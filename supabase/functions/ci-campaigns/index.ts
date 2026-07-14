import { authorizeMember } from '../_shared/auth.ts';
import {
  buildDestinationUrl,
  buildRedirectUrl,
  generateCampaignSlug,
  generateMapa7pCampaignSlug,
  generateTrackingCode,
  parseCampaignBatchInput,
  parseCampaignInput,
  type CtaPosition,
  type CampaignRecord,
} from '../_shared/campaigns.ts';
import { serviceClient } from '../_shared/client.ts';
import { CommercialIntelligenceError } from '../_shared/errors.ts';
import { errorResponse, json, preflight, readJson } from '../_shared/http.ts';

const CAMPAIGN_FIELDS = [
  'campaign_id', 'tracking_code', 'slug', 'name', 'channel', 'video_id', 'product_id', 'product_name',
  'offer_code', 'destination_url', 'tracking_parameter', 'cta_label', 'cta_position', 'utm_source',
  'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'status', 'starts_at', 'created_by',
  'created_at', 'updated_at',
].join(',');

const MAPA7P_PRODUCT_ID = '6966825';

function campaignSlug(productId: string, videoId: string, position: CtaPosition): string {
  if (productId === MAPA7P_PRODUCT_ID && ['description', 'pinned_comment', 'comment_reply'].includes(position)) {
    return generateMapa7pCampaignSlug(videoId, position);
  }
  return generateCampaignSlug();
}

function databaseFailure(): never {
  throw new CommercialIntelligenceError('database_error', 'Não foi possível acessar as campanhas.', 503);
}

function redirectBase(): string | null {
  const configured = Deno.env.get('CI_CAMPAIGN_REDIRECT_BASE_URL')?.trim();
  if (configured) return configured;
  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.replace(/\/$/, '');
  return supabaseUrl ? `${supabaseUrl}/functions/v1/ci-campaign-redirect` : null;
}

function campaignDto(campaign: CampaignRecord, clicks = 0) {
  const { created_by: _createdBy, ...safeCampaign } = campaign;
  return {
    ...safeCampaign,
    directUrl: buildDestinationUrl(campaign),
    redirectUrl: buildRedirectUrl(redirectBase(), campaign.slug),
    humanClicks: clicks,
  };
}

async function listCampaigns(client: any) {
  const [campaignResult, videoResult, productResult, clickResult] = await Promise.all([
    client.from('ci_campaigns').select(CAMPAIGN_FIELDS).order('created_at', { ascending: false }),
    client.from('ci_youtube_videos').select('video_id,title,published_at,content_type,thumbnail_url').order('published_at', { ascending: false }),
    client.from('ci_hotmart_transactions').select('product_id,product_name,offer_code').not('product_id', 'is', null),
    client.from('ci_click_events').select('campaign_id,is_bot'),
  ]);
  if (campaignResult.error || videoResult.error || productResult.error || clickResult.error) databaseFailure();

  const clickCounts = new Map<string, number>();
  for (const click of clickResult.data || []) {
    if (!click.is_bot) clickCounts.set(click.campaign_id, (clickCounts.get(click.campaign_id) || 0) + 1);
  }
  const products = new Map<string, { productId: string; productName: string; offerCodes: Set<string> }>();
  for (const row of productResult.data || []) {
    if (!row.product_id) continue;
    const product = products.get(row.product_id) || { productId: row.product_id, productName: row.product_name, offerCodes: new Set<string>() };
    if (row.offer_code) product.offerCodes.add(row.offer_code);
    products.set(row.product_id, product);
  }

  return {
    campaigns: (campaignResult.data || []).map((campaign: CampaignRecord) => campaignDto(campaign, clickCounts.get(campaign.campaign_id) || 0)),
    catalog: {
      videos: videoResult.data || [],
      products: [...products.values()].map(product => ({ ...product, offerCodes: [...product.offerCodes].sort() }))
        .sort((left, right) => left.productName.localeCompare(right.productName, 'pt-BR')),
    },
  };
}

async function createCampaign(request: Request, client: any, body: Record<string, unknown>) {
  const member = await authorizeMember(request, client, 'admin');
  const input = parseCampaignInput(body);
  const video = await client.from('ci_youtube_videos').select('video_id').eq('video_id', input.videoId).maybeSingle();
  if (video.error) databaseFailure();
  if (!video.data) throw new CommercialIntelligenceError('video_not_found', 'Vídeo não encontrado no catálogo sincronizado.', 400);

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const trackingCode = generateTrackingCode(input.videoId, input.ctaPosition);
    const slug = campaignSlug(input.productId, input.videoId, input.ctaPosition);
    const row = {
      tracking_code: trackingCode,
      slug,
      name: input.name,
      channel: 'youtube',
      video_id: input.videoId,
      product_id: input.productId,
      product_name: input.productName,
      offer_code: input.offerCode,
      destination_url: input.destinationUrl,
      tracking_parameter: input.trackingParameter,
      cta_label: input.ctaLabel,
      cta_position: input.ctaPosition,
      utm_source: input.utmSource,
      utm_medium: input.utmMedium,
      utm_campaign: input.utmCampaign,
      utm_content: input.utmContent,
      utm_term: input.utmTerm,
      status: input.status,
      starts_at: input.startsAt,
      created_by: member.userId,
    };
    const inserted = await client.from('ci_campaigns').insert(row).select(CAMPAIGN_FIELDS).single();
    if (!inserted.error && inserted.data) return { campaign: campaignDto(inserted.data as CampaignRecord), member };
    if (inserted.error?.code !== '23505') databaseFailure();
  }
  throw new CommercialIntelligenceError('campaign_code_collision', 'Não foi possível gerar um código único. Tente novamente.', 409);
}

