import { Router } from 'express';
import { getSalesHistory, getSalesSummary } from '../services/hotmart.js';

const router = Router();

router.get('/sales', async (req, res) => {
  try {
    const { start, end, status } = req.query;
    const sales = await getSalesHistory(
      start as string | undefined,
      end as string | undefined,
      status as string | undefined
    );
    res.json({ ok: true, sales, count: sales.length });
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

// Webhook handler for real-time events
router.post('/webhook', (req, res) => {
  const event = req.body;
  console.log('[Hotmart Webhook]', event?.event || 'unknown', JSON.stringify(event).slice(0, 200));
  res.status(200).json({ ok: true });
});

export default router;
