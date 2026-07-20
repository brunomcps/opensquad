import type { CtaPosition } from '../../../supabase/functions/_shared/campaigns';
import type { AttributionDto, CampaignCatalog, CampaignDto } from '../../../ci-app/src/api';

type PositionPresentation = { code: string; label: string; order: number };

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

// Posição desconhecida NUNCA pode derrubar a aba. Em 20/07/2026 a campanha de DM
// do Instagram (cta_position 'dm', gravada direto no banco) não existia no mapa
// acima e o acesso a .code de undefined quebrou a aba Rastreamento inteira.
const POSITION_FALLBACK: PositionPresentation = { code: '?', label: 'Origem não catalogada', order: 99 };

export interface CampaignPositionItem {
  campaign: CampaignDto;
  code: string;
  label: string;
  metrics: {
    clicks: number;
    sales: number;
    additionalSales: number;
    netAfterFees: number;
  };
}

export interface VideoCampaignBundleModel {
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  canEmbed: boolean;
  statusSummary: string;
  statusTone: 'active' | 'inactive' | 'draft' | 'mixed';
  totals: {
    clicks: number;
    sales: number;
    additionalSales: number;
    netAfterFees: number;
  };
  items: CampaignPositionItem[];
}

export function positionPresentation(position: CtaPosition | string): PositionPresentation {
  return POSITION_PRESENTATION[position] || POSITION_FALLBACK;
}

export function isYouTubeVideoId(value: string): boolean {
  return /^[A-Za-z0-9_-]{11}$/.test(value);
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

export function buildVideoCampaignBundles(
  campaigns: CampaignDto[],
  videos: CampaignCatalog['videos'],
  attributionCampaigns: AttributionDto['campaigns'],
): VideoCampaignBundleModel[] {
  const videoById = new Map(videos.map(video => [video.video_id, video]));
  const attributionByCampaign = new Map(attributionCampaigns.map(item => [item.campaignId, item]));
  const campaignsByVideo = new Map<string, CampaignDto[]>();

  for (const campaign of campaigns) {
    const group = campaignsByVideo.get(campaign.video_id) || [];
    group.push(campaign);
    campaignsByVideo.set(campaign.video_id, group);
  }

  return [...campaignsByVideo.entries()].map(([videoId, groupCampaigns]) => {
    const video = videoById.get(videoId);
    const items = [...groupCampaigns]
      .sort((left, right) => positionPresentation(left.cta_position).order - positionPresentation(right.cta_position).order)
      .map(campaign => {
        const presentation = positionPresentation(campaign.cta_position);
        const stats = attributionByCampaign.get(campaign.campaign_id);
        return {
          campaign,
          code: presentation.code,
          label: presentation.label,
          metrics: {
            clicks: stats?.clicks || 0,
            sales: stats?.sales || 0,
            additionalSales: stats?.additionalSales || 0,
            netAfterFees: stats?.orderNetAfterFees || 0,
          },
        };
      });

    const totals = items.reduce((result, item) => ({
      clicks: result.clicks + item.metrics.clicks,
      sales: result.sales + item.metrics.sales,
      additionalSales: result.additionalSales + item.metrics.additionalSales,
      netAfterFees: result.netAfterFees + item.metrics.netAfterFees,
    }), { clicks: 0, sales: 0, additionalSales: 0, netAfterFees: 0 });

    return {
      videoId,
      title: video?.title || videoId,
      thumbnailUrl: video?.thumbnail_url || null,
      canEmbed: isYouTubeVideoId(videoId),
      statusSummary: summarizeCampaignStatuses(groupCampaigns),
      statusTone: campaignStatusTone(groupCampaigns),
      totals: { ...totals, netAfterFees: roundMoney(totals.netAfterFees) },
      items,
    };
  });
}
