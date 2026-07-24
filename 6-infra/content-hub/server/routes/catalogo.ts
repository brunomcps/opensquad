import { Router } from 'express';
import {
  loadCatalog,
  getCatalog,
  getCatalogCompact,
  findByAlias,
  getCatalogStats,
} from '../services/catalogo.js';

const router = Router();

// --- Reload catalog from vault (OneDrive or filesystem) ---

router.post('/reload', async (_req, res) => {
  try {
    const entries = await loadCatalog();
    res.json({ ok: true, count: entries.length });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- Full catalog ---

router.get('/', async (_req, res) => {
  try {
    const entries = await getCatalog();
    res.json({ ok: true, count: entries.length, entries });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- Compact catalog (for Haiku prompt injection) ---

router.get('/compact', async (_req, res) => {
  try {
    await getCatalog(); // ensure loaded
    const compact = getCatalogCompact();
    res.json({ ok: true, compact });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- Find by alias (fuzzy match) ---

router.get('/find', async (req, res) => {
  const query = req.query.q as string;
  if (!query) return res.status(400).json({ ok: false, error: 'Missing ?q=' });

  try {
    await getCatalog(); // ensure loaded
    const results = findByAlias(query);
    res.json({
      ok: true,
      query,
      count: results.length,
      results: results.slice(0, 5), // top 5
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- Stats ---

router.get('/stats', async (_req, res) => {
  try {
    await getCatalog(); // ensure loaded
    const stats = getCatalogStats();
    res.json({ ok: true, ...stats });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
