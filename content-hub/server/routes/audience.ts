import { Router } from 'express';
import { readFile } from 'fs/promises';
import { join } from 'path';
import {
  searchComments,
  getFilterOptions,
  getStats,
} from '../services/audienceComments.js';

const router = Router();
const DATA_DIR = join(import.meta.dirname, '..', '..', 'data');

router.get('/', async (_req, res) => {
  try {
    const raw = await readFile(join(DATA_DIR, 'audience-insights.json'), 'utf-8');
    res.json(JSON.parse(raw));
  } catch {
    res.json(null);
  }
});

router.get('/comments', async (req, res) => {
  try {
    const filters: Record<string, any> = {};

    if (req.query.video) filters.video = String(req.query.video);
    if (req.query.category) filters.category = String(req.query.category);
    if (req.query.search) filters.search = String(req.query.search);
    if (req.query.relevancia) filters.relevancia = String(req.query.relevancia);

    if (req.query.minLikes) {
      const parsed = parseInt(String(req.query.minLikes));
      if (!isNaN(parsed)) filters.minLikes = parsed;
    }

    if (req.query.isChannelOwner !== undefined) {
      filters.isChannelOwner = String(req.query.isChannelOwner) === 'true';
    }

    if (req.query.limit) {
      const parsed = parseInt(String(req.query.limit));
      if (!isNaN(parsed) && parsed > 0) filters.limit = Math.min(parsed, 500);
    }

    if (req.query.offset) {
      const parsed = parseInt(String(req.query.offset));
      if (!isNaN(parsed) && parsed >= 0) filters.offset = parsed;
    }

    const result = await searchComments(filters);
    res.json(result);
  } catch (err: any) {
    console.error('Error searching comments:', err);
    res.status(500).json({ error: err.message || 'Failed to search comments' });
  }
});

router.get('/comments/stats', async (_req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (err: any) {
    console.error('Error getting comment stats:', err);
    res.status(500).json({ error: err.message || 'Failed to get stats' });
  }
});

router.get('/comments/filters', async (_req, res) => {
  try {
    const options = await getFilterOptions();
    res.json(options);
  } catch (err: any) {
    console.error('Error getting filter options:', err);
    res.status(500).json({ error: err.message || 'Failed to get filter options' });
  }
});

export default router;
