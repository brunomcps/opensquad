import { authorizeMember } from '../_shared/auth.ts';
import { serviceClient } from '../_shared/client.ts';
import { CommercialIntelligenceError } from '../_shared/errors.ts';
import { errorResponse, json, preflight } from '../_shared/http.ts';
import {
  decodeTrackingCursor,
  encodeTrackingCursor,
  nextHotmartReconciliationAt,
  parseEventLimit,
  parseEventTypes,
  parseTrackingFilters,
  TRACKING_TIMEZONE,
} from '../_shared/trackingHistory.ts';

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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
    unresolvedOperationalFailures: Number(data?.unresolved_operational_failures || 0),
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
    const url = new URL(request.url);
    const filters = parseTrackingFilters(url);
    const types = parseEventTypes(url.searchParams.get('types'));
    const limit = parseEventLimit(url.searchParams.get('limit'));
    const cursor = decodeTrackingCursor(url.searchParams.get('cursor'));
    const [eventsResult, freshnessResult] = await Promise.all([
      client.rpc('ci_tracking_events', {
        p_start: filters.startIso,
        p_end: filters.endExclusiveIso,
        p_video_id: filters.videoId,
        p_position: filters.position,
        p_traffic: filters.traffic,
        p_include_clicks: types.includes('click'),
        p_include_sales: types.includes('sale'),
        p_cursor_at: cursor?.occurredAt || null,
        p_cursor_id: cursor?.sortId || null,
        p_limit: limit + 1,
        p_channel: filters.channel,
      }),
      client.rpc('ci_tracking_freshness').maybeSingle(),
    ]);
    if (eventsResult.error || freshnessResult.error) {
      throw new CommercialIntelligenceError('tracking_query_failed', 'Não foi possível consultar os eventos de rastreamento.', 503);
    }

    const rows = eventsResult.data || [];
    const hasNext = rows.length > limit;
    const visible = rows.slice(0, limit);
    const events = visible.map((row: Record<string, any>) => ({
      eventId: row.event_id,
      type: row.event_type as 'click' | 'sale',
      occurredAt: new Date(row.occurred_at).toISOString(),
      videoId: row.video_id || null,
      videoTitle: row.video_title || null,
      thumbnailUrl: row.thumbnail_url || null,
      ctaPosition: row.cta_position || null,
      trackingCode: row.tracking_code || null,
      traffic: row.traffic_classification || null,
      trafficGroup: row.traffic_group || null,
      referrerHost: row.referrer_host || null,
      deviceType: row.device_type || null,
      technicalReason: row.exclusion_reason || null,
      attribution: row.attribution || null,
      status: row.transaction_status || null,
      amount: numberOrNull(row.amount),
      currency: row.currency || null,
      productName: row.product_name || null,
      channel: row.channel || null,
      campaignName: row.campaign_name || null,
    }));
    const last = visible.at(-1);
    const nextCursor = hasNext && last
      ? encodeTrackingCursor({ occurredAt: last.occurred_at, sortId: last.event_sort_id })
      : null;
    const generatedAt = new Date().toISOString();

    return json(request, {
      ok: true,
      timezone: TRACKING_TIMEZONE,
      generatedAt,
      period: {
        start: filters.start,
        end: filters.end,
        startIso: filters.startIso,
        endExclusiveIso: filters.endExclusiveIso,
      },
      filters: {
        videoId: filters.videoId,
        position: filters.position || 'all',
        traffic: filters.traffic,
        channel: filters.channel || 'all',
        types,
      },
      freshness: freshness(freshnessResult.data as Record<string, any> | null, generatedAt),
      events,
      nextCursor,
      member: { role: member.role },
    });
  } catch (error) {
    return errorResponse(request, error);
  }
});
