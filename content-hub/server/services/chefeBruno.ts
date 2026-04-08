/**
 * Chefe Bruno — Daily bot message composition + callback handling.
 * Ported from _opensquad/_telegram/chefe_bruno.py
 *
 * Reads from Supabase (not local .md files) so it works on Railway 24/7.
 */

import { sendMessage, answerCallbackQuery, getUpdates } from './telegram.js';
import { getTodayEvents, type CalendarEvent } from './calendar.js';
import { syncToday } from './googleFitSync.js';
import {
  getActiveTarefas,
  updateTarefaStatus,
  updateTarefaDue,
  getCurrentTreino,
  getMetricasDia,
  getActiveProductions,
  updateProductionField,
  type Tarefa,
  type TreinoSemana,
  type MetricaDiaria,
  type Production,
} from '../db/bot.js';
import { supabase } from '../db/client.js';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

// ============================
// CONSTANTS
// ============================

const DIAS_SEMANA = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];

const DAY_NAMES = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'];

const PIPELINE: Array<[string, string, string]> = [
  ['roteiro', '📝', 'Roteiro'],
  ['hook', '🪝', 'Hook'],
  ['gravacao', '🎙️', 'Gravar'],
  ['edicao', '🎬', 'Editar'],
  ['thumbnail_img', '🖼️', 'Thumbnail'],
  ['publicacao', '📤', 'Publicar'],
];

const FIELD_INFO = Object.fromEntries(PIPELINE.map(([f, e, v]) => [f, { emoji: e, verb: v }]));
const FIELD_CODE: Record<string, string> = { g: 'gravacao', e: 'edicao', p: 'publicacao', t: 'thumbnail_img' };
const CODE_FIELD = Object.fromEntries(Object.entries(FIELD_CODE).map(([k, v]) => [v, k]));

const PILLAR_EMOJI: Record<string, string> = {
  criacao: '🎬', negocio: '💼', admin: '🗂️',
  saude: '💪', clinica: '🏥', pessoal: '🏠',
};

// ============================
// HELPERS
// ============================

function isDone(value: string | null | undefined): boolean {
  if (!value || value === '❌') return false;
  return value.includes('✅');
}

function parseDateField(value: string | null | undefined): { emoji: string | null; date: Date | null } {
  if (!value || value === '❌') return { emoji: null, date: null };
  for (const emoji of ['📅', '✅', '⚠️']) {
    if (value.includes(emoji)) {
      const match = value.match(/(\d{4}-\d{2}-\d{2})/);
      if (match) {
        return { emoji, date: new Date(match[1] + 'T12:00:00') };
      }
      return { emoji, date: null };
    }
  }
  return { emoji: null, date: null };
}

function todayBRT(): Date {
  const now = new Date();
  // Convert to BRT (UTC-3)
  const brt = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) - 3 * 3600000);
  return brt;
}

function todayStr(): string {
  return todayBRT().toISOString().slice(0, 10);
}

function daysBetween(d1: Date, d2: Date): number {
  return Math.floor((d1.getTime() - d2.getTime()) / 86400000);
}

function formatDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ============================
// SCANNERS
// ============================

interface VideoTask {
  title: string;
  slug: string;
  field: string;
  date?: Date;
  days_late?: number;
  acao_emoji: string;
  acao_verb: string;
}

function scanVideos(productions: Production[]): Record<string, VideoTask[]> {
  const today = new Date(todayStr() + 'T12:00:00');
  const tasks: Record<string, VideoTask[]> = {
    overdue: [], today: [], upcoming: [], no_schedule: [], done_recent: [],
  };

  for (const prod of productions) {
    if ((prod.status || '').includes('publicado')) continue;
    if (!prod.slug) continue;

    // Compute proxima_acao
    let acao = '✅ completo';
    for (const [field, emoji, verb] of PIPELINE) {
      if (!isDone((prod as any)[field])) {
        acao = `${emoji} ${verb.toLowerCase()}`;
        break;
      }
    }
    const acao_emoji = acao.split(' ')[0];
    const acao_verb = acao.split(' ').slice(1).join(' ');

    let hasSchedule = false;

    for (const field of ['gravacao', 'edicao', 'publicacao']) {
      const val = (prod as any)[field] as string | null;
      if (!val || val === '❌') continue;
      hasSchedule = true;

      const { emoji, date: taskDate } = parseDateField(val);
      if (!taskDate) continue;

      if (emoji === '✅') {
        if (daysBetween(today, taskDate) <= 2) {
          tasks.done_recent.push({ title: prod.title, slug: prod.slug, field, date: taskDate, acao_emoji, acao_verb });
        }
        continue;
      }

      const info: VideoTask = {
        title: prod.title, slug: prod.slug, field, date: taskDate, acao_emoji, acao_verb,
      };

      if (taskDate < today) {
        info.days_late = daysBetween(today, taskDate);
        tasks.overdue.push(info);
      } else if (taskDate.toISOString().slice(0, 10) === todayStr()) {
        tasks.today.push(info);
      } else if (daysBetween(taskDate, today) <= 3) {
        tasks.upcoming.push(info);
      }
    }

    if (!hasSchedule && !(prod.status || '').includes('publicado') && !(prod.status || '').includes('ideia')) {
      tasks.no_schedule.push({ title: prod.title, slug: prod.slug, field: '', acao_emoji, acao_verb });
    }
  }

  return tasks;
}

