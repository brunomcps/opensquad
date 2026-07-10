import { Router } from 'express';
import { getSalesHistory, getSalesSummary, type HotmartSale } from '../services/hotmart.js';

const router = Router();

export function sanitizeHotmartSale(
  sale: HotmartSale,
): Omit<HotmartSale, 'buyerName' | 'buyerEmail'> {
  const { buyerName: _buyerName, buyerEmail: _buyerEmail, ...publicSale } = sale;
  return publicSale;
}

router.get('/sales', async (req, res) => {
  try {
    const { start, end, status } = req.query;
    const sales = await getSalesHistory(
      start as string | undefined,
      end as string | undefined,
      status as string | undefined
    );
    const publicSales = sales.map(sanitizeHotmartSale);
    res.json({ ok: true, sales: publicSales, count: publicSales.length });
  } catch (err: any) {
    console.error('Hotmart API error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const { start, end } = req.query;
    const summary = await getSalesSummary(
      start as string | undefined,
      end as string | undefined
    );
    res.json({ ok: true, summary });
  } catch (err: any) {
    console.error('Hotmart summary error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Monthly comparison: returns last N months of summaries
router.get('/monthly', async (req, res) => {
  try {
    const months = parseInt(req.query.months as string) || 3;
    const now = new Date();
    const results: any[] = [];

    for (let i = 0; i < months; i++) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = i === 0
        ? now
        : new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      try {
        const summary = await getSalesSummary(start.toISOString(), end.toISOString());
        results.push({
          month: start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
          monthKey: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
          ...summary,
        });
      } catch {
        results.push({
          month: start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
          monthKey: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
          totalSales: 0, totalRevenue: 0, totalRefunds: 0, netRevenue: 0, products: [],
          periodStart: start.toISOString(), periodEnd: end.toISOString(),
        });
      }
    }

    res.json({ ok: true, months: results });
  } catch (err: any) {
    console.error('Hotmart monthly error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Legacy endpoint deliberately disabled. The validated endpoint lives under
// /api/commercial-intel/hotmart/webhook.
router.post('/webhook', (_req, res) => {
  res.status(410).json({
    ok: false,
    error: {
      code: 'webhook_moved',
      message: 'Use o webhook validado da Inteligência Comercial.',
    },
  });
});

export default router;
