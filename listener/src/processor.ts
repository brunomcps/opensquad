/**
 * Claude CLI processor.
 *
 * Processes Telegram messages using Claude Code CLI, which has full
 * access to the vault (Read, Write, Glob, Grep, Bash). This is the
 * "brain" of the Diario Inteligente when the PC is online.
 *
 * Phase 2: basic processing with a simple system prompt.
 * Phase 3 will add dynamic agent loading and sophisticated prompts.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CLAUDE_BIN = process.env.CLAUDE_BIN || 'claude';
const VAULT_PATH = process.env.VAULT_PATH || path.resolve(__dirname, '../..');

// --- Types ---

interface MessageBatch {
  id: string;
  chatId: number;
  messages: Array<{
    type: 'text' | 'voice' | 'photo';
    text?: string;
    fileId?: string;
    caption?: string;
    timestamp: string;
  }>;
  timestamp: string;
}

// --- System prompt (Phase 2: basic, Phase 3 will add agents) ---

function buildPrompt(batch: MessageBatch): string {
  // Combine all text messages into one
  const texts = batch.messages
    .filter(m => m.type === 'text' && m.text)
    .map(m => m.text)
    .join('\n');

  const hasVoice = batch.messages.some(m => m.type === 'voice');
  const hasPhoto = batch.messages.some(m => m.type === 'photo');

  let prompt = texts;
  if (hasVoice) prompt += '\n[Audio message received — transcription pending Phase 3]';
  if (hasPhoto) prompt += '\n[Photo received — analysis pending Phase 3]';

  return prompt;
}

const SYSTEM_PROMPT = `Voce e o Chefe Bruno, assistente pessoal do Dr. Bruno Salles.
Bruno te manda mensagens pelo Telegram com dados de saude, treino, humor, refeicoes, habitos e tarefas.

Seu trabalho:
1. Extrair dados estruturados da mensagem (exercicios, cargas, sono, humor, etc.)
2. Registrar no vault (criar/atualizar notas em saude/metricas/)
3. Responder de forma curta e provocativa (maximo 3 frases)

Regras:
- Responda SEMPRE em portugues BR, sem acentos nos nomes de arquivo
- Use o catalogo em catalogo/ pra identificar exercicios e metricas
- Leia saude/metricas/metricas-YYYY-MM-DD.md do dia atual pra atualizar
- Leia saude/treino-semana-*.md pra saber o plano de treino
- Horario logico: 05-23:59 = dia atual, 00-04:59 = verificar contexto
- Seja direto, provocativo, sem enrolacao. Cobrar quando necessario.
- Formato da resposta: texto puro pra Telegram (HTML simples: <b>, <i>)

IMPORTANTE: So retorne a mensagem de resposta pro Bruno. Nada mais.`;

// --- Process ---

export async function processWithClaude(batch: MessageBatch): Promise<string> {
  const userPrompt = buildPrompt(batch);
  if (!userPrompt.trim()) {
    return '(mensagem vazia)';
  }

  console.log(`[Processor] Processing: "${userPrompt.slice(0, 80)}..."`);

  try {
    const { stdout } = await execFileAsync(CLAUDE_BIN, [
      '-p', userPrompt,
      '--model', 'claude-opus-4-6',
      '--output-format', 'text',
      '--max-turns', '10',
    ], {
      cwd: VAULT_PATH,
      maxBuffer: 5 * 1024 * 1024, // 5MB
      timeout: 120_000, // 2 min
      shell: CLAUDE_BIN.endsWith('.cmd'), // Windows .cmd needs shell
      env: {
        ...process.env,
      },
    });

    const response = stdout.trim();
    if (!response) return '(processado, sem resposta)';

    console.log(`[Processor] Response: "${response.slice(0, 80)}..."`);
    return response;
  } catch (err: any) {
    console.error('[Processor] Claude CLI error:', err.message);
    if (err.stderr) console.error('[Processor] stderr:', err.stderr.slice(0, 500));

    // Fallback: basic echo
    return `Recebi: "${userPrompt.slice(0, 100)}" — Claude CLI fora. Processo quando voltar.`;
  }
}