interface TarefaTask {
  title: string;
  slug: string;
  due: Date;
  pillar: string;
  pillar_emoji: string;
  days_late?: number;
}

function scanTarefas(tarefas: Tarefa[]): Record<string, TarefaTask[]> {
  const today = new Date(todayStr() + 'T12:00:00');
  const result: Record<string, TarefaTask[]> = { overdue: [], today: [], upcoming: [] };

  for (const t of tarefas) {
    if (!t.due) continue;
    const due = new Date(t.due + 'T12:00:00');
    const info: TarefaTask = {
      title: t.title, slug: t.slug, due, pillar: t.pillar,
      pillar_emoji: PILLAR_EMOJI[t.pillar] || '📌',
    };

    if (due < today) {
      info.days_late = daysBetween(today, due);
      result.overdue.push(info);
    } else if (due.toISOString().slice(0, 10) === todayStr()) {
      result.today.push(info);
    } else if (daysBetween(due, today) <= 3) {
      result.upcoming.push(info);
    }
  }

  result.overdue.sort((a, b) => (b.days_late || 0) - (a.days_late || 0));
  return result;
}

interface TreinoInfo {
  meta: number;
  feitos: number;
  proxima: number | null;
  treino_titulo: string;
  exercicios: Array<{ nome: string; musculo: string; series: string; reps: string; carga: string }>;
}

function scanTreino(treino: TreinoSemana | null): TreinoInfo | null {
  if (!treino) return null;

  const meta = treino.meta_sessoes;
  const feitos = treino.concluidos;
  let proxima: number | null = null;
  for (let i = 1; i <= meta; i++) {
    if (!(treino as any)[`treino_${i}`]) {
      proxima = i;
      break;
    }
  }

  // Get today's exercises from JSONB
  const weekday = todayBRT().getDay(); // 0=Sunday
  const dayIndex = weekday === 0 ? 6 : weekday - 1; // Convert to 0=Monday
  const dayName = DAY_NAMES[dayIndex];

  let treino_titulo = '';
  let exercicios: TreinoInfo['exercicios'] = [];

  if (treino.exercicios && dayName !== 'Domingo') {
    const dayData = treino.exercicios[dayName];
    if (dayData) {
      treino_titulo = `${dayName} — ${dayData.label}`;
      exercicios = (dayData.exercises || []).map((ex: any) => ({
        nome: ex.nome,
        musculo: ex.musculo,
        series: ex.series,
        reps: ex.reps,
        carga: ex.carga,
        gif: ex.gif || null,
      }));
    }
  }

  return { meta, feitos, proxima, treino_titulo, exercicios };
}

// ============================
// COMPOSE
// ============================

function formatGcal(events: CalendarEvent[]): string | null {
  if (!events.length) return null;
  const lines = ['🏥 <b>CONSULTAS:</b>'];
  for (const e of events) {
    const time = e.start.includes('T')
      ? e.start.split('T')[1].slice(0, 5)
      : 'dia todo';
    lines.push(`  ${time} — ${e.summary}`);
  }
  return lines.join('\n');
}

