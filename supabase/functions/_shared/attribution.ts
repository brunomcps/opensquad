import type { CampaignRecord } from './campaigns.ts';

export interface AttributionTransaction {
  transaction_id: string;
  status: string;
  approved_date: string | null;
  gross_value: number | string | null;
  gross_currency: string | null;
  fee_value: number | string | null;
  fee_currency: string | null;
  tracking_src: string | null;
  tracking_sck: string | null;
  tracking_xcod: string | null;
}

export interface AttributionClick {
  campaign_id: string;
  is_bot: boolean;
}

export interface DirectAttributionReport {
  currency: string;
  totals: {
    approvedSales: number;
    trackedOriginSales: number;
    attributedSales: number;
    unattributedSales: number;
    ambiguousOriginSales: number;
    attributedNetAfterFees: number;
    coverage: number;
    humanClicks: number;
  };
  campaigns: Array<{
    campaignId: string;
    campaignName: string;
    trackingCode: string;
    videoId: string;
    productName: string;
    ctaLabel: string;
    ctaPosition: string;
    clicks: number;
    sales: number;
    netAfterFees: number;
    clickToSale: number | null;
  }>;
  unknownCodes: Array<{ code: string; sales: number; netAfterFees: number }>;
}

function money(value: number | string | null): number | null {
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function ratio(value: number): number {
  return Math.round((value + Number.EPSILON) * 10_000) / 10_000;
}

function originCodes(transaction: AttributionTransaction): string[] {
  return [...new Set([
    transaction.tracking_sck,
    transaction.tracking_src,
    transaction.tracking_xcod,
  ].map(value => value?.trim()).filter((value): value is string => Boolean(value)))];
}

function transactionNet(transaction: AttributionTransaction, currency: string): number {
  if (transaction.gross_currency?.toUpperCase() !== currency) return 0;
  if (transaction.fee_currency?.toUpperCase() !== currency) return 0;
  const gross = money(transaction.gross_value);
  const fee = money(transaction.fee_value);
  return gross === null || fee === null ? 0 : gross - fee;
}

export function buildDirectAttributionReport(input: {
  campaigns: CampaignRecord[];
  transactions: AttributionTransaction[];
  clicks: AttributionClick[];
  currency?: string;
}): DirectAttributionReport {
  const currency = (input.currency || 'BRL').toUpperCase();
  const campaignByCode = new Map(input.campaigns.map(campaign => [campaign.tracking_code.trim().toLowerCase(), campaign]));
  const clicks = new Map<string, number>();
  for (const click of input.clicks) {
    if (!click.is_bot) clicks.set(click.campaign_id, (clicks.get(click.campaign_id) || 0) + 1);
  }

  const campaignStats = new Map<string, { sales: number; net: number }>();
  const unknown = new Map<string, { sales: number; net: number }>();
  let approvedSales = 0;
  let trackedOriginSales = 0;
  let attributedSales = 0;
  let attributedNet = 0;
  let ambiguousOriginSales = 0;

  for (const transaction of input.transactions) {
    if (transaction.status !== 'approved' || transaction.gross_currency?.toUpperCase() !== currency) continue;
    approvedSales += 1;
    const codes = originCodes(transaction);
    if (codes.length) trackedOriginSales += 1;
    const matches = [...new Map(
      codes.map(code => campaignByCode.get(code.toLowerCase())).filter((campaign): campaign is CampaignRecord => Boolean(campaign))
        .map(campaign => [campaign.campaign_id, campaign]),
    ).values()];
    const net = transactionNet(transaction, currency);

    if (matches.length === 1) {
      const campaign = matches[0];
      const stats = campaignStats.get(campaign.campaign_id) || { sales: 0, net: 0 };
      stats.sales += 1;
      stats.net += net;
      campaignStats.set(campaign.campaign_id, stats);
      attributedSales += 1;
      attributedNet += net;
      continue;
    }

    if (matches.length > 1) ambiguousOriginSales += 1;

    for (const code of codes) {
      if (campaignByCode.has(code.toLowerCase())) continue;
      const stats = unknown.get(code) || { sales: 0, net: 0 };
      stats.sales += 1;
      stats.net += net;
      unknown.set(code, stats);
    }
  }

  const campaignRows = input.campaigns.map(campaign => {
    const stats = campaignStats.get(campaign.campaign_id) || { sales: 0, net: 0 };
    const humanClicks = clicks.get(campaign.campaign_id) || 0;
    return {
      campaignId: campaign.campaign_id,
      campaignName: campaign.name,
      trackingCode: campaign.tracking_code,
      videoId: campaign.video_id,
      productName: campaign.product_name,
      ctaLabel: campaign.cta_label,
      ctaPosition: campaign.cta_position,
      clicks: humanClicks,
      sales: stats.sales,
      netAfterFees: round(stats.net),
      clickToSale: humanClicks ? ratio(stats.sales / humanClicks) : null,
    };
  }).sort((left, right) => right.netAfterFees - left.netAfterFees || right.sales - left.sales || right.clicks - left.clicks);

  return {
    currency,
    totals: {
      approvedSales,
      trackedOriginSales,
      attributedSales,
      unattributedSales: approvedSales - attributedSales,
      ambiguousOriginSales,
      attributedNetAfterFees: round(attributedNet),
      coverage: approvedSales ? ratio(attributedSales / approvedSales) : 0,
      humanClicks: [...clicks.values()].reduce((total, value) => total + value, 0),
    },
    campaigns: campaignRows,
    unknownCodes: [...unknown.entries()]
      .map(([code, stats]) => ({ code, sales: stats.sales, netAfterFees: round(stats.net) }))
      .sort((left, right) => right.sales - left.sales || left.code.localeCompare(right.code)),
  };
}
