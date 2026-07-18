import type { DataQualityReport } from '../../src/types/commercialIntelligence';
import type { TemporalAssociationReport } from '../../supabase/functions/_shared/association';
import type { DirectAttributionReport } from '../../supabase/functions/_shared/attribution';
import type { CampaignBatchInput, CampaignInput, CampaignRecord, CampaignStatus } from '../../supabase/functions/_shared/campaigns';
import type { CommercialOverview } from '../../supabase/functions/_shared/overview';
import { functionsBaseUrl, supabase } from './supabase';

export type MemberRole = 'viewer' | 'admin';

export type CampaignDto = Omit<CampaignRecord, 'created_by'> & {
  directUrl: string;
  redirectUrl: string | null;
  humanClicks: number;
};

export interface CampaignCatalog {
  videos: Array<{
    video_id: string;
    title: string;
    published_at: string | null;
    content_type: string;
    thumbnail_url: string | null;
  }>;
  products: Array<{
    productId: string;
    productName: string;
    offerCodes: string[];
  }>;
}

export interface AttributionDto extends DirectAttributionReport {
  period: { start: string; end: string };
}

export type TrackingGranularity = 'auto' | 'hour' | 'day' | 'week';
export type TrackingTrafficFilter = 'qualified' | 'technical' | 'all';
export type TrackingPositionFilter = 'all' | 'description' | 'pinned_comment' | 'comment_reply' | 'video';
export type TrackingEventType = 'click' | 'sale';

export interface TrackingHistoryFilters {
  start: string;
  end: string;
  granularity: TrackingGranularity;
  videoId?: string | null;
  position: TrackingPositionFilter;
  traffic: TrackingTrafficFilter;
}

export interface TrackingFreshnessDto {
  consultedAt: string;
  lastClickAt: string | null;
  lastQualifiedClickAt?: string | null;
  lastHotmartWebhookAt: string | null;
  /** Legacy alias for the most recent fully successful reconciliation. */
  lastHotmartReconciliationAt: string | null;
  lastHotmartReconciliationAttemptAt?: string | null;
  lastHotmartReconciliationSuccessAt?: string | null;
  lastHotmartReconciliationPartialAt?: string | null;
  lastHotmartReconciliationStatus?: 'running' | 'success' | 'partial' | 'failed' | null;
  lastHotmartReconciliationWarnings?: string[];
  lastHotmartReconciliationErrorCode?: string | null;
  lastHotmartReconciliationErrorMessage?: string | null;
  nextHotmartReconciliationAt: string | null;
  latestOperationalFailureAt?: string | null;
  unresolvedOperationalFailures?: number;
  hotmartScheduleActive?: boolean;
  hotmartScheduleExpression?: string | null;
}

export interface TrackingSeriesBucketDto {
  bucketStart: string;
  clicks: {
    description: number;
    pinnedComment: number;
    commentReply: number;
    video: number;
    other: number;
    total: number;
    unknown: number;
  };
  sales: {
    description: number;
    pinnedComment: number;
    commentReply: number;
    video: number;
    additional: number;
    unattributed: number;
    ambiguous: number;
    total: number;
  };
  financialDataIncomplete: number;
  netAfterFees: number;
}

export interface TrackingSeriesDto {
  period: { start: string; end: string };
  granularity: Exclude<TrackingGranularity, 'auto'>;
  generatedAt: string;
  freshness: TrackingFreshnessDto;
  totals: {
    qualifiedClicks: number;
    technicalClicks: number;
    unknownClicks: number;
    totalClicks: number;
    selectedClicks: number;
    attributedSales: number;
    additionalProducts: number;
    unattributedSales: number;
    ambiguousSales: number;
    financialDataIncomplete: number;
    netAfterFees: number;
  };
  buckets: TrackingSeriesBucketDto[];
}

export interface TrackingEventDto {
  eventId: string;
  type: TrackingEventType;
  occurredAt: string;
  videoId: string | null;
  videoTitle: string | null;
  thumbnailUrl: string | null;
  ctaPosition: Exclude<TrackingPositionFilter, 'all'> | null;
  trackingCode: string | null;
  traffic: 'qualified' | 'bot' | 'scanner' | 'technical' | 'duplicate' | 'unknown' | null;
  trafficGroup: 'qualified' | 'technical' | 'unknown' | null;
  referrerHost: string | null;
  deviceType: string | null;
  technicalReason: string | null;
  attribution: 'attributed' | 'unattributed' | 'ambiguous' | 'direct_primary' | 'direct_additional' | null;
  status: string | null;
  amount: number | null;
  currency: string | null;
  productName: string | null;
}

export interface TrackingEventsDto {
  events: TrackingEventDto[];
  nextCursor: string | null;
}

interface FunctionErrorPayload {
  error?: { code?: string; message?: string } | string;
}

export class CommercialIntelligenceApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'CommercialIntelligenceApiError';
  }
}

async function request<T>(functionName: string, init?: RequestInit, retry = true): Promise<T> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    throw new CommercialIntelligenceApiError('unauthorized', 'Sua sessão expirou.', 401);
  }

  const response = await fetch(`${functionsBaseUrl}/${functionName}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${data.session.access_token}`,
      ...(init?.headers || {}),
    },
  });

  if (response.status === 401 && retry) {
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.data.session) return request<T>(functionName, init, false);
  }

  const payload = await response.json().catch(() => ({})) as T & FunctionErrorPayload;
  if (!response.ok) {
    const error = typeof payload.error === 'object' ? payload.error : undefined;
    throw new CommercialIntelligenceApiError(
      error?.code || 'request_failed',
      error?.message || 'Não foi possível concluir a solicitação.',
      response.status,
    );
  }
  return payload;
}

