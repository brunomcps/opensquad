import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(__dirname, '../../data/brolls.json');
const THUMBNAILS_DIR = path.resolve(__dirname, '../../data/thumbnails');

// Ensure thumbnails dir exists
if (!fs.existsSync(THUMBNAILS_DIR)) {
  fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
}

const router = Router();

interface BRoll {
  id: string;
  filename: string;
  filepath: string;
  thumbnailPath?: string;
  duration: number;
  resolution: string;
  aspectRatio: string;
  fileSize: number;
  description: string;
  tags: string[];
  source: string;
  prompt?: string;
  createdAt: string;
  usedIn: { videoTitle: string; videoId?: string; timestamp: string; addedAt: string }[];
}

function readBRolls(): BRoll[] {
  if (!fs.existsSync(DATA_PATH)) return [];
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeBRolls(data: BRoll[]) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function getNextId(brolls: BRoll[]): string {
  if (brolls.length === 0) return 'broll-001';
  const nums = brolls.map((b) => {
    const m = b.id.match(/broll-(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  });
  const next = Math.max(...nums) + 1;
  return `broll-${String(next).padStart(3, '0')}`;
}

function probeVideo(filepath: string): { duration: number; width: number; height: number } | null {
  try {
    const out = execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -show_entries format=duration -of json "${filepath}"`,
      { timeout: 10000 }
    ).toString();
    const data = JSON.parse(out);
    const stream = data.streams?.[0] || {};
    const duration = parseFloat(stream.duration || data.format?.duration || '0');
    return { duration: Math.round(duration * 10) / 10, width: stream.width || 0, height: stream.height || 0 };
  } catch {
    return null;
  }
}

function generateThumbnail(filepath: string, id: string): string | undefined {
  try {
    const outPath = path.join(THUMBNAILS_DIR, `${id}.jpg`);
    execSync(
      `ffmpeg -y -i "${filepath}" -vframes 1 -ss 00:00:02 -vf "scale=320:-1" -update 1 "${outPath}"`,
      { timeout: 15000, stdio: 'ignore' }
    );
    return outPath;
  } catch {
    return undefined;
  }
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function calcAspectRatio(w: number, h: number): string {
  if (!w || !h) return 'unknown';
  const d = gcd(w, h);
  return `${w / d}:${h / d}`;
}

// GET /api/brolls — list all with optional filters
router.get('/', (req, res) => {
  try {
    let brolls = readBRolls();
    const { source, tag, search } = req.query;

    if (source && source !== 'all') {
      brolls = brolls.filter((b) => b.source === source);
    }
    if (tag) {
      const t = String(tag).toLowerCase();
      brolls = brolls.filter((b) => b.tags.some((bt) => bt.toLowerCase().includes(t)));
    }
    if (search) {
      const q = String(search).toLowerCase();
      brolls = brolls.filter(
        (b) =>
          b.description.toLowerCase().includes(q) ||
          b.tags.some((t) => t.toLowerCase().includes(q)) ||
          b.filename.toLowerCase().includes(q)
      );
    }

    res.json({ ok: true, brolls });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/brolls — add a new b-roll from a file path
router.post('/', (req, res) => {
  try {
    const brolls = readBRolls();
    const { filepath, description, tags, source, prompt } = req.body;

    if (!filepath || !fs.existsSync(filepath)) {
      res.status(400).json({ ok: false, error: 'File not found: ' + filepath });
      return;
    }

    const id = getNextId(brolls);
    const stats = fs.statSync(filepath);
    const probe = probeVideo(filepath);
    const thumbnailPath = generateThumbnail(filepath, id);

    const entry: BRoll = {
      id,
      filename: path.basename(filepath),
      filepath: path.resolve(filepath),
      thumbnailPath,
      duration: probe?.duration || 0,
      resolution: probe ? `${probe.width}x${probe.height}` : 'unknown',
      aspectRatio: probe ? calcAspectRatio(probe.width, probe.height) : 'unknown',
      fileSize: stats.size,
      description: description || '',
      tags: tags || [],
      source: source || 'other',
      prompt,
      createdAt: new Date().toISOString(),
      usedIn: [],
    };

    brolls.push(entry);
    writeBRolls(brolls);
    res.status(201).json({ ok: true, broll: entry });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// PUT /api/brolls/:id — update metadata
router.put('/:id', (req, res) => {
  try {
    const brolls = readBRolls();
    const idx = brolls.findIndex((b) => b.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ ok: false, error: 'B-roll not found' });
      return;
    }

    const { description, tags, source, prompt, usedIn } = req.body;
    if (description !== undefined) brolls[idx].description = description;
    if (tags !== undefined) brolls[idx].tags = tags;
    if (source !== undefined) brolls[idx].source = source;
    if (prompt !== undefined) brolls[idx].prompt = prompt;
    if (usedIn !== undefined) brolls[idx].usedIn = usedIn;

    writeBRolls(brolls);
    res.json({ ok: true, broll: brolls[idx] });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE /api/brolls/:id
router.delete('/:id', (req, res) => {
  try {
    const brolls = readBRolls();
    const idx = brolls.findIndex((b) => b.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ ok: false, error: 'B-roll not found' });
      return;
    }

    // Remove thumbnail if exists
    const thumbPath = brolls[idx].thumbnailPath;
    if (thumbPath && fs.existsSync(thumbPath)) {
      fs.unlinkSync(thumbPath);
    }

    brolls.splice(idx, 1);
    writeBRolls(brolls);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/brolls/scan-folder — scan a directory and import all .mp4 files
router.post('/scan-folder', (req, res) => {
  try {
    const { folderPath, source } = req.body;
    if (!folderPath || !fs.existsSync(folderPath)) {
      res.status(400).json({ ok: false, error: 'Folder not found: ' + folderPath });
      return;
    }

    const brolls = readBRolls();
    const existingPaths = new Set(brolls.map((b) => b.filepath));
    const files = fs.readdirSync(folderPath).filter((f) => /\.(mp4|webm|mov)$/i.test(f));
    const added: BRoll[] = [];

    for (const file of files) {
      const fullPath = path.resolve(folderPath, file);
      if (existingPaths.has(fullPath)) continue;

      const id = getNextId([...brolls, ...added]);
      const stats = fs.statSync(fullPath);
      const probe = probeVideo(fullPath);
      const thumbnailPath = generateThumbnail(fullPath, id);

      const entry: BRoll = {
        id,
        filename: file,
        filepath: fullPath,
        thumbnailPath,
        duration: probe?.duration || 0,
        resolution: probe ? `${probe.width}x${probe.height}` : 'unknown',
        aspectRatio: probe ? calcAspectRatio(probe.width, probe.height) : 'unknown',
        fileSize: stats.size,
        description: file.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        tags: [],
        source: source || 'other',
        createdAt: new Date().toISOString(),
        usedIn: [],
      };

      added.push(entry);
    }

    brolls.push(...added);
    writeBRolls(brolls);
    res.json({ ok: true, imported: added.length, skipped: files.length - added.length, brolls: added });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/brolls/import-squad — import from squad library-index.md
router.post('/import-squad', (req, res) => {
  try {
    const { libraryPath, libraryDir } = req.body;
    if (!libraryPath || !fs.existsSync(libraryPath)) {
      res.status(400).json({ ok: false, error: 'library-index.md not found: ' + libraryPath });
      return;
    }

    const content = fs.readFileSync(libraryPath, 'utf-8');
    const brolls = readBRolls();
    const existingIds = new Set(brolls.map((b) => b.id));
    const added: BRoll[] = [];

    // Parse markdown table rows: | ID | Arquivo | Descrição | Tags | Prompt | Data | Reuso |
    const lines = content.split('\n');
    for (const line of lines) {
      if (!line.startsWith('| broll-')) continue;
      const cols = line.split('|').map((c) => c.trim()).filter(Boolean);
      if (cols.length < 6) continue;

      const [id, filename, description, tagsStr, prompt, date] = cols;
      if (existingIds.has(id)) continue;

      const dir = libraryDir || path.dirname(libraryPath);
      const filepath = path.resolve(dir, filename);
      const tags = tagsStr.split(',').map((t) => t.trim()).filter(Boolean);

      let fileSize = 0;
      let duration = 0;
      let resolution = 'unknown';
      let aspectRatio = 'unknown';
      let thumbnailPath: string | undefined;

      if (fs.existsSync(filepath)) {
        fileSize = fs.statSync(filepath).size;
        const probe = probeVideo(filepath);
        if (probe) {
          duration = probe.duration;
          resolution = `${probe.width}x${probe.height}`;
          aspectRatio = calcAspectRatio(probe.width, probe.height);
        }
        thumbnailPath = generateThumbnail(filepath, id);
      }

      const entry: BRoll = {
        id,
        filename,
        filepath,
        thumbnailPath,
        duration,
        resolution,
        aspectRatio,
        fileSize,
        description,
        tags,
        source: prompt?.includes('N/A') ? 'other' : 'veo',
        prompt: prompt === 'N/A (pré-existente)' ? undefined : prompt,
        createdAt: date ? new Date(date).toISOString() : new Date().toISOString(),
        usedIn: [],
      };

      added.push(entry);
    }

    brolls.push(...added);
    writeBRolls(brolls);
    res.json({ ok: true, imported: added.length, brolls: added });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/brolls/thumbnail/:id — serve thumbnail image
router.get('/thumbnail/:id', (req, res) => {
  try {
    const brolls = readBRolls();
    const broll = brolls.find((b) => b.id === req.params.id);
    if (!broll?.thumbnailPath || !fs.existsSync(broll.thumbnailPath)) {
      res.status(404).json({ ok: false, error: 'Thumbnail not found' });
      return;
    }
    res.sendFile(broll.thumbnailPath);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/brolls/video/:id — serve video file for preview
router.get('/video/:id', (req, res) => {
  try {
    const brolls = readBRolls();
    const broll = brolls.find((b) => b.id === req.params.id);
    if (!broll || !fs.existsSync(broll.filepath)) {
      res.status(404).json({ ok: false, error: 'Video file not found' });
      return;
    }

    const stat = fs.statSync(broll.filepath);
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': 'video/mp4',
      });
      fs.createReadStream(broll.filepath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Length': stat.size, 'Content-Type': 'video/mp4' });
      fs.createReadStream(broll.filepath).pipe(res);
    }
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
