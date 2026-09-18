/**
 * Esteira de DMs do Instagram via ManyChat (14/08/2026).
 *
 * Por que existe: a API do ManyChat NÃO tem endpoint pra ler mensagem recebida.
 * A única forma de saber que chegou DM é o fluxo dele empurrar (External Request).
 * Este arquivo é o ouvido: recebe o empurrão, guarda na fila e avisa o Bruno.
 *
 * Fluxo completo:
 *   DM chega → ManyChat (fluxo F2) → POST /api/manychat/inbox → mc_fila_dm
 *   → Claude redige (GET /fila, POST /rascunho) → Telegram pro Bruno
 *   → Bruno aprova → POST /enviar → ManyChat /fb/sending/sendContent → DM sai
 *
 * Regra dura: nada sai sem aprovação, EXCETO o que a triagem marcar batido=true
 * (valor da consulta, atende online, link do MAPA). Sofrimento, menor de idade,
 * medicação e dúvida clínica NUNCA são batidos.
 */

import { Router } from 'express';
import { supabase } from '../db/client.js';

const router = Router();

const MC_TOKEN = process.env.MANYCHAT_API_TOKEN || '';
const MC_API = 'https://api.manychat.com';

// Bot próprio da esteira de DM; cai no bot geral se ainda não existir.
const TG_TOKEN = process.env.MC_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
const TG_CHAT = process.env.MC_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID || '';

const SECRET = process.env.SYNC_PUSH_SECRET || '';

/** Todo endpoint daqui é protegido: o ManyChat manda o segredo no header. */
function autorizado(req: any, res: any): boolean {
  if (!SECRET) return true; // sem segredo configurado = ambiente local
  const auth = req.headers.authorization;
  if (auth === `Bearer ${SECRET}`) return true;
  if (req.headers['x-sync-secret'] === SECRET) return true;
  if (req.query.secret === SECRET) return true;
  res.status(401).json({ ok: false, erro: 'nao autorizado' });
  return false;
}

async function telegram(metodo: string, corpo: Record<string, any>) {
  if (!TG_TOKEN || !TG_CHAT) return { ok: false, erro: 'telegram nao configurado' };
  const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/${metodo}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT, parse_mode: 'HTML', ...corpo }),
  });
  return r.json();
}

