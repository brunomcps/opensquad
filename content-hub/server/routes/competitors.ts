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
import { detectTrends, getDetectedTrends } from '../services/trendDetector.js';
import { compareToBruno } from '../services/brunoComparison.js';
import { runEmbeddingPipeline, analyzeContentGaps, indexBrunoVideos, indexCompetitorVideos } from '../services/embeddings.js';
import { syncCompetitorAds, getCompetitorAds } from '../services/adLibrary.js';
import { extractYouTubeTranscript, extractShortVideoTranscript, getTranscript } from '../services/transcriptExtractor.js';
import { fetchVideoComments } from '../services/comments.js';
import {
  getBookmarks,
  saveBookmark,
  deleteBookmark,
  getCompetitorFichas,
  getCompetitorFicha,
  saveCompetitorFicha,
  getCompetitorComments,
  saveCompetitorComments,
  getCompetitorRegistry,
  saveCompetitorRegistry,
} from '../db/competitors.js';

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

    const category = (req.query.category as any) || 'all';
    const feed = await getFeed({ competitorIds, platforms, category, sortBy, sortOrder, limit });
    res.json({ ok: true, data: feed });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- Weekly Sync (full automation pipeline) ---

router.post('/weekly-sync', async (_req, res) => {
  try {
    const results: string[] = [];

    const registry = await getRegistry();
    for (const comp of registry.competitors) {
      for (const platform of Object.keys(comp.platforms)) {
        if (!SUPPORTED_PLATFORMS.includes(platform)) continue;
        if (isSyncing(comp.id, platform)) continue;
        try {
          const data = await syncCompetitorPlatform(comp.id, platform);
          results.push(`✓ ${comp.name}/${platform}: ${data.itemCount} items`);
        } catch (err: any) {
          results.push(`✗ ${comp.name}/${platform}: ${err.message}`);
        }
      }
    }

    try {
      const trends = await detectTrends();
      results.push(`✓ Tendências: ${trends.length} detectadas`);
    } catch (err: any) {
      results.push(`✗ Tendências: ${err.message}`);
    }

    try {
      const insights = await compareToBruno();
      results.push(`✓ Comparação Bruno (keywords): ${insights.length} insights`);
    } catch (err: any) {
      results.push(`✗ Comparação Bruno: ${err.message}`);
    }

    // Step 4: Embedding-based analysis (if Voyage API key is set)
    if (process.env.VOYAGE_API_KEY) {
      try {
        const embResult = await runEmbeddingPipeline();
        results.push(`✓ Embeddings: ${embResult.brunoIndexed} Bruno + ${embResult.competitorIndexed} competitor indexed, ${embResult.insights.length} gaps/overlaps`);
      } catch (err: any) {
        results.push(`✗ Embeddings: ${err.message}`);
      }
    }

    res.json({
      ok: true,
      data: { completedAt: new Date().toISOString(), steps: results },
      message: `Weekly sync complete: ${results.filter(r => r.startsWith('✓')).length} succeeded, ${results.filter(r => r.startsWith('✗')).length} failed`,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- Trends ---

router.get('/trends', async (_req, res) => {
  try {
    const trends = await getDetectedTrends();
    res.json({ ok: true, data: trends });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/trends/detect', async (req, res) => {
  try {
    const windowDays = req.body.windowDays || 0;
    const trends = await detectTrends(windowDays);
    res.json({ ok: true, data: trends, message: `Detected ${trends.length} trends` });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- Bruno Comparison ---

router.get('/comparison', async (_req, res) => {
  try {
    // Prefer embedding-based analysis if VOYAGE_API_KEY is set
    if (process.env.VOYAGE_API_KEY) {
      const insights = await analyzeContentGaps();
      if (insights.length > 0) return res.json({ ok: true, data: insights });
    }
    // Fallback to keyword-based
    const insights = await compareToBruno();
    res.json({ ok: true, data: insights });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- Embeddings ---

// POST /embeddings/index — index all videos
router.post('/embeddings/index', async (_req, res) => {
  try {
    const bruno = await indexBrunoVideos();
    const competitor = await indexCompetitorVideos();
    res.json({ ok: true, data: { brunoIndexed: bruno, competitorIndexed: competitor } });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /embeddings/analyze — run full pipeline (index + gap analysis)
router.post('/embeddings/analyze', async (_req, res) => {
  try {
    const result = await runEmbeddingPipeline();
    res.json({ ok: true, data: result });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- Bookmarks ---

router.get('/bookmarks', async (req, res) => {
  try {
    const tag = req.query.tag ? String(req.query.tag) : undefined;
    const bookmarks = await getBookmarks(tag);
    res.json({ ok: true, data: bookmarks });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/bookmarks', async (req, res) => {
  try {
    await saveBookmark(req.body);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/bookmarks/:competitorId/:videoId', async (req, res) => {
  try {
    await deleteBookmark(req.params.competitorId, req.params.videoId);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- Ads (Meta Ad Library) ---

router.get('/ads/:competitorId', async (req, res) => {
  try {
    const ads = await getCompetitorAds(req.params.competitorId);
    res.json({ ok: true, data: ads });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/ads/:competitorId/sync', async (req, res) => {
  try {
    const pageName = req.body.pageName || req.params.competitorId;
    const ads = await syncCompetitorAds(req.params.competitorId, pageName);
    res.json({ ok: true, data: ads, message: `Found ${ads.length} ads` });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- Products/Business ---

router.put('/:id/products', async (req, res) => {
  try {
    const registry = await getCompetitorRegistry();
    const comp = registry.competitors.find((c: any) => c.id === req.params.id);
    if (!comp) return res.status(404).json({ ok: false, error: 'Competitor not found' });
    comp.platforms = { ...comp.platforms, _products: req.body };
    await saveCompetitorRegistry(registry.competitors);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/:id/products', async (req, res) => {
  try {
    const registry = await getCompetitorRegistry();
    const comp = registry.competitors.find((c: any) => c.id === req.params.id);
    if (!comp) return res.status(404).json({ ok: false, error: 'Competitor not found' });
    res.json({ ok: true, data: comp.platforms?._products || null });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- Competitor Fichas ---

router.get('/fichas', async (req, res) => {
  try {
    const competitorId = req.query.competitor ? String(req.query.competitor) : undefined;
    const fichas = await getCompetitorFichas(competitorId);
    res.json({ ok: true, data: fichas });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/fichas/:competitorId/:videoId', async (req, res) => {
  try {
    const ficha = await getCompetitorFicha(req.params.competitorId, req.params.videoId);
    if (!ficha) return res.json({ ok: true, data: null, message: 'No ficha yet' });
    res.json({ ok: true, data: ficha });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/fichas/:competitorId/:videoId', async (req, res) => {
  try {
    await saveCompetitorFicha({
      competitorId: req.params.competitorId,
      videoId: req.params.videoId,
      ...req.body,
    });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- Transcripts ---

router.post('/:id/transcript/:videoId', async (req, res) => {
  const { id, videoId } = req.params;
  const { url, platform } = req.body;
  if (!url) return res.status(400).json({ ok: false, error: 'url is required in body' });
  try {
    const result = platform === 'youtube'
      ? await extractYouTubeTranscript(videoId, id, url)
      : await extractShortVideoTranscript(videoId, id, platform || 'tiktok', url);
    res.json({ ok: true, data: result });
  } catch (err: any) {
    console.error(`[transcript error] ${id}/${videoId}:`, err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/:id/transcript/:videoId', async (req, res) => {
  try {
    const text = await getTranscript(req.params.id, req.params.videoId);
    if (!text) return res.json({ ok: true, data: null, message: 'No transcript yet' });
    res.json({ ok: true, data: { text } });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- Comments ---

router.post('/:id/comments/:videoId', async (req, res) => {
  const { id, videoId } = req.params;
  try {
    const comments = await fetchVideoComments(videoId);
    const sliced = comments.slice(0, 100);
    const data = { videoId, fetchedAt: new Date().toISOString(), totalComments: comments.length, comments: sliced };
    await saveCompetitorComments({ competitorId: id, videoId, fetchedAt: data.fetchedAt, totalComments: comments.length, comments: sliced });
    res.json({ ok: true, data });
  } catch (err: any) {
    console.error(`[comments error] ${id}/${videoId}:`, err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/:id/comments/:videoId', async (req, res) => {
  try {
    const data = await getCompetitorComments(req.params.id, req.params.videoId);
    if (!data) return res.json({ ok: true, data: null, message: 'No comments yet' });
    res.json({ ok: true, data });
  } catch {
    res.json({ ok: true, data: null, message: 'No comments yet' });
  }
});

// --- History & Data ---

router.get('/:id/:platform/history', async (req, res) => {
  try {
    const history = await getCompetitorHistory(req.params.id, req.params.platform);
    res.json({ ok: true, data: history });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/:id/:platform', async (req, res) => {
  try {
    const data = await getCompetitorData(req.params.id, req.params.platform);
    if (!data) return res.json({ ok: true, data: null, message: 'No data yet. Run sync first.' });
    res.json({ ok: true, data });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const data = await getCompetitorAllPlatforms(req.params.id);
    res.json({ ok: true, data });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

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
