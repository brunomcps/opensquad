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

  const { files } = req.body as { files: Record<string, any> };
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

  console.log(`[SyncPush] Received ${saved.length} files: ${saved.join(', ')}`);
  res.json({ ok: true, saved });
});

export default router;
