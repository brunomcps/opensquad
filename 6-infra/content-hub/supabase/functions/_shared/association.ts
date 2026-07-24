import { CommercialIntelligenceError } from './errors.ts';

export interface AssociationVideo {
  video_id: string;
  title: string;
  published_at: string | null;
  content_type: string;
  thumbnail_url: string | null;
}

export interface AssociationYoutubeDaily {
  video_id: string;
  metric_date: string;
  views: number | string;
}

export interface AssociationTransaction {
  status: string;
  approved_date: string | null;
  order_date: string | null;
  gross_value: number | string | null;
  gross_currency: string | null;
  fee_value: number | string | null;
  fee_currency: string | null;
}

export interface TemporalAssociationReport {
  period: { start: string; end: string; currency: string };
  method: {
    label: 'Associação temporal exploratória';
    postWindowDays: number;
    baselineWeeks: number;
    description: string;
    warning: string;
  };
  totals: {
    videosPublished: number;
    videosAnalyzed: number;
    aboveBaseline: number;
    belowBaseline: number;
    insufficientData: number;
  };
  videos: Array<{
    videoId: string;
    title: string;
    publishedDate: string;
    contentType: string;
    thumbnailUrl: string | null;
    postWindow: { start: string; end: string };
    views: number;
    actualSales: number;
    expectedSales: number;
    salesDifference: number;
    actualNetAfterFees: number;
    expectedNetAfterFees: number;
    netDifference: number;
    netDifferenceRate: number | null;
    overlapCount: number;
    signal: 'above' | 'below' | 'flat';
    warnings: string[];
  }>;
}

const DAY_MS = 86_400_000;
const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
});

function businessDate(value: string): string | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const parts = Object.fromEntries(formatter.formatToParts(parsed).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T12:00:00.000Z`).toISOString().slice(0, 10) === value;
}

function shift(date: string, days: number): string {
  return new Date(Date.parse(`${date}T12:00:00.000Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

function dates(start: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => shift(start, index));
}

