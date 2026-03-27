import { Router } from 'express';
import { getCachedFacebookPosts, fetchFacebookPosts } from '../services/facebook.js';

const router = Router();

// Get cached posts (fast)
router.get('/posts', (_req, res) => {
  const data = getCachedFacebookPosts();
  res.json({ ok: true, ...data });
});

// Sync: fetch fresh data from Facebook API
router.post('/sync', async (_req, res) => {
  try {
    const result = await fetchFacebookPosts();
    res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error('[Facebook] Sync error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
