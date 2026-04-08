/**
 * Haiku Conversation — fallback when PC is offline.
 *
 * Architecture: Hybrid (pre-process → Haiku → post-process)
 *
 * 1. Pre-process: findByAliasMulti() resolves catalog matches
 * 2. Haiku receives ONLY matched entries + training plan (not full catalog)
 * 3. Post-process: validates frontmatter against catalog, handles unknowns
 *
 * Catalog is the source of truth for field names. Haiku never invents fields.
 */

import { getAgents, getAgentsCompact } from './agentLoader.js';
import {
  getCatalog,
  findByAliasMulti,
  getFieldMap,
  getCatalogForPrompt,
  createCatalogEntry,
  type CatalogEntry,
  type FieldMapEntry,
} from './catalogo.js';
import { writeMetrics, todayBRT } from './vaultWriter.js';
import { readFile } from './onedrive.js';
import { readTreinoFromVault } from './vaultReader.js';
import { sendMessage } from './telegram.js';
import type { BufferedMessage } from './messageBuffer.js';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1024;

// --- History + pending state ---

interface HistoryEntry {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

let recentHistory: HistoryEntry[] = [];
const MAX_HISTORY = 15;

interface PendingConfirmation {
  type: 'unknown_metric' | 'desvio_permanente';
  term?: string;
  originalMessage?: string;
  exercicio?: string;
  suggestion?: {
    categoria: string;
    grupo: string;
    unidade: string;
  };
}
let pendingConfirmation: PendingConfirmation | null = null;

function addToHistory(role: 'user' | 'assistant', content: string): void {
  recentHistory.push({ role, content, timestamp: new Date().toISOString() });
  if (recentHistory.length > MAX_HISTORY * 2) {
    recentHistory = recentHistory.slice(-MAX_HISTORY * 2);
  }
}

// --- Build prompt with catalog matches ---

async function buildSystemPrompt(
  catalogContext: string,
  fieldMap: FieldMapEntry[],
): Promise<string> {
  await getAgents();
  const agentsSummary = getAgentsCompact();

  let todayMetrics = '';
  try {
    todayMetrics = await readFile(`saude/metricas/metricas-${todayBRT()}.md`);
  } catch { /* no metrics yet */ }

  // Build field map instructions
  const fieldInstructions: string[] = [];
  for (const f of fieldMap) {
    if (f.campo_frontmatter && f.tipo_valor === 'calorias_macros') {
      // Meals → 4 sub-fields
      const base = f.campo_frontmatter;
      fieldInstructions.push(`${f.nome}: frontmatter ${base}_kcal, ${base}_prot, ${base}_carb, ${base}_gord`);
    } else if (f.campo_frontmatter) {
      fieldInstructions.push(`${f.nome}: frontmatter "${f.campo_frontmatter}" (${f.tipo_valor}, ${f.unidade})`);
    } else {
      fieldInstructions.push(`${f.nome}: body section com wikilink ${f.wikilink}`);
    }
  }

  return `Voce e o Chefe Bruno, hub do Diario Inteligente do Dr. Bruno Salles.
Bruno manda mensagens pelo Telegram. Voce extrai dados, registra e responde.

Data: ${todayBRT()}

## AGENTES
${agentsSummary}

## METRICAS RECONHECIDAS NA MENSAGEM
${catalogContext || '(nenhuma metrica reconhecida)'}

## MAPA DE CAMPOS (use SOMENTE estes)
${fieldInstructions.length > 0 ? fieldInstructions.join('\n') : '(nenhum campo mapeado)'}

${todayMetrics ? `## METRICAS JA REGISTRADAS HOJE\n${todayMetrics.slice(0, 400)}` : ''}

## REGRAS
1. Portugues BR, max 3 frases, tom provocativo
2. frontmatter: use SOMENTE os campos do MAPA acima. NUNCA invente campos
3. Exercicios no body: use wikilinks [[id-do-exercicio]]
4. Refeicoes: macros vao no frontmatter (ex: almoco_kcal, almoco_prot)
5. Refeicoes: descricao vai em sections.refeicoes com wikilink [[almoco]]
6. Se o treino difere do PLANO DO DIA, registre em desvios[]
7. Se NAO reconhece um termo, retorne em desconhecidos[] com sua SUGESTAO de classificacao (categoria, grupo, unidade, razao). Use seu conhecimento pra inferir do contexto.
8. Correcao: use "replace" em vez de "sections" (nao duplicar)
9. HTML: <b>, <i> pro Telegram

## FORMATO JSON (retorne SOMENTE isto)
{"resposta":"texto Telegram","dados":{"frontmatter":{},"sections":{},"replace":{},"desvios":[],"desconhecidos":[]},"agente":"nome"}

Exemplo treino:
{"resposta":"80kg limpo, boa.","dados":{"frontmatter":{"humor":7},"sections":{"treino":"### [[push-a]] (100%)\\n| Exercicio | Planejado | Executado | Desvio |\\n|---|---|---|---|\\n| [[supino-reto-barra]] | 4x6-8 80kg | 4x8 80kg | conforme |"},"desvios":[],"desconhecidos":[]},"agente":"rafa-coach"}

Exemplo refeicao:
{"resposta":"Costelao no almoco? Gordura alta.","dados":{"frontmatter":{"almoco_kcal":800,"almoco_prot":50},"sections":{"refeicoes":"- 12:00 [[almoco]]: Costelao (800kcal, 50g prot)"},"desconhecidos":[]},"agente":"chefe-bruno"}

Exemplo desconhecido (SUGIRA a classificacao baseado no contexto):
{"resposta":"Anotei o humor. Mas nao conheco 'prancha'.","dados":{"frontmatter":{"humor":6},"desconhecidos":[{"termo":"prancha","categoria":"exercicio","grupo":"core","unidade":"segundos","razao":"3x45s indica duracao, prancha e isometria de core"}]},"agente":"chefe-bruno"}

IMPORTANTE: retorne SOMENTE JSON.`;
}

// --- Haiku API call ---

async function callHaiku(systemPrompt: string, userMessage: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');

  const messages = [
    ...recentHistory.slice(-MAX_HISTORY).map(h => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    })),
    { role: 'user' as const, content: userMessage },
  ];

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: HAIKU_MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Haiku API ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json() as any;
  return data.content?.[0]?.text || '';
}

// --- Parse response ---

interface HaikuResponse {
  resposta: string;
  dados: {
    frontmatter: Record<string, any>;
    sections: Record<string, string>;
    replace: Record<string, string>;
    desvios: Array<{ exercicio: string; tipo: string; motivo?: string }>;
    desconhecidos: string[];
  };
  agente: string;
}

function parseResponse(raw: string): HaikuResponse {
  console.log(`[Haiku] Raw: ${raw.slice(0, 200)}`);

  const tryParse = (s: string): HaikuResponse | null => {
    try {
      const obj = JSON.parse(s);
      return {
        resposta: obj.resposta || obj.response || '',
        dados: {
          frontmatter: obj.dados?.frontmatter || obj.frontmatter || {},
          sections: obj.dados?.sections || obj.sections || {},
          replace: obj.dados?.replace || obj.replace || {},
          desvios: obj.dados?.desvios || obj.desvios || [],
          desconhecidos: obj.dados?.desconhecidos || obj.desconhecidos || [],
        },
        agente: obj.agente || 'chefe-bruno',
      };
    } catch { return null; }
  };

  // Try: code block → raw → brace extraction → fallback
  const codeMatch = raw.match(/```json?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeMatch) { const r = tryParse(codeMatch[1]); if (r) return r; }

