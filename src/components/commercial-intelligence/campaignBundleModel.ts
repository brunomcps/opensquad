import type { CtaPosition } from '../../../supabase/functions/_shared/campaigns';
import type { AttributionDto, CampaignCatalog, CampaignDto } from '../../../ci-app/src/api';
import { conversionRate } from './trackingHistoryModel';

type PositionPresentation = { code: string; label: string; order: number; hint?: string };

const POSITION_PRESENTATION: Record<string, PositionPresentation> = {
  description: { code: 'D', label: 'Descrição', order: 0 },
  pinned_comment: { code: 'C', label: 'Comentário fixado', order: 1 },
  comment_reply: { code: 'R', label: 'Resposta a comentário', order: 2 },
  video: { code: 'V', label: 'Card do vídeo', order: 3 },
  bio: { code: 'B', label: 'Bio', order: 4 },
  community: { code: 'CM', label: 'Comunidade', order: 5 },
  // canais de relacionamento (Instagram hoje, TikTok amanhã) entram aqui
  dm: { code: 'DM', label: 'DM do Instagram', order: 6 },
  other: { code: 'O', label: 'Outro', order: 7 },
};

// No Instagram os mesmos códigos significam outra coisa: "comment_reply" é o
// comentário que o robô ManyChat responde por DM, não uma resposta pública.
const INSTAGRAM_POSITION_PRESENTATION: Record<string, PositionPresentation> = {
  bio: { code: 'B', label: 'Bio', order: 0, hint: 'link do perfil' },
  comment_reply: { code: 'C', label: 'Comentário → DM', order: 1, hint: 'robô ManyChat entrega o link' },
  dm: { code: 'DM', label: 'DM manual', order: 2, hint: 'respondida por você' },
};

// Posição desconhecida NUNCA pode derrubar a aba. Em 20/07/2026 a campanha de DM
// do Instagram (cta_position 'dm', gravada direto no banco) não existia no mapa
// acima e o acesso a .code de undefined quebrou a aba Rastreamento inteira.
const POSITION_FALLBACK: PositionPresentation = { code: '?', label: 'Origem não catalogada', order: 99 };

export interface CampaignPositionMetrics {
  clicks: number;
  sales: number;
  additionalSales: number;
  netAfterFees: number;
  refunds: number;
  foreignSales: number;
  lastClickAt: string | null;
}

export interface CampaignPositionItem {
  campaign: CampaignDto;
  code: string;
  label: string;
  hint?: string;
  metrics: CampaignPositionMetrics;
}

export interface CampaignBundleTotals extends CampaignPositionMetrics {
  // null = poucos cliques pra afirmar (ver CONVERSION_MIN_CLICKS)
  conversion: number | null;
  // Mesmos números sem filtro de período; null quando o período já é "desde o início".
  lifetime: { clicks: number; sales: number; additionalSales: number; netAfterFees: number; lastClickAt: string | null } | null;
}

export interface VideoCampaignBundleModel {
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  canEmbed: boolean;
  statusSummary: string;
  statusTone: 'active' | 'inactive' | 'draft' | 'mixed';
  totals: CampaignBundleTotals;
  items: CampaignPositionItem[];
}

export interface InstagramCampaignBundleModel {
  statusSummary: string;
  statusTone: VideoCampaignBundleModel['statusTone'];
  totals: CampaignBundleTotals;
  items: CampaignPositionItem[];
  // Primeira e última data de criação dos links, pra tela dizer "links criados de X a Y".
  createdFrom: string | null;
  createdTo: string | null;
  // Bio com venda e sem clique = a bio ainda usa o HotLink cru (a venda chega, o clique não).
  bioWithoutClicks: boolean;
}

export type BundleTrafficFilter = 'qualified' | 'technical' | 'all';

export interface BundleBuildOptions {
  // 'all' ou ausente = todos os locais; qualquer outro valor restringe as linhas do card.
  position?: string | null;
  traffic?: BundleTrafficFilter;
  // Relatório sem filtro de período (desde o início). Ausente = não mostra "na vida".
  lifetime?: AttributionDto['campaigns'] | null;
}