export async function getQuality(): Promise<{ quality: DataQualityReport; member: { role: MemberRole } }> {
  const result = await request<{ ok: true; quality: DataQualityReport; member: { role: MemberRole } }>('ci-quality');
  return { quality: result.quality, member: result.member };
}

export async function getOverview(filters: {
  start: string;
  end: string;
  currency: string;
  goal: number;
}): Promise<{ overview: CommercialOverview; member: { role: MemberRole } }> {
  const query = new URLSearchParams({
    start: filters.start,
    end: filters.end,
    currency: filters.currency,
    goal: String(filters.goal),
  });
  const result = await request<{ ok: true; overview: CommercialOverview; member: { role: MemberRole } }>(
    `ci-overview?${query.toString()}`,
  );
  return { overview: result.overview, member: result.member };
}

export async function runSync(source: 'youtube' | 'hotmart'): Promise<void> {
  await request(`ci-sync-${source}`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function getCampaigns(): Promise<{
  campaigns: CampaignDto[];
  catalog: CampaignCatalog;
  member: { role: MemberRole };
}> {
  const result = await request<{
    ok: true;
    campaigns: CampaignDto[];
    catalog: CampaignCatalog;
    member: { role: MemberRole };
  }>('ci-campaigns');
  return { campaigns: result.campaigns, catalog: result.catalog, member: result.member };
}

export async function createCampaign(input: CampaignInput): Promise<CampaignDto> {
  const result = await request<{ ok: true; campaign: CampaignDto }>('ci-campaigns', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      videoId: input.videoId,
      productId: input.productId,
      productName: input.productName,
      offerCode: input.offerCode,
      destinationUrl: input.destinationUrl,
      trackingParameter: input.trackingParameter,
      ctaLabel: input.ctaLabel,
      ctaPosition: input.ctaPosition,
      utmSource: input.utmSource,
      utmMedium: input.utmMedium,
      utmCampaign: input.utmCampaign,
      utmContent: input.utmContent,
      utmTerm: input.utmTerm,
      startsAt: input.startsAt,
      status: input.status,
    }),
  });
  return result.campaign;
}

export async function createCampaignBatch(input: CampaignBatchInput): Promise<{
  campaigns: CampaignDto[];
  created: number;
  skipped: number;
}> {
  const result = await request<{
    ok: true;
    campaigns: CampaignDto[];
    created: number;
    skipped: number;
  }>('ci-campaigns', {
    method: 'POST',
    body: JSON.stringify({ mode: 'bulk', ...input }),
  });
  return { campaigns: result.campaigns, created: result.created, skipped: result.skipped };
}

export async function updateCampaignStatus(campaignId: string, status: Extract<CampaignStatus, 'active' | 'inactive'>): Promise<CampaignDto> {
  const result = await request<{ ok: true; campaign: CampaignDto }>('ci-campaigns', {
    method: 'PATCH',
    body: JSON.stringify({ campaignId, status }),
  });
  return result.campaign;
}

export async function getAttribution(filters: { start: string; end: string; currency: string }): Promise<AttributionDto> {
  const query = new URLSearchParams(filters);
  const result = await request<{ ok: true; attribution: AttributionDto }>(`ci-attribution?${query.toString()}`);
  return result.attribution;
}

function trackingQuery(filters: TrackingHistoryFilters): URLSearchParams {
  const query = new URLSearchParams({
    start: filters.start,
    end: filters.end,
    granularity: filters.granularity,
    position: filters.position,
    traffic: filters.traffic,
  });
  if (filters.videoId) query.set('videoId', filters.videoId);
  return query;
}

export async function getTrackingSeries(filters: TrackingHistoryFilters): Promise<TrackingSeriesDto> {
  const query = trackingQuery(filters);
  const result = await request<{ ok: true; series: TrackingSeriesDto }>(`ci-tracking-series?${query.toString()}`);
  return result.series;
}

export async function getTrackingEvents(
  filters: TrackingHistoryFilters,
  options: { cursor?: string | null; limit?: number } = {},
): Promise<TrackingEventsDto> {
  const query = trackingQuery(filters);
  query.set('limit', String(options.limit || 50));
  if (options.cursor) query.set('cursor', options.cursor);
  const result = await request<{ ok: true; events: TrackingEventDto[]; nextCursor: string | null }>(
    `ci-tracking-events?${query.toString()}`,
  );
  return { events: result.events, nextCursor: result.nextCursor };
}

export async function getAssociation(filters: {
  start: string;
  end: string;
  currency: string;
  window: number;
  baselineWeeks: number;
}): Promise<TemporalAssociationReport> {
  const query = new URLSearchParams({
    start: filters.start,
    end: filters.end,
    currency: filters.currency,
    window: String(filters.window),
    baselineWeeks: String(filters.baselineWeeks),
  });
  const result = await request<{ ok: true; association: TemporalAssociationReport }>(`ci-association?${query.toString()}`);
  return result.association;
}