  const direct = tryParse(raw);
  if (direct) return direct;

  const braceMatch = raw.match(/\{[\s\S]*"resposta"[\s\S]*\}/);
  if (braceMatch) { const r = tryParse(braceMatch[0]); if (r) return r; }

  return {
    resposta: raw.slice(0, 500),
    dados: { frontmatter: {}, sections: {}, replace: {}, desvios: [], desconhecidos: [] },
    agente: 'chefe-bruno',
  };
}

// --- Post-process: validate frontmatter against catalog ---

function validateFrontmatter(
  fm: Record<string, any>,
  fieldMap: FieldMapEntry[],
): Record<string, any> {
  // Build set of allowed field names
  const allowed = new Set<string>();
  for (const f of fieldMap) {
    if (!f.campo_frontmatter) continue;
    if (f.tipo_valor === 'calorias_macros') {
      const base = f.campo_frontmatter;
      allowed.add(`${base}_kcal`);
      allowed.add(`${base}_prot`);
      allowed.add(`${base}_carb`);
      allowed.add(`${base}_gord`);
    } else {
      allowed.add(f.campo_frontmatter);
    }
  }

  // Always allow these base fields
  const alwaysAllowed = ['humor', 'peso', 'sono', 'cigarros', 'passos', 'calorias',
    'hr_repouso', 'hr_media', 'treino_tipo', 'treino_duracao', 'treino_completude'];
  for (const f of alwaysAllowed) allowed.add(f);

  const validated: Record<string, any> = {};
  const rejected: string[] = [];

  for (const [key, value] of Object.entries(fm)) {
    if (allowed.has(key)) {
      validated[key] = value;
    } else {
      rejected.push(key);
    }
  }

  if (rejected.length > 0) {
    console.log(`[Haiku] Rejected invented fields: ${rejected.join(', ')}`);
  }

  return validated;
}

