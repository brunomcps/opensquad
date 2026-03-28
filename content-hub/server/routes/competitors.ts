import { Router } from 'express';
import {
  getRegistry,
  saveRegistry,
  syncCompetitorPlatform,
  getCompetitorData,
  getCompetitorAllPlatforms,
  getFeed,
  getSyncStatus,
  isSyncing,
  SUPPORTED_PLATFORMS,
} from '../services/apifyCompetitors.js';

const router = Router();

// GET /registry — returns competitor list
router.get('/registry', async (_req, res) => {
  try {
    const registry = await getRegistry();
    res.json({ ok: true, data: registry });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// PUT /registry — update competitor list
router.put('/registry', async (req, res) => {
  try {
    await saveRegistry(req.body);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /status — sync status for all competitors
router.get('/status', async (_req, res) => {
  try {
    const status = await getSyncStatus();
    res.json({ ok: true, data: status });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /feed — aggregated content feed with query params
router.get('/feed', async (req, res) => {
  try {
    const competitorIds = req.query.competitors ? String(req.query.competitors).split(',') : undefined;
    const platforms = req.query.platforms ? String(req.query.platforms).split(',') : undefined;
    const sortBy = (req.query.sortBy as any) || 'date';
    const sortOrder = (req.query.sortOrder as any) || 'desc';
    const limit = req.query.limit ? parseInt(String(req.query.limit)) : 200;

    const feed = await getFeed({ competitorIds, platforms, sortBy, sortOrder, limit });
    res.json({ ok: true, data: feed });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /:id/:platform — cached data for one competitor+platform
router.get('/:id/:platform', async (req, res) => {
  try {
    const data = await getCompetitorData(req.params.id, req.params.platform);
    if (!data) return res.json({ ok: true, data: null, message: 'No data yet. Run sync first.' });
    res.json({ ok: true, data });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /:id — all platform data for one competitor
router.get('/:id', async (req, res) => {
  try {
    const data = await getCompetitorAllPlatforms(req.params.id);
    res.json({ ok: true, data });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /:id/:platform/sync — trigger Apify scrape
router.post('/:id/:platform/sync', async (req, res) => {
  const { id, platform } = req.params;

  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    return res.status(400).json({ ok: false, error: `Unsupported platform: ${platform}. Supported: ${SUPPORTED_PLATFORMS.join(', ')}` });
  }

  if (isSyncing(id, platform)) {
    return res.status(409).json({ ok: false, error: `Sync already in progress for ${id}/${platform}` });
  }

  try {
    const data = await syncCompetitorPlatform(id, platform);
    res.json({ ok: true, data, message: `Synced ${data.itemCount} items` });
  } catch (err: any) {
    console.error(`[sync error] ${id}/${platform}:`, err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
