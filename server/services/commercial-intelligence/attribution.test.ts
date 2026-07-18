import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDirectAttributionReport, type AttributionTransaction } from '../../../supabase/functions/_shared/attribution.ts';
import type { CampaignRecord } from '../../../supabase/functions/_shared/campaigns.ts';

const campaign: CampaignRecord = {
  campaign_id: 'c1', tracking_code: 'yt|video1|d|a1b2', slug: 'ci-abcdef123456',
  name: 'Vídeo 1', channel: 'youtube', video_id: 'video1', product_id: 'p1', product_name: 'Curso',
  offer_code: null, destination_url: 'https://pay.hotmart.com/X1', tracking_parameter: 'sck',
  cta_label: 'Conheça', cta_position: 'description', utm_source: 'youtube', utm_medium: 'organic',
  utm_campaign: 'video-1', utm_content: null, utm_term: null, status: 'active',
  starts_at: '2026-07-13T00:00:00.000Z', created_by: 'u1', created_at: '2026-07-13T00:00:00.000Z',
  updated_at: '2026-07-13T00:00:00.000Z',
};

function transaction(
  id: string,
  sck: string | null,
  overrides: Partial<AttributionTransaction> = {},
): AttributionTransaction {
  return {
    transaction_id: id,
    product_id: 'p1',
    offer_code: null,
    status: 'approved',
    approved_date: '2026-07-13T12:00:00.000Z',
    gross_value: 100,
    gross_currency: 'BRL',
    fee_value: 10,
    fee_currency: 'BRL',
    producer_net_value: null,
    producer_net_currency: null,
    tracking_src: null,
    tracking_sck: sck,
    tracking_xcod: null,
    ...overrides,
  };
}

test('atribui somente origem e produto conhecidos sem duplicar transação', () => {
  const report = buildDirectAttributionReport({
    campaigns: [campaign],
    transactions: [transaction('t1', campaign.tracking_code), transaction('t2', null), transaction('t3', 'desconhecido')],
    clicks: [{ campaign_id: 'c1', is_bot: false }, { campaign_id: 'c1', is_bot: true }],
  });
  assert.deepEqual(report.totals, {
    approvedSales: 3,
    trackedOriginSales: 2,
    attributedSales: 1,
    additionalProductSales: 0,
    unattributedSales: 2,
    ambiguousOriginSales: 0,
    financialDataIncompleteSales: 0,
    additionalFinancialDataIncompleteSales: 0,
    attributedNetAfterFees: 90,
    attributedAdditionalNetAfterFees: 0,
    attributedOrderNetAfterFees: 90,
    coverage: 0.3333,
    humanClicks: 1,
  });
  assert.equal(report.campaigns[0].sales, 1);
  assert.equal(report.campaigns[0].additionalSales, 0);
  assert.equal(report.campaigns[0].clickToSale, 1);
  assert.deepEqual(report.unknownCodes, [{ code: 'desconhecido', sales: 1, netAfterFees: 90 }]);
});

test('origens conflitantes não geram crédito duplo', () => {
  const second = { ...campaign, campaign_id: 'c2', tracking_code: 'yt|video2|d|a1b2', video_id: 'video2' };
  const report = buildDirectAttributionReport({
    campaigns: [campaign, second],
    transactions: [{ ...transaction('t1', campaign.tracking_code), tracking_src: second.tracking_code }],
    clicks: [],
  });
  assert.equal(report.totals.attributedSales, 0);
  assert.equal(report.totals.ambiguousOriginSales, 1);
  assert.equal(report.campaigns.reduce((total, row) => total + row.sales, 0), 0);
});

test('conta uma venda do MAPA e separa três produtos adicionais do checkout', () => {
  const trackingCode = 'yt|WrWsJ4MjP04|d|e17e';
  const mapaCampaign: CampaignRecord = {
    ...campaign,
    campaign_id: 'mapa-description',
    tracking_code: trackingCode,
    video_id: 'WrWsJ4MjP04',
    product_id: '6966825',
    product_name: 'MAPA-7P',
    offer_code: 'vyqym0gx',
  };
  const webhookTransaction = (
    id: string,
    productId: string,
    net: number,
  ): AttributionTransaction => transaction(id, null, {
    product_id: productId,
    gross_currency: null,
    fee_value: null,
    fee_currency: null,
    producer_net_value: net,
    producer_net_currency: 'BRL',
    tracking_src: trackingCode,
  });

  const report = buildDirectAttributionReport({
    campaigns: [mapaCampaign],
    transactions: [
      webhookTransaction('mapa', '6966825', 127.03),
      webhookTransaction('guia', '7117503', 43.33),
      webhookTransaction('manual', '7150363', 24.14),
      webhookTransaction('autismo', '7390260', 86.4),
    ],
    clicks: [
      { campaign_id: 'mapa-description', is_bot: false },
      { campaign_id: 'mapa-description', is_bot: false },
    ],
  });

  assert.equal(report.totals.approvedSales, 1);
  assert.equal(report.totals.trackedOriginSales, 1);
  assert.equal(report.totals.attributedSales, 1);
  assert.equal(report.totals.additionalProductSales, 3);
  assert.equal(report.totals.attributedNetAfterFees, 127.03);
  assert.equal(report.totals.attributedAdditionalNetAfterFees, 153.87);
  assert.equal(report.totals.attributedOrderNetAfterFees, 280.9);
  assert.equal(report.campaigns[0].sales, 1);
  assert.equal(report.campaigns[0].additionalSales, 3);
  assert.equal(report.campaigns[0].netAfterFees, 127.03);
  assert.equal(report.campaigns[0].additionalNetAfterFees, 153.87);
  assert.equal(report.campaigns[0].orderNetAfterFees, 280.9);
  assert.equal(report.campaigns[0].clickToSale, 0.5);
});

test('não descarta conversão rastreada quando o financeiro está incompleto', () => {
  const report = buildDirectAttributionReport({
    campaigns: [campaign],
    transactions: [transaction('t1', campaign.tracking_code, {
      gross_value: 100,
      gross_currency: null,
      fee_value: null,
      fee_currency: null,
      producer_net_value: null,
      producer_net_currency: null,
    })],
    clicks: [],
  });

  assert.equal(report.totals.attributedSales, 1);
  assert.equal(report.totals.financialDataIncompleteSales, 1);
  assert.equal(report.totals.attributedNetAfterFees, 0);
  assert.equal(report.campaigns[0].financialDataIncompleteSales, 1);
});

test('conta somente tráfego classificado como qualified e mantém fallback legado', () => {
  const report = buildDirectAttributionReport({
    campaigns: [campaign],
    transactions: [],
    clicks: [
      { campaign_id: 'c1', is_bot: false, traffic_classification: 'qualified' },
      { campaign_id: 'c1', is_bot: false, traffic_classification: 'test' },
      { campaign_id: 'c1', is_bot: false },
      { campaign_id: 'c1', is_bot: true },
    ],
  });

  assert.equal(report.totals.humanClicks, 2);
  assert.equal(report.campaigns[0].clicks, 2);
});
