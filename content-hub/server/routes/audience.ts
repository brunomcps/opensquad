import { Router } from 'express';
import { readFile } from 'fs/promises';
import { join } from 'path';
import {
  searchComments,
  getFilterOptions,
  getStats,
} from '../services/audienceComments.js';
import { supabase } from '../db/client.js';
import {
  getStats as getStatsV2,
  getDimensionData,
  getDimensionSummaries,
  getCrossTabulation,
  searchComments as searchCommentsV2,
  getCommentDetail,
  getSuperfans,
  getSubclusters,
  getInsights,
  getAudienceSegments,
  getSegmentComments,
} from '../services/audienceIntelligence.js';

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

// ============================================================
// V2 Endpoints — Audience Intelligence
// ============================================================

// Overall stats
router.get('/v2/stats', async (_req, res) => {
  try {
    const stats = await getStatsV2();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dimension summaries (Level 2 cards)
router.get('/v2/dimensions', async (_req, res) => {
  try {
    const summaries = await getDimensionSummaries();
    res.json(summaries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dimension detail (Level 3)
router.get('/v2/dimension/:dim', async (req, res) => {
  try {
    const data = await getDimensionData(req.params.dim);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Filtered comment list (Level 5)
router.get('/v2/comments', async (req, res) => {
  try {
    const filters: any = {};
    const strFields = ['tipo', 'sentimento', 'sinal_conteudo', 'sinal_produto', 'sinal_copy', 'sinal_metodo',
      'categoria', 'video_id', 'perfil_genero', 'perfil_diagnostico', 'perfil_faixa_etaria', 'elogio_tipo', 'search', 'sort', 'author_channel_url'];
    for (const f of strFields) {
      if (req.query[f]) filters[f] = String(req.query[f]);
    }
    if (req.query.min_likes) filters.min_likes = parseInt(String(req.query.min_likes));
    if (req.query.min_peso_social) filters.min_peso_social = parseInt(String(req.query.min_peso_social));
    if (req.query.is_superfan === 'true') filters.is_superfan = true;
    if (req.query.tem_demanda === 'true') filters.tem_demanda = true;
    if (req.query.exclude_team === 'false') filters.exclude_team = false;
    if (req.query.comment_ids) {
      try { filters.comment_ids = JSON.parse(String(req.query.comment_ids)); } catch {}
    }
    if (req.query.limit) filters.limit = parseInt(String(req.query.limit));
    if (req.query.offset) filters.offset = parseInt(String(req.query.offset));

    const result = await searchCommentsV2(filters);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Single comment detail
router.get('/v2/comments/:id', async (req, res) => {
  try {
    const comment = await getCommentDetail(req.params.id);
    res.json(comment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Cross-tabulation
router.get('/v2/cross/:dim1/:dim2', async (req, res) => {
  try {
    const matrix = await getCrossTabulation(req.params.dim1, req.params.dim2);
    res.json(matrix);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Superfans (paginated)
router.get('/v2/superfans', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit)) : 200;
    const offset = req.query.offset ? parseInt(String(req.query.offset)) : 0;
    const data = await getSuperfans(limit, offset);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Superfan profile
router.get('/v2/superfans/profile/:authorUrl', async (req, res) => {
  try {
    const { getAudSuperfanProfile } = await import('../db/audience.js');
    const data = await getAudSuperfanProfile(decodeURIComponent(req.params.authorUrl));
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Comments filtered by subcluster ID
router.get('/v2/subclusters/:subclusterId/comments', async (req, res) => {
  try {
    const { data: sc } = await supabase.from('aud_subclusters').select('comment_ids').eq('id', req.params.subclusterId).single();
    if (!sc || !sc.comment_ids || sc.comment_ids.length === 0) return res.json({ items: [], total: 0 });
    const ids = sc.comment_ids as string[];
    const limit = Math.min(parseInt(String(req.query.limit || '50')), 200);
    const offset = parseInt(String(req.query.offset || '0'));

    // For large ID sets (>300), use chunked fetching to avoid PostgREST URL limits
    if (ids.length > 300) {
      // Fetch in chunks, merge, sort, paginate in-memory
      const CHUNK = 250;
      let allRows: any[] = [];
      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        const { data: chunkData } = await supabase.from('aud_comments')
          .select('*')
          .in('id', chunk)
          .order('peso_social', { ascending: false })
          .limit(limit + offset); // only need top N per chunk
        if (chunkData) allRows.push(...chunkData);
      }
      // Dedupe, sort, paginate
      const seen = new Set<string>();
      allRows = allRows.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
      allRows.sort((a, b) => (b.peso_social || 0) - (a.peso_social || 0));
      const total = ids.length;
      const items = allRows.slice(offset, offset + limit);
      res.json({ items, total });
    } else {
      const { data, count } = await supabase.from('aud_comments')
        .select('*', { count: 'exact' })
        .in('id', ids)
        .order('peso_social', { ascending: false })
        .range(offset, offset + limit - 1);
      res.json({ items: data || [], total: count || 0 });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Subclusters (filtered by parent value)
router.get('/v2/subclusters/:dim/:val', async (req, res) => {
  try {
    const data = await getSubclusters(req.params.dim, req.params.val);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Subclusters (all for a dimension — no parent filter)
router.get('/v2/subclusters-all/:dim', async (req, res) => {
  try {
    const data = await getSubclusters(req.params.dim, undefined);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Insights
router.get('/v2/insights', async (req, res) => {
  try {
    const level = req.query.level ? parseInt(String(req.query.level)) : undefined;
    const dimension = req.query.dimension ? String(req.query.dimension) : undefined;
    const data = await getInsights(level, dimension);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Segment comments (by segment ID)
router.get('/v2/segments/:id/comments', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit)) : 50;
    const offset = req.query.offset ? parseInt(String(req.query.offset)) : 0;
    const data = await getSegmentComments(req.params.id, limit, offset);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Audience segments (3 layers)
router.get('/v2/segments', async (_req, res) => {
  try {
    const data = await getAudienceSegments();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
