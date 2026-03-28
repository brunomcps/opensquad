import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
const router = Router();

const SYNC_SECRET = process.env.SYNC_PUSH_SECRET || '';

// Allowed files that can be pushed
const ALLOWED_FILES = [
  'tiktok-videos.json',
  'linkedin-posts.json',
  'twitter-posts.json',
];

// POST /api/sync-push — receive scraped data from local machine
router.post('/', (req, res) => {
  // Auth check
  const token = req.headers['x-sync-secret'] as string;
  if (!SYNC_SECRET || token !== SYNC_SECRET) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const { files, thumbs } = req.body as {
    files: Record<string, any>;
    thumbs?: Record<string, string>; // filename → base64
  };
  if (!files || typeof files !== 'object') {
    return res.status(400).json({ ok: false, error: 'Missing files object' });
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const saved: string[] = [];
  for (const [filename, content] of Object.entries(files)) {
    if (!ALLOWED_FILES.includes(filename)) continue;
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');
    saved.push(filename);
  }

  // Save thumbnails
  let thumbCount = 0;
  if (thumbs && typeof thumbs === 'object') {
    const thumbDir = path.join(DATA_DIR, 'tiktok-thumbs');
    if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });
    for (const [filename, base64] of Object.entries(thumbs)) {
      if (!filename.endsWith('.jpg')) continue;
      const thumbPath = path.join(thumbDir, filename);
      fs.writeFileSync(thumbPath, Buffer.from(base64, 'base64'));
      thumbCount++;
    }
  }

  console.log(`[SyncPush] Received ${saved.length} files, ${thumbCount} thumbnails`);
  res.json({ ok: true, saved, thumbCount });
});

export default router;