function compose(
  videoTasks: Record<string, VideoTask[]>,
  tarefaTasks: Record<string, TarefaTask[]>,
  treinoInfo: TreinoInfo | null,
  metricas: MetricaDiaria | null,
  gcalEvents: CalendarEvent[],
): string[] {
  const today = todayBRT();
  const dia = DIAS_SEMANA[today.getDay() === 0 ? 6 : today.getDay() - 1];
  const dateStr = formatDate(today);
  const sections: string[] = [];
  let hasWork = false;

  // Greeting
  const greetings = [
    `🔔 Bom dia, Bruno!\nHoje é ${dia}, ${dateStr}.`,
    `☀️ Levanta, Bruno!\n${dia.charAt(0).toUpperCase() + dia.slice(1)}, ${dateStr}. Hora de trabalhar.`,
    `⏰ ${dia.charAt(0).toUpperCase() + dia.slice(1)}, ${dateStr}.\nTeu chefe já tá acordado. E você?`,
    `📋 Dia ${dateStr}, ${dia}.\nBora ver o que tá pegando.`,
  ];
  sections.push(greetings[Math.floor(Math.random() * greetings.length)]);

  // Health
  if (metricas) {
    const parts: string[] = [];
    if (metricas.sono != null) {
      const emoji = metricas.sono >= 7 ? '😴' : '⚠️';
      parts.push(`${emoji} Sono: ${metricas.sono}h`);
    }
    if (metricas.peso != null) parts.push(`⚖️ ${metricas.peso}kg`);
    if (metricas.hr_repouso != null) parts.push(`❤️ FC rep: ${metricas.hr_repouso}bpm`);
    if (metricas.passos != null) parts.push(`👟 ${metricas.passos} passos`);
    if (parts.length) sections.push(`📊 <b>SAÚDE:</b> ${parts.join(' | ')}`);
  }

  // Calendar
  const gcalMsg = formatGcal(gcalEvents);
  if (gcalMsg) sections.push(gcalMsg);

  // Overdue videos
  if (videoTasks.overdue.length) {
    hasWork = true;
    const lines = ['🚨 <b>VÍDEOS ATRASADOS:</b>'];
    for (const t of videoTasks.overdue) {
      const fi = FIELD_INFO[t.field] || { emoji: '❓', verb: t.field };
      lines.push(`  ${fi.emoji} ${fi.verb} → ${t.title.slice(0, 38)} (${t.days_late}d)`);
    }
    sections.push(lines.join('\n'));
  }

  // Overdue tarefas
  if (tarefaTasks.overdue.length) {
    hasWork = true;
    const lines = ['🚨 <b>TAREFAS ATRASADAS:</b>'];
    for (const t of tarefaTasks.overdue) {
      const days = t.days_late || 0;
      const suffix = days >= 6 ? ' ← DECIDE: faz ou descarta?' : days >= 3 ? ' ← tá acumulando' : '';
      lines.push(`  ${t.pillar_emoji} ${t.title.slice(0, 35)} (${days}d)${suffix}`);
    }
    sections.push(lines.join('\n'));
  }

  // Today videos
  if (videoTasks.today.length) {
    hasWork = true;
    const lines = ['📋 <b>VÍDEOS HOJE:</b>'];
    for (const t of videoTasks.today) {
      const fi = FIELD_INFO[t.field] || { emoji: '❓', verb: t.field };
      lines.push(`  ${fi.emoji} ${fi.verb} → ${t.title.slice(0, 38)}`);
    }
    sections.push(lines.join('\n'));
  }

  // Today tarefas
  if (tarefaTasks.today.length) {
    hasWork = true;
    const lines = ['📋 <b>TAREFAS HOJE:</b>'];
    for (const t of tarefaTasks.today) {
      lines.push(`  ${t.pillar_emoji} ${t.title.slice(0, 38)}`);
    }
    sections.push(lines.join('\n'));
  }

  // Upcoming
  if (videoTasks.upcoming.length || tarefaTasks.upcoming.length) {
    hasWork = true;
    const lines = ['📅 <b>PRÓXIMOS DIAS:</b>'];
    for (const t of videoTasks.upcoming) {
      const fi = FIELD_INFO[t.field] || { emoji: '❓', verb: t.field };
      lines.push(`  ${fi.emoji} ${fi.verb} → ${t.title.slice(0, 38)} (${formatDate(t.date!)})`);
    }
    for (const t of tarefaTasks.upcoming) {
      lines.push(`  ${t.pillar_emoji} ${t.title.slice(0, 38)} (${formatDate(t.due)})`);
    }
    sections.push(lines.join('\n'));
  }

  // No schedule
  if (videoTasks.no_schedule.length) {
    hasWork = true;
    const lines = ['⚠️ <b>SEM DATA:</b>'];
    for (const t of videoTasks.no_schedule) {
      lines.push(`  ${t.acao_emoji} ${t.acao_verb.charAt(0).toUpperCase() + t.acao_verb.slice(1)} → ${t.title.slice(0, 38)}`);
    }
    sections.push(lines.join('\n'));
  }

  // Done recent
  if (videoTasks.done_recent.length) {
    const lines = ['✅ <b>CONCLUÍDO:</b>'];
    for (const t of videoTasks.done_recent) {
      const fi = FIELD_INFO[t.field] || { emoji: '❓', verb: t.field };
      lines.push(`  ${fi.emoji} ${fi.verb} → ${t.title.slice(0, 38)}`);
    }
    sections.push(lines.join('\n'));
  }

  // Closing
  const allOverdue = [...videoTasks.overdue, ...tarefaTasks.overdue.map((t) => ({ ...t, days_late: t.days_late || 0 }))];
  const maxDays = Math.max(...allOverdue.map((t) => t.days_late || 0), 0);

  let closers: string[];
  if (maxDays >= 6) {
    closers = [
      `Tem coisa com ${maxDays} dias de atraso. Isso é autoboicote. Resolve ou descarta.`,
      `${maxDays} dias. Sério. Ou faz ou tira da lista. Carregar pendência é pior que falhar.`,
    ];
  } else if (allOverdue.length) {
    closers = [
      'TDAH não é desculpa pra deixar acumular. Resolve hoje.',
      'Tá esperando motivação? Ela vem DEPOIS de começar.',
    ];
  } else if (videoTasks.today.length || tarefaTasks.today.length) {
    closers = [
      'Dia cheio. Foco total, sem desvio.',
      'Já sabe o que fazer. Vai lá e faz.',
    ];
  } else if (hasWork) {
    closers = ['Tudo encaminhado. Mantém o ritmo.'];
  } else {
    closers = ['Nada pendente. Bom momento pra adiantar algo.'];
  }
  sections.push(closers[Math.floor(Math.random() * closers.length)]);

  // Main message
  const mainMsg = sections.join('\n\n');

  // Treino as separate message
  const msgs = [mainMsg];

  if (treinoInfo?.proxima) {
    const titulo = treinoInfo.treino_titulo;
    let header = `💪 <b>TREINO HOJE:</b> Sessão ${treinoInfo.proxima}/${treinoInfo.meta}`;
    if (titulo) {
      const label = titulo.includes('—') ? titulo.split('—')[1].trim() : titulo;
      header += `\n<b>${label}</b>`;
    }
    if (treinoInfo.exercicios.length) {
      const lines = [header, ''];
      treinoInfo.exercicios.forEach((ex, i) => {
        const carga = ex.carga;
        if (carga && carga !== '—') {
          lines.push(`  ${i + 1}. ${ex.nome}\n      ${ex.series}x${ex.reps}  <b>${carga}</b>  •  <i>${ex.musculo}</i>`);
        } else {
          lines.push(`  ${i + 1}. ${ex.nome}\n      ${ex.series}x${ex.reps}  •  <i>${ex.musculo}</i>`);
        }
      });
      msgs.push(lines.join('\n'));
    } else {
      msgs.push(header);
    }
  } else if (treinoInfo && !treinoInfo.proxima) {
    msgs.push('💪 <b>TREINO:</b> ✅ Todas as sessões feitas esta semana!');
  }

  return msgs;
}

