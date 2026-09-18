import { CommercialIntelligenceError } from './errors.ts';

export type CampaignStatus = 'draft' | 'active' | 'inactive';
export type TrackingParameter = 'sck' | 'src';
// 'dm' = DM manual do Instagram (existe no banco desde 20/07/2026).
export type CtaPosition = 'description' | 'pinned_comment' | 'comment_reply' | 'video' | 'bio' | 'dm' | 'community' | 'other';
export type TrafficClassification = 'qualified' | 'bot' | 'scanner' | 'technical' | 'duplicate' | 'unknown';

export interface TrafficSignals {
  userAgent: string | null;
  accept?: string | null;
  secFetchMode?: string | null;
  secFetchDest?: string | null;
  technical?: boolean;
}

export interface TrafficClassificationResult {
  classification: TrafficClassification;
  exclusionReason: string | null;
  isBot: boolean;
}

export interface CampaignRecord {
  campaign_id: string;
  tracking_code: string;
  slug: string;
  name: string;
  // Instagram (bio, comentário → DM, DM manual) não tem vídeo: video_id fica null.
  channel: 'youtube' | 'instagram';
  video_id: string | null;
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

export interface CampaignBatchInput {
  namePrefix: string;
  videoIds: string[];
  productId: string;
  productName: string;
  offerCode: string | null;
  destinationUrl: string;
  trackingParameter: TrackingParameter;
  ctaLabel: string;
  positions: CtaPosition[];
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  startsAt: string;
  status: Extract<CampaignStatus, 'draft' | 'active'>;
}

const POSITION_CODES: Record<CtaPosition, string> = {
  description: 'd',
  pinned_comment: 'p',
  comment_reply: 'r',
  video: 'v',
  bio: 'b',
  dm: 'm',
  community: 'c',
  other: 'o',
};

const MAPA7P_PUBLIC_POSITION_CODES: Partial<Record<CtaPosition, string>> = {
  description: 'd',
  pinned_comment: 'c',
  comment_reply: 'r',
  video: 'v',
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

function uniqueTextList(value: unknown, label: string, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxItems) {
    throw new CommercialIntelligenceError('invalid_campaign_batch', `${label} inválido.`, 400);
  }
  const items = value.map(item => requiredText(item, label, 1, maxLength));
  return [...new Set(items)];
}

export function parseCampaignBatchInput(body: Record<string, unknown>): CampaignBatchInput {
  const positions = uniqueTextList(body.positions, 'Posições', 7, 32)
    .map(position => enumValue(position, Object.keys(POSITION_CODES) as CtaPosition[], 'Posição do CTA'));
  return {
    namePrefix: requiredText(body.namePrefix || 'MAPA-7P', 'Prefixo', 3, 60),
    videoIds: uniqueTextList(body.videoIds, 'Vídeos', 500, 32),
    productId: requiredText(body.productId, 'Produto', 1, 160),
    productName: requiredText(body.productName, 'Nome do produto', 1, 240),
    offerCode: optionalText(body.offerCode, 160),
    destinationUrl: validUrl(body.destinationUrl),
    trackingParameter: enumValue(body.trackingParameter, ['sck', 'src'] as const, 'Parâmetro de rastreamento'),
    ctaLabel: requiredText(body.ctaLabel, 'CTA', 2),
    positions,
    utmSource: requiredText(body.utmSource || 'youtube', 'UTM source', 1, 100),
    utmMedium: requiredText(body.utmMedium || 'organic', 'UTM medium', 1, 100),
    utmCampaign: requiredText(body.utmCampaign || 'mapa7p-youtube', 'UTM campaign', 1, 160),
    startsAt: isoDate(body.startsAt),
    status: enumValue(body.status || 'active', ['draft', 'active'] as const, 'Status'),
  };
}

function compactTrackingSegment(value: string, max: number): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, max) || 'x';
}

function compactSlugSegment(value: string, max: number): string {
  return compactTrackingSegment(value, max).toLowerCase();
}

export function generateTrackingCode(
  videoId: string,
  position: CtaPosition,
  nonce = crypto.randomUUID().replace(/-/g, '').slice(0, 4),
): string {
  const code = `yt|${compactTrackingSegment(videoId, 14)}|${POSITION_CODES[position]}|${compactTrackingSegment(nonce, 5)}`;
  if (code.length > 30 || !/^[A-Za-z0-9|]+$/.test(code)) {
    throw new CommercialIntelligenceError('tracking_code_invalid', 'Não foi possível gerar o código da campanha.', 500);
  }
  return code;
}

export function generateCampaignSlug(nonce = crypto.randomUUID().replace(/-/g, '').slice(0, 12)): string {
  const cleaned = compactSlugSegment(nonce, 20);
  return `${cleaned}00000000`.slice(0, 8);
}

export function generateMapa7pCampaignSlug(videoId: string, position: CtaPosition): string {
  const positionCode = MAPA7P_PUBLIC_POSITION_CODES[position];
  if (!positionCode) {
    throw new CommercialIntelligenceError('invalid_mapa7p_position', 'Posição inválida para link MAPA-7P.', 400);
  }
  const videoSegment = compactSlugSegment(videoId, 45);
  const slug = `${videoSegment}-${positionCode}`;
  if (slug.length < 6 || slug.length > 48 || !/^[a-z0-9-]+$/.test(slug)) {
    throw new CommercialIntelligenceError('campaign_slug_invalid', 'Não foi possível gerar o link MAPA-7P.', 500);
  }
  return slug;
}

