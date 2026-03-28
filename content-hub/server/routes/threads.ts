import { Router } from 'express';
import { getCachedThreadsPosts, fetchThreadsPosts } from '../services/threads.js';

const router = Router();

// Get cached posts (fast)
router.get('/posts', async (_req, res) => {
  const data = await getCachedThreadsPosts();
  res.json({ ok: true, ...data });
});

// Sync: fetch fresh data from Threads API
router.post('/sync', async (_req, res) => {
  try {
    const result = await fetchThreadsPosts();
    res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error('[Threads] Sync error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
