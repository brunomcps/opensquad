import { Router } from 'express';
import { getCachedAnalytics, syncVideoAnalytics, syncAllAnalytics } from '../services/youtubeAnalytics.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LONGOS_DIR = path.resolve(__dirname, '../../../youtube/by-video/longos');

const router = Router();

// GET /api/yt-analytics/:videoId — get analytics for a video (cached or fresh)
router.get('/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const force = req.query.force === 'true';

    if (!force) {
      const cached = await getCachedAnalytics(videoId);
      if (cached) return res.json({ ok: true, ...cached });
    }

    const data = await syncVideoAnalytics(videoId);
    res.json({ ok: true, ...data });
  } catch (err: any) {
    console.error('YT Analytics error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/yt-analytics/sync — sync all videos
router.post('/sync', async (_req, res) => {
  try {
    res.json({ ok: true, message: 'Analytics sync started' });
    syncAllAnalytics().then(result => {
      console.log(`[yt-analytics] Sync complete: ${result.synced.length} synced, ${result.errors.length} errors`);
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/yt-analytics — list all cached analytics
router.get('/', async (_req, res) => {
  try {
    if (!fs.existsSync(LONGOS_DIR)) {
      return res.json({ ok: true, count: 0, analytics: [] });
    }

    const dirs = fs.readdirSync(LONGOS_DIR, { withFileTypes: true }).filter(d => d.isDirectory());
    const analytics: any[] = [];

    for (const dir of dirs) {
      const analyticsPath = path.join(LONGOS_DIR, dir.name, 'analytics.json');
      if (fs.existsSync(analyticsPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(analyticsPath, 'utf-8'));
          analytics.push(data);
        } catch { /* skip */ }
      }
    }

    res.json({ ok: true, count: analytics.length, analytics });
  } catch (err: any) {
    console.error('YT Analytics list error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
