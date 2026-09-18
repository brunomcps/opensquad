import assert from 'node:assert/strict';
import test from 'node:test';
import type { AttributionDto, CampaignCatalog, CampaignDto } from '../../../ci-app/src/api.ts';
import {
  buildInstagramCampaignBundle,
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
  clicksTotal?: number;
  refunds?: number;
  foreignSales?: number;
  lastQualifiedClickAt?: string | null;
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
    clicksTotal: input.clicksTotal, refunds: input.refunds, foreignSales: input.foreignSales,
    lastQualifiedClickAt: input.lastQualifiedClickAt,
  };
}

const NO_EXTRAS = { refunds: 0, foreignSales: 0, lastClickAt: null };

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
  assert.deepEqual(bundles[0].totals, {
    clicks: 15, sales: 3, additionalSales: 3, netAfterFees: 329.85, ...NO_EXTRAS,
    conversion: null, lifetime: null,
  });
  assert.deepEqual(bundles[0].items[2].metrics, { clicks: 0, sales: 0, additionalSales: 0, netAfterFees: 0, ...NO_EXTRAS });
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
      campaign({ campaign_id: 'dm-ig', video_id: null, cta_position: 'dm', channel: 'instagram' }),
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

test('card traz devolvidas, moeda estrangeira, último clique, conversão com volume e totais de vida', () => {
  const campaigns = [
    campaign({ campaign_id: 'description', video_id: '0OkxYzoxzUk', cta_position: 'description' }),
    campaign({ campaign_id: 'comment', video_id: '0OkxYzoxzUk', cta_position: 'pinned_comment' }),
  ];
  const period = [
    attribution({ campaignId: 'description', videoId: '0OkxYzoxzUk', clicks: 60, clicksTotal: 90, sales: 3, netAfterFees: 300, refunds: 1, foreignSales: 1, lastQualifiedClickAt: '2026-09-18T17:37:00.000Z' }),
    attribution({ campaignId: 'comment', videoId: '0OkxYzoxzUk', clicks: 0, clicksTotal: 4, sales: 1, netAfterFees: 100, lastQualifiedClickAt: '2026-09-10T10:00:00.000Z' }),
  ];
  const lifetime = [
    attribution({ campaignId: 'description', videoId: '0OkxYzoxzUk', clicks: 600, clicksTotal: 900, sales: 30, netAfterFees: 3000 }),
    attribution({ campaignId: 'comment', videoId: '0OkxYzoxzUk', clicks: 40, clicksTotal: 44, sales: 2, netAfterFees: 200 }),
  ];
  const [bundle] = buildVideoCampaignBundles(campaigns, videos, period, { lifetime });
  assert.equal(bundle.totals.refunds, 1);
  assert.equal(bundle.totals.foreignSales, 1);
  assert.equal(bundle.totals.lastClickAt, '2026-09-18T17:37:00.000Z', 'o mais recente entre os links');
  assert.equal(bundle.totals.conversion, 0.05, 'só o local com clique medido entra: 3 vendas / 60 cliques');
  assert.deepEqual(bundle.totals.lifetime, { clicks: 640, sales: 32, additionalSales: 0, netAfterFees: 3200, lastClickAt: null });

  const [technical] = buildVideoCampaignBundles(campaigns, videos, period, { traffic: 'technical' });
  assert.equal(technical.totals.clicks, 34, '(90-60) + (4-0) cliques técnicos');
  const [all] = buildVideoCampaignBundles(campaigns, videos, period, { traffic: 'all' });
  assert.equal(all.totals.clicks, 94);
});

test('filtro de local deixa só a linha escolhida e some com o vídeo sem aquele local', () => {
  const campaigns = [
    campaign({ campaign_id: 'description', video_id: '0OkxYzoxzUk', cta_position: 'description' }),
    campaign({ campaign_id: 'comment', video_id: '0OkxYzoxzUk', cta_position: 'pinned_comment' }),
    campaign({ campaign_id: 'other-desc', video_id: 'AAAAAAAAAAA', cta_position: 'description' }),
  ];
  const bundles = buildVideoCampaignBundles(campaigns, videos, [], { position: 'pinned_comment' });
  assert.equal(bundles.length, 1);
  assert.deepEqual(bundles[0].items.map(item => item.code), ['C']);
  assert.equal(buildVideoCampaignBundles(campaigns, videos, [], { position: 'all' }).length, 2);
});

test('Instagram vira um card próprio com Bio, Comentário → DM e DM manual, fora da lista de vídeos', () => {
  const campaigns = [
    campaign({ campaign_id: 'ig-dm', video_id: null, cta_position: 'dm', channel: 'instagram', starts_at: '2026-07-20T03:15:00.000Z' }),
    campaign({ campaign_id: 'ig-bio', video_id: null, cta_position: 'bio', channel: 'instagram', starts_at: '2026-08-07T18:50:00.000Z' }),
    campaign({ campaign_id: 'ig-cmt', video_id: null, cta_position: 'comment_reply', channel: 'instagram', starts_at: '2026-08-14T11:16:00.000Z' }),
    campaign({ campaign_id: 'yt-desc', video_id: '0OkxYzoxzUk', cta_position: 'description' }),
  ];
  const report = [
    attribution({ campaignId: 'ig-bio', videoId: '', clicks: 0, sales: 7, netAfterFees: 812.41 }),
    attribution({ campaignId: 'ig-cmt', videoId: '', clicks: 195, sales: 2, netAfterFees: 228.46 }),
    attribution({ campaignId: 'ig-dm', videoId: '', clicks: 11, sales: 1, netAfterFees: 127.03 }),
  ];
  const instagram = buildInstagramCampaignBundle(campaigns, report);
  assert.ok(instagram);
  assert.deepEqual(instagram.items.map(item => [item.code, item.label]), [['B', 'Bio'], ['C', 'Comentário → DM'], ['DM', 'DM manual']]);
  assert.equal(instagram.items[1].hint, 'robô ManyChat entrega o link');
  assert.equal(instagram.totals.clicks, 206);
  assert.equal(instagram.totals.sales, 10);
  assert.equal(instagram.totals.conversion, 3 / 206, 'bio sem clique fica fora da conversão');
  assert.equal(instagram.bioWithoutClicks, true);
  assert.equal(instagram.createdFrom, '2026-07-20T03:15:00.000Z');
  assert.equal(instagram.createdTo, '2026-08-14T11:16:00.000Z');
  assert.equal(buildVideoCampaignBundles(campaigns, videos, report).length, 1, 'o YouTube segue só com o vídeo');
  assert.equal(buildInstagramCampaignBundle([campaigns[3]], report), null);
});
