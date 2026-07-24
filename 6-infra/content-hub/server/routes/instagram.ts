import { Router } from 'express';
import { getCachedInstagramPosts, fetchInstagramPosts } from '../services/instagram.js';
import { generateCommentSuggestions } from '../services/commentAI.js';

const router = Router();

const PAGE_TOKEN = process.env.INSTAGRAM_PAGE_TOKEN || '';
const FB_API = 'https://graph.facebook.com/v21.0';

// Get cached posts (fast)
router.get('/posts', async (_req, res) => {
  const data = await getCachedInstagramPosts();
  res.json({ ok: true, ...data });
});

// Sync: fetch fresh data from Instagram API
router.post('/sync', async (_req, res) => {
  try {
    const result = await fetchInstagramPosts();
    res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error('[Instagram] Sync error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Get comments for a media
router.get('/comments/:mediaId', async (req, res) => {
  try {
    if (!PAGE_TOKEN) throw new Error('INSTAGRAM_PAGE_TOKEN not set');
    const { mediaId } = req.params;
    const limit = req.query.limit || 50;
    const fbRes = await fetch(`${FB_API}/${mediaId}/comments?fields=id,text,username,timestamp,like_count&limit=${limit}&access_token=${PAGE_TOKEN}`);
    const data = await fbRes.json();
    if (data.error) throw new Error(data.error.message);
    res.json({ ok: true, comments: data.data || [] });
  } catch (err: any) {
    console.error('[Instagram] Comments error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Reply to a comment (posts as the Page/Business account)
router.post('/comments/:mediaId/reply', async (req, res) => {
  try {
    if (!PAGE_TOKEN) throw new Error('INSTAGRAM_PAGE_TOKEN not set');
    const { mediaId } = req.params;
    const { message } = req.body;
    if (!message) throw new Error('message is required');

    const fbRes = await fetch(`${FB_API}/${mediaId}/comments?message=${encodeURIComponent(message)}&access_token=${PAGE_TOKEN}`, {
      method: 'POST',
    });
    const data = await fbRes.json();
    if (data.error) throw new Error(data.error.message);
    res.json({ ok: true, commentId: data.id });
  } catch (err: any) {
    console.error('[Instagram] Reply error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Hide or unhide a comment
router.post('/comments/:commentId/hide', async (req, res) => {
  try {
    if (!PAGE_TOKEN) throw new Error('INSTAGRAM_PAGE_TOKEN not set');
    const { commentId } = req.params;
    const hide = req.body.hide !== false; // default true, pass { hide: false } to unhide
    const fbRes = await fetch(`${FB_API}/${commentId}?hide=${hide}&access_token=${PAGE_TOKEN}`, {
      method: 'POST',
    });
    const data = await fbRes.json();
    if (data.error) throw new Error(data.error.message);
    res.json({ ok: true, hidden: hide });
  } catch (err: any) {
    console.error('[Instagram] Hide error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// AI-powered comment suggestions
router.post('/comments/:mediaId/suggest', async (req, res) => {
  try {
    if (!PAGE_TOKEN) throw new Error('INSTAGRAM_PAGE_TOKEN not set');
    const { mediaId } = req.params;
    const { caption } = req.body;

    // Fetch comments first
    const limit = 50;
    const fbRes = await fetch(`${FB_API}/${mediaId}/comments?fields=id,text,username,timestamp,like_count&limit=${limit}&access_token=${PAGE_TOKEN}`);
    const data = await fbRes.json();
    if (data.error) throw new Error(data.error.message);

    const comments = data.data || [];
    if (comments.length === 0) {
      res.json({ ok: true, suggestions: [] });
      return;
    }

    // Generate AI suggestions
    const suggestions = await generateCommentSuggestions(comments, caption || '');
    res.json({ ok: true, suggestions, comments });
  } catch (err: any) {
    console.error('[Instagram] AI suggest error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
