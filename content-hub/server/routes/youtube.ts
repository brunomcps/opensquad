import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getChannelVideos, getChannelStats, updateVideo, getCompetitorStats } from '../services/youtube.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMPETITORS_PATH = path.resolve(__dirname, '../../data/competitors.json');

function readCompetitors() {
  try { return JSON.parse(fs.readFileSync(COMPETITORS_PATH, 'utf-8')); }
  catch { return []; }
}
function writeCompetitors(data: any[]) {
  fs.writeFileSync(COMPETITORS_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

const router = Router();

router.get('/videos', async (_req, res) => {
  try {
    const videos = await getChannelVideos();
    res.json({ ok: true, videos });
  } catch (err: any) {
    console.error('YouTube API error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/channel-stats', async (_req, res) => {
  try {
    const stats = await getChannelStats();
    res.json({ ok: true, stats });
  } catch (err: any) {
    console.error('YouTube channel stats error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put('/videos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, tags, categoryId } = req.body;
    const result = await updateVideo(id, { title, description, tags, categoryId });
    res.json({ ok: true, video: result });
  } catch (err: any) {
    console.error('YouTube update error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/competitor/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const data = await getCompetitorStats(channelId);
    res.json({ ok: true, competitor: data });
  } catch (err: any) {
    console.error('Competitor stats error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Saved competitors persistence
router.get('/competitors', (_req, res) => {
  res.json({ ok: true, competitors: readCompetitors() });
});

router.post('/competitors', (req, res) => {
  const competitors = readCompetitors();
  const entry = req.body;
  if (competitors.some((c: any) => c.channelId === entry.channelId)) {
    return res.status(409).json({ ok: false, error: 'Ja adicionado' });
  }
  competitors.push(entry);
  writeCompetitors(competitors);
  res.status(201).json({ ok: true });
});

router.delete('/competitors/:channelId', (req, res) => {
  const competitors = readCompetitors().filter((c: any) => c.channelId !== req.params.channelId);
  writeCompetitors(competitors);
  res.json({ ok: true });
});

export default router;
