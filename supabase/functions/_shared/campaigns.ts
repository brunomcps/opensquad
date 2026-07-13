import { CommercialIntelligenceError } from './errors.ts';

export type CampaignStatus = 'draft' | 'active' | 'inactive';
export type TrackingParameter = 'sck' | 'src';
export type CtaPosition = 'description' | 'pinned_comment' | 'video' | 'bio' | 'community' | 'other';

export interface CampaignRecord {
  campaign_id: string;
  tracking_code: string;
  slug: string;
  name: string;
  channel: 'youtube';
  video_id: string;
  product_id: string;
  product_name: string;
  offer_code: string | null;
  destination_url: string;
  tracking_parameter: TrackingParameter;
  cta_label: string;
  cta_position: CtaPosition;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string | null;
  utm_term: string | null;
  status: CampaignStatus;
  starts_at: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignInput {
  name: string;
  videoId: string;
  productId: string;
  productName: string;
  offerCode: string | null;
  destinationUrl: string;
  trackingParameter: TrackingParameter;
  ctaLabel: string;
  ctaPosition: CtaPosition;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string | null;
  utmTerm: string | null;
  startsAt: string;
  status: CampaignStatus;
}

const POSITION_CODES: Record<CtaPosition, string> = {
  description: 'd',
  pinned_comment: 'p',
  video: 'v',
  bio: 'b',
  community: 'c',
  other: 'o',
};

function requiredText(value: unknown, label: string, min = 1, max = 120): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length < min || text.length > max) {
    throw new CommercialIntelligenceError('invalid_campaign', `${label} inválido.`, 400);
  }
  return text;
}

function optionalText(value: unknown, max = 120): string | null {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value).trim();
  if (!text || text.length > max) {
    throw new CommercialIntelligenceError('invalid_campaign', 'Campo opcional inválido.', 400);
  }
  return text;
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (!allowed.includes(value as T)) {
    throw new CommercialIntelligenceError('invalid_campaign', `${label} inválido.`, 400);
  }
  return value as T;
}

function validUrl(value: unknown): string {
  const text = requiredText(value, 'URL de destino', 8, 2_000);
  let parsed: URL;
  try { parsed = new URL(text); }
  catch { throw new CommercialIntelligenceError('invalid_campaign_url', 'URL de destino inválida.', 400); }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new CommercialIntelligenceError('invalid_campaign_url', 'A URL precisa usar HTTP ou HTTPS.', 400);
  }
  return parsed.toString();
}

function isoDate(value: unknown): string {
  const parsed = value ? new Date(String(value)) : new Date();
  if (Number.isNaN(parsed.getTime())) {
    throw new CommercialIntelligenceError('invalid_campaign', 'Data inicial inválida.', 400);
  }
  return parsed.toISOString();
}

export function parseCampaignInput(body: Record<string, unknown>): CampaignInput {
  const position = enumValue(body.ctaPosition, Object.keys(POSITION_CODES) as CtaPosition[], 'Posição do CTA');
  return {
    name: requiredText(body.name, 'Nome', 3),
    videoId: requiredText(body.videoId, 'Vídeo', 3, 32),
    productId: requiredText(body.productId, 'Produto', 1, 160),
    productName: requiredText(body.productName, 'Nome do produto', 1, 240),
    offerCode: optionalText(body.offerCode, 160),
    destinationUrl: validUrl(body.destinationUrl),
    trackingParameter: enumValue(body.trackingParameter, ['sck', 'src'] as const, 'Parâmetro de rastreamento'),
    ctaLabel: requiredText(body.ctaLabel, 'CTA', 2),
    ctaPosition: position,
    utmSource: requiredText(body.utmSource || 'youtube', 'UTM source', 1, 100),
    utmMedium: requiredText(body.utmMedium || 'organic', 'UTM medium', 1, 100),
    utmCampaign: requiredText(body.utmCampaign || body.name, 'UTM campaign', 1, 160),
    utmContent: optionalText(body.utmContent, 160),
    utmTerm: optionalText(body.utmTerm, 160),
    startsAt: isoDate(body.startsAt),
    status: enumValue(body.status || 'active', ['draft', 'active'] as const, 'Status'),
  };
}

function compactSegment(value: string, max: number): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9.-]/g, '')
    .slice(0, max) || 'x';
}

export function generateTrackingCode(
  videoId: string,
  position: CtaPosition,
  nonce = crypto.randomUUID().replace(/-/g, '').slice(0, 4),
): string {
  const code = `yt|${compactSegment(videoId, 14)}|${POSITION_CODES[position]}|${compactSegment(nonce, 5)}`;
  if (code.length > 30 || code.includes('_') || !/^[A-Za-z0-9|.-]+$/.test(code)) {
    throw new CommercialIntelligenceError('tracking_code_invalid', 'Não foi possível gerar o código da campanha.', 500);
  }
  return code;
}

export function generateCampaignSlug(nonce = crypto.randomUUID().replace(/-/g, '').slice(0, 12)): string {
  const cleaned = compactSegment(nonce, 20).toLowerCase();
  return `ci-${cleaned}`;
}

export function buildDestinationUrl(campaign: Pick<CampaignRecord,
  'destination_url' | 'tracking_parameter' | 'tracking_code' | 'utm_source' | 'utm_medium' |
  'utm_campaign' | 'utm_content' | 'utm_term'>): string {
  const url = new URL(campaign.destination_url);
  url.searchParams.set(campaign.tracking_parameter, campaign.tracking_code);
  url.searchParams.set('utm_source', campaign.utm_source);
  url.searchParams.set('utm_medium', campaign.utm_medium);
  url.searchParams.set('utm_campaign', campaign.utm_campaign);
  if (campaign.utm_content) url.searchParams.set('utm_content', campaign.utm_content);
  if (campaign.utm_term) url.searchParams.set('utm_term', campaign.utm_term);
  return url.toString();
}

export function buildRedirectUrl(baseUrl: string | null | undefined, slug: string): string | null {
  if (!baseUrl) return null;
  const url = new URL(baseUrl);
  url.searchParams.set('slug', slug);
  return url.toString();
}

export function referrerHost(value: string | null): string | null {
  if (!value) return null;
  try { return new URL(value).hostname.slice(0, 255) || null; }
  catch { return null; }
}

export function classifyDevice(userAgent: string | null): 'desktop' | 'mobile' | 'tablet' | 'unknown' {
  const agent = userAgent || '';
  if (!agent) return 'unknown';
  if (/ipad|tablet|kindle|silk/i.test(agent)) return 'tablet';
  if (/mobile|iphone|android/i.test(agent)) return 'mobile';
  return 'desktop';
}

export function probableBot(userAgent: string | null): boolean {
  return /bot|crawler|spider|preview|facebookexternalhit|whatsapp|telegram/i.test(userAgent || '');
}
