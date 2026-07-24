import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const SQUAD_INPUT_DIR = path.resolve(PROJECT_ROOT, 'squads/yt-broll/input');
const PRODUCTIONS_PATH = path.resolve(__dirname, '../../data/productions.json');
const THUMBNAILS_DIR = path.resolve(__dirname, '../../data/production-thumbnails');

interface Block {
  id: string;
  text: string;
  startTime: string;
  endTime: string;
}

interface ExportRequest {
  productionId: string;
  productionTitle: string;
  blocks: Block[];
  style?: string;
}

/**
 * Exports a Content Hub production as input for the yt-broll squad.
 * Creates squads/yt-broll/input/content-hub-request.json
 */
export function exportForSquad(req: ExportRequest): string {
  if (!fs.existsSync(SQUAD_INPUT_DIR)) {
    fs.mkdirSync(SQUAD_INPUT_DIR, { recursive: true });
  }

  const outputPath = path.join(SQUAD_INPUT_DIR, 'content-hub-request.json');

  const data = {
    productionId: req.productionId,
    productionTitle: req.productionTitle,
    style: req.style || 'mix',
    blocks: req.blocks.map((b) => ({
      id: b.id,
      text: b.text,
      startTime: b.startTime,
      endTime: b.endTime,
    })),
    exportedAt: new Date().toISOString(),
    contentHubProductionsPath: PRODUCTIONS_PATH,
  };

  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
  return outputPath;
}

/**
 * Opens Claude Code in a new terminal with the squad run command ready.
 */
export function launchSquadInteractive(): void {
  const batPath = path.join(SQUAD_INPUT_DIR, 'launch-squad.bat');

  fs.writeFileSync(batPath, [
    '@echo off',
    'chcp 65001 > nul',
    `cd /d "${PROJECT_ROOT.replace(/\//g, '\\')}"`,
    'echo.',
    'echo ==========================================',
    'echo   Opensquad - B-Roll Generator',
    'echo   Input carregado do Content Hub',
    'echo ==========================================',
    'echo.',
    'claude "/opensquad run yt-broll"',
    'pause',
  ].join('\r\n'), 'utf-8');

  spawn('cmd', ['/c', 'start', 'cmd', '/k', batPath], {
    detached: true,
    stdio: 'ignore',
    cwd: PROJECT_ROOT,
  });
}

// --- Thumbnail ---

interface ThumbnailRequest {
  productionId: string;
  productionTitle: string;
  description: string;
  tags: string[];
  thumbnailText?: string;
  thumbnailTextVariations: { text: string; selected: boolean }[];
  thumbnailPrompt?: string;
  sendMode: 'selected' | 'ai-choose';
  script?: string;
}

/**
 * Exports thumbnail briefing and opens Claude Code with the thumbnail-generator skill.
 */
export function launchThumbnailGenerator(req: ThumbnailRequest): string {
  if (!fs.existsSync(SQUAD_INPUT_DIR)) {
    fs.mkdirSync(SQUAD_INPUT_DIR, { recursive: true });
  }

  const outputPath = path.join(SQUAD_INPUT_DIR, 'thumbnail-request.json');
  const destThumbPath = path.join(THUMBNAILS_DIR, `${req.productionId}.png`);

  fs.writeFileSync(outputPath, JSON.stringify({
    ...req,
    destThumbPath,
    contentHubProductionsPath: PRODUCTIONS_PATH,
    exportedAt: new Date().toISOString(),
  }, null, 2), 'utf-8');

  // Build the prompt for Claude Code
  let textInstruction: string;
  if (req.sendMode === 'selected' && req.thumbnailText) {
    textInstruction = `Use EXATAMENTE este texto na thumbnail: "${req.thumbnailText}"`;
  } else if (req.sendMode === 'ai-choose' && req.thumbnailTextVariations.length > 0) {
    const options = req.thumbnailTextVariations.map((v, i) => `  ${i + 1}. "${v.text}"`).join('\n');
    textInstruction = `Escolha o melhor texto entre estas opções para a thumbnail:\n${options}\nEscolha o que funcionar melhor visualmente.`;
  } else {
    textInstruction = 'Sugira o texto da thumbnail baseado no título e conteúdo do vídeo.';
  }

  const extraPrompt = req.thumbnailPrompt ? `\n\nInstrução extra do usuário: ${req.thumbnailPrompt}` : '';

  const briefing = [
    `O tema do vídeo é: "${req.productionTitle}"`,
    req.description ? `O vídeo fala sobre: ${req.description}` : '',
    req.tags.length > 0 ? `Conceitos-chave: ${req.tags.join(', ')}` : '',
    req.script ? `Gancho do vídeo (primeiras linhas do roteiro): ${req.script.slice(0, 500)}` : '',
    '',
    textInstruction,
    extraPrompt,
  ].filter(Boolean).join('\n');

  const claudePrompt = [
    `Leia o briefing abaixo e use a skill thumbnail-generator para gerar a thumbnail.`,
    `Após gerar, salve o resultado em: ${destThumbPath}`,
    `E atualize o campo thumbnailPath da produção ${req.productionId} em ${PRODUCTIONS_PATH}`,
    ``,
    `--- BRIEFING ---`,
    briefing,
  ].join('\n');

  // Write launcher
  const batPath = path.join(SQUAD_INPUT_DIR, 'launch-thumbnail.bat');
  const escapedPrompt = claudePrompt.replace(/"/g, '""');

  fs.writeFileSync(batPath, [
    '@echo off',
    'chcp 65001 > nul',
    `cd /d "${PROJECT_ROOT.replace(/\//g, '\\')}"`,
    'echo.',
    'echo ==========================================',
    'echo   Opensquad - Thumbnail Generator',
    `echo   Producao: ${req.productionTitle.slice(0, 50)}`,
    'echo ==========================================',
    'echo.',
    `claude "${escapedPrompt}"`,
    'pause',
  ].join('\r\n'), 'utf-8');

  spawn('cmd', ['/c', 'start', 'cmd', '/k', batPath], {
    detached: true,
    stdio: 'ignore',
    cwd: PROJECT_ROOT,
  });

  return outputPath;
}
