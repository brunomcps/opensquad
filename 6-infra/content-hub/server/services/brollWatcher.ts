import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(__dirname, '../../data/brolls.json');
const THUMBNAILS_DIR = path.resolve(__dirname, '../../data/thumbnails');

const VIDEO_EXTENSIONS = /\.(mp4|webm|mov)$/i;
const IGNORE_PATTERNS = /(\.(tmp|crdownload|part)|~\$|\.onedrive)/i;
const DEBOUNCE_MS = 3000;
const STABLE_CHECK_MS = 1500;

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
  usedIn: any[];
}

function readBRolls(): BRoll[] {
  if (!fs.existsSync(DATA_PATH)) return [];
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
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
  return `broll-${String(Math.max(...nums) + 1).padStart(3, '0')}`;
}

function probeVideo(filepath: string): { duration: number; width: number; height: number } | null {
  try {
    const out = execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -show_entries format=duration -of json "${filepath}"`,
      { timeout: 10000 }
    ).toString();
    const data = JSON.parse(out);
    const stream = data.streams?.[0] || {};
    const dur = parseFloat(stream.duration || data.format?.duration || '0');
    return { duration: Math.round(dur * 10) / 10, width: stream.width || 0, height: stream.height || 0 };
  } catch {
    return null;
  }
}

function generateThumbnail(filepath: string, id: string): string | undefined {
  if (!fs.existsSync(THUMBNAILS_DIR)) fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
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

function extractTagsFromPath(filepath: string, watchRoot: string): string[] {
  const relative = path.relative(watchRoot, filepath);
  const parts = relative.split(path.sep);
  // All parts except the filename are subfolder names = tags
  return parts.slice(0, -1).map((p) => p.toLowerCase());
}

function descriptionFromFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')       // remove extension
    .replace(/^broll-\d+-/, '')    // remove broll-NNN- prefix
    .replace(/[-_]/g, ' ')        // dashes/underscores to spaces
    .replace(/\s+/g, ' ')         // collapse whitespace
    .trim();
}

async function waitForStableFile(filepath: string): Promise<boolean> {
  // Wait for file size to stop changing (copy complete)
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const size1 = fs.statSync(filepath).size;
      await new Promise((r) => setTimeout(r, STABLE_CHECK_MS));
      if (!fs.existsSync(filepath)) return false;
      const size2 = fs.statSync(filepath).size;
      if (size1 === size2 && size1 > 0) return true;
    } catch {
      return false;
    }
  }
  return false;
}

// Debounce map to avoid processing the same file multiple times
const pending = new Map<string, NodeJS.Timeout>();

function processFile(filepath: string, watchRoot: string) {
  // Clear any existing debounce for this file
  const existing = pending.get(filepath);
  if (existing) clearTimeout(existing);

  pending.set(filepath, setTimeout(async () => {
    pending.delete(filepath);

    // Validate
    if (!fs.existsSync(filepath)) return;
    if (IGNORE_PATTERNS.test(filepath)) return;
    if (!VIDEO_EXTENSIONS.test(filepath)) return;

    // Wait for copy to complete
    const stable = await waitForStableFile(filepath);
    if (!stable) {
      console.log(`[watcher] File not stable, skipping: ${path.basename(filepath)}`);
      return;
    }

    // Check if already indexed
    const brolls = readBRolls();
    const absPath = path.resolve(filepath);
    if (brolls.some((b) => b.filepath === absPath)) {
      return; // Already in library
    }

    // Process
    const id = getNextId(brolls);
    const stats = fs.statSync(filepath);
    const probe = probeVideo(filepath);
    const thumbnailPath = generateThumbnail(filepath, id);
    const tags = extractTagsFromPath(filepath, watchRoot);

    const entry: BRoll = {
      id,
      filename: path.basename(filepath),
      filepath: absPath,
      thumbnailPath,
      duration: probe?.duration || 0,
      resolution: probe ? `${probe.width}x${probe.height}` : 'unknown',
      aspectRatio: probe ? calcAspectRatio(probe.width, probe.height) : 'unknown',
      fileSize: stats.size,
      description: descriptionFromFilename(path.basename(filepath)),
      tags,
      source: 'other',
      createdAt: new Date().toISOString(),
      usedIn: [],
    };

    brolls.push(entry);
    writeBRolls(brolls);
    console.log(`[watcher] Added: ${entry.id} — ${entry.filename} [${tags.join(', ') || 'no tags'}]`);
  }, DEBOUNCE_MS));
}

function handleDelete(filepath: string) {
  const absPath = path.resolve(filepath);
  const brolls = readBRolls();
  const idx = brolls.findIndex((b) => b.filepath === absPath);
  if (idx === -1) return;

  const removed = brolls[idx];
  // Remove thumbnail
  if (removed.thumbnailPath && fs.existsSync(removed.thumbnailPath)) {
    try { fs.unlinkSync(removed.thumbnailPath); } catch { /* ignore */ }
  }
  brolls.splice(idx, 1);
  writeBRolls(brolls);
  console.log(`[watcher] Removed: ${removed.id} — ${removed.filename}`);
}

export function startBRollWatcher(watchDir: string) {
  if (!fs.existsSync(watchDir)) {
    fs.mkdirSync(watchDir, { recursive: true });
  }

  const watcher = chokidar.watch(watchDir, {
    persistent: true,
    ignoreInitial: false,        // Process existing files on startup
    depth: 5,                    // Support nested subfolders
    awaitWriteFinish: false,     // We handle this ourselves with waitForStableFile
    ignored: (filePath: string) => {
      // Ignore non-video files and temp files
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) return false;
      if (IGNORE_PATTERNS.test(filePath)) return true;
      if (!VIDEO_EXTENSIONS.test(filePath)) return true;
      return false;
    },
  });

  watcher
    .on('add', (fp) => processFile(fp, watchDir))
    .on('unlink', (fp) => handleDelete(fp))
    .on('error', (err) => console.error('[watcher] Error:', err));

  console.log(`[watcher] Watching: ${watchDir}`);
  return watcher;
}