export function buildDestinationUrl(campaign: Pick<CampaignRecord,
  'destination_url' | 'tracking_parameter' | 'tracking_code' | 'utm_source' | 'utm_medium' |
  'utm_campaign' | 'utm_content' | 'utm_term'>): string {
  const url = new URL(campaign.destination_url);
  url.searchParams.set(campaign.tracking_parameter, campaign.tracking_code);
  if (campaign.tracking_parameter === 'src' && url.hostname.toLowerCase().endsWith('.hotmart.com')) {
    // Hotmart uses SRC on HotLinks and SCK on producer checkout links. Carrying
    // both lets an intermediate sales page explicitly forward SCK to checkout
    // without changing or invalidating the existing SRC attribution flow.
    url.searchParams.set('sck', campaign.tracking_code);
  }
  url.searchParams.set('utm_source', campaign.utm_source);
  url.searchParams.set('utm_medium', campaign.utm_medium);
  url.searchParams.set('utm_campaign', campaign.utm_campaign);
  if (campaign.utm_content) url.searchParams.set('utm_content', campaign.utm_content);
  if (campaign.utm_term) url.searchParams.set('utm_term', campaign.utm_term);
  return url.toString();
}

export function buildRedirectUrl(baseUrl: string | null | undefined, slug: string): string | null {
  if (!baseUrl) return null;
  if (baseUrl.includes('{slug}')) {
    return new URL(baseUrl.replaceAll('{slug}', encodeURIComponent(slug))).toString();
  }
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

const SCANNER_USER_AGENT = /facebookexternalhit|meta-externalagent|whatsapp|telegrambot|slackbot|discordbot|skypeuripreview|linkedinbot|twitterbot|pinterestbot|microsoft office existence discovery|proofpoint|mimecast|barracuda|safelinks|urlscan|virustotal/i;
const AUTOMATION_USER_AGENT = /\bbot\b|crawler|spider|headlesschrome|phantomjs|selenium|playwright|puppeteer|curl\/|wget\/|python-requests|python-urllib|axios\/|postmanruntime|insomnia|lighthouse|uptimerobot|monitoring/i;
const BROWSER_USER_AGENT = /mozilla\/5\.0|chrome\/|crios\/|firefox\/|fxios\/|safari\/|edg\/|opr\//i;

export function classifyTraffic(signals: TrafficSignals): TrafficClassificationResult {
  if (signals.technical) {
    return { classification: 'technical', exclusionReason: 'explicit_test_request', isBot: false };
  }

  const userAgent = signals.userAgent?.trim() || '';
  if (!userAgent) {
    return { classification: 'unknown', exclusionReason: 'missing_user_agent', isBot: false };
  }
  if (SCANNER_USER_AGENT.test(userAgent)) {
    return { classification: 'scanner', exclusionReason: 'preview_or_security_scanner', isBot: true };
  }
  if (AUTOMATION_USER_AGENT.test(userAgent)) {
    return { classification: 'bot', exclusionReason: 'automated_user_agent', isBot: true };
  }

  const navigationSignal = signals.secFetchMode?.toLowerCase() === 'navigate'
    || signals.secFetchDest?.toLowerCase() === 'document'
    || signals.accept?.toLowerCase().includes('text/html');
  if (BROWSER_USER_AGENT.test(userAgent) && (navigationSignal || (!signals.accept && !signals.secFetchMode && !signals.secFetchDest))) {
    return { classification: 'qualified', exclusionReason: null, isBot: false };
  }

  return { classification: 'unknown', exclusionReason: 'insufficient_browser_signals', isBot: false };
}

export function probableBot(userAgent: string | null): boolean {
  return classifyTraffic({ userAgent }).isBot;
}

// Etapa 5 da faxina (18/09/2026): "colar o link" em vez de escolher em lista.

// Aceita o ID puro (11 caracteres) ou qualquer formato de link do YouTube:
// watch?v=, youtu.be/, /shorts/, /live/, /embed/, com ou sem parâmetros extras.
export function extractYoutubeVideoId(value: string): string | null {
  const text = (value || '').trim();
  if (!text) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(text)) return text;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^(www|m|music)\./, '');
  if (!['youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(host)) return null;
  let candidate: string | null = null;
  if (host === 'youtu.be') candidate = url.pathname.split('/').filter(Boolean)[0] || null;
  else if (url.searchParams.get('v')) candidate = url.searchParams.get('v');
  else {
    const match = url.pathname.match(/^\/(?:shorts|live|embed|v)\/([A-Za-z0-9_-]{11})/);
    candidate = match?.[1] || null;
  }
  return candidate && /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
}

// Link de post, reel ou vídeo do Instagram → código curto do post (shortcode).
export function extractInstagramShortcode(value: string): string | null {
  const text = (value || '').trim();
  if (!text) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host !== 'instagram.com' && host !== 'instagr.am') return null;
  const match = url.pathname.match(/^\/(?:[A-Za-z0-9_.]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]{5,20})\/?/);
  return match?.[1] || null;
}

export function generateInstagramPostTrackingCode(
  shortcode: string,
  nonce = crypto.randomUUID().replace(/-/g, '').slice(0, 4),
): string {
  const code = `ig|${compactTrackingSegment(shortcode, 14)}|c|${compactTrackingSegment(nonce, 5)}`;
  if (code.length > 30 || !/^[A-Za-z0-9|]+$/.test(code)) {
    throw new CommercialIntelligenceError('tracking_code_invalid', 'Não foi possível gerar o código do post.', 500);
  }
  return code;
}

export function generateInstagramPostSlug(shortcode: string): string {
  const slug = `ig-post-${compactSlugSegment(shortcode, 20)}`;
  if (slug.length < 6 || slug.length > 48 || !/^[a-z0-9-]+$/.test(slug)) {
    throw new CommercialIntelligenceError('campaign_slug_invalid', 'Não foi possível gerar o link do post.', 500);
  }
  return slug;
}

export function instagramPostUtmContent(shortcode: string): string {
  return `post-${shortcode}`.slice(0, 160);
}
