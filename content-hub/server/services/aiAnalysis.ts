import fs from 'fs';
import path from 'path';
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const AGENT_PATH = path.resolve(PROJECT_ROOT, 'squads/yt-broll/agents/analyst.agent.md');
const BROLLS_PATH = path.resolve(__dirname, '../../data/brolls.json');
const PRODUCTIONS_PATH = path.resolve(__dirname, '../../data/productions.json');
const PROMPTS_DIR = path.resolve(__dirname, '../../data/ai-prompts');

if (!fs.existsSync(PROMPTS_DIR)) fs.mkdirSync(PROMPTS_DIR, { recursive: true });

interface Block {
  id: string;
  text: string;
  startTime: string;
  endTime: string;
  brollId?: string;
  lowerThird?: any;
  note?: string;
}

interface BRoll {
  id: string;
  filename: string;
  description: string;
  tags: string[];
  duration: number;
}

interface Suggestion {
  blockId: string;
  brollId?: string;
  brollReason?: string;
  newBrollConcept?: string;
  lowerThird?: { type: 'name-id' | 'concept' | 'topic'; text: string; subtitle?: string };
  lowerThirdReason?: string;
}

function readBRolls(): BRoll[] {
  if (!fs.existsSync(BROLLS_PATH)) return [];
  return JSON.parse(fs.readFileSync(BROLLS_PATH, 'utf-8'));
}

function buildPrompt(productionTitle: string, blocks: Block[]): string {
  const brolls = readBRolls();

  // Read agent persona (just the markdown body, skip frontmatter)
  let agentPersona = '';
  if (fs.existsSync(AGENT_PATH)) {
    const content = fs.readFileSync(AGENT_PATH, 'utf-8');
    const bodyMatch = content.match(/---[\s\S]*?---\s*([\s\S]*)/);
    agentPersona = bodyMatch ? bodyMatch[1].trim() : content;
  }

  const transcript = blocks.map((b) =>
    `[${b.startTime} — ${b.endTime}] (blockId: ${b.id})\n"${b.text}"`
  ).join('\n\n');

  const libraryList = brolls.length > 0
    ? brolls.map((b) => `- ${b.id}: ${b.description} [tags: ${b.tags.join(', ')}] (${b.duration}s)`).join('\n')
    : 'Biblioteca vazia — todos os b-rolls precisarão ser gerados.';

  const alreadyAssigned = blocks
    .filter((b) => b.brollId)
    .map((b) => `- Bloco ${b.startTime}: já tem ${b.brollId}`)
    .join('\n') || 'Nenhum b-roll atribuído ainda.';

  return `${agentPersona}

---

# Tarefa: Analisar transcrição e sugerir b-rolls e lower thirds

## Contexto
Vídeo: "${productionTitle}"
Você está analisando a transcrição de um vídeo do Dr. Bruno Salles (psicólogo, PhD em neurociência, canal sobre TDAH adulto) para sugerir onde colocar b-rolls e textos lower-third.

## Biblioteca de B-Rolls disponíveis
${libraryList}

## B-Rolls já atribuídos
${alreadyAssigned}

## Transcrição (${blocks.length} blocos)
${transcript}

## Lower Third Types disponíveis
- **name-id**: Identificação do speaker (Nome + Credencial). Usar na primeira aparição ou quando trocar de speaker.
- **concept**: Conceito-chave (um termo ou frase curta). Usar quando um conceito científico importante é mencionado pela primeira vez.
- **topic**: Cabeçalho de seção (Capítulo + Tópico). Usar em transições de tema no vídeo.

## Instruções
1. Analise TODA a transcrição antes de fazer sugestões
2. Para cada bloco relevante, sugira: b-roll (da biblioteca OU conceito pra gerar novo) E/OU lower third
3. NÃO sugira b-roll para TODOS os blocos — só onde genuinamente agrega valor
4. Para b-rolls da biblioteca, indique qual clip e por quê
5. Para b-rolls novos, descreva o conceito visual
6. Para lower thirds, indique o tipo e o texto exato
7. Blocos que já têm b-roll atribuído podem receber sugestão de lower third

## Formato de resposta OBRIGATÓRIO
Responda APENAS com um JSON array válido, sem markdown, sem explicação, sem code block. Apenas o JSON puro:

[
  {
    "blockId": "id-do-bloco",
    "brollId": "broll-001 ou null se precisa gerar novo",
    "brollReason": "motivo da sugestão",
    "newBrollConcept": "descrição visual se não tem na biblioteca, ou null",
    "lowerThird": { "type": "concept", "text": "Texto do lower third", "subtitle": "opcional" },
    "lowerThirdReason": "motivo da sugestão"
  }
]

Se um bloco não precisa de nada, NÃO o inclua no array.
Se um bloco só precisa de b-roll (sem lower third), omita o campo lowerThird.
Se um bloco só precisa de lower third (sem b-roll), omita brollId/brollReason/newBrollConcept.`;
}