// ============================
// AI COMPOSE (Fase 4)
// ============================

async function composeWithAI(
  videoTasks: Record<string, VideoTask[]>,
  tarefaTasks: Record<string, TarefaTask[]>,
  treinoInfo: TreinoInfo | null,
  metricas: MetricaDiaria | null,
  gcalEvents: CalendarEvent[],
): Promise<string[]> {
  const today = todayBRT();
  const dia = DIAS_SEMANA[today.getDay() === 0 ? 6 : today.getDay() - 1];
  const dateStr = formatDate(today);

  // Get yesterday's metrics for comparison
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  let metricasOntem: MetricaDiaria | null = null;
  try { metricasOntem = await getMetricasDia(yesterdayStr); } catch { /* ok */ }

  // Build structured data for Haiku
  const data: Record<string, any> = {
    dia: `${dia}, ${dateStr}`,
  };

  if (metricas) {
    data.saude_hoje = {
      sono: metricas.sono,
      peso: metricas.peso,
      hr_repouso: metricas.hr_repouso,
      passos: metricas.passos,
      humor: (metricas as any).humor,
    };
  }
  if (metricasOntem) {
    data.saude_ontem = {
      sono: metricasOntem.sono,
      peso: metricasOntem.peso,
      hr_repouso: metricasOntem.hr_repouso,
      humor: (metricasOntem as any).humor,
    };
  }

  if (gcalEvents.length) {
    data.consultas = gcalEvents.map(e => ({
      horario: e.start.includes('T') ? e.start.split('T')[1].slice(0, 5) : 'dia todo',
      titulo: e.summary,
    }));
  }

  const mapVideo = (t: VideoTask) => ({
    titulo: t.title.slice(0, 40),
    etapa: FIELD_INFO[t.field]?.verb || t.field,
    dias_atraso: t.days_late,
  });
  const mapTarefa = (t: TarefaTask) => ({
    titulo: t.title.slice(0, 40),
    pillar: t.pillar_emoji,
    dias_atraso: t.days_late,
  });

  if (videoTasks.overdue.length) data.videos_atrasados = videoTasks.overdue.map(mapVideo);
  if (tarefaTasks.overdue.length) data.tarefas_atrasadas = tarefaTasks.overdue.map(mapTarefa);
  if (videoTasks.today.length) data.videos_hoje = videoTasks.today.map(mapVideo);
  if (tarefaTasks.today.length) data.tarefas_hoje = tarefaTasks.today.map(mapTarefa);
  if (videoTasks.upcoming.length) data.videos_proximos = videoTasks.upcoming.map(mapVideo);
  if (tarefaTasks.upcoming.length) data.tarefas_proximas = tarefaTasks.upcoming.map(mapTarefa);
  if (videoTasks.no_schedule.length) data.videos_sem_data = videoTasks.no_schedule.map(t => t.title.slice(0, 40));
  if (videoTasks.done_recent.length) data.concluidos = videoTasks.done_recent.map(t => `${FIELD_INFO[t.field]?.verb || t.field}: ${t.title.slice(0, 30)}`);

  if (treinoInfo?.proxima) {
    data.treino = {
      sessao: `${treinoInfo.proxima}/${treinoInfo.meta}`,
      titulo: treinoInfo.treino_titulo,
      exercicios: treinoInfo.exercicios.map(ex => ({
        nome: ex.nome,
        series_reps: `${ex.series}x${ex.reps}`,
        carga: ex.carga,
        musculo: ex.musculo,
        gif: (ex as any).gif || null,
      })),
    };
  } else if (treinoInfo && !treinoInfo.proxima) {
    data.treino = { completo: true };
  }

  const systemPrompt = `Voce e o Chefe Bruno, assistente do Dr. Bruno Salles. Sua tarefa: compor a MENSAGEM MATINAL diaria pro Telegram.

REGRAS:
- Portugues BR, tom provocativo e direto (voce e o "chefe" do Bruno)
- HTML pra Telegram: <b>, <i>, emojis
- NUNCA invente dados. Só use o que esta no JSON abaixo
- Maximo ~600 caracteres na mensagem principal
- Se tem algo atrasado, COBRE. Se ta tudo em dia, ELOGIE com parcimonia
- Compare metricas de hoje com ontem quando houver diferença relevante
- Mencione consultas/agenda se houver
- Nao liste TODOS os itens — destaque os mais urgentes (max 3-4 linhas de itens)

FORMATO:
Retorne APENAS um JSON array de strings. Cada string e uma mensagem separada pro Telegram.
Primeira mensagem: briefing matinal (saude + tarefas/videos + fechamento)
Segunda mensagem (se houver treino): detalhes do treino com exercicios formatados. IMPORTANTE: se o exercicio tem campo "gif", inclua o link como hyperlink no nome: <a href="URL">Nome do exercicio</a>

Exemplo de retorno:
["<b>mensagem principal aqui</b>\\ncom quebras de linha","<b>treino aqui</b>"]

IMPORTANTE: retorne SOMENTE o JSON array, sem markdown, sem texto antes ou depois.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: HAIKU_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: JSON.stringify(data) }],
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Haiku API error ${res.status}: ${err.slice(0, 200)}`);
  }

  const result = await res.json() as any;
  const raw = result.content?.[0]?.text || '';
  console.log(`[ChefeBruno] AI compose raw: ${raw.slice(0, 150)}...`);

  // Parse JSON array
  try {
    const msgs = JSON.parse(raw);
    if (Array.isArray(msgs) && msgs.length > 0 && typeof msgs[0] === 'string') {
      return msgs;
    }
  } catch { /* try extraction */ }

  // Try to extract array from markdown
  const match = raw.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const msgs = JSON.parse(match[0]);
      if (Array.isArray(msgs)) return msgs;
    } catch { /* fallback */ }
  }

  throw new Error('AI compose returned invalid format');
}