function numberValue(value: number | string | null): number | null {
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundRatio(value: number): number {
  return Math.round((value + Number.EPSILON) * 10_000) / 10_000;
}

export function parseAssociationFilters(url: URL, now = new Date()): {
  start: string; end: string; currency: string; postWindowDays: number; baselineWeeks: number;
} {
  const today = businessDate(now.toISOString()) || now.toISOString().slice(0, 10);
  const start = url.searchParams.get('start') || shift(today, -180);
  const end = url.searchParams.get('end') || today;
  const currency = (url.searchParams.get('currency') || 'BRL').trim().toUpperCase();
  const postWindowDays = Number(url.searchParams.get('window') || 7);
  const baselineWeeks = Number(url.searchParams.get('baselineWeeks') || 4);
  if (!validDate(start) || !validDate(end) || start > end) {
    throw new CommercialIntelligenceError('invalid_period', 'Período inválido.', 400);
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new CommercialIntelligenceError('invalid_currency', 'Moeda inválida.', 400);
  }
  if (![7, 14].includes(postWindowDays) || baselineWeeks < 2 || baselineWeeks > 8) {
    throw new CommercialIntelligenceError('invalid_association_method', 'Parâmetros da análise inválidos.', 400);
  }
  return { start, end, currency, postWindowDays, baselineWeeks };
}

export function buildTemporalAssociationReport(input: {
  videos: AssociationVideo[];
  youtubeDaily: AssociationYoutubeDaily[];
  transactions: AssociationTransaction[];
  start: string;
  end: string;
  currency?: string;
  postWindowDays?: number;
  baselineWeeks?: number;
}): TemporalAssociationReport {
  const currency = (input.currency || 'BRL').toUpperCase();
  const postWindowDays = input.postWindowDays || 7;
  const baselineWeeks = input.baselineWeeks || 4;
  const dailySales = new Map<string, { sales: number; net: number }>();
  let earliestObservedDate: string | null = null;

  for (const transaction of input.transactions) {
    if (transaction.status !== 'approved' || transaction.gross_currency?.toUpperCase() !== currency) continue;
    const date = businessDate(transaction.approved_date || transaction.order_date || '');
    if (!date) continue;
    if (!earliestObservedDate || date < earliestObservedDate) earliestObservedDate = date;
    const current = dailySales.get(date) || { sales: 0, net: 0 };
    current.sales += 1;
    const gross = numberValue(transaction.gross_value);
    const fee = transaction.fee_currency?.toUpperCase() === currency ? numberValue(transaction.fee_value) : null;
    if (gross !== null && fee !== null) current.net += gross - fee;
    dailySales.set(date, current);
  }

  const views = new Map<string, number>();
  for (const row of input.youtubeDaily) {
    const parsed = Number(row.views);
    if (Number.isFinite(parsed)) views.set(`${row.video_id}:${row.metric_date}`, parsed);
  }

  const published = input.videos.map(video => ({ video, date: video.published_at ? businessDate(video.published_at) : null }))
    .filter((item): item is { video: AssociationVideo; date: string } => Boolean(item.date))
    .filter(item => item.date >= input.start && item.date <= input.end)
    .sort((left, right) => left.date.localeCompare(right.date));

  let insufficientData = 0;
  const results: TemporalAssociationReport['videos'] = [];

  for (const item of published) {
    const postEnd = shift(item.date, postWindowDays - 1);
    const earliestBaseline = shift(item.date, -7 * baselineWeeks);
    if (postEnd > input.end || !earliestObservedDate || earliestBaseline < earliestObservedDate) {
      insufficientData += 1;
      continue;
    }

    const postDates = dates(item.date, postWindowDays);
    let actualSales = 0;
    let actualNet = 0;
    let expectedSales = 0;
    let expectedNet = 0;

    for (const postDate of postDates) {
      const actual = dailySales.get(postDate) || { sales: 0, net: 0 };
      actualSales += actual.sales;
      actualNet += actual.net;
      let firstBaselineDate = shift(postDate, -7);
      while (firstBaselineDate >= item.date) firstBaselineDate = shift(firstBaselineDate, -7);
      const baselineDates = Array.from({ length: baselineWeeks }, (_, index) => shift(firstBaselineDate, -7 * index));
      expectedSales += baselineDates.reduce((total, date) => total + (dailySales.get(date)?.sales || 0), 0) / baselineWeeks;
      expectedNet += baselineDates.reduce((total, date) => total + (dailySales.get(date)?.net || 0), 0) / baselineWeeks;
    }

    const overlapCount = published.filter(other => other.video.video_id !== item.video.video_id && other.date >= item.date && other.date <= postEnd).length;
    const postViews = postDates.reduce((total, date) => total + (views.get(`${item.video.video_id}:${date}`) || 0), 0);
    const netDifference = actualNet - expectedNet;
    const warnings: string[] = [];
    if (overlapCount) warnings.push('Há outros vídeos publicados na mesma janela; não isole efeito causal.');
    if (!postViews) warnings.push('Sem visualizações diárias disponíveis na janela de publicação.');
    const signal = netDifference > 0.01 ? 'above' : netDifference < -0.01 ? 'below' : 'flat';

    results.push({
      videoId: item.video.video_id,
      title: item.video.title,
      publishedDate: item.date,
      contentType: item.video.content_type,
      thumbnailUrl: item.video.thumbnail_url,
      postWindow: { start: item.date, end: postEnd },
      views: postViews,
      actualSales,
      expectedSales: round(expectedSales),
      salesDifference: round(actualSales - expectedSales),
      actualNetAfterFees: round(actualNet),
      expectedNetAfterFees: round(expectedNet),
      netDifference: round(netDifference),
      netDifferenceRate: expectedNet ? roundRatio(netDifference / expectedNet) : null,
      overlapCount,
      signal,
      warnings,
    });
  }

  results.sort((left, right) => right.netDifference - left.netDifference || right.actualSales - left.actualSales);
  return {
    period: { start: input.start, end: input.end, currency },
    method: {
      label: 'Associação temporal exploratória',
      postWindowDays,
      baselineWeeks,
      description: `A janela posterior de ${postWindowDays} dias é comparada aos mesmos dias da semana nas ${baselineWeeks} semanas anteriores.`,
      warning: 'Diferença observada não prova que o vídeo causou as vendas.',
    },
    totals: {
      videosPublished: published.length,
      videosAnalyzed: results.length,
      aboveBaseline: results.filter(result => result.signal === 'above').length,
      belowBaseline: results.filter(result => result.signal === 'below').length,
      insufficientData,
    },
    videos: results,
  };
}
