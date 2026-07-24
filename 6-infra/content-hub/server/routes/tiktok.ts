import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getCachedTikTokVideos, scrapeTikTokProfile } from '../services/tiktok.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

const TIKTOK_HANDLE = 'brunosallesphd';

// Get cached videos (fast, no Playwright)
router.get('/videos', async (_req, res) => {
  const data = await getCachedTikTokVideos();
  res.json({ ok: true, ...data });
});

// Sync: trigger Playwright scrape (slow, ~10-15s)
let syncing = false;

router.post('/sync', async (_req, res) => {
  if (syncing) {
    return res.status(409).json({ ok: false, error: 'Sincronizacao ja em andamento' });
  }

  syncing = true;
  try {
    const result = await scrapeTikTokProfile(TIKTOK_HANDLE);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error('[TikTok] Sync error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    syncing = false;
  }
});

// Serve cached thumbnails (local fallback, redirect to Supabase Storage if missing)
router.get('/thumb/:filename', (req, res) => {
  const thumbPath = path.resolve(__dirname, '../../data/tiktok-thumbs', req.params.filename);
  if (fs.existsSync(thumbPath)) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(thumbPath).pipe(res);
  } else {
    // Redirect to Supabase Storage
    const supabaseUrl = process.env.SUPABASE_URL || 'https://vdaualgktroizsttbrfh.supabase.co';
    const storagePath = `bruno-tiktok/${req.params.filename}`;
    res.redirect(`${supabaseUrl}/storage/v1/object/public/thumbnails/${storagePath}`);
  }
});

export default router;
