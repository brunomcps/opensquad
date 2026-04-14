import { Router } from 'express';
import { getChannelVideos } from '../services/youtube.js';
import { getSalesHistory } from '../services/hotmart.js';

const router = Router();

interface VideoRevenue {
  videoId: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  isShort: boolean;
  views: number;
  likes: number;
  salesCount: number;
  revenue: number;
  revenuePerView: number;
  topProduct: string;
}

router.get('/content-revenue', async (req, res) => {
  try {
    const windowDays = parseInt(req.query.window as string) || 7;

    // Fetch both datasets in parallel
    const [videos, sales] = await Promise.all([
      getChannelVideos(),
      getSalesHistory(),  // defaults to current month; get all available
    ]);

    // Also fetch previous months for better coverage
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    let allSales = sales;
    try {
      const olderSales = await getSalesHistory(threeMonthsAgo.toISOString(), now.toISOString());
      // Deduplicate by transactionId
      const seen = new Set(allSales.map(s => s.transactionId));
      for (const s of olderSales) {
        if (!seen.has(s.transactionId)) {
          allSales.push(s);
          seen.add(s.transactionId);
        }
      }
    } catch { /* older sales fetch failed, use current month only */ }

    // For each video, count sales in the window after publication
    const windowMs = windowDays * 24 * 60 * 60 * 1000;
    const results: VideoRevenue[] = [];

    for (const video of videos) {
      if (video.privacyStatus !== 'public') continue;

      const pubDate = new Date(video.publishedAt);
      const windowEnd = new Date(pubDate.getTime() + windowMs);

      const windowSales = allSales.filter(sale => {
        const saleDate = new Date(sale.purchaseDate);
        return saleDate >= pubDate && saleDate <= windowEnd;
      });

      const revenue = windowSales.reduce((sum, s) => sum + s.netPrice, 0);

      // Find most sold product in this window
      const productCounts = new Map<string, number>();
      for (const s of windowSales) {
        productCounts.set(s.productName, (productCounts.get(s.productName) || 0) + 1);
      }
      const topProduct = [...productCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';

      results.push({
        videoId: video.id,
        title: video.title,
        thumbnail: video.thumbnail,
        publishedAt: video.publishedAt,
        isShort: video.isShort,
        views: video.viewCount || 0,
        likes: video.likeCount || 0,
        salesCount: windowSales.length,
        revenue,
        revenuePerView: video.viewCount ? revenue / video.viewCount : 0,
        topProduct: topProduct.replace(/·.*/, '').trim(),
      });
    }

    // Sort by revenue descending
    results.sort((a, b) => b.revenue - a.revenue);

    // Daily overlay: sales per day for timeline chart
    const dailySales = new Map<string, number>();
    for (const s of allSales) {
      const day = s.purchaseDate.slice(0, 10);
      dailySales.set(day, (dailySales.get(day) || 0) + s.netPrice);
    }

    const dailyPublications = new Map<string, string[]>();
    for (const v of videos) {
      if (v.privacyStatus !== 'public') continue;
      const day = v.publishedAt.slice(0, 10);
      const existing = dailyPublications.get(day) || [];
      existing.push(v.title);
      dailyPublications.set(day, existing);
    }

    // Build timeline (last 90 days)
    const timeline: { date: string; revenue: number; publications: string[] }[] = [];
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    for (let d = new Date(ninetyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
      const day = d.toISOString().slice(0, 10);
      timeline.push({
        date: day,
        revenue: dailySales.get(day) || 0,
        publications: dailyPublications.get(day) || [],
      });
    }

    // Summary stats
    const totalRevenue = results.reduce((sum, r) => sum + r.revenue, 0);
    const topConverters = results
      .filter(r => r.views > 100 && r.revenue > 0)
      .sort((a, b) => b.revenuePerView - a.revenuePerView)
      .slice(0, 5);

    res.json({
      ok: true,
      windowDays,
      totalVideos: results.length,
      videosWithSales: results.filter(r => r.revenue > 0).length,
      totalRevenue,
      topByRevenue: results.slice(0, 15),
      topByConversion: topConverters,
      timeline,
    });
  } catch (err: any) {
    console.error('Content-revenue error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
