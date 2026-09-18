import { authorizeMember } from '../_shared/auth.ts';
import {
  buildDestinationUrl,
  buildRedirectUrl,
  extractInstagramShortcode,
  extractYoutubeVideoId,
  generateCampaignSlug,
  generateInstagramPostSlug,
  generateInstagramPostTrackingCode,
  generateMapa7pCampaignSlug,
  generateTrackingCode,
  instagramPostUtmContent,
  parseCampaignBatchInput,
  parseCampaignInput,
  type CampaignBatchInput,
  type CtaPosition,
  type CampaignRecord,
} from '../_shared/campaigns.ts';
import { edgeRepository, serviceClient } from '../_shared/client.ts';
import { CommercialIntelligenceError } from '../_shared/errors.ts';
import { errorResponse, json, preflight, readJson } from '../_shared/http.ts';
import { parseYoutubeVideoMetadata, parseYoutubeVideoStats, readYoutubeMetadata } from '../_shared/youtube.ts';
import type { Member } from '../_shared/types.ts';

const CAMPAIGN_FIELDS = [
  'campaign_id', 'tracking_code', 'slug', 'name', 'channel', 'video_id', 'product_id', 'product_name',
  'offer_code', 'destination_url', 'tracking_parameter', 'cta_label', 'cta_position', 'utm_source',
  'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'status', 'starts_at', 'created_by',
  'created_at', 'updated_at',
].join(',');

const MAPA7P_PRODUCT_ID = '6966825';
// Mesmos padrões do gerador da tela (BulkCampaignGenerator), pro "colar link"
// criar exatamente os mesmos 4 links que o gerador criaria.
const MAPA7P_PRODUCT_NAME = 'MAPA-7P · Mapeamento de Padrões Dopaminérgico';
const MAPA7P_HOTLINK = 'https://go.hotmart.com/K103806991N';
const MAPA7P_OFFER_CODE = 'vyqym0gx';
const MAPA7P_POSITIONS: CtaPosition[] = ['description', 'pinned_comment', 'comment_reply', 'video'];