function escapaHtml(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─────────────────────────────────────────────────────────────
// 1. OUVIDO — o ManyChat empurra a DM nova pra cá
// ─────────────────────────────────────────────────────────────
router.post('/inbox', async (req, res) => {
  if (!autorizado(req, res)) return;

  try {
    // O ManyChat manda os campos que a gente configurar no External Request.
    const {
      subscriber_id,
      username,
      nome,
      mensagem,
      recebida_em,
    } = req.body || {};

    if (!subscriber_id || !mensagem) {
      return res.status(400).json({ ok: false, erro: 'faltou subscriber_id ou mensagem' });
    }

    const recebida = recebida_em ? new Date(recebida_em) : new Date();

    const { data, error } = await supabase
      .from('mc_fila_dm')
      .insert({
        mc_subscriber_id: String(subscriber_id),
        ig_username: username || null,
        nome: nome || null,
        mensagem: String(mensagem),
        recebida_em: recebida.toISOString(),
        status: 'novo',
      })
      .select('id')
      .single();

    if (error) throw error;

    // Aviso imediato, sem rascunho ainda: o Bruno pediu pra ser avisado a qualquer hora.
    const quem = username ? `@${username}` : (nome || subscriber_id);
    await telegram('sendMessage', {
      text:
        `📥 <b>DM nova no Instagram</b>\n\n` +
        `<b>${escapaHtml(String(quem))}</b>\n` +
        `<i>${escapaHtml(String(mensagem)).slice(0, 500)}</i>\n\n` +
        `Estou redigindo a resposta. Você recebe pra aprovar em seguida.`,
    });

    res.json({ ok: true, id: data?.id });
  } catch (e: any) {
    console.error('[manychat/inbox]', e?.message || e);
    res.status(500).json({ ok: false, erro: String(e?.message || e) });
  }
});

// ─────────────────────────────────────────────────────────────
// 2. FILA — o Claude lê o que está esperando resposta
// ─────────────────────────────────────────────────────────────
router.get('/fila', async (req, res) => {
  if (!autorizado(req, res)) return;

  const status = String(req.query.status || 'novo');
  const limite = Math.min(Number(req.query.limite) || 20, 100);

  const { data, error } = await supabase
    .from('mc_fila_dm')
    .select('*')
    .eq('status', status)
    .order('recebida_em', { ascending: true })
    .limit(limite);

  if (error) return res.status(500).json({ ok: false, erro: error.message });

  const agora = Date.now();
  const itens = (data || []).map((d: any) => ({
    ...d,
    horas_restantes: d.janela_expira_em
      ? Math.round(((new Date(d.janela_expira_em).getTime() - agora) / 3600000) * 10) / 10
      : null,
  }));

  res.json({ ok: true, total: itens.length, itens });
});

// ─────────────────────────────────────────────────────────────
// 3. RASCUNHO — o Claude grava a resposta e manda pro Bruno aprovar
// ─────────────────────────────────────────────────────────────
router.post('/rascunho', async (req, res) => {
  if (!autorizado(req, res)) return;

  try {
    const { id, rascunho, grupo, batido, motivo_triagem } = req.body || {};
    if (!id || !rascunho) return res.status(400).json({ ok: false, erro: 'faltou id ou rascunho' });

    const { data, error } = await supabase
      .from('mc_fila_dm')
      .update({
        rascunho,
        rascunho_em: new Date().toISOString(),
        grupo: grupo || null,
        batido: !!batido,
        motivo_triagem: motivo_triagem || null,
        status: 'rascunho',
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    // Batido sai sozinho; o resto sobe pro Bruno com botões.
    if (batido) {
      const envio = await enviarPeloManyChat(data.mc_subscriber_id, rascunho);
      if (envio.ok) {
        await supabase.from('mc_fila_dm').update({
          status: 'enviado', enviado_texto: rascunho, enviado_em: new Date().toISOString(),
          aprovado_por: 'automatico (batido)',
        }).eq('id', id);
        await telegram('sendMessage', {
          text: `✅ <b>Resposta automática enviada</b> (caso batido: ${escapaHtml(grupo || '')})\n\n` +
                `Para <b>${escapaHtml(data.ig_username ? '@' + data.ig_username : data.nome || '')}</b>\n` +
                `<i>${escapaHtml(rascunho).slice(0, 400)}</i>`,
        });
      }
      return res.json({ ok: true, enviado: envio.ok, erro: envio.erro });
    }

    const horas = data.janela_expira_em
      ? Math.round((new Date(data.janela_expira_em).getTime() - Date.now()) / 3600000)
      : null;

    await telegram('sendMessage', {
      text:
        `✏️ <b>Resposta pronta pra aprovar</b>\n\n` +
        `<b>De:</b> ${escapaHtml(data.ig_username ? '@' + data.ig_username : data.nome || '')}\n` +
        `<b>Grupo:</b> ${escapaHtml(grupo || 'sem classificação')}\n` +
        (horas !== null ? `<b>Janela:</b> ${horas}h restantes\n` : '') +
        `\n<b>Mensagem dela/dele:</b>\n<i>${escapaHtml(data.mensagem).slice(0, 400)}</i>\n\n` +
        `<b>Minha resposta:</b>\n${escapaHtml(rascunho)}`,
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Enviar', callback_data: `mc_ok:${id}` },
          { text: '❌ Descartar', callback_data: `mc_no:${id}` },
        ]],
      },
    });

    res.json({ ok: true, aguardando_aprovacao: true });
  } catch (e: any) {
    console.error('[manychat/rascunho]', e?.message || e);
    res.status(500).json({ ok: false, erro: String(e?.message || e) });
  }
});

