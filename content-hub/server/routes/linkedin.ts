import { Router } from 'express';
import { getCachedLinkedInPosts, scrapeLinkedInProfile } from '../services/linkedin.js';

const router = Router();

const HANDLE = process.env.LINKEDIN_HANDLE || '';

let scraping = false;

// Get cached posts (fast)
router.get('/posts', (_req, res) => {
  const data = getCachedLinkedInPosts();
  res.json({ ok: true, ...data });
});

// Sync: scrape fresh data from LinkedIn profile
router.post('/sync', async (_req, res) => {
  if (scraping) {
    return res.status(429).json({ ok: false, error: 'Scrape already in progress' });
  }
  if (!HANDLE) {
    return res.status(400).json({ ok: false, error: 'LINKEDIN_HANDLE not set in .env' });
  }
  scraping = true;
  try {
    const result = await scrapeLinkedInProfile(HANDLE);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error('[LinkedIn] Sync error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    scraping = false;
  }
});

export default router;
