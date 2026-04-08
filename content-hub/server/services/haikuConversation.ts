/**
 * Haiku Conversation — fallback when PC is offline.
 *
 * Builds a prompt with all agents + catalog + history,
 * sends to Claude Haiku (1 API call), parses the structured
 * response, and writes extracted data to the vault.
 *
 * Response format from Haiku:
 * ```json
 * {
 *   "resposta": "Texto pro Bruno no Telegram",
 *   "dados": {
 *     "frontmatter": { "peso": 77.8, "humor": 5 },
 *     "sections": { "treino": "- 10:30 Supino reto 80kg 4x8" }
 *   }
 * }
 * ```
 */

import { getAgents, getAgentsCompact } from './agentLoader.js';
import { getCatalog, getCatalogCompact } from './catalogo.js';
import { writeMetrics, todayBRT } from './vaultWriter.js';
import { readFile } from './onedrive.js';
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

// --- Build system prompt ---

async function buildSystemPrompt(): Promise<string> {
  await getAgents();
  await getCatalog();

  const agentsSummary = getAgentsCompact();
  const catalogCompact = getCatalogCompact();

  // Try to load today's metrics for context
  let todayMetrics = '';
  try {
    const date = todayBRT();
    todayMetrics = await readFile(`saude/metricas/metricas-${date}.md`);
  } catch { /* no metrics yet today */ }

  return `Voce e o Chefe Bruno, hub do Diario Inteligente do Dr. Bruno Salles.
Bruno te manda mensagens pelo Telegram. Voce classifica, extrai dados, registra e responde.

Data de hoje: ${todayBRT()}

## AGENTES DISPONIVEIS
${agentsSummary}

## CATALOGO DE METRICAS (campos validos pro frontmatter)
${catalogCompact}

${todayMetrics ? `## METRICAS DE HOJE (ja registradas)\n${todayMetrics.slice(0, 500)}` : ''}

## REGRAS
1. Portugues BR, curto (max 3 frases), tom provocativo e direto
2. SEMPRE extraia dados numericos da mensagem
3. HTML simples pra Telegram: <b>, <i>
4. Horario logico: 05-23:59 = dia atual, 00-04:59 = dia anterior

## FORMATO DE RESPOSTA
Voce DEVE retornar APENAS um bloco JSON. Nenhum texto fora do JSON.
Exemplo pra "fiz supino 80kg 4x8, humor 7":

{"resposta":"<b>80kg no supino</b>, 4x8 limpo? Boa. Humor 7, ta no caminho. Bora pro proximo.","dados":{"frontmatter":{"humor":7},"sections":{"treino":"- Supino reto 80kg 4x8"}},"agente":"chefe-bruno"}

Campos do frontmatter: use EXATAMENTE os nomes do catalogo (humor, peso, cigarros, sono_horas, etc).
Sections: treino, refeicoes, habitos, humor, notas.
Se nao ha dados numericos, mande "dados":{} vazio.
IMPORTANTE: retorne SOMENTE o JSON, sem markdown, sem texto antes ou depois.`;
}

// --- Call Haiku API ---

async function callHaiku(systemPrompt: string, userMessage: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }

  const messages = [
    // Include recent history for context
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
    throw new Error(`Haiku API error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json() as any;
  const text = data.content?.[0]?.text || '';
  return text;
}

// --- Parse response ---

interface HaikuResponse {
  resposta: string;
  dados: {
    frontmatter: Record<string, any>;
    sections: Record<string, string>;
  };
  agente: string;
}

function normalizeResponse(obj: any): HaikuResponse {
  return {
    resposta: obj.resposta || obj.response || obj.text || '',
    dados: {
      frontmatter: obj.dados?.frontmatter || obj.frontmatter || {},
      sections: obj.dados?.sections || obj.sections || {},
    },
    agente: obj.agente || obj.agente_usado || 'chefe-bruno',
  };
}

function parseResponse(raw: string): HaikuResponse {
  console.log(`[Haiku] Raw response: ${raw.slice(0, 200)}`);

  // Try to extract JSON from markdown code block
  const jsonMatch = raw.match(/```json?\s*\n?([\s\S]*?)\n?\s*```/);
  if (jsonMatch) {
    try {
      return normalizeResponse(JSON.parse(jsonMatch[1]));
    } catch { /* fallback */ }
  }

  // Try raw JSON parse (Haiku sometimes returns pure JSON without code block)
  try {
    return normalizeResponse(JSON.parse(raw));
  } catch { /* fallback */ }

  // Try to find JSON object anywhere in the text
  const braceMatch = raw.match(/\{[\s\S]*"resposta"[\s\S]*\}/);
  if (braceMatch) {
    try {
      return normalizeResponse(JSON.parse(braceMatch[0]));
    } catch { /* fallback */ }
  }

  // Last resort: treat entire response as text
  return {
    resposta: raw.slice(0, 500),
    dados: { frontmatter: {}, sections: {} },
    agente_usado: 'chefe-bruno',
  };
}

// --- Main entry point ---

export async function processWithHaiku(messages: BufferedMessage[]): Promise<string> {
  // Combine messages into one string
  const userText = messages
    .filter(m => m.text)
    .map(m => m.text)
    .join('\n');

  if (!userText.trim()) return '(mensagem vazia)';

  console.log(`[Haiku] Processing: "${userText.slice(0, 80)}..."`);

  try {
    const systemPrompt = await buildSystemPrompt();
    const raw = await callHaiku(systemPrompt, userText);
    const parsed = parseResponse(raw);

    console.log(`[Haiku] Agent: ${parsed.agente_usado}, Response: "${parsed.resposta.slice(0, 60)}..."`);

    // Write extracted data to vault
    const hasDados = Object.keys(parsed.dados.frontmatter || {}).length > 0 ||
                     Object.keys(parsed.dados.sections || {}).length > 0;
    if (hasDados) {
      try {
        await writeMetrics({
          date: todayBRT(),
          frontmatter: parsed.dados.frontmatter,
          sections: parsed.dados.sections,
        });
        console.log('[Haiku] Data written to vault');
      } catch (e: any) {
        console.error('[Haiku] Vault write error:', e.message);
      }
    }

    // Update history
    addToHistory('user', userText);
    addToHistory('assistant', parsed.resposta);

    return parsed.resposta;
  } catch (err: any) {
    console.error('[Haiku] Error:', err.message);

    if (err.message.includes('ANTHROPIC_API_KEY')) {
      return '⚠️ Haiku nao configurado (falta API key). Dados registrados quando PC ligar.';
    }

    return `⚠️ Erro no Haiku: ${err.message.slice(0, 80)}`;
  }
}