function campaignSlug(productId: string, videoId: string, position: CtaPosition): string {
  if (productId === MAPA7P_PRODUCT_ID && ['description', 'pinned_comment', 'comment_reply', 'video'].includes(position)) {
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
  const [campaignResult, videoResult, productResult, clickResult, statsResult] = await Promise.all([
    client.from('ci_campaigns').select(CAMPAIGN_FIELDS).order('created_at', { ascending: false }),
    client.from('ci_youtube_videos').select('video_id,title,published_at,content_type,thumbnail_url,privacy_status').order('published_at', { ascending: false }),
    // Views agregadas no banco. Antes lia a tabela de vendas (1.371 linhas) e a
    // de cliques (12.700) inteiras pelo PostgREST, que corta em 1.000: um
    // produto podia sumir do filtro e a contagem de cliques vinha errada.
    client.from('ci_product_catalog').select('product_id,product_name,offer_codes'),
    client.from('ci_campaign_click_counts').select('campaign_id,human_clicks'),
    client.from('ci_youtube_video_stats').select('video_id,views,likes,comments'),
  ]);
  if (campaignResult.error || videoResult.error || productResult.error || clickResult.error || statsResult.error) databaseFailure();

  const clickCounts = new Map<string, number>();
  for (const row of clickResult.data || []) {
    clickCounts.set(String(row.campaign_id), Number(row.human_clicks) || 0);
  }
  const products = new Map<string, { productId: string; productName: string; offerCodes: Set<string> }>();
  for (const row of productResult.data || []) {
    if (!row.product_id) continue;
    products.set(String(row.product_id), {
      productId: String(row.product_id),
      productName: String(row.product_name || row.product_id),
      offerCodes: new Set<string>((row.offer_codes || []).map((code: unknown) => String(code))),
    });
  }
  const videoStats = new Map<string, { views: number; likes: number; comments: number }>();
  for (const row of statsResult.data || []) {
    videoStats.set(row.video_id, {
      views: Number(row.views) || 0,
      likes: Number(row.likes) || 0,
      comments: Number(row.comments) || 0,
    });
  }

  return {
    campaigns: (campaignResult.data || []).map((campaign: CampaignRecord) => campaignDto(campaign, clickCounts.get(campaign.campaign_id) || 0)),
    catalog: {
      videos: (videoResult.data || []).map((video: Record<string, unknown>) => ({
        ...video,
        stats: videoStats.get(String(video.video_id)) || { views: 0, likes: 0, comments: 0 },
      })),
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
  return insertCampaignBatch(client, member, input);
}

async function insertCampaignBatch(client: any, member: Member, input: CampaignBatchInput) {
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

async function mapaOfferCode(client: any): Promise<string | null> {
  const product = await client.from('ci_product_catalog').select('product_id,product_name,offer_codes')
    .eq('product_id', MAPA7P_PRODUCT_ID).maybeSingle();
  const offers: string[] = Array.isArray(product.data?.offer_codes) ? product.data.offer_codes.map(String) : [];
  return offers.includes(MAPA7P_OFFER_CODE) ? MAPA7P_OFFER_CODE : offers[0] || null;
}

// Colar o link do vídeo: cadastra o vídeo no catálogo (título, data, capa,
// privacidade, views de vida) se ainda não estiver, e cria os 4 links do MAPA.
async function createLinksFromYoutubeUrl(request: Request, client: any, body: Record<string, unknown>) {
  const member = await authorizeMember(request, client, 'admin');
  const videoId = extractYoutubeVideoId(typeof body.url === 'string' ? body.url : '');
  if (!videoId) {
    throw new CommercialIntelligenceError('invalid_youtube_url', 'Não reconheci esse link como um vídeo do YouTube.', 400);
  }
  let video = await client.from('ci_youtube_videos')
    .select('video_id,title,published_at,content_type,thumbnail_url,privacy_status')
    .eq('video_id', videoId).maybeSingle();
  if (video.error) databaseFailure();
  let catalogued = false;
  if (!video.data) {
    const fetchedAt = new Date().toISOString();
    const items = await readYoutubeMetadata([videoId]);
    const metadata = parseYoutubeVideoMetadata(items, fetchedAt);
    if (!metadata.length) {
      throw new CommercialIntelligenceError('video_not_found', 'O YouTube não encontrou esse vídeo (link errado ou vídeo apagado).', 404);
    }
    const repository = edgeRepository();
    await repository.upsertYoutubeVideos(metadata);
    await repository.upsertYoutubeVideoStats(parseYoutubeVideoStats(items, fetchedAt)).catch(() => 0);
    catalogued = true;
    video = await client.from('ci_youtube_videos')
      .select('video_id,title,published_at,content_type,thumbnail_url,privacy_status')
      .eq('video_id', videoId).maybeSingle();
    if (video.error || !video.data) databaseFailure();
  }
  const result = await insertCampaignBatch(client, member, {
    namePrefix: 'MAPA-7P',
    videoIds: [videoId],
    productId: MAPA7P_PRODUCT_ID,
    productName: MAPA7P_PRODUCT_NAME,
    offerCode: await mapaOfferCode(client),
    destinationUrl: MAPA7P_HOTLINK,
    trackingParameter: 'src',
    ctaLabel: 'Conheça o MAPA-7P',
    positions: MAPA7P_POSITIONS,
    utmSource: 'youtube',
    utmMedium: 'organic',
    utmCampaign: 'mapa7p-youtube',
    startsAt: new Date().toISOString(),
    status: 'active',
  });
  return { ...result, video: video.data, catalogued };
}

// Colar o link do post do Instagram: um link só, pro robô (ManyChat) entregar
// na DM de quem comentar naquele post. Post repetido devolve o link que já existe.
async function createInstagramPostLink(request: Request, client: any, body: Record<string, unknown>) {
  const member = await authorizeMember(request, client, 'admin');
  const shortcode = extractInstagramShortcode(typeof body.url === 'string' ? body.url : '');
  if (!shortcode) {
    throw new CommercialIntelligenceError('invalid_instagram_url', 'Não reconheci esse link como um post, reel ou vídeo do Instagram.', 400);
  }
  const utmContent = instagramPostUtmContent(shortcode);
  const existing = await client.from('ci_campaigns').select(CAMPAIGN_FIELDS)
    .eq('channel', 'instagram').eq('utm_content', utmContent).limit(1).maybeSingle();
  if (existing.error) databaseFailure();
  if (existing.data) {
    return { campaign: campaignDto(existing.data as CampaignRecord), created: 0, skipped: 1, member };
  }
  const offerCode = await mapaOfferCode(client);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const row = {
      tracking_code: generateInstagramPostTrackingCode(shortcode),
      slug: generateInstagramPostSlug(shortcode),
      name: `MAPA-7P | Instagram | post ${shortcode}`.slice(0, 120),
      channel: 'instagram',
      video_id: null,
      product_id: MAPA7P_PRODUCT_ID,
      product_name: MAPA7P_PRODUCT_NAME,
      offer_code: offerCode,
      destination_url: MAPA7P_HOTLINK,
      tracking_parameter: 'src',
      cta_label: `Comentário → DM do post ${shortcode}`.slice(0, 120),
      cta_position: 'comment_reply',
      utm_source: 'instagram',
      utm_medium: 'organic',
      utm_campaign: 'mapa7p-instagram',
      utm_content: utmContent,
      utm_term: null,
      status: 'active',
      starts_at: new Date().toISOString(),
      created_by: member.userId,
    };
    const inserted = await client.from('ci_campaigns').insert(row).select(CAMPAIGN_FIELDS).single();
    if (!inserted.error && inserted.data) return { campaign: campaignDto(inserted.data as CampaignRecord), created: 1, skipped: 0, member };
    if (inserted.error?.code !== '23505') databaseFailure();
  }
  throw new CommercialIntelligenceError('campaign_code_collision', 'Não foi possível gerar um código único. Tente novamente.', 409);
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
      if (body.mode === 'youtube_url') {
        const result = await createLinksFromYoutubeUrl(request, client, body);
        return json(request, {
          ok: true,
          video: result.video,
          catalogued: result.catalogued,
          campaigns: result.campaigns,
          created: result.created,
          skipped: result.skipped,
          member: { role: result.member.role },
        }, 201);
      }
      if (body.mode === 'instagram_post') {
        const result = await createInstagramPostLink(request, client, body);
        return json(request, {
          ok: true,
          campaign: result.campaign,
          created: result.created,
          skipped: result.skipped,
          member: { role: result.member.role },
        }, 201);
      }
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
