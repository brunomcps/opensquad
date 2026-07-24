import assert from 'node:assert/strict';
import test from 'node:test';
import type { AttributionDto, CampaignCatalog, CampaignDto } from '../../../ci-app/src/api.ts';
import {
  buildVideoCampaignBundles,
  isYouTubeVideoId,
  summarizeCampaignStatuses,
} from '../../../src/components/commercial-intelligence/campaignBundleModel.ts';

function campaign(input: Partial<CampaignDto> & Pick<CampaignDto, 'campaign_id' | 'video_id' | 'cta_position'>): CampaignDto {
  return {
    tracking_code: `yt|${input.video_id}|x|test`, slug: `slug-${input.campaign_id}`, name: `Campanha ${input.campaign_id}`,
    channel: 'youtube', product_id: 'p1', product_name: 'MAPA-7P', offer_code: null,
    destination_url: 'https://go.hotmart.com/K103806991N', tracking_parameter: 'src', cta_label: 'Conheça o MAPA-7P',
    utm_source: 'youtube', utm_medium: 'organic', utm_campaign: 'mapa7p-youtube', utm_content: input.cta_position,
    utm_term: null, status: 'active', starts_at: '2026-07-14T12:00:00.000Z', created_at: '2026-07-14T12:00:00.000Z',
    updated_at: '2026-07-14T12:00:00.000Z', directUrl: 'https://go.hotmart.com/K103806991N',
    redirectUrl: `https://link.brunosallesphd.com.br/m7p/${input.campaign_id}`, humanClicks: 0,
    ...input,
  };
}

function attribution(input: {
  campaignId: string;
  videoId: string;
  clicks: number;
  sales: number;
  netAfterFees: number;
  additionalSales?: number;
  additionalNetAfterFees?: number;
}): AttributionDto['campaigns'][number] {
  const additionalSales = input.additionalSales || 0;
  const additionalNetAfterFees = input.additionalNetAfterFees || 0;
  return {
    campaignId: input.campaignId, campaignName: input.campaignId, trackingCode: input.campaignId,
    videoId: input.videoId, productName: 'MAPA-7P', ctaLabel: 'Conheça', ctaPosition: 'description',
    clicks: input.clicks, sales: input.sales, additionalSales,
    financialDataIncompleteSales: 0, additionalFinancialDataIncompleteSales: 0,
    netAfterFees: input.netAfterFees, additionalNetAfterFees,
    orderNetAfterFees: input.netAfterFees + additionalNetAfterFees,
    clickToSale: input.clicks ? input.sales / input.clicks : null,
  };
}

const videos: CampaignCatalog['videos'] = [{
  video_id: '0OkxYzoxzUk', title: 'O QUE REALMENTE É TDAH', published_at: '2026-07-01T12:00:00.000Z',
  content_type: 'long', thumbnail_url: 'https://i.ytimg.com/vi/0OkxYzoxzUk/hqdefault.jpg',
}];

test('agrupa campanhas por vídeo, ordena D/C/R/V e agrega métricas', () => {
  const campaigns = [
    campaign({ campaign_id: 'reply', video_id: '0OkxYzoxzUk', cta_position: 'comment_reply' }),
    campaign({ campaign_id: 'description', video_id: '0OkxYzoxzUk', cta_position: 'description' }),
    campaign({ campaign_id: 'comment', video_id: '0OkxYzoxzUk', cta_position: 'pinned_comment' }),
    campaign({ campaign_id: 'video-card', video_id: '0OkxYzoxzUk', cta_position: 'video' }),
  ];
  const bundles = buildVideoCampaignBundles(campaigns, videos, [
    attribution({ campaignId: 'description', videoId: '0OkxYzoxzUk', clicks: 10, sales: 2, netAfterFees: 199.9, additionalSales: 1, additionalNetAfterFees: 20 }),
    attribution({ campaignId: 'comment', videoId: '0OkxYzoxzUk', clicks: 5, sales: 1, netAfterFees: 99.95, additionalSales: 2, additionalNetAfterFees: 10 }),
  ]);

  assert.equal(bundles.length, 1);
  assert.deepEqual(bundles[0].items.map(item => item.code), ['D', 'C', 'R', 'V']);
  assert.equal(bundles[0].items[3].label, 'Card do vídeo');
  assert.deepEqual(bundles[0].totals, { clicks: 15, sales: 3, additionalSales: 3, netAfterFees: 329.85 });
  assert.deepEqual(bundles[0].items[2].metrics, { clicks: 0, sales: 0, additionalSales: 0, netAfterFees: 0 });
  assert.equal(bundles[0].statusSummary, '4 links ativos');
  assert.equal(bundles[0].statusTone, 'active');
  assert.equal(bundles[0].thumbnailUrl, videos[0].thumbnail_url);
});