// Vários links no mesmo local: as respostas a comentário têm variantes
// (padrão, acolhimento, relato, dúvida) e o Instagram tem um link por post.
// Sem isto, quatro linhas "Resposta a comentário" iguais não dizem nada.
const REPLY_VARIANT_NAMES: Record<string, string> = { acolhimento: 'acolhimento', relato: 'relato', duvida: 'dúvida' };

export function itemVariant(
  campaign: Pick<CampaignDto, 'cta_position' | 'utm_content'>,
  channel: 'youtube' | 'instagram',
): { label: string; hint?: string } | null {
  const content = campaign.utm_content || '';
  if (channel === 'instagram' && content.startsWith('post-')) {
    return { label: `Post ${content.slice(5)}`, hint: 'comentário → DM deste post (robô ManyChat)' };
  }
  if (channel === 'youtube' && campaign.cta_position === 'comment_reply') {
    const match = content.match(/comment_reply_([a-z]+)$/i);
    if (match) {
      const variant = match[1].toLowerCase();
      return { label: `Resposta · ${REPLY_VARIANT_NAMES[variant] || variant}`, hint: 'resposta a comentário' };
    }
  }
  return null;
}

export function positionPresentation(position: CtaPosition | string, channel: string | null = 'youtube'): PositionPresentation {
  if (channel === 'instagram') return INSTAGRAM_POSITION_PRESENTATION[position] || POSITION_PRESENTATION[position] || POSITION_FALLBACK;
  return POSITION_PRESENTATION[position] || POSITION_FALLBACK;
}

export function isYouTubeVideoId(value: string): boolean {
  return /^[A-Za-z0-9_-]{11}$/.test(value);
}

