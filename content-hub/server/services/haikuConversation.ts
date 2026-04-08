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
import type { BufferedMessage } from './messageBuffer.js';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1024;

// --- History ---

interface HistoryEntry {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

let recentHistory: HistoryEntry[] = [];
const MAX_HISTORY = 15;

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
7. Se NAO reconhece um termo: na PRIMEIRA vez, pergunte na resposta sugerindo classificacao ("Parece exercicio de core, medido em segundos. Confirma?"). Na SEGUNDA vez (usuario confirma com "sim"/"ok"), retorne criar_catalogo com os dados.
8. Correcao: use "replace" em vez de "sections" (nao duplicar)
9. HTML: <b>, <i> pro Telegram

## FORMATO JSON (retorne SOMENTE isto)
{"resposta":"texto Telegram","dados":{"frontmatter":{},"sections":{},"replace":{},"desvios":[],"desconhecidos":[],"criar_catalogo":null},"agente":"nome"}

criar_catalogo: use SOMENTE quando o usuario CONFIRMAR ("sim","ok") uma sugestao anterior de metrica nova.
Formato: {"nome":"prancha","categoria":"exercicio","grupo":"core","unidade":"segundos","aliases":["prancha"]}

Exemplo treino:
{"resposta":"80kg limpo, boa.","dados":{"frontmatter":{"humor":7},"sections":{"treino":"### [[push-a]] (100%)\\n| Exercicio | Planejado | Executado | Desvio |\\n|---|---|---|---|\\n| [[supino-reto-barra]] | 4x6-8 80kg | 4x8 80kg | conforme |"},"desvios":[],"desconhecidos":[]},"agente":"rafa-coach"}

Exemplo refeicao:
{"resposta":"Costelao no almoco? Gordura alta.","dados":{"frontmatter":{"almoco_kcal":800,"almoco_prot":50},"sections":{"refeicoes":"- 12:00 [[almoco]]: Costelao (800kcal, 50g prot)"},"desconhecidos":[]},"agente":"chefe-bruno"}

Exemplo desconhecido (1a vez — SUGERE e pergunta):
{"resposta":"Nao conheco 'prancha'. Parece exercicio de core, medido em segundos. Confirma?","dados":{"desconhecidos":["prancha"]},"agente":"chefe-bruno"}

Exemplo confirmacao (usuario disse "sim" — CRIA a entrada):
{"resposta":"Catalogado! Prancha agora e exercicio de core.","dados":{"criar_catalogo":{"nome":"prancha","categoria":"exercicio","grupo":"core","unidade":"segundos","aliases":["prancha"]}},"agente":"chefe-bruno"}

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
    criar_catalogo: { nome: string; categoria: string; grupo: string; unidade: string; aliases: string[] } | null;
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
          criar_catalogo: obj.dados?.criar_catalogo || obj.criar_catalogo || null,
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
    dados: { frontmatter: {}, sections: {}, replace: {}, desvios: [], desconhecidos: [], criar_catalogo: null },
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

// --- Handle catalog creation from Haiku response ---

async function handleCriarCatalogo(entry: { nome: string; categoria: string; grupo: string; unidade: string; aliases: string[] }): Promise<void> {
  const tipoMap: Record<string, string> = {
    kg: 'carga_kg', reps: 'contagem', segundos: 'duracao_s',
    minutos: 'duracao_min', kcal: 'calorias', litros: 'volume',
    '1-10': 'escala', contagem: 'contagem',
  };
  const tipo_valor = tipoMap[entry.unidade] || 'contagem';

  try {
    await createCatalogEntry(
      entry.nome,
      entry.categoria,
      entry.grupo,
      tipo_valor,
      entry.unidade,
      entry.aliases || [entry.nome.toLowerCase()],
    );
    console.log(`[Haiku] Catalog entry created: ${entry.nome}`);
  } catch (e: any) {
    console.error(`[Haiku] Failed to create catalog entry:`, e.message);
  }
}

// --- Main entry point ---

export async function processWithHaiku(messages: BufferedMessage[]): Promise<string> {
  const userText = messages.filter(m => m.text).map(m => m.text).join('\n');
  if (!userText.trim()) return '(mensagem vazia)';

  console.log(`[Haiku] Processing: "${userText.slice(0, 80)}..."`);

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

    // 7. Handle catalog creation (Haiku decided to create after user confirmed)
    if (parsed.dados.criar_catalogo) {
      handleCriarCatalogo(parsed.dados.criar_catalogo).catch(() => {});
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