// --- Handle unknown metrics ---

interface UnknownMetric {
  termo: string;
  categoria?: string;
  grupo?: string;
  unidade?: string;
  razao?: string;
}

async function handleUnknowns(desconhecidos: any[], originalMessage: string): Promise<void> {
  if (desconhecidos.length === 0) return;

  const item = desconhecidos[0]; // One at a time
  const isStructured = typeof item === 'object' && item.termo;

  if (isStructured) {
    const u = item as UnknownMetric;
    pendingConfirmation = {
      type: 'unknown_metric',
      term: u.termo,
      originalMessage,
      suggestion: {
        categoria: u.categoria || 'habito',
        grupo: u.grupo || '',
        unidade: u.unidade || 'contagem',
      },
    };

    await sendMessage(
      `Nao conheco "<b>${u.termo}</b>".\n\n` +
      `Pelo contexto, parece ser:\n` +
      `• Tipo: <b>${u.categoria || '?'}</b>\n` +
      `• Grupo: <b>${u.grupo || '?'}</b>\n` +
      `• Mede em: <b>${u.unidade || '?'}</b>\n` +
      (u.razao ? `\n<i>${u.razao}</i>\n` : '') +
      `\nRegistro assim? Ou me corrige.`
    );
  } else {
    // Fallback: unstructured string
    const term = typeof item === 'string' ? item : String(item);
    pendingConfirmation = {
      type: 'unknown_metric',
      term,
      originalMessage,
    };
    await sendMessage(
      `Nao conheco "<b>${term}</b>". O que e?\n` +
      `<i>Ex: "exercicio, core, segundos"</i>`
    );
  }
}

// --- Handle pending confirmation responses ---

async function handlePendingConfirmation(userText: string): Promise<string | null> {
  if (!pendingConfirmation) return null;

  if (pendingConfirmation.type === 'unknown_metric' && pendingConfirmation.term) {
    const lower = userText.trim().toLowerCase();
    const tipoMap: Record<string, string> = {
      kg: 'carga_kg', reps: 'contagem', segundos: 'duracao_s',
      minutos: 'duracao_min', kcal: 'calorias', litros: 'volume',
      '1-10': 'escala', contagem: 'contagem',
    };

    let categoria: string;
    let subcategoria: string;
    let unidade: string;

    // "sim", "ok", "isso", "pode ser", "registra" → use suggestion (or defaults)
    const isAffirmative = /^(sim|ok|isso|pode|registra|bora|confirma|s|yes|claro|pode ser)$/i.test(lower.split(/\s/)[0]);
    if (isAffirmative) {
      const s = pendingConfirmation.suggestion || { categoria: 'habito', grupo: '', unidade: 'contagem' };
      categoria = s.categoria;
      subcategoria = s.grupo;
      unidade = s.unidade;
    } else {
      // Manual: "exercicio, core, segundos"
      const parts = userText.split(/[,;]\s*/).map(s => s.trim().toLowerCase());
      if (parts.length >= 2) {
        categoria = parts[0];
        subcategoria = parts.length >= 3 ? parts[1] : '';
        unidade = parts.length >= 3 ? parts[2] : parts[1];
      } else {
        return `Diz "sim" pra aceitar a sugestao, ou me diz no formato: "<i>tipo, grupo, unidade</i>"`;
      }
    }

    const tipo_valor = tipoMap[unidade] || 'contagem';

    const slug = await createCatalogEntry(
      pendingConfirmation.term,
      categoria,
      subcategoria,
      tipo_valor,
      unidade,
      [pendingConfirmation.term.toLowerCase()],
    );

    pendingConfirmation = null;
    return `Catalogado! "<b>${slug}</b>" (${categoria}, ${subcategoria || 'geral'}, ${unidade}). Proxima vez que falar, ja reconheco.`;
  }

  pendingConfirmation = null;
  return null;
}