// ─────────────────────────────────────────────────────────────
// 4. ENVIO — manda a DM pelo ManyChat
// ─────────────────────────────────────────────────────────────
async function enviarPeloManyChat(subscriberId: string, texto: string) {
  if (!MC_TOKEN) return { ok: false, erro: 'MANYCHAT_API_TOKEN ausente' };

  const r = await fetch(`${MC_API}/fb/sending/sendContent`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MC_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subscriber_id: Number(subscriberId),
      data: {
        version: 'v2',
        content: {
          messages: [{ type: 'text', text: texto }],
        },
      },
    }),
  });

  const j: any = await r.json().catch(() => ({}));
  if (j?.status === 'success') return { ok: true };
  return { ok: false, erro: j?.message || `http ${r.status}` };
}

router.post('/enviar', async (req, res) => {
  if (!autorizado(req, res)) return;

  const { id, texto } = req.body || {};
  if (!id) return res.status(400).json({ ok: false, erro: 'faltou id' });

  const { data, error } = await supabase.from('mc_fila_dm').select('*').eq('id', id).single();
  if (error || !data) return res.status(404).json({ ok: false, erro: 'nao encontrado' });

  const corpo = texto || data.rascunho;
  if (!corpo) return res.status(400).json({ ok: false, erro: 'sem texto pra enviar' });

  const envio = await enviarPeloManyChat(data.mc_subscriber_id, corpo);

  await supabase.from('mc_fila_dm').update({
    status: envio.ok ? 'enviado' : 'rascunho',
    enviado_texto: envio.ok ? corpo : null,
    enviado_em: envio.ok ? new Date().toISOString() : null,
    erro: envio.ok ? null : envio.erro,
    tentativas: (data.tentativas || 0) + 1,
  }).eq('id', id);

  res.json({ ok: envio.ok, erro: envio.erro });
});

// ─────────────────────────────────────────────────────────────
// 5. BOTÕES DO TELEGRAM — aprovar / descartar
// ─────────────────────────────────────────────────────────────
router.post('/tg-callback', async (req, res) => {
  try {
    const cb = req.body?.callback_query;
    if (!cb) return res.json({ ok: true });

    const [acao, id] = String(cb.data || '').split(':');
    if (!id) return res.json({ ok: true });

    if (acao === 'mc_ok') {
      const { data } = await supabase.from('mc_fila_dm').select('*').eq('id', id).single();
      if (data) {
        const envio = await enviarPeloManyChat(data.mc_subscriber_id, data.rascunho);
        await supabase.from('mc_fila_dm').update({
          status: envio.ok ? 'enviado' : 'rascunho',
          enviado_texto: envio.ok ? data.rascunho : null,
          enviado_em: envio.ok ? new Date().toISOString() : null,
          aprovado_por: 'bruno (telegram)',
          aprovado_em: new Date().toISOString(),
          erro: envio.ok ? null : envio.erro,
        }).eq('id', id);

        await telegram('sendMessage', {
          text: envio.ok ? '✅ Enviada.' : `⚠️ Não consegui enviar: ${escapaHtml(envio.erro || '')}`,
        });
      }
    }

    if (acao === 'mc_no') {
      await supabase.from('mc_fila_dm').update({
        status: 'descartado',
        aprovado_por: 'bruno (telegram)',
        aprovado_em: new Date().toISOString(),
      }).eq('id', id);
      await telegram('sendMessage', { text: '🗑️ Descartada. Não vou responder essa.' });
    }

    // tira o "carregando" do botão
    if (TG_TOKEN) {
      await fetch(`https://api.telegram.org/bot${TG_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: cb.id }),
      });
    }

    res.json({ ok: true });
  } catch (e: any) {
    console.error('[manychat/tg-callback]', e?.message || e);
    res.json({ ok: true }); // nunca deixa o Telegram reenviar em loop
  }
});

// ─────────────────────────────────────────────────────────────
// 6. SAÚDE
// ─────────────────────────────────────────────────────────────
router.get('/status', async (_req, res) => {
  const { count } = await supabase
    .from('mc_fila_dm')
    .select('*', { count: 'exact', head: true })
    .in('status', ['novo', 'rascunho']);

  res.json({
    ok: true,
    manychat_token: !!MC_TOKEN,
    telegram: !!TG_TOKEN && !!TG_CHAT,
    bot_proprio: !!process.env.MC_TELEGRAM_BOT_TOKEN,
    pendentes: count ?? 0,
  });
});

export default router;