// ============================
// KEYBOARD
// ============================

function buildKeyboard(
  videoTasks: Record<string, VideoTask[]>,
  tarefaTasks: Record<string, TarefaTask[]>,
): { inline_keyboard: any[][] } | null {
  const rows: any[][] = [];

  // Video buttons
  const vidActionable = [...videoTasks.overdue, ...videoTasks.today];
  for (const t of vidActionable.slice(0, 3)) {
    const fi = FIELD_INFO[t.field] || { emoji: '❓', verb: t.field };
    const short = t.title.slice(0, 16);
    const slug = t.slug.slice(0, 38);
    const fc = CODE_FIELD[t.field] || t.field[0];

    const doneCb = `d:${slug}:${fc}`;
    const reagCb = `r:${slug}:${fc}`;

    if (Buffer.byteLength(doneCb) <= 64 && Buffer.byteLength(reagCb) <= 64) {
      rows.push([
        { text: `✅ ${fi.emoji} ${short}`, callback_data: doneCb },
        { text: '📅 Reagendar', callback_data: reagCb },
      ]);
    }
  }

  // Task buttons
  const tarActionable = [...tarefaTasks.overdue, ...tarefaTasks.today];
  for (const t of tarActionable.slice(0, 3)) {
    const short = t.title.slice(0, 14);
    const slug = t.slug.slice(0, 34);

    const doneCb = `T:d:${slug}`;
    const reagCb = `T:r:${slug}`;
    const descCb = `T:x:${slug}`;

    if ([doneCb, reagCb, descCb].every((cb) => Buffer.byteLength(cb) <= 64)) {
      rows.push([
        { text: `✅ ${t.pillar_emoji} ${short}`, callback_data: doneCb },
        { text: '📅 +2d', callback_data: reagCb },
        { text: '🗑️', callback_data: descCb },
      ]);
    }
  }

  // Fallback: no-schedule videos
  if (!rows.length) {
    for (const t of videoTasks.no_schedule.slice(0, 3)) {
      const slug = t.slug.slice(0, 38);
      const short = t.title.slice(0, 16);
      rows.push([
        { text: `📅 Agendar: ${t.acao_emoji} ${short}`, callback_data: `a:${slug}:g` },
      ]);
    }
  }

  return rows.length ? { inline_keyboard: rows } : null;
}