test('mantém vídeos separados e usa metadados seguros como fallback', () => {
  const bundles = buildVideoCampaignBundles([
    campaign({ campaign_id: 'known', video_id: '0OkxYzoxzUk', cta_position: 'description' }),
    campaign({ campaign_id: 'unknown', video_id: 'short', cta_position: 'bio' }),
  ], videos, []);

  assert.equal(bundles.length, 2);
  assert.equal(bundles[1].title, 'short');
  assert.equal(bundles[1].thumbnailUrl, null);
  assert.equal(bundles[1].canEmbed, false);
  assert.deepEqual(bundles[1].items.map(item => [item.code, item.label]), [['B', 'Bio']]);
});

test('resume estados homogêneos e mistos sem esconder rascunhos', () => {
  const active = campaign({ campaign_id: 'a', video_id: '0OkxYzoxzUk', cta_position: 'description' });
  const inactive = campaign({ campaign_id: 'i', video_id: '0OkxYzoxzUk', cta_position: 'pinned_comment', status: 'inactive' });
  const draft = campaign({ campaign_id: 'd', video_id: '0OkxYzoxzUk', cta_position: 'comment_reply', status: 'draft' });

  assert.equal(summarizeCampaignStatuses([active]), '1 link ativo');
  assert.equal(summarizeCampaignStatuses([inactive, { ...inactive, campaign_id: 'i2' }]), '2 links inativos');
  assert.equal(summarizeCampaignStatuses([active, inactive, draft]), '1 ativo · 1 inativo · 1 rascunho');
  assert.equal(buildVideoCampaignBundles([active, inactive, draft], videos, [])[0].statusTone, 'mixed');
});

test('aceita somente o formato seguro de ID usado pelo embed do YouTube', () => {
  assert.equal(isYouTubeVideoId('0OkxYzoxzUk'), true);
  assert.equal(isYouTubeVideoId('abc-DEF_123'), true);
  assert.equal(isYouTubeVideoId('short'), false);
  assert.equal(isYouTubeVideoId('invalid/id!'), false);
});

// Regressão do incidente de 20/07/2026: a campanha de DM do Instagram (sem
// vídeo, posição 'dm' fora do catálogo de posições) derrubou a aba Rastreamento
// inteira em produção, por duas causas somadas: posição desconhecida devolvia
// undefined e vídeo ausente virava título null no .replace().
test('campanha de outro canal (sem vídeo) não entra na lista por vídeo e não quebra', () => {
  const bundles = buildVideoCampaignBundles(
    [
      campaign({ campaign_id: 'dm-ig', video_id: null as unknown as string, cta_position: 'dm' as never }),
      campaign({ campaign_id: 'description', video_id: '0OkxYzoxzUk', cta_position: 'description' }),
    ],
    videos,
    [],
  );
  assert.equal(bundles.length, 1, 'só o vídeo do YouTube vira conjunto');
  assert.equal(bundles[0].videoId, '0OkxYzoxzUk');
  for (const bundle of bundles) {
    assert.equal(typeof bundle.title, 'string');
    for (const item of bundle.items) {
      assert.equal(typeof item.code, 'string');
      assert.equal(typeof item.label, 'string');
    }
  }
});

test('posição desconhecida no banco não derruba a tela (usa rótulo de reserva)', () => {
  const bundles = buildVideoCampaignBundles(
    [campaign({ campaign_id: 'futuro', video_id: '0OkxYzoxzUk', cta_position: 'tiktok_bio' as never })],
    videos,
    [],
  );
  assert.equal(bundles[0].items[0].code, '?');
  assert.equal(bundles[0].items[0].label, 'Origem não catalogada');
});
