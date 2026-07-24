import { Router } from 'express';
import { getProductProfiles, getProductDetail } from '../services/infoprodutos.js';
import { getProductContent } from '../services/infoprodutoContent.js';

const router = Router();

// GET /api/infoprodutos — all products with profiles
router.get('/', async (req, res) => {
  try {
    const months = parseInt(req.query.months as string) || 6;
    const data = await getProductProfiles(months);
    res.json({ ok: true, ...data });
  } catch (err: any) {
    console.error('Infoprodutos error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/infoprodutos/:id/content — rich product content
router.get('/:id/content', async (req, res) => {
  try {
    const content = await getProductContent(req.params.id);
    if (!content) return res.status(404).json({ ok: false, error: 'Content not found' });
    res.json({ ok: true, content });
  } catch (err: any) {
    console.error('Product content error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/infoprodutos/:id — single product detail
router.get('/:id', async (req, res) => {
  try {
    const product = await getProductDetail(req.params.id);
    if (!product) return res.status(404).json({ ok: false, error: 'Product not found' });
    res.json({ ok: true, product });
  } catch (err: any) {
    console.error('Infoprodutos detail error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