// ============================
// MAIN ENTRY POINTS
// ============================

export async function sendDaily(): Promise<{ ok: boolean; messageCount: number; error?: string }> {
  try {
    // 1. Sync Google Fit
    let metricas: MetricaDiaria | null = null;
    try {
      await syncToday();
      metricas = await getMetricasDia(todayStr());
    } catch (err: any) {
      console.error('[ChefeBruno] Google Fit sync error:', err.message);
      metricas = await getMetricasDia(todayStr());
    }

    // 2. Fetch all data in parallel
    const [productions, tarefas, treino, gcalEvents] = await Promise.all([
      getActiveProductions(),
      getActiveTarefas(),
      getCurrentTreino(),
      getTodayEvents().catch(() => [] as CalendarEvent[]),
    ]);

    // 3. Scan & compose
    const videoTasks = scanVideos(productions);
    const tarefaTasks = scanTarefas(tarefas);
    const treinoInfo = scanTreino(treino);

    // Try AI compose first, fall back to static template
    let messages: string[];
    if (ANTHROPIC_API_KEY) {
      try {
        messages = await composeWithAI(videoTasks, tarefaTasks, treinoInfo, metricas, gcalEvents);
        console.log('[ChefeBruno] Using AI-composed message');
      } catch (err: any) {
        console.error('[ChefeBruno] AI compose failed, using template:', err.message);
        messages = compose(videoTasks, tarefaTasks, treinoInfo, metricas, gcalEvents);
      }
    } else {
      messages = compose(videoTasks, tarefaTasks, treinoInfo, metricas, gcalEvents);
    }
    const keyboard = buildKeyboard(videoTasks, tarefaTasks);

    // 4. Send
    for (let i = 0; i < messages.length; i++) {
      const kb = i === messages.length - 1 ? keyboard : null;
      await sendMessage(messages[i], kb);
    }

    // 5. Save to history
    const { saveTelegramHistory } = await import('../db/bot.js');
    saveTelegramHistory({
      source: 'daily',
      assistant_response: messages.join('\n\n---\n\n'),
    }).catch(() => {});

    console.log(`[ChefeBruno] Sent ${messages.length} messages`);
    return { ok: true, messageCount: messages.length };
  } catch (err: any) {
    console.error('[ChefeBruno] sendDaily error:', err.message);
    return { ok: false, messageCount: 0, error: err.message };
  }
}

