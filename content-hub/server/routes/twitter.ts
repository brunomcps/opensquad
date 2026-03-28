import { Router } from 'express';
import { getCachedTwitterPosts, scrapeTwitterProfile } from '../services/twitter.js';

const router = Router();

const TWITTER_HANDLE = process.env.TWITTER_HANDLE || 'brunosallesphd';

// Get cached posts (fast, no Playwright)
router.get('/posts', async (_req, res) => {
  const data = await getCachedTwitterPosts();
  res.json({ ok: true, ...data });
});

// Sync: trigger Playwright scrape (slow, ~10-15s)
let syncing = false;

router.post('/sync', async (_req, res) => {
  if (syncing) {
    return res.status(409).json({ ok: false, error: 'Sync already in progress' });
  }

  syncing = true;
  try {
    const result = await scrapeTwitterProfile(TWITTER_HANDLE);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error('[Twitter] Sync error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    syncing = false;
  }
});

export default router;