export function isInstagramCampaign(campaign: Pick<CampaignDto, 'channel' | 'video_id' | 'cta_position'>): boolean {
  if (campaign.channel === 'instagram') return true;
  // Campanhas antigas gravadas sem canal: sem vídeo e em posição de Instagram.
  return !campaign.video_id && ['bio', 'dm', 'comment_reply'].includes(campaign.cta_position);
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function summarizeCampaignStatuses(campaigns: CampaignDto[]): string {
  const counts = campaigns.reduce((result, campaign) => {
    result[campaign.status] += 1;
    return result;
  }, { active: 0, inactive: 0, draft: 0 });

  if (counts.active === campaigns.length) return `${counts.active} ${counts.active === 1 ? 'link ativo' : 'links ativos'}`;
  if (counts.inactive === campaigns.length) return `${counts.inactive} ${counts.inactive === 1 ? 'link inativo' : 'links inativos'}`;
  if (counts.draft === campaigns.length) return `${counts.draft} ${counts.draft === 1 ? 'link em rascunho' : 'links em rascunho'}`;

  return [
    counts.active ? `${counts.active} ${counts.active === 1 ? 'ativo' : 'ativos'}` : '',
    counts.inactive ? `${counts.inactive} ${counts.inactive === 1 ? 'inativo' : 'inativos'}` : '',
    counts.draft ? `${counts.draft} ${counts.draft === 1 ? 'rascunho' : 'rascunhos'}` : '',
  ].filter(Boolean).join(' · ');
}

export function campaignStatusTone(campaigns: CampaignDto[]): VideoCampaignBundleModel['statusTone'] {
  const statuses = new Set(campaigns.map(campaign => campaign.status));
  return statuses.size === 1 ? campaigns[0].status : 'mixed';
}

type AttributionCampaign = AttributionDto['campaigns'][number];

// O relatório traz cliques de gente (clicks) e o total bruto (clicksTotal).
// "Técnico" = a diferença: robô, scanner, duplicado.
function clicksForTraffic(stats: AttributionCampaign | undefined, traffic: BundleTrafficFilter): number {
  if (!stats) return 0;
  const qualified = stats.clicks || 0;
  const total = stats.clicksTotal ?? qualified;
  if (traffic === 'all') return total;
  if (traffic === 'technical') return Math.max(0, total - qualified);
  return qualified;
}

function positionMetrics(stats: AttributionCampaign | undefined, traffic: BundleTrafficFilter): CampaignPositionMetrics {
  return {
    clicks: clicksForTraffic(stats, traffic),
    sales: stats?.sales || 0,
    additionalSales: stats?.additionalSales || 0,
    netAfterFees: stats?.orderNetAfterFees || 0,
    refunds: (stats?.refunds || 0) + (stats?.additionalRefunds || 0),
    foreignSales: stats?.foreignSales || 0,
    lastClickAt: stats?.lastQualifiedClickAt || stats?.lastClickAt || null,
  };
}

function laterOf(left: string | null, right: string | null): string | null {
  if (!left) return right;
  if (!right) return left;
  return Date.parse(right) > Date.parse(left) ? right : left;
}

function sumMetrics(items: CampaignPositionItem[]): CampaignPositionMetrics {
  return items.reduce((result, item) => ({
    clicks: result.clicks + item.metrics.clicks,
    sales: result.sales + item.metrics.sales,
    additionalSales: result.additionalSales + item.metrics.additionalSales,
    netAfterFees: result.netAfterFees + item.metrics.netAfterFees,
    refunds: result.refunds + item.metrics.refunds,
    foreignSales: result.foreignSales + item.metrics.foreignSales,
    lastClickAt: laterOf(result.lastClickAt, item.metrics.lastClickAt),
  }), { clicks: 0, sales: 0, additionalSales: 0, netAfterFees: 0, refunds: 0, foreignSales: 0, lastClickAt: null as string | null });
}

// Conversão só conta locais onde o clique é medido: uma venda vinda de link cru
// (bio sem clique) entraria como "1 venda em 0 cliques" e distorceria tudo.
function bundleConversion(items: CampaignPositionItem[]): number | null {
  const measured = items.filter(item => item.metrics.clicks > 0);
  const clicks = measured.reduce((sum, item) => sum + item.metrics.clicks, 0);
  const sales = measured.reduce((sum, item) => sum + item.metrics.sales, 0);
  return conversionRate(sales, clicks);
}

function bundleTotals(
  items: CampaignPositionItem[],
  lifetimeByCampaign: Map<string, AttributionCampaign> | null,
  traffic: BundleTrafficFilter,
): CampaignBundleTotals {
  const totals = sumMetrics(items);
  let lifetime: CampaignBundleTotals['lifetime'] = null;
  if (lifetimeByCampaign) {
    lifetime = items.reduce((result, item) => {
      const stats = lifetimeByCampaign.get(item.campaign.campaign_id);
      return {
        clicks: result.clicks + clicksForTraffic(stats, traffic),
        sales: result.sales + (stats?.sales || 0),
        additionalSales: result.additionalSales + (stats?.additionalSales || 0),
        netAfterFees: roundMoney(result.netAfterFees + (stats?.orderNetAfterFees || 0)),
        lastClickAt: laterOf(result.lastClickAt, stats?.lastQualifiedClickAt || stats?.lastClickAt || null),
      };
    }, { clicks: 0, sales: 0, additionalSales: 0, netAfterFees: 0, lastClickAt: null as string | null });
  }
  return {
    ...totals,
    netAfterFees: roundMoney(totals.netAfterFees),
    conversion: bundleConversion(items),
    lifetime,
  };
}

function buildItems(
  campaigns: CampaignDto[],
  channel: 'youtube' | 'instagram',
  attributionByCampaign: Map<string, AttributionCampaign>,
  options: BundleBuildOptions,
): CampaignPositionItem[] {
  const traffic = options.traffic || 'qualified';
  const position = options.position && options.position !== 'all' ? options.position : null;
  return campaigns
    .filter(campaign => !position || campaign.cta_position === position)
    .sort((left, right) => (
      positionPresentation(left.cta_position, channel).order - positionPresentation(right.cta_position, channel).order
      || (left.utm_content || '').localeCompare(right.utm_content || '')
    ))
    .map(campaign => {
      const presentation = positionPresentation(campaign.cta_position, channel);
      const variant = itemVariant(campaign, channel);
      return {
        campaign,
        code: presentation.code,
        label: variant?.label || presentation.label,
        hint: variant?.hint || presentation.hint,
        metrics: positionMetrics(attributionByCampaign.get(campaign.campaign_id), traffic),
      };
    });
}

export function buildVideoCampaignBundles(
  campaigns: CampaignDto[],
  videos: CampaignCatalog['videos'],
  attributionCampaigns: AttributionDto['campaigns'],
  options: BundleBuildOptions = {},
): VideoCampaignBundleModel[] {
  const videoById = new Map(videos.map(video => [video.video_id, video]));
  const attributionByCampaign = new Map(attributionCampaigns.map(item => [item.campaignId, item]));
  const lifetimeByCampaign = options.lifetime ? new Map(options.lifetime.map(item => [item.campaignId, item])) : null;
  const campaignsByVideo = new Map<string, CampaignDto[]>();

  for (const campaign of campaigns) {
    // Campanha de outro canal (DM do Instagram, por exemplo) não tem vídeo e não
    // pertence a esta lista, que agrupa links POR VÍDEO do YouTube. Sem este
    // filtro o título vira null e o .replace() derruba a aba (incidente 20/07);
    // os cliques dela seguem contando normalmente no gráfico e no livro-caixa.
    const videoId = campaign.video_id;
    if (!videoId || isInstagramCampaign(campaign)) continue;
    const group = campaignsByVideo.get(videoId) || [];
    group.push(campaign);
    campaignsByVideo.set(videoId, group);
  }

  const bundles: VideoCampaignBundleModel[] = [];
  for (const [videoId, groupCampaigns] of campaignsByVideo.entries()) {
    const items = buildItems(groupCampaigns, 'youtube', attributionByCampaign, options);
    // Filtro de local que não bate com nenhum link do vídeo: o vídeo sai da lista.
    if (!items.length) continue;
    const video = videoById.get(videoId);
    bundles.push({
      videoId,
      title: video?.title || videoId || 'Vídeo sem título',
      thumbnailUrl: video?.thumbnail_url || null,
      canEmbed: isYouTubeVideoId(videoId),
      statusSummary: summarizeCampaignStatuses(groupCampaigns),
      statusTone: campaignStatusTone(groupCampaigns),
      totals: bundleTotals(items, lifetimeByCampaign, options.traffic || 'qualified'),
      items,
    });
  }
  return bundles;
}

export function buildInstagramCampaignBundle(
  campaigns: CampaignDto[],
  attributionCampaigns: AttributionDto['campaigns'],
  options: BundleBuildOptions = {},
): InstagramCampaignBundleModel | null {
  const instagram = campaigns.filter(isInstagramCampaign);
  if (!instagram.length) return null;
  const attributionByCampaign = new Map(attributionCampaigns.map(item => [item.campaignId, item]));
  const lifetimeByCampaign = options.lifetime ? new Map(options.lifetime.map(item => [item.campaignId, item])) : null;
  const items = buildItems(instagram, 'instagram', attributionByCampaign, options);
  if (!items.length) return null;
  const created = instagram.map(campaign => campaign.starts_at || campaign.created_at).filter(Boolean).sort();
  const bio = items.find(item => item.campaign.cta_position === 'bio');
  return {
    statusSummary: summarizeCampaignStatuses(instagram),
    statusTone: campaignStatusTone(instagram),
    totals: bundleTotals(items, lifetimeByCampaign, options.traffic || 'qualified'),
    items,
    createdFrom: created[0] || null,
    createdTo: created[created.length - 1] || null,
    bioWithoutClicks: Boolean(bio && bio.metrics.sales > 0 && bio.metrics.clicks === 0),
  };
}