// ============================
// CALLBACK PROCESSING
// ============================

let lastUpdateId = 0;

export async function processCallbacks(): Promise<number> {
  const result = await getUpdates(lastUpdateId + 1);
  if (!result.ok || !result.result?.length) return 0;

  let processed = 0;

  for (const update of result.result) {
    lastUpdateId = update.update_id;
    const cb = update.callback_query;
    if (!cb) continue;

    const data = cb.data || '';

    // === TAREFAS (prefix T:) ===
    if (data.startsWith('T:')) {
      const [, action, slug] = data.split(':', 3);
      if (!slug) continue;

      // Check tarefa exists
      const { data: tarefaData } = await supabase.from('tarefas').select('title').eq('slug', slug).limit(1);
      if (!tarefaData?.length) {
        await answerCallbackQuery(cb.id, '❌ Tarefa não encontrada');
        continue;
      }
      const title = tarefaData[0].title;

      if (action === 'd') {
        await updateTarefaStatus(slug, 'concluido');
        await answerCallbackQuery(cb.id, '✅ Tarefa concluída!');
        await sendMessage(`✅ <b>${title.slice(0, 40)}</b> concluída!`);
        processed++;
      } else if (action === 'r') {
        const newDate = new Date(todayBRT().getTime() + 2 * 86400000);
        const newDateStr = newDate.toISOString().slice(0, 10);
        await updateTarefaDue(slug, newDateStr);
        await answerCallbackQuery(cb.id, `📅 Reagendada pra ${formatDate(newDate)}`);
        await sendMessage(`📅 <b>${title.slice(0, 35)}</b> → ${formatDate(newDate)}.\nMas não vira hábito.`);
        processed++;
      } else if (action === 'x') {
        await updateTarefaStatus(slug, 'arquivado');
        await answerCallbackQuery(cb.id, '🗑️ Tarefa descartada');
        await sendMessage(`🗑️ <b>${title.slice(0, 40)}</b> descartada. Menos peso.`);
        processed++;
      }
      continue;
    }

    // === VIDEOS (format d:slug:fc) ===
    const parts = data.split(':');
    if (parts.length !== 3) continue;
    const [action, slug, fc] = parts;
    const field = FIELD_CODE[fc];
    if (!field) continue;

    const { data: prodData } = await supabase.from('productions').select('title').eq('slug', slug).limit(1);
    if (!prodData?.length) {
      await answerCallbackQuery(cb.id, '❌ Arquivo não encontrado');
      continue;
    }
    const fi = FIELD_INFO[field] || { emoji: '❓', verb: field };

    if (action === 'd') {
      await updateProductionField(slug, field, `✅ ${todayStr()}`);
      await answerCallbackQuery(cb.id, `✅ ${fi.verb} concluído!`);
      await sendMessage(`✅ <b>${fi.verb}</b> de <b>${prodData[0].title.slice(0, 35)}</b> concluído!`);
      processed++;
    } else if (action === 'r') {
      const newDate = new Date(todayBRT().getTime() + 2 * 86400000);
      const newDateStr = newDate.toISOString().slice(0, 10);
      await updateProductionField(slug, field, `📅 ${newDateStr}`);
      await answerCallbackQuery(cb.id, `📅 Reagendado pra ${formatDate(newDate)}`);
      await sendMessage(`📅 ${fi.emoji} ${fi.verb} de <b>${prodData[0].title.slice(0, 30)}</b> → ${formatDate(newDate)}`);
      processed++;
    }
  }

  return processed;
}
