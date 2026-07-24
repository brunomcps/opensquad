import { createClient } from '@supabase/supabase-js';
import { buildTemporalAssociationReport } from '../../../supabase/functions/_shared/association.ts';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function allRows<T>(factory: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { code?: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1_000) {
    const result = await factory(from, from + 999);
    if (result.error) throw new Error(`Supabase read failed: ${result.error.code || 'unknown'}`);
    rows.push(...(result.data || []));
    if ((result.data || []).length < 1_000) return rows;
  }
}

const client = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const end = new Date().toISOString().slice(0, 10);
const start = new Date(Date.parse(`${end}T12:00:00.000Z`) - 180 * 86_400_000).toISOString().slice(0, 10);
const lookback = new Date(Date.parse(`${start}T12:00:00.000Z`) - 28 * 86_400_000).toISOString().slice(0, 10);

const [videos, youtubeDaily, transactions] = await Promise.all([
  allRows<any>((from, to) => client.from('ci_youtube_videos')
    .select('video_id,title,published_at,content_type,thumbnail_url').order('video_id').range(from, to)),
  allRows<any>((from, to) => client.from('ci_youtube_daily')
    .select('video_id,metric_date,views').gte('metric_date', start).lte('metric_date', end)
    .order('video_id').order('metric_date').range(from, to)),
  allRows<any>((from, to) => client.from('ci_hotmart_transactions')
    .select('transaction_id,status,approved_date,order_date,gross_value,gross_currency,fee_value,fee_currency,tracking_src,tracking_sck,tracking_xcod')
    .gte('approved_date', `${lookback}T00:00:00-03:00`).lte('approved_date', `${end}T23:59:59.999-03:00`)
    .order('transaction_id').range(from, to)),
]);

const approved = transactions.filter(row => row.status === 'approved' && row.gross_currency === 'BRL');
const withOrigin = approved.filter(row => row.tracking_src || row.tracking_sck || row.tracking_xcod);
const association = buildTemporalAssociationReport({
  videos,
  youtubeDaily,
  transactions,
  start,
  end,
  currency: 'BRL',
  postWindowDays: 7,
  baselineWeeks: 4,
});

console.log(JSON.stringify({
  ok: true,
  readOnly: true,
  period: { start, end },
  sourceRows: { videos: videos.length, youtubeDaily: youtubeDaily.length, transactions: transactions.length },
  originCoverage: { approvedSales: approved.length, salesWithAnyOrigin: withOrigin.length },
  association: {
    totals: association.totals,
    topObservedDifferences: association.videos.slice(0, 5).map(video => ({
      videoId: video.videoId,
      title: video.title,
      publishedDate: video.publishedDate,
      actualSales: video.actualSales,
      expectedSales: video.expectedSales,
      netDifference: video.netDifference,
      overlapCount: video.overlapCount,
      viewsAvailable: video.views > 0,
    })),
  },
}, null, 2));
