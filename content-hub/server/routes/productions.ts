import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { renderLowerThird } from '../services/lowerThirdRenderer.js';
import { exportForSquad, launchSquadInteractive, launchThumbnailGenerator } from '../services/squadLauncher.js';
import { suggestLowerThirds, applyLowerThirdSuggestions } from '../services/geminiAnalysis.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(__dirname, '../../data/productions.json');
const THUMBNAILS_DIR = path.resolve(__dirname, '../../data/production-thumbnails');
const LOWER_THIRDS_DIR = path.resolve(__dirname, '../../data/lower-thirds');

const router = Router();

interface LowerThird {
  type: string;
  text: string;
  subtitle?: string;
  pngPath?: string;
}

interface ScriptBlock {
  id: string;
  text: string;
  startTime: string;
  endTime: string;
  brollId?: string;
  lowerThird?: LowerThird;
  note?: string;
}

interface TitleVariation {
  text: string;
  selected: boolean;
}

interface Production {
  id: string;
  title: string;
  titleVariations: TitleVariation[];
  description: string;
  tags: string[];
  status: string;
  plannedDate?: string;
  youtubeId?: string;
  script?: string;
  rawVideoPath?: string;
  thumbnailPath?: string;
  thumbnailText?: string;
  thumbnailTextVariations: TitleVariation[];
  thumbnailPrompt?: string;
  blocks: ScriptBlock[];
  ideaNote?: string;
  ideaSource?: string;
  createdAt: string;
  updatedAt: string;
}

function readProductions(): Production[] {
  if (!fs.existsSync(DATA_PATH)) return [];
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
}

