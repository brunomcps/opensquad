import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { saveTikTokVideos, saveLinkedInPosts, saveTwitterPosts } from '../db/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
const router = Router();

const SYNC_SECRET = process.env.SYNC_PUSH_SECRET || '';

// POST /api/sync-push — receive scraped data from local machine
router.post('/', async (req, res) => {
  // Auth check
  const token = req.headers['x-sync-secret'] as string;
  if (!SYNC_SECRET || token !== SYNC_SECRET) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const { files, thumbs } = req.body as {
    files: Record<string, any>;
    thumbs?: Record<string, string>;
  };
  if (!files || typeof files !== 'object') {
    return res.status(400).json({ ok: false, error: 'Missing files object' });
  }

  // Write to filesystem (fallback)
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const saved: string[] = [];

  // Write to DB + filesystem
  for (const [filename, content] of Object.entries(files)) {
    try {
      if (filename === 'tiktok-videos.json' && content.videos) {
        await saveTikTokVideos(content.videos, content.syncedAt || new Date().toISOString());
        fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(content, null, 2), 'utf-8');
        saved.push(filename);
      } else if (filename === 'linkedin-posts.json' && content.posts) {
        await saveLinkedInPosts(content.posts, content.syncedAt || new Date().toISOString());
        fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(content, null, 2), 'utf-8');
        saved.push(filename);
      } else if (filename === 'twitter-posts.json' && content.posts) {
        await saveTwitterPosts(content.posts, content.syncedAt || new Date().toISOString());
        fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(content, null, 2), 'utf-8');
        saved.push(filename);
      }
    } catch (e: any) {
      console.error(`[SyncPush] DB error for ${filename}:`, e.message);
      // Still save to filesystem as fallback
      fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(content, null, 2), 'utf-8');
      saved.push(filename);
    }
  }

  // Save thumbnails to filesystem (still needed for serving)
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

  console.log(`[SyncPush] Received ${saved.length} files (DB+fs), ${thumbCount} thumbnails`);
  res.json({ ok: true, saved, thumbCount });
});

export default router;
