import { Router } from 'express';
import {
  getRegistry,
  saveRegistry,
  syncCompetitorPlatform,
  getCompetitorData,
  getCompetitorAllPlatforms,
  getFeed,
  getSyncStatus,
  getCompetitorHistory,
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

// POST /:id/transcript/:videoId — extract transcript for a specific video
router.post('/:id/transcript/:videoId', async (req, res) => {
  const { id, videoId } = req.params;
  const { url, platform } = req.body; // { url: "https://youtube.com/watch?v=...", platform: "youtube" }

  if (!url) return res.status(400).json({ ok: false, error: 'url is required in body' });

  try {
    const { extractYouTubeTranscript, extractShortVideoTranscript } = await import('../services/transcriptExtractor.js');

    let result;
    if (platform === 'youtube') {
      result = await extractYouTubeTranscript(videoId, id, url);
    } else {
      result = await extractShortVideoTranscript(videoId, id, platform || 'tiktok', url);
    }

    res.json({ ok: true, data: result });
  } catch (err: any) {
    console.error(`[transcript error] ${id}/${videoId}:`, err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /:id/transcript/:videoId — get existing transcript
router.get('/:id/transcript/:videoId', async (req, res) => {
  try {
    const { getTranscript } = await import('../services/transcriptExtractor.js');
    const text = await getTranscript(req.params.id, req.params.videoId);
    if (!text) return res.json({ ok: true, data: null, message: 'No transcript yet' });
    res.json({ ok: true, data: { text } });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /:id/comments/:videoId — fetch YouTube comments for a competitor video
router.post('/:id/comments/:videoId', async (req, res) => {
  const { id, videoId } = req.params;
  try {
    const { fetchVideoComments } = await import('../services/comments.js');
    const fsP = await import('fs/promises');
    const pathM = await import('path');
    const { fileURLToPath } = await import('url');
    const dir = pathM.default.dirname(fileURLToPath(import.meta.url));
    const commentsDir = pathM.default.resolve(dir, `../../data/competitors/${id}/comments`);
    await fsP.default.mkdir(commentsDir, { recursive: true });
    const comments = await fetchVideoComments(videoId);
    const data = { videoId, fetchedAt: new Date().toISOString(), totalComments: comments.length, comments: comments.slice(0, 100) };
    await fsP.default.writeFile(pathM.default.join(commentsDir, `${videoId}.json`), JSON.stringify(data, null, 2), 'utf-8');
    res.json({ ok: true, data });
  } catch (err: any) {
    console.error(`[comments error] ${id}/${videoId}:`, err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /:id/comments/:videoId — get cached comments
router.get('/:id/comments/:videoId', async (req, res) => {
  try {
    const fsP = await import('fs/promises');
    const pathM = await import('path');
    const { fileURLToPath } = await import('url');
    const dir = pathM.default.dirname(fileURLToPath(import.meta.url));
    const filePath = pathM.default.resolve(dir, `../../data/competitors/${req.params.id}/comments/${req.params.videoId}.json`);
    const raw = await fsP.default.readFile(filePath, 'utf-8');
    res.json({ ok: true, data: JSON.parse(raw) });
  } catch {
    res.json({ ok: true, data: null, message: 'No comments yet' });
  }
});

// GET /:id/:platform/history — historical snapshots
router.get('/:id/:platform/history', async (req, res) => {
  try {
    const history = await getCompetitorHistory(req.params.id, req.params.platform);
    res.json({ ok: true, data: history });
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