function savePromptFile(productionId: string, prompt: string): string {
  const filePath = path.join(PROMPTS_DIR, `${productionId}.md`);
  fs.writeFileSync(filePath, prompt, 'utf-8');
  return filePath;
}

function parseSuggestions(raw: string): Suggestion[] {
  // Try to extract JSON from the response (handle markdown code blocks)
  let jsonStr = raw.trim();

  // Remove markdown code block if present
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();

  // Find the array
  const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
  if (arrayMatch) jsonStr = arrayMatch[0];

  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* ignore */ }

  return [];
}

export interface AnalysisResult {
  suggestions: Suggestion[];
  promptPath: string;
  raw?: string;
}

/**
 * Background mode: run claude --print and return suggestions
 */
export async function runAnalysisBackground(productionId: string, productionTitle: string, blocks: Block[]): Promise<AnalysisResult> {
  const prompt = buildPrompt(productionTitle, blocks);
  const promptPath = savePromptFile(productionId, prompt);

  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['--print', '-p', prompt], {
      cwd: PROJECT_ROOT,
      shell: true,
      timeout: 300000, // 5 min max
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.on('close', (code) => {
      if (code !== 0 && !stdout) {
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
        return;
      }
      const suggestions = parseSuggestions(stdout);
      resolve({ suggestions, promptPath, raw: stdout });
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn claude CLI: ${err.message}`));
    });
  });
}

/**
 * Interactive mode: open a terminal window with claude and the prompt pre-loaded
 */
export function runAnalysisInteractive(productionId: string, productionTitle: string, blocks: Block[]): { promptPath: string } {
  const prompt = buildPrompt(productionTitle, blocks);
  const promptPath = savePromptFile(productionId, prompt);

  // Create a launcher script that feeds the prompt to claude
  const launcherPath = path.join(PROMPTS_DIR, `${productionId}-launch.bat`);
  const escapedPromptPath = promptPath.replace(/\//g, '\\');

  fs.writeFileSync(launcherPath, [
    '@echo off',
    'chcp 65001 > nul',
    `cd /d "${PROJECT_ROOT.replace(/\//g, '\\')}"`,
    'echo.',
    'echo ========================================',
    'echo   Opensquad - Analise de B-Rolls',
    'echo   Producao: ' + productionTitle,
    'echo ========================================',
    'echo.',
    'echo O prompt sera enviado para o Claude automaticamente.',
    'echo Voce pode intervir a qualquer momento.',
    'echo.',
    `type "${escapedPromptPath}" | claude`,
    'echo.',
    'echo ========================================',
    'echo   Analise concluida!',
    'echo   Copie o JSON do resultado acima e',
    'echo   clique em "Importar Sugestoes" no Content Hub.',
    'echo ========================================',
    'pause',
  ].join('\r\n'), 'utf-8');

  // Open the terminal
  spawn('cmd', ['/c', 'start', 'cmd', '/k', launcherPath], {
    detached: true,
    stdio: 'ignore',
    cwd: PROJECT_ROOT,
  });

  return { promptPath };
}

/**
 * Apply suggestions to a production's blocks
 */
export function applySuggestions(productionId: string, suggestions: Suggestion[]): number {
  const productions = JSON.parse(fs.readFileSync(PRODUCTIONS_PATH, 'utf-8'));
  const idx = productions.findIndex((p: any) => p.id === productionId);
  if (idx === -1) return 0;

  let applied = 0;
  for (const s of suggestions) {
    const blockIdx = productions[idx].blocks.findIndex((b: any) => b.id === s.blockId);
    if (blockIdx === -1) continue;

    const block = productions[idx].blocks[blockIdx];

    // Only suggest, don't overwrite existing assignments
    if (!block.aiSuggestion) block.aiSuggestion = {};

    if (s.brollId || s.newBrollConcept) {
      block.aiSuggestion.broll = {
        brollId: s.brollId || null,
        newConcept: s.newBrollConcept || null,
        reason: s.brollReason || '',
      };
    }

    if (s.lowerThird) {
      block.aiSuggestion.lowerThird = {
        ...s.lowerThird,
        reason: s.lowerThirdReason || '',
      };
    }

    applied++;
  }

  productions[idx].updatedAt = new Date().toISOString();
  fs.writeFileSync(PRODUCTIONS_PATH, JSON.stringify(productions, null, 2), 'utf-8');
  return applied;
}
