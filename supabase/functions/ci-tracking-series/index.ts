import { authorizeMember } from '../_shared/auth.ts';
import { serviceClient } from '../_shared/client.ts';
import { CommercialIntelligenceError } from '../_shared/errors.ts';
import { errorResponse, json, preflight } from '../_shared/http.ts';
import {
  nextHotmartReconciliationAt,
  parseTrackingFilters,
  trackingBucketStarts,
  TRACKING_TIMEZONE,
} from '../_shared/trackingHistory.ts';

// As caixas por posição (descrição, comentário fixado, resposta, card) são do
// YouTube. Clique/venda do Instagram entra na caixa `instagram`, nunca nas do
// YouTube: em 18/09/2026 os 186 cliques do link de comentário do Instagram
// apareciam como "Resposta a comentário" do YouTube.
type PositionCounts = {
  description: number;
  pinnedComment: number;
  commentReply: number;
  video: number;
  instagram: number;
  other: number;
  total: number;
};

type SaleCounts = {
  description: number;
  pinnedComment: number;
  commentReply: number;
  video: number;
  instagram: number;
  unattributed: number;
  ambiguous: number;
  additional: number;
  total: number;
};

type Bucket = {
  bucketStart: string;
  clicks: PositionCounts & { unknown: number };
  sales: SaleCounts;
  financialDataIncomplete: number;
  netAfterFees: number;
};

type ChannelTotals = { clicks: number; qualifiedClicks: number; attributedSales: number; additionalProducts: number; netAfterFees: number };

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function emptyBucket(bucketStart: string): Bucket {
  return {
    bucketStart,
    clicks: { description: 0, pinnedComment: 0, commentReply: 0, video: 0, instagram: 0, other: 0, total: 0, unknown: 0 },
    sales: { description: 0, pinnedComment: 0, commentReply: 0, video: 0, instagram: 0, unattributed: 0, ambiguous: 0, additional: 0, total: 0 },
    financialDataIncomplete: 0,
    netAfterFees: 0,
  };
}

function emptyChannelTotals(): ChannelTotals {
  return { clicks: 0, qualifiedClicks: 0, attributedSales: 0, additionalProducts: 0, netAfterFees: 0 };
}

function isYoutube(channel: string | null): boolean {
  return !channel || channel === 'youtube';
}

function clickPosition(bucket: Bucket, position: string | null, channel: string | null, count: number): void {
  if (!isYoutube(channel)) bucket.clicks.instagram += count;
  else if (position === 'description') bucket.clicks.description += count;
  else if (position === 'pinned_comment') bucket.clicks.pinnedComment += count;
  else if (position === 'comment_reply') bucket.clicks.commentReply += count;
  else if (position === 'video') bucket.clicks.video += count;
  else bucket.clicks.other += count;
  bucket.clicks.total += count;
}

function salePosition(bucket: Bucket, position: string | null, channel: string | null, count: number): void {
  if (!isYoutube(channel)) bucket.sales.instagram += count;
  else if (position === 'description') bucket.sales.description += count;
  else if (position === 'pinned_comment') bucket.sales.pinnedComment += count;
  else if (position === 'comment_reply') bucket.sales.commentReply += count;
  else if (position === 'video') bucket.sales.video += count;
  else bucket.sales.unattributed += count;
  bucket.sales.total += count;
}

function freshness(data: Record<string, any> | null, consultedAt: string) {
  const scheduleActive = data?.hotmart_schedule_active === true;
  const scheduleExpression = data?.hotmart_schedule_expression || null;
  return {
    consultedAt,
    lastClickAt: data?.last_click_at || null,
    lastQualifiedClickAt: data?.last_qualified_click_at || null,
    lastHotmartWebhookAt: data?.last_hotmart_webhook_at || null,
    lastHotmartReconciliationAt: data?.last_hotmart_reconciliation_at || null,
    lastHotmartReconciliationAttemptAt: data?.last_hotmart_reconciliation_attempt_at || null,
    lastHotmartReconciliationSuccessAt: data?.last_hotmart_reconciliation_success_at || null,
    lastHotmartReconciliationPartialAt: data?.last_hotmart_reconciliation_partial_at || null,
    lastHotmartReconciliationStatus: data?.last_hotmart_reconciliation_status || null,
    lastHotmartReconciliationWarnings: Array.isArray(data?.last_hotmart_reconciliation_warnings)
      ? data.last_hotmart_reconciliation_warnings
      : [],
    lastHotmartReconciliationErrorCode: data?.last_hotmart_reconciliation_error_code || null,
    lastHotmartReconciliationErrorMessage: data?.last_hotmart_reconciliation_error_message || null,
    hotmartScheduleActive: scheduleActive,
    hotmartScheduleExpression: scheduleExpression,
    nextHotmartReconciliationAt: scheduleActive && scheduleExpression === '40 9 * * *'
      ? nextHotmartReconciliationAt(new Date(consultedAt))
      : null,
    latestOperationalFailureAt: data?.latest_operational_failure_at || null,
    unresolvedOperationalFailures: number(data?.unresolved_operational_failures),
  };
}

