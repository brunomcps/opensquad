import { Router } from 'express';
import { getCachedComments, syncVideoComments, syncAllComments } from '../services/comments.js';

const router = Router();

// GET /api/comments/:videoId — get comments for a video (cached or fresh)
router.get('/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const force = req.query.force === 'true';

    // Return cached if available and not forcing refresh
    if (!force) {
      const cached = getCachedComments(videoId);
      if (cached) return res.json({ ok: true, ...cached });
    }

    // Fetch fresh
    const data = await syncVideoComments(videoId);
    res.json({ ok: true, ...data });
  } catch (err: any) {
    console.error('Comments error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/comments/sync — sync all videos
router.post('/sync', async (_req, res) => {
  try {
    res.json({ ok: true, message: 'Sync started' });
    // Run in background after response
    syncAllComments().then(result => {
      console.log(`[comments] Sync complete: ${result.synced} synced, ${result.errors.length} errors`);
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
