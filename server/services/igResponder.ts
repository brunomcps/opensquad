// Esteira de DMs do Instagram (ig-responder).
// Vigia a caixa via Graph API, classifica cada mensagem nova com IA e:
//   modo "observador": manda o rascunho pro Telegram do Bruno (NÃO envia DM)
//   modo "auto": responde sozinho SÓ os grupos habilitados; delicado SEMPRE vira fila
// Regra de ouro: conteúdo de DM nunca é persistido no banco (só ids/grupo/ação);
// o texto trafega apenas pro Telegram privado. Nasce com ativo=false na config.
import cron from 'node-cron';
import { supabase } from '../db/client.js';
import { sendMessage as telegramSend } from './telegram.js';

// Rota NOVA da Meta ("Instagram Login"): graph.instagram.com + token do caso de
// uso INSTAGRAM_BUSINESS. Não depende de Página do Facebook nem do portão antigo.
const IG_GRAPH = 'https://graph.instagram.com/v21.0';
function igLoginToken(): string {
  return (process.env.INSTAGRAM_LOGIN_TOKEN || '').replace(/^﻿/, '').trim();
}
async function igGet(pathname: string, params: Record<string, string>): Promise<any> {
  const url = new URL(`${IG_GRAPH}${pathname}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('access_token', igLoginToken());
  const r = await fetch(url);
  const data: any = await r.json();
  if (!r.ok || data?.error) throw new Error(data?.error?.message || `IG API ${r.status}`);
  return data;
}
async function igPost(pathname: string, body: Record<string, unknown>): Promise<any> {
  const url = new URL(`${IG_GRAPH}${pathname}`);
  url.searchParams.set('access_token', igLoginToken());
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data: any = await r.json();
  if (!r.ok || data?.error) throw new Error(data?.error?.message || `IG API ${r.status}`);
  return data;
}

// Lê as conversas da caixa (rota nova: /me/conversations, sem platform=)
async function fetchLiveConversations(limit = 8): Promise<any> {
  return igGet('/me/conversations', {
    fields: 'id,updated_time,participants,messages.limit(1){id,created_time,from,message}',
    limit: String(limit),
  });
}
async function fetchLiveConversationMessages(conversationId: string, limit = 12): Promise<any> {
  return igGet(`/${conversationId}/messages`, {
    fields: 'id,created_time,from,message',
    limit: String(limit),
  });
}
async function sendInstagramDm(recipientId: string, text: string): Promise<any> {
  return igPost('/me/messages', { recipient: { id: recipientId }, message: { text } });
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODELO = 'claude-sonnet-5';
const JANELA_MS = 24 * 60 * 60 * 1000 * 0.9; // 24h com 10% de margem de segurança
// ids que representam a NOSSA conta (pra reconhecer mensagens que já são nossas).
// Na rota nova, o from.id pode vir como id app-scoped (login) ou o business id.
const MEUS_IDS = new Set(
  [
    process.env.INSTAGRAM_LOGIN_ID,
    process.env.INSTAGRAM_BUSINESS_ID,
    process.env.INSTAGRAM_USER_ID,
    process.env.INSTAGRAM_PAGE_ID,
  ].filter(Boolean) as string[],
);
function ehNossa(id: string): boolean {
  return !id || MEUS_IDS.has(id);
}

export const GRUPOS = [
  'consulta',
  'sera_que_tenho',
  'pergunta_conteudo',
  'elogio_papo',
  'oferta_b2b',
  'delicado',
  'spam_vago',
] as const;
export type Grupo = (typeof GRUPOS)[number];

interface ConfigResponder {
  ativo: boolean;
  modo: 'observador' | 'auto';
  grupos_auto: string[];
  roteiros: Record<string, string>;
  poll_minutos: number;
}

interface Classificacao {
  grupo: Grupo;
  resposta: string | null;
  motivo: string;
}

export interface ResumoPoll {
  executou: boolean;
  conversasVistas: number;
  novas: number;
  respondidas: number;
  fila: number;
  observadas: number;
  erros: string[];
}

async function carregaConfig(): Promise<ConfigResponder | null> {
  const { data, error } = await supabase
    .from('ci_ig_responder_config')
    .select('ativo,modo,grupos_auto,roteiros,poll_minutos')
    .eq('id', 1)
    .maybeSingle();
  if (error || !data) {
    console.warn('[ig-responder] config indisponível:', error?.message);
    return null;
  }
  return data as ConfigResponder;
}

async function jaProcessada(messageId: string): Promise<boolean> {
  const { data } = await supabase
    .from('ci_ig_processed')
    .select('message_id')
    .eq('message_id', messageId)
    .maybeSingle();
  return Boolean(data);
}

async function registra(entrada: {
  message_id: string;
  conversation_id: string;
  autor_id: string;
  grupo: string | null;
  acao: string;
}): Promise<void> {
  const { error } = await supabase.from('ci_ig_processed').insert(entrada);
  if (error && !error.message.includes('duplicate')) {
    console.warn('[ig-responder] falha ao registrar:', error.message);
  }
}

function nomeDoAutor(participantes: any, autorId: string): string {
  const lista = participantes?.data || [];
  const autor = lista.find((p: any) => String(p.id) === autorId);
  return autor?.username || autor?.name || autorId;
}

async function classifica(
  historico: Array<{ de: 'lead' | 'bruno'; texto: string }>,
  roteiros: Record<string, string>,
): Promise<Classificacao> {
  const conversa = historico
    .map(m => `${m.de === 'lead' ? 'PESSOA' : 'EQUIPE'}: ${m.texto}`)
    .join('\n');
  const roteirosTexto = Object.entries(roteiros)
    .map(([grupo, texto]) => `- ${grupo}: ${texto}`)
    .join('\n') || '(nenhum roteiro cadastrado ainda)';

  const prompt = `Você é o triador e redator da EQUIPE do Dr. Bruno Salles (psicólogo PhD, canal de TDAH adulto). Analise a conversa de DM do Instagram abaixo e responda APENAS um JSON válido:
{"grupo": "<um de: ${GRUPOS.join(' | ')}>", "resposta": "<texto da resposta ou null>", "motivo": "<1 frase>"}

GRUPOS: consulta (quer atendimento/avaliação/agenda) · sera_que_tenho (relata sinais, quer saber se tem TDAH) · pergunta_conteudo (dúvida sobre tema dos vídeos) · elogio_papo (agradecimento, comentário leve) · oferta_b2b (vende serviço/parceria) · delicado (crise, sofrimento agudo, ideação, questão de paciente em tratamento, menor de idade) · spam_vago (spam, "oi" seco, ilegível).

REGRAS DA RESPOSTA (quando não for delicado):
- Assine o tom como equipe: primeira pessoa do plural discreta ("aqui é da equipe do Dr. Bruno").
- PROIBIDO: orientação clínica, diagnóstico, promessa de resultado, valores não listados nos roteiros, travessão (—), links não listados nos roteiros.
- Use o roteiro do grupo quando existir; adapte 1-2 frases ao que a pessoa disse (nada de texto robótico).
- Curta: 2-4 frases. PT-BR coloquial leve.
- grupo delicado ou menor de idade: resposta = null SEMPRE.
- Se não houver roteiro pro grupo consulta, resposta = null (vai pra fila humana).

ROTEIROS CADASTRADOS:
${roteirosTexto}

CONVERSA (mais antiga primeiro):
${conversa}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const corpo: any = await res.json();
  const texto = corpo?.content?.[0]?.text || '{}';
  const json = texto.slice(texto.indexOf('{'), texto.lastIndexOf('}') + 1);
  const saida = JSON.parse(json);
  const grupo: Grupo = GRUPOS.includes(saida.grupo) ? saida.grupo : 'delicado';
  return {
    grupo,
    resposta: grupo === 'delicado' ? null : (typeof saida.resposta === 'string' ? saida.resposta : null),
    motivo: String(saida.motivo || ''),
  };
}

export async function pollDmsOnce(): Promise<ResumoPoll> {
  const resumo: ResumoPoll = {
    executou: false, conversasVistas: 0, novas: 0, respondidas: 0, fila: 0, observadas: 0, erros: [],
  };
  const config = await carregaConfig();
  if (!config?.ativo) return resumo;
  resumo.executou = true;

  let conversas: any;
  try {
    // 25 estourava o limite de dados do Graph ("reduce the amount of data");
    // 8 conversas por ciclo de 2 min dá vazão de sobra pro volume da caixa
    conversas = await fetchLiveConversations(8);
  } catch (erro: any) {
    const mensagem = String(erro?.message || erro);
    resumo.erros.push(mensagem);
    // "Fatal" (subcode 2207085) = "Permitir acesso a mensagens" desligado no app do Instagram
    if (mensagem.includes('2207085') || mensagem.trim() === 'Fatal') {
      console.warn('[ig-responder] Meta bloqueou leitura: toggle "acesso a mensagens" ainda desligado no Instagram (Configurações > Mensagens e respostas a story > Ferramentas conectadas).');
    }
    return resumo;
  }

  for (const conversa of conversas?.data || []) {
    resumo.conversasVistas += 1;
    const ultima = conversa?.messages?.data?.[0];
    if (!ultima?.id) continue;
    const autorId = String(ultima?.from?.id || '');
    if (ehNossa(autorId)) continue; // última mensagem é nossa
    if (await jaProcessada(ultima.id)) continue;

    resumo.novas += 1;
    const criadaEm = new Date(ultima.created_time).getTime();
    const registroBase = {
      message_id: String(ultima.id),
      conversation_id: String(conversa.id),
      autor_id: autorId,
    };

    if (Date.now() - criadaEm > JANELA_MS) {
      await registra({ ...registroBase, grupo: null, acao: 'janela_fechada' });
      continue;
    }

    try {
      const historicoBruto: any = await fetchLiveConversationMessages(String(conversa.id), 12);
      const historico = ((historicoBruto?.data || []) as any[])
        .reverse()
        .map((m: any) => ({
          de: ehNossa(String(m?.from?.id)) ? ('bruno' as const) : ('lead' as const),
          texto: String(m?.message || '(anexo)').slice(0, 600),
        }));
      const autor = nomeDoAutor(conversa.participants, autorId);
      const { grupo, resposta, motivo } = await classifica(historico, config.roteiros || {});

      const podeAuto = config.modo === 'auto'
        && grupo !== 'delicado'
        && resposta
        && (config.grupos_auto || []).includes(grupo);

      if (podeAuto) {
        await sendInstagramDm(autorId, resposta as string);
        await registra({ ...registroBase, grupo, acao: 'respondido' });
        resumo.respondidas += 1;
        await telegramSend(`🤖 DM respondida (${grupo}) · @${autor}\n"${(resposta as string).slice(0, 180)}"`);
      } else {
        const acao = grupo === 'delicado' ? 'fila' : 'observado';
        await registra({ ...registroBase, grupo, acao });
        if (grupo === 'delicado') resumo.fila += 1; else resumo.observadas += 1;
        const alerta = grupo === 'delicado' ? '🚨 DELICADO, precisa de VOCÊ' : `👀 ${grupo}`;
        await telegramSend(
          `${alerta} · @${autor} no Instagram\n` +
          `Pessoa: "${historico.filter((m: { de: string }) => m.de === 'lead').slice(-1)[0]?.texto?.slice(0, 220) || ''}"\n` +
          (resposta ? `Rascunho da equipe: "${resposta.slice(0, 280)}"\n` : '') +
          `(${motivo}) · responder: instagram.com/direct/inbox`,
        );
      }
    } catch (erro: any) {
      resumo.erros.push(`conversa ${conversa.id}: ${String(erro?.message || erro).slice(0, 150)}`);
    }
  }
  return resumo;
}

// ===== ChamaChat: comentário com palavra-chave → DM automática (private reply) =====
// Regra da Meta: 1 mensagem privada por comentário, em até 7 dias. Keywords vêm
// da config (keywords_comment_dm: [{ palavra, resposta }]). Sem keywords = dorme.

async function enviaPrivateReply(commentId: string, texto: string): Promise<void> {
  // rota nova: graph.instagram.com/me/messages com recipient.comment_id
  await igPost('/me/messages', { recipient: { comment_id: commentId }, message: { text: texto } });
}

export async function pollComentariosOnce(): Promise<{ executou: boolean; comentariosVistos: number; dmsEnviadas: number; erros: string[] }> {
  const resumo = { executou: false, comentariosVistos: 0, dmsEnviadas: 0, erros: [] as string[] };
  const config = await carregaConfig();
  if (!config?.ativo) return resumo;
  const regras: Array<{ palavra: string; resposta: string }> = Array.isArray((config as any).keywords_comment_dm)
    ? (config as any).keywords_comment_dm
    : [];
  if (regras.length === 0) return resumo; // sem palavra-chave cadastrada, dorme
  resumo.executou = true;

  const seteDias = 7 * 24 * 60 * 60 * 1000 * 0.9;
  try {
    const corpo: any = await igGet('/me/media', {
      fields: 'id,timestamp,comments.limit(25){id,text,timestamp,from,username}',
      limit: '5',
    });
    for (const media of corpo?.data || []) {
      for (const comentario of media?.comments?.data || []) {
        resumo.comentariosVistos += 1;
        const autorId = String(comentario?.from?.id || '');
        if (ehNossa(autorId)) continue; // comentário nosso
        if (Date.now() - new Date(comentario.timestamp).getTime() > seteDias) continue;
        const texto = String(comentario?.text || '').toLowerCase();
        const regra = regras.find(r => texto.includes(String(r.palavra || '').toLowerCase()));
        if (!regra) continue;
        if (await jaProcessada(`c_${comentario.id}`)) continue;
        try {
          await enviaPrivateReply(String(comentario.id), regra.resposta);
          await registra({
            message_id: `c_${comentario.id}`,
            conversation_id: String(media.id),
            autor_id: autorId,
            grupo: 'comment_dm',
            acao: 'respondido',
          });
          resumo.dmsEnviadas += 1;
          await telegramSend(`💬→📩 Comentário de @${comentario?.username || autorId} virou DM (palavra "${regra.palavra}")`);
        } catch (erro: any) {
          resumo.erros.push(String(erro?.message || erro).slice(0, 150));
        }
      }
    }
  } catch (erro: any) {
    resumo.erros.push(String(erro?.message || erro).slice(0, 150));
  }
  return resumo;
}

let cronIniciado = false;

export function startIgResponderCron(): void {
  if (cronIniciado) return;
  cronIniciado = true;
  cron.schedule('*/2 * * * *', async () => {
    try {
      const resumo = await pollDmsOnce();
      if (resumo.executou && (resumo.novas > 0 || resumo.erros.length > 0)) {
        console.log('[ig-responder]', JSON.stringify(resumo));
      }
      const comentarios = await pollComentariosOnce();
      if (comentarios.executou && (comentarios.dmsEnviadas > 0 || comentarios.erros.length > 0)) {
        console.log('[ig-responder][comment-dm]', JSON.stringify(comentarios));
      }
    } catch (erro: any) {
      console.error('[ig-responder] poll falhou:', erro?.message || erro);
    }
  }, { timezone: 'America/Sao_Paulo' });
  console.log('[ig-responder] cron agendado: a cada 2 min (ativo só quando a config ligar)');
}