Deno.serve(async request => {
  const options = preflight(request);
  if (options) return options;
  if (request.method !== 'GET') {
    return json(request, { ok: false, error: { code: 'method_not_allowed', message: 'Método não permitido.' } }, 405);
  }

  try {
    const client = serviceClient();
    const member = await authorizeMember(request, client, 'viewer');
    const filters = parseTrackingFilters(new URL(request.url));
    const [seriesResult, freshnessResult] = await Promise.all([
      client.rpc('ci_tracking_series', {
        p_start: filters.startIso,
        p_end: filters.endExclusiveIso,
        p_granularity: filters.granularity,
        p_video_id: filters.videoId,
        p_position: filters.position,
        // Totals must always preserve raw, qualified, technical and unknown traffic.
        // The selected traffic filter is applied only to the plotted buckets below.
        p_traffic: 'all',
        p_products: filters.products,
        p_channel: filters.channel,
      }),
      client.rpc('ci_tracking_freshness').maybeSingle(),
    ]);
    if (seriesResult.error || freshnessResult.error) {
      throw new CommercialIntelligenceError('tracking_query_failed', 'Não foi possível consultar o histórico de rastreamento.', 503);
    }

    const buckets = new Map<string, Bucket>(
      trackingBucketStarts(filters.startIso, filters.endExclusiveIso, filters.granularity)
        .map(bucketStart => [bucketStart, emptyBucket(bucketStart)]),
    );
    const totals = {
      qualifiedClicks: 0,
      technicalClicks: 0,
      unknownClicks: 0,
      totalClicks: 0,
      selectedClicks: 0,
      attributedSales: 0,
      additionalProducts: 0,
      unattributedSales: 0,
      ambiguousSales: 0,
      financialDataIncomplete: 0,
      netAfterFees: 0,
    };
    // Totais por canal (youtube / instagram), pra tela mostrar a divisão sem
    // refazer a conta. Venda sem origem e ambígua não têm canal.
    const byChannel: Record<string, ChannelTotals> = { youtube: emptyChannelTotals(), instagram: emptyChannelTotals() };
    const channelTotals = (channel: string | null): ChannelTotals => {
      const key = isYoutube(channel) ? 'youtube' : String(channel);
      byChannel[key] = byChannel[key] || emptyChannelTotals();
      return byChannel[key];
    };

    for (const row of seriesResult.data || []) {
      const bucketStart = new Date(row.bucket_start).toISOString();
      const count = number(row.event_count);
      const rowChannel: string | null = row.channel || null;
      if (row.event_type === 'click') {
        if (row.traffic_group === 'qualified') totals.qualifiedClicks += count;
        else if (row.traffic_group === 'technical') totals.technicalClicks += count;
        else totals.unknownClicks += count;
        totals.totalClicks += count;
        channelTotals(rowChannel).clicks += count;
        if (row.traffic_group === 'qualified') channelTotals(rowChannel).qualifiedClicks += count;

        const selected = filters.traffic === 'all'
          || filters.traffic === row.traffic_group;
        if (!selected) continue;
        const bucket = buckets.get(bucketStart) || emptyBucket(bucketStart);
        clickPosition(bucket, row.cta_position, rowChannel, count);
        if (row.traffic_group === 'unknown') bucket.clicks.unknown += count;
        totals.selectedClicks += count;
        buckets.set(bucketStart, bucket);
      } else if (row.event_type === 'sale') {
        const bucket = buckets.get(bucketStart) || emptyBucket(bucketStart);
        const financialDataIncomplete = row.financial_incomplete === true;
        if (row.attribution === 'direct_primary') {
          salePosition(bucket, row.cta_position, rowChannel, count);
          totals.attributedSales += count;
          channelTotals(rowChannel).attributedSales += count;
          if (financialDataIncomplete) {
            bucket.financialDataIncomplete += count;
            totals.financialDataIncomplete += count;
          }
          const net = number(row.net_amount);
          bucket.netAfterFees += net;
          totals.netAfterFees += net;
          channelTotals(rowChannel).netAfterFees += net;
        } else if (row.attribution === 'direct_additional') {
          bucket.sales.additional += count;
          bucket.sales.total += count;
          totals.additionalProducts += count;
          channelTotals(rowChannel).additionalProducts += count;
          if (financialDataIncomplete) {
            bucket.financialDataIncomplete += count;
            totals.financialDataIncomplete += count;
          }
          const net = number(row.net_amount);
          bucket.netAfterFees += net;
          totals.netAfterFees += net;
          channelTotals(rowChannel).netAfterFees += net;
        } else if (row.attribution === 'ambiguous') {
          bucket.sales.ambiguous += count;
          bucket.sales.total += count;
          totals.ambiguousSales += count;
        } else {
          bucket.sales.unattributed += count;
          bucket.sales.total += count;
          totals.unattributedSales += count;
        }
        buckets.set(bucketStart, bucket);
      }
    }

    const generatedAt = new Date().toISOString();
    return json(request, {
      ok: true,
      series: {
        period: {
          start: filters.start,
          end: filters.end,
          startIso: filters.startIso,
          endExclusiveIso: filters.endExclusiveIso,
          timezone: TRACKING_TIMEZONE,
        },
        granularity: filters.granularity,
        generatedAt,
        filters: {
          videoId: filters.videoId,
          position: filters.position || 'all',
          traffic: filters.traffic,
          products: filters.products || 'all',
          channel: filters.channel || 'all',
        },
        freshness: freshness(freshnessResult.data as Record<string, any> | null, generatedAt),
        totals: {
          ...totals,
          netAfterFees: Math.round((totals.netAfterFees + Number.EPSILON) * 100) / 100,
        },
        byChannel: Object.fromEntries(Object.entries(byChannel).map(([key, value]) => [key, {
          ...value,
          netAfterFees: Math.round((value.netAfterFees + Number.EPSILON) * 100) / 100,
        }])),
        buckets: [...buckets.values()]
          .sort((left, right) => left.bucketStart.localeCompare(right.bucketStart))
          .map(bucket => ({
            ...bucket,
            netAfterFees: Math.round((bucket.netAfterFees + Number.EPSILON) * 100) / 100,
          })),
      },
      member: { role: member.role },
    });
  } catch (error) {
    return errorResponse(request, error);
  }
});