function writeProductions(data: Production[]) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// GET /api/productions — list all
router.get('/', (_req, res) => {
  try {
    const productions = readProductions();
    res.json({ ok: true, productions });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/productions/lower-third-template — serve the HTML template (MUST be before /:id)
router.get('/lower-third-template', (_req, res) => {
  const templatePath = path.resolve(__dirname, '../../../temp/lower-third-templates.html');
  if (!fs.existsSync(templatePath)) {
    res.status(404).send('Template HTML not found');
    return;
  }
  res.sendFile(templatePath);
});

// GET /api/productions/:id
router.get('/:id', (req, res) => {
  try {
    const productions = readProductions();
    const p = productions.find((x) => x.id === req.params.id);
    if (!p) { res.status(404).json({ ok: false, error: 'Not found' }); return; }
    res.json({ ok: true, production: p });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/productions — create
router.post('/', (req, res) => {
  try {
    const productions = readProductions();
    const now = new Date().toISOString();
    const entry: Production = {
      id: crypto.randomUUID(),
      title: req.body.title || 'Sem título',
      titleVariations: req.body.titleVariations || [],
      description: req.body.description || '',
      tags: req.body.tags || [],
      status: req.body.status || 'idea',
      plannedDate: req.body.plannedDate,
      script: req.body.script,
      rawVideoPath: req.body.rawVideoPath,
      thumbnailTextVariations: [],
      blocks: [],
      ideaNote: req.body.ideaNote,
      ideaSource: req.body.ideaSource,
      createdAt: now,
      updatedAt: now,
    };
    productions.push(entry);
    writeProductions(productions);
    res.status(201).json({ ok: true, production: entry });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// PUT /api/productions/:id — update
router.put('/:id', (req, res) => {
  try {
    const productions = readProductions();
    const idx = productions.findIndex((x) => x.id === req.params.id);
    if (idx === -1) { res.status(404).json({ ok: false, error: 'Not found' }); return; }

    const allowed = [
      'title', 'titleVariations', 'description', 'tags', 'status', 'plannedDate', 'youtubeId',
      'script', 'rawVideoPath', 'thumbnailPath', 'thumbnailText', 'thumbnailTextVariations',
      'thumbnailPrompt', 'blocks', 'ideaNote', 'ideaSource',
    ];
    for (const key of allowed) {
      if (req.body[key] !== undefined) (productions[idx] as any)[key] = req.body[key];
    }
    productions[idx].updatedAt = new Date().toISOString();

    writeProductions(productions);
    res.json({ ok: true, production: productions[idx] });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE /api/productions/:id
router.delete('/:id', (req, res) => {
  try {
    const productions = readProductions();
    const idx = productions.findIndex((x) => x.id === req.params.id);
    if (idx === -1) { res.status(404).json({ ok: false, error: 'Not found' }); return; }

    // Clean up thumbnail if exists
    const thumb = productions[idx].thumbnailPath;
    if (thumb && fs.existsSync(thumb)) {
      try { fs.unlinkSync(thumb); } catch { /* ignore */ }
    }

    productions.splice(idx, 1);
    writeProductions(productions);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/productions/:id/import-srt — parse SRT (content or file path) and create blocks
router.post('/:id/import-srt', (req, res) => {
  try {
    const productions = readProductions();
    const idx = productions.findIndex((x) => x.id === req.params.id);
    if (idx === -1) { res.status(404).json({ ok: false, error: 'Not found' }); return; }

    let { srtContent, srtFilePath, mergeSeconds } = req.body;

    // Read from file if path provided
    if (!srtContent && srtFilePath) {
      if (!fs.existsSync(srtFilePath)) {
        res.status(400).json({ ok: false, error: 'SRT file not found: ' + srtFilePath });
        return;
      }
      srtContent = fs.readFileSync(srtFilePath, 'utf-8');
    }

    if (!srtContent) { res.status(400).json({ ok: false, error: 'srtContent or srtFilePath required' }); return; }

    const blocks = parseSRT(srtContent, mergeSeconds || 8);
    productions[idx].blocks = blocks;
    productions[idx].updatedAt = new Date().toISOString();

    writeProductions(productions);
    res.json({ ok: true, production: productions[idx], blocksCreated: blocks.length });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/productions/:id/thumbnail — upload thumbnail from file path
router.post('/:id/thumbnail', (req, res) => {
  try {
    const productions = readProductions();
    const idx = productions.findIndex((x) => x.id === req.params.id);
    if (idx === -1) { res.status(404).json({ ok: false, error: 'Not found' }); return; }

    const { filepath } = req.body;
    if (!filepath || !fs.existsSync(filepath)) {
      res.status(400).json({ ok: false, error: 'File not found: ' + filepath });
      return;
    }

    const ext = path.extname(filepath);
    const destPath = path.join(THUMBNAILS_DIR, `${productions[idx].id}${ext}`);
    fs.copyFileSync(filepath, destPath);

    productions[idx].thumbnailPath = destPath;
    productions[idx].updatedAt = new Date().toISOString();
    writeProductions(productions);

    res.json({ ok: true, thumbnailPath: destPath });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/productions/:id/thumbnail — serve thumbnail
router.get('/:id/thumbnail', (req, res) => {
  try {
    const productions = readProductions();
    const p = productions.find((x) => x.id === req.params.id);
    if (!p?.thumbnailPath || !fs.existsSync(p.thumbnailPath)) {
      res.status(404).json({ ok: false, error: 'No thumbnail' });
      return;
    }
    res.sendFile(p.thumbnailPath);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/productions/:id/lower-third — generate lower-third PNG for a block
router.post('/:id/lower-third', async (req, res) => {
  try {
    const productions = readProductions();
    const idx = productions.findIndex((x) => x.id === req.params.id);
    if (idx === -1) { res.status(404).json({ ok: false, error: 'Not found' }); return; }

    const { blockId, type, text, subtitle } = req.body;
    if (!blockId || !type || !text) {
      res.status(400).json({ ok: false, error: 'blockId, type, and text required' });
      return;
    }

    const blockIdx = productions[idx].blocks.findIndex((b) => b.id === blockId);
    if (blockIdx === -1) { res.status(404).json({ ok: false, error: 'Block not found' }); return; }

    const pngPath = await renderLowerThird({
      type, text, subtitle,
      productionId: req.params.id,
      blockId,
    });

    productions[idx].blocks[blockIdx].lowerThird = { type, text, subtitle, pngPath };
    productions[idx].updatedAt = new Date().toISOString();
    writeProductions(productions);

    res.json({ ok: true, pngPath });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/productions/lower-third/:filename — serve lower-third PNG
router.get('/lower-third/:filename', (req, res) => {
  try {
    const filePath = path.join(LOWER_THIRDS_DIR, req.params.filename);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ ok: false, error: 'Not found' });
      return;
    }
    res.sendFile(filePath);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/productions/:id/launch-squad — export data and open Claude Code with squad
router.post('/:id/launch-squad', (req, res) => {
  try {
    const productions = readProductions();
    const p = productions.find((x) => x.id === req.params.id);
    if (!p) { res.status(404).json({ ok: false, error: 'Not found' }); return; }
    if (p.blocks.length === 0) { res.status(400).json({ ok: false, error: 'Importe o SRT primeiro. Sem blocos para analisar.' }); return; }

    const style = req.body.style || 'mix';

    // Export production data for the squad
    const exportPath = exportForSquad({
      productionId: p.id,
      productionTitle: p.title,
      blocks: p.blocks,
      style,
    });

    // Launch Claude Code in a new terminal
    launchSquadInteractive();

    res.json({
      ok: true,
      exportPath,
      message: `Input exportado e Claude Code aberto. O squad yt-broll vai ler a transcrição de "${p.title}" automaticamente.`,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/productions/:id/launch-thumbnail — open Claude Code with thumbnail generator
router.post('/:id/launch-thumbnail', (req, res) => {
  try {
    const productions = readProductions();
    const p = productions.find((x) => x.id === req.params.id);
    if (!p) { res.status(404).json({ ok: false, error: 'Not found' }); return; }

    const { sendMode } = req.body;

    const exportPath = launchThumbnailGenerator({
      productionId: p.id,
      productionTitle: p.title,
      description: p.description,
      tags: p.tags,
      thumbnailText: p.thumbnailText,
      thumbnailTextVariations: p.thumbnailTextVariations || [],
      thumbnailPrompt: p.thumbnailPrompt,
      sendMode: sendMode || 'selected',
      script: p.script,
    });

    res.json({
      ok: true,
      exportPath,
      message: `Claude Code aberto com a skill thumbnail-generator para "${p.title}".`,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/productions/:id/suggest-lower-thirds — AI analysis via Gemini
router.post('/:id/suggest-lower-thirds', async (req, res) => {
  try {
    const productions = readProductions();
    const p = productions.find((x) => x.id === req.params.id);
    if (!p) { res.status(404).json({ ok: false, error: 'Not found' }); return; }
    if (p.blocks.length === 0) { res.status(400).json({ ok: false, error: 'Importe o SRT primeiro.' }); return; }

    const suggestions = await suggestLowerThirds(p.title, p.blocks);
    const applied = applyLowerThirdSuggestions(p.id, suggestions);
    const updated = readProductions().find((x) => x.id === req.params.id);

    res.json({ ok: true, suggestionsCount: suggestions.length, applied, production: updated });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/productions/:id/refresh — re-read production from disk (after squad writeback)
router.post('/:id/refresh', (req, res) => {
  try {
    const productions = readProductions();
    const p = productions.find((x) => x.id === req.params.id);
    if (!p) { res.status(404).json({ ok: false, error: 'Not found' }); return; }
    res.json({ ok: true, production: p });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- SRT Parser ---

function parseSRT(content: string, mergeSeconds: number): ScriptBlock[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const entries: { start: string; end: string; text: string }[] = [];

  let i = 0;
  while (i < lines.length) {
    // Skip sequence number
    if (/^\d+$/.test(lines[i]?.trim())) {
      i++;
    }

    // Parse timestamp line
    const tsMatch = lines[i]?.match(
      /(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/
    );
    if (tsMatch) {
      const start = tsMatch[1].replace(',', '.');
      const end = tsMatch[2].replace(',', '.');
      i++;

      // Collect text lines until empty line
      const textLines: string[] = [];
      while (i < lines.length && lines[i]?.trim() !== '') {
        textLines.push(lines[i].trim());
        i++;
      }

      entries.push({ start, end, text: textLines.join(' ') });
    }

    i++;
  }

  // Merge short entries into blocks based on mergeSeconds
  const blocks: ScriptBlock[] = [];
  let currentBlock: { start: string; end: string; texts: string[] } | null = null;

  for (const entry of entries) {
    if (!currentBlock) {
      currentBlock = { start: entry.start, end: entry.end, texts: [entry.text] };
      continue;
    }

    const blockDuration = timeToSeconds(entry.end) - timeToSeconds(currentBlock.start);
    if (blockDuration <= mergeSeconds) {
      currentBlock.end = entry.end;
      currentBlock.texts.push(entry.text);
    } else {
      blocks.push(makeBlock(currentBlock));
      currentBlock = { start: entry.start, end: entry.end, texts: [entry.text] };
    }
  }

  if (currentBlock) blocks.push(makeBlock(currentBlock));

  return blocks;
}

function makeBlock(raw: { start: string; end: string; texts: string[] }): ScriptBlock {
  return {
    id: crypto.randomUUID(),
    text: raw.texts.join(' '),
    startTime: formatTime(raw.start),
    endTime: formatTime(raw.end),
  };
}

function timeToSeconds(ts: string): number {
  const [h, m, rest] = ts.split(':');
  const [s, ms] = rest.split('.');
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms || '0') / 1000;
}

function formatTime(ts: string): string {
  // Convert "00:03:19.500" to "00:03:19"
  return ts.replace(/\.\d+$/, '');
}

export default router;