// --- Main entry point ---

export async function processWithHaiku(messages: BufferedMessage[]): Promise<string> {
  const userText = messages.filter(m => m.text).map(m => m.text).join('\n');
  if (!userText.trim()) return '(mensagem vazia)';

  console.log(`[Haiku] Processing: "${userText.slice(0, 80)}..."`);

  // Check if this is a response to a pending confirmation
  const confirmResponse = await handlePendingConfirmation(userText);
  if (confirmResponse) {
    addToHistory('user', userText);
    addToHistory('assistant', confirmResponse);
    return confirmResponse;
  }

  try {
    // 1. PRE-PROCESS: find catalog matches in the message
    await getCatalog();
    const matches = findByAliasMulti(userText);
    const fieldMap = getFieldMap(matches);
    console.log(`[Haiku] Catalog matches: ${matches.map(m => `${m.entry.nome}(${m.score})`).join(', ') || 'none'}`);

    // 2. Get today's training plan for comparison
    let treinoDia = null;
    try {
      const treino = await readTreinoFromVault();
      if (treino) {
        const weekday = new Date(Date.now() - 3 * 3600000).getDay();
        const dayIndex = weekday === 0 ? 6 : weekday - 1;
        const dayNames = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'];
        treinoDia = treino.dias[dayNames[dayIndex]] || null;
      }
    } catch { /* no treino */ }

    // 3. Build prompt with ONLY matched entries
    const catalogContext = getCatalogForPrompt(fieldMap, treinoDia);
    const systemPrompt = await buildSystemPrompt(catalogContext, fieldMap);

    // 4. Call Haiku
    const raw = await callHaiku(systemPrompt, userText);
    const parsed = parseResponse(raw);

    console.log(`[Haiku] Agent: ${parsed.agente}, Response: "${parsed.resposta.slice(0, 60)}..."`);

    // 5. POST-PROCESS: validate frontmatter
    const validatedFm = validateFrontmatter(parsed.dados.frontmatter, fieldMap);

    // 6. Write to vault
    const hasDados = Object.keys(validatedFm).length > 0 ||
                     Object.keys(parsed.dados.sections || {}).length > 0 ||
                     Object.keys(parsed.dados.replace || {}).length > 0;
    if (hasDados) {
      try {
        await writeMetrics({
          date: todayBRT(),
          frontmatter: validatedFm,
          sections: parsed.dados.sections,
          replace: parsed.dados.replace,
        });
        console.log('[Haiku] Vault updated');
      } catch (e: any) {
        console.error('[Haiku] Vault write error:', e.message);
      }
    }

    // 7. Handle unknowns (ask Bruno)
    if (parsed.dados.desconhecidos?.length > 0) {
      handleUnknowns(parsed.dados.desconhecidos, userText).catch(() => {});
    }

    // 8. Handle desvios
    if (parsed.dados.desvios?.length > 0) {
      const subs = parsed.dados.desvios.filter(d => d.tipo === 'substituicao');
      if (subs.length > 0) {
        const desvioMsg = subs.map(d =>
          `Trocou <b>${d.exercicio}</b>${d.motivo ? ` (${d.motivo})` : ''}. So hoje ou muda no plano?`
        ).join('\n');
        // Send after the main response
        setTimeout(() => sendMessage(desvioMsg).catch(() => {}), 2000);
      }
    }

    addToHistory('user', userText);
    addToHistory('assistant', parsed.resposta);

    return parsed.resposta;
  } catch (err: any) {
    console.error('[Haiku] Error:', err.message);
    if (err.message.includes('ANTHROPIC_API_KEY')) {
      return '⚠️ Haiku nao configurado (falta API key).';
    }
    return `⚠️ Erro: ${err.message.slice(0, 80)}`;
  }
}
