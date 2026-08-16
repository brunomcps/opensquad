/**
 * Esteira de DMs do Instagram — roda dentro do Cloudflare Worker.
 *
 * Por que aqui e não no servidor: o serviço do Content Hub no Railway não existe
 * mais (14/08/2026: "Application not found" pelo domínio e pelo endereço direto).
 * O Worker já é dono de hub.brunosallesphd.com.br, é grátis e nunca cai, então
 * a esteira mora nele e não depende de servidor nenhum.
 *
 * A fila vive no KV do próprio Worker (INSTAGRAM_DM_KV), sem credencial extra.
 *
 * Rotas (todas exigem o segredo, menos o callback do Telegram que valida por token):
 *   POST /api/manychat/inbox       ← o ManyChat empurra a DM nova
 *   GET  /api/manychat/fila        ← o Claude lê o que está esperando
 *   POST /api/manychat/rascunho    ← o Claude grava a resposta e manda pro Telegram
 *   POST /api/manychat/enviar      ← dispara a DM pelo ManyChat
 *   POST /api/manychat/tg-callback ← botões ✅ Enviar / ❌ Descartar
 *   GET  /api/manychat/status      ← saúde da esteira
 */

const PREFIXO = 'mcdm:'; // chaves da fila no KV

function json(dados, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function autorizado(request, env) {
  const segredo = env.MC_SECRET;
  if (!segredo) return true;
  const url = new URL(request.url);
  const auth = request.headers.get('Authorization');
  if (auth === `Bearer ${segredo}`) return true;
  if (request.headers.get('x-mc-secret') === segredo) return true;
  if (url.searchParams.get('secret') === segredo) return true;
  return false;
}

function escapaHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function telegram(env, metodo, corpo) {
  const token = env.MC_TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN;
  const chat = env.MC_TELEGRAM_CHAT_ID || env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return { ok: false, erro: 'telegram sem credencial' };

  const r = await fetch(`https://api.telegram.org/bot${token}/${metodo}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, parse_mode: 'HTML', ...corpo }),
  });
  return r.json();
}

async function enviarPeloManyChat(env, subscriberId, texto) {
  if (!env.MANYCHAT_API_TOKEN) return { ok: false, erro: 'MANYCHAT_API_TOKEN ausente' };

  const r = await fetch('https://api.manychat.com/fb/sending/sendContent', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.MANYCHAT_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subscriber_id: Number(subscriberId),
      data: { version: 'v2', content: { messages: [{ type: 'text', text: texto }] } },
    }),
  });

  const j = await r.json().catch(() => ({}));
  if (j && j.status === 'success') return { ok: true };
  return { ok: false, erro: (j && j.message) || `http ${r.status}` };
}

async function lerFila(env, status) {
  const lista = await env.INSTAGRAM_DM_KV.list({ prefix: PREFIXO });
  const itens = [];
  for (const chave of lista.keys) {
    const bruto = await env.INSTAGRAM_DM_KV.get(chave.name);
    if (!bruto) continue;
    const item = JSON.parse(bruto);
    if (!status || item.status === status) itens.push(item);
  }
  itens.sort((a, b) => new Date(a.recebida_em) - new Date(b.recebida_em));
  return itens;
}

async function gravar(env, item) {
  // 30 dias de validade: a janela da Meta é 24h, o resto é histórico curto.
  await env.INSTAGRAM_DM_KV.put(PREFIXO + item.id, JSON.stringify(item), {
    expirationTtl: 60 * 60 * 24 * 30,
  });
}

async function pegar(env, id) {
  const bruto = await env.INSTAGRAM_DM_KV.get(PREFIXO + id);
  return bruto ? JSON.parse(bruto) : null;
}

function horasRestantes(item) {
  if (!item.recebida_em) return null;
  const fim = new Date(item.recebida_em).getTime() + 24 * 3600 * 1000;
  return Math.round(((fim - Date.now()) / 3600000) * 10) / 10;
}

export async function handleManychat(request, env) {
  const url = new URL(request.url);
  const rota = url.pathname.replace('/api/manychat', '');

  // ── saúde ────────────────────────────────────────────────
  if (rota === '/status' && request.method === 'GET') {
    if (!autorizado(request, env)) return json({ ok: false, erro: 'nao autorizado' }, 401);
    const pendentes = (await lerFila(env, 'novo')).length;
    const rascunhos = (await lerFila(env, 'rascunho')).length;
    return json({
      ok: true,
      manychat: !!env.MANYCHAT_API_TOKEN,
      telegram: !!(env.MC_TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN),
      pendentes,
      rascunhos,
    });
  }

  // ── 1. OUVIDO: o ManyChat empurra a DM nova ──────────────
  if (rota === '/inbox' && request.method === 'POST') {
    if (!autorizado(request, env)) return json({ ok: false, erro: 'nao autorizado' }, 401);

    const corpo = await request.json().catch(() => ({}));
    const { subscriber_id, username, nome, mensagem } = corpo;
    if (!subscriber_id || !mensagem) {
      return json({ ok: false, erro: 'faltou subscriber_id ou mensagem' }, 400);
    }

    const item = {
      id: crypto.randomUUID(),
      mc_subscriber_id: String(subscriber_id),
      ig_username: username || null,
      nome: nome || null,
      mensagem: String(mensagem),
      recebida_em: new Date().toISOString(),
      status: 'novo',
      grupo: null,
      batido: false,
      rascunho: null,
    };
    await gravar(env, item);

    const quem = username ? '@' + username : (nome || subscriber_id);
    await telegram(env, 'sendMessage', {
      text:
        `📥 <b>DM nova no Instagram</b>\n\n` +
        `<b>${escapaHtml(quem)}</b>\n` +
        `<i>${escapaHtml(mensagem).slice(0, 500)}</i>\n\n` +
        `Estou redigindo a resposta.`,
    });

    return json({ ok: true, id: item.id });
  }

  // ── 2. FILA: o Claude lê o que está esperando ────────────
  if (rota === '/fila' && request.method === 'GET') {
    if (!autorizado(request, env)) return json({ ok: false, erro: 'nao autorizado' }, 401);
    const status = url.searchParams.get('status') || 'novo';
    const itens = (await lerFila(env, status)).map((i) => ({ ...i, horas_restantes: horasRestantes(i) }));
    return json({ ok: true, total: itens.length, itens });
  }

  // ── 3. RASCUNHO: grava a resposta e manda pro Bruno ──────
  if (rota === '/rascunho' && request.method === 'POST') {
    if (!autorizado(request, env)) return json({ ok: false, erro: 'nao autorizado' }, 401);

    const { id, rascunho, grupo, batido, motivo_triagem } = await request.json().catch(() => ({}));
    if (!id || !rascunho) return json({ ok: false, erro: 'faltou id ou rascunho' }, 400);

    const item = await pegar(env, id);
    if (!item) return json({ ok: false, erro: 'nao encontrado' }, 404);

    item.rascunho = rascunho;
    item.grupo = grupo || null;
    item.batido = !!batido;
    item.motivo_triagem = motivo_triagem || null;
    item.status = 'rascunho';
    item.rascunho_em = new Date().toISOString();
    await gravar(env, item);

    // caso batido sai sozinho; o resto sobe pro Bruno com botões
    if (batido) {
      const envio = await enviarPeloManyChat(env, item.mc_subscriber_id, rascunho);
      if (envio.ok) {
        item.status = 'enviado';
        item.enviado_em = new Date().toISOString();
        item.aprovado_por = 'automatico (batido)';
        await gravar(env, item);
        await telegram(env, 'sendMessage', {
          text:
            `✅ <b>Resposta automática enviada</b> (${escapaHtml(grupo || 'batido')})\n\n` +
            `Para <b>${escapaHtml(item.ig_username ? '@' + item.ig_username : item.nome || '')}</b>\n` +
            `<i>${escapaHtml(rascunho).slice(0, 400)}</i>`,
        });
      } else {
        item.status = 'rascunho';
        item.erro = envio.erro;
        await gravar(env, item);
      }
      return json({ ok: true, enviado: envio.ok, erro: envio.erro });
    }

    const horas = horasRestantes(item);
    await telegram(env, 'sendMessage', {
      text:
        `✏️ <b>Resposta pronta pra aprovar</b>\n\n` +
        `<b>De:</b> ${escapaHtml(item.ig_username ? '@' + item.ig_username : item.nome || '')}\n` +
        `<b>Grupo:</b> ${escapaHtml(grupo || 'sem classificação')}\n` +
        (horas !== null ? `<b>Janela:</b> ${horas}h restantes\n` : '') +
        `\n<b>Mensagem dela/dele:</b>\n<i>${escapaHtml(item.mensagem).slice(0, 400)}</i>\n\n` +
        `<b>Minha resposta:</b>\n${escapaHtml(rascunho)}`,
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Enviar', callback_data: `mc_ok:${id}` },
          { text: '❌ Descartar', callback_data: `mc_no:${id}` },
        ]],
      },
    });

    return json({ ok: true, aguardando_aprovacao: true });
  }

  // ── 4. ENVIO manual ──────────────────────────────────────
  if (rota === '/enviar' && request.method === 'POST') {
    if (!autorizado(request, env)) return json({ ok: false, erro: 'nao autorizado' }, 401);

    const { id, texto } = await request.json().catch(() => ({}));
    const item = await pegar(env, id);
    if (!item) return json({ ok: false, erro: 'nao encontrado' }, 404);

    const corpo = texto || item.rascunho;
    if (!corpo) return json({ ok: false, erro: 'sem texto' }, 400);

    const envio = await enviarPeloManyChat(env, item.mc_subscriber_id, corpo);
    item.status = envio.ok ? 'enviado' : 'rascunho';
    if (envio.ok) { item.enviado_em = new Date().toISOString(); item.enviado_texto = corpo; }
    else { item.erro = envio.erro; }
    await gravar(env, item);

    return json({ ok: envio.ok, erro: envio.erro });
  }

  // ── 5. BOTÕES do Telegram ────────────────────────────────
  if (rota === '/tg-callback' && request.method === 'POST') {
    const corpo = await request.json().catch(() => ({}));
    const cb = corpo.callback_query;
    if (!cb) return json({ ok: true });

    const [acao, id] = String(cb.data || '').split(':');
    const item = id ? await pegar(env, id) : null;

    if (item && acao === 'mc_ok') {
      const envio = await enviarPeloManyChat(env, item.mc_subscriber_id, item.rascunho);
      item.status = envio.ok ? 'enviado' : 'rascunho';
      item.aprovado_por = 'bruno (telegram)';
      item.aprovado_em = new Date().toISOString();
      if (envio.ok) item.enviado_em = new Date().toISOString();
      else item.erro = envio.erro;
      await gravar(env, item);
      await telegram(env, 'sendMessage', {
        text: envio.ok ? '✅ Enviada.' : `⚠️ Não consegui enviar: ${escapaHtml(envio.erro)}`,
      });
    }

    if (item && acao === 'mc_no') {
      item.status = 'descartado';
      item.aprovado_por = 'bruno (telegram)';
      item.aprovado_em = new Date().toISOString();
      await gravar(env, item);
      await telegram(env, 'sendMessage', { text: '🗑️ Descartada.' });
    }

    const token = env.MC_TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN;
    if (token && cb.id) {
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: cb.id }),
      });
    }

    return json({ ok: true });
  }

  return json({ ok: false, erro: 'rota desconhecida' }, 404);
}