function batchCampaignName(prefix: string, videoId: string, position: CtaPosition): string {
  return `${prefix} | ${videoId} | ${position}`.slice(0, 120);
}

async function createCampaignBatch(request: Request, client: any, body: Record<string, unknown>) {
  const member = await authorizeMember(request, client, 'admin');
  const input = parseCampaignBatchInput(body);
  const [videoResult, existingResult] = await Promise.all([
    client.from('ci_youtube_videos').select('video_id').in('video_id', input.videoIds),
    client.from('ci_campaigns').select('video_id,cta_position')
      .eq('product_id', input.productId)
      .in('video_id', input.videoIds)
      .in('cta_position', input.positions),
  ]);
  if (videoResult.error || existingResult.error) databaseFailure();

  const foundVideos = new Set((videoResult.data || []).map((video: { video_id: string }) => video.video_id));
  const missingVideos = input.videoIds.filter(videoId => !foundVideos.has(videoId));
  if (missingVideos.length) {
    throw new CommercialIntelligenceError('video_not_found', 'Um ou mais vídeos não existem no catálogo sincronizado.', 400);
  }

  const existingKeys = new Set((existingResult.data || [])
    .map((campaign: { video_id: string; cta_position: CtaPosition }) => `${campaign.video_id}|${campaign.cta_position}`));
  const trackingCodes = new Set<string>();
  const slugs = new Set<string>();
  const rows: Array<Record<string, unknown>> = [];

  for (const videoId of input.videoIds) {
    for (const position of input.positions) {
      if (existingKeys.has(`${videoId}|${position}`)) continue;
      let trackingCode = '';
      let slug = '';
      for (let attempt = 0; attempt < 6; attempt += 1) {
        trackingCode = generateTrackingCode(videoId, position);
        slug = campaignSlug(input.productId, videoId, position);
        if (!trackingCodes.has(trackingCode) && !slugs.has(slug)) break;
      }
      if (!trackingCode || !slug || trackingCodes.has(trackingCode) || slugs.has(slug)) {
        throw new CommercialIntelligenceError('campaign_code_collision', 'Não foi possível gerar códigos únicos para o lote.', 409);
      }
      trackingCodes.add(trackingCode);
      slugs.add(slug);
      rows.push({
        tracking_code: trackingCode,
        slug,
        name: batchCampaignName(input.namePrefix, videoId, position),
        channel: 'youtube',
        video_id: videoId,
        product_id: input.productId,
        product_name: input.productName,
        offer_code: input.offerCode,
        destination_url: input.destinationUrl,
        tracking_parameter: input.trackingParameter,
        cta_label: input.ctaLabel,
        cta_position: position,
        utm_source: input.utmSource,
        utm_medium: input.utmMedium,
        utm_campaign: input.utmCampaign,
        utm_content: `${videoId}-${position}`.slice(0, 160),
        utm_term: null,
        status: input.status,
        starts_at: input.startsAt,
        created_by: member.userId,
      });
    }
  }

  if (!rows.length) {
    return { campaigns: [], created: 0, skipped: existingKeys.size, member };
  }
  const inserted = await client.from('ci_campaigns').insert(rows).select(CAMPAIGN_FIELDS);
  if (inserted.error) {
    if (inserted.error.code === '23505') {
      throw new CommercialIntelligenceError('campaign_code_collision', 'Já existe uma campanha equivalente ou houve colisão de código.', 409);
    }
    databaseFailure();
  }
  return {
    campaigns: (inserted.data || []).map((campaign: CampaignRecord) => campaignDto(campaign)),
    created: inserted.data?.length || 0,
    skipped: input.videoIds.length * input.positions.length - rows.length,
    member,
  };
}

async function updateCampaign(request: Request, client: any) {
  const member = await authorizeMember(request, client, 'admin');
  const body = await readJson(request);
  const campaignId = typeof body.campaignId === 'string' ? body.campaignId.trim() : '';
  const status = body.status === 'active' || body.status === 'inactive' ? body.status : null;
  if (!campaignId || !status) throw new CommercialIntelligenceError('invalid_campaign_update', 'Atualização de campanha inválida.', 400);
  const result = await client.from('ci_campaigns')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('campaign_id', campaignId)
    .select(CAMPAIGN_FIELDS)
    .maybeSingle();
  if (result.error) databaseFailure();
  if (!result.data) throw new CommercialIntelligenceError('campaign_not_found', 'Campanha não encontrada.', 404);
  return { campaign: campaignDto(result.data as CampaignRecord), member };
}

Deno.serve(async request => {
  const options = preflight(request);
  if (options) return options;
  try {
    const client = serviceClient();
    if (request.method === 'GET') {
      const member = await authorizeMember(request, client, 'viewer');
      return json(request, { ok: true, ...(await listCampaigns(client)), member: { role: member.role } });
    }
    if (request.method === 'POST') {
      const body = await readJson(request);
      if (body.mode === 'bulk') {
        const result = await createCampaignBatch(request, client, body);
        return json(request, {
          ok: true,
          campaigns: result.campaigns,
          created: result.created,
          skipped: result.skipped,
          member: { role: result.member.role },
        }, 201);
      }
      const result = await createCampaign(request, client, body);
      return json(request, { ok: true, campaign: result.campaign, member: { role: result.member.role } }, 201);
    }
    if (request.method === 'PATCH') {
      const result = await updateCampaign(request, client);
      return json(request, { ok: true, campaign: result.campaign, member: { role: result.member.role } });
    }
    return json(request, { ok: false, error: { code: 'method_not_allowed', message: 'Método não permitido.' } }, 405);
  } catch (error) {
    return errorResponse(request, error);
  }
});
