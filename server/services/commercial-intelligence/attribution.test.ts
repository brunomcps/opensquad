import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDirectAttributionReport } from '../../../supabase/functions/_shared/attribution.ts';
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

function transaction(id: string, sck: string | null) {
  return {
    transaction_id: id, status: 'approved', approved_date: '2026-07-13T12:00:00.000Z',
    gross_value: 100, gross_currency: 'BRL', fee_value: 10, fee_currency: 'BRL',
    tracking_src: null, tracking_sck: sck, tracking_xcod: null,
  };
}

test('atribui somente origem conhecida e não duplica transação', () => {
  const report = buildDirectAttributionReport({
    campaigns: [campaign],
    transactions: [transaction('t1', campaign.tracking_code), transaction('t2', null), transaction('t3', 'desconhecido')],
    clicks: [{ campaign_id: 'c1', is_bot: false }, { campaign_id: 'c1', is_bot: true }],
  });
  assert.deepEqual(report.totals, {
    approvedSales: 3, trackedOriginSales: 2, attributedSales: 1, unattributedSales: 2,
    ambiguousOriginSales: 0, attributedNetAfterFees: 90, coverage: 0.3333, humanClicks: 1,
  });
  assert.equal(report.campaigns[0].sales, 1);
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
