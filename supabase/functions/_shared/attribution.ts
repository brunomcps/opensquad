import type { CampaignRecord } from './campaigns.ts';

export interface AttributionTransaction {
  transaction_id: string;
  product_id: string | null;
  offer_code: string | null;
  status: string;
  approved_date: string | null;
  gross_value: number | string | null;
  gross_currency: string | null;
  fee_value: number | string | null;
  fee_currency: string | null;
  producer_net_value: number | string | null;
  producer_net_currency: string | null;
  tracking_src: string | null;
  tracking_sck: string | null;
  tracking_xcod: string | null;
}

export interface AttributionClick {
  campaign_id: string;
  is_bot: boolean;
  traffic_classification?: string | null;
}

export interface DirectAttributionReport {
  currency: string;
  totals: {
    approvedSales: number;
    trackedOriginSales: number;
    attributedSales: number;
    additionalProductSales: number;
    unattributedSales: number;
    ambiguousOriginSales: number;
    financialDataIncompleteSales: number;
    additionalFinancialDataIncompleteSales: number;
    attributedNetAfterFees: number;
    attributedAdditionalNetAfterFees: number;
    attributedOrderNetAfterFees: number;
    coverage: number;
    humanClicks: number;
  };
  campaigns: Array<{
    campaignId: string;
    campaignName: string;
    trackingCode: string;
    // null nas campanhas do Instagram (não têm vídeo)
    videoId: string | null;
    productName: string;
    ctaLabel: string;
    ctaPosition: string;
    clicks: number;
    sales: number;
    additionalSales: number;
    financialDataIncompleteSales: number;
    additionalFinancialDataIncompleteSales: number;
    netAfterFees: number;
    additionalNetAfterFees: number;
    orderNetAfterFees: number;
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

function normalized(value: string | null): string | null {
  const result = value?.trim().toLowerCase();
  return result || null;
}

function originCodes(transaction: AttributionTransaction): string[] {
  return [...new Set([
    transaction.tracking_sck,
    transaction.tracking_src,
    transaction.tracking_xcod,
  ].map(normalized).filter((value): value is string => Boolean(value)))];
}

function sameProduct(transaction: AttributionTransaction, campaign: CampaignRecord): boolean {
  const productId = normalized(transaction.product_id);
  if (productId) return productId === normalized(campaign.product_id);
  const offerCode = normalized(transaction.offer_code);
  return Boolean(offerCode && offerCode === normalized(campaign.offer_code));
}

function transactionMatchesCurrency(transaction: AttributionTransaction, currency: string): boolean {
  const producerNet = money(transaction.producer_net_value);
  if (producerNet !== null && transaction.producer_net_currency) {
    return transaction.producer_net_currency.toUpperCase() === currency;
  }
  const gross = money(transaction.gross_value);
  if (gross !== null && transaction.gross_currency) {
    return transaction.gross_currency.toUpperCase() === currency;
  }
  return true;
}

function transactionNet(transaction: AttributionTransaction, currency: string): number | null {
  const producerNet = money(transaction.producer_net_value);
  if (producerNet !== null && transaction.producer_net_currency?.toUpperCase() === currency) {
    return producerNet;
  }
  if (transaction.gross_currency?.toUpperCase() !== currency) return null;
  if (transaction.fee_currency?.toUpperCase() !== currency) return null;
  const gross = money(transaction.gross_value);
  const fee = money(transaction.fee_value);
  return gross === null || fee === null ? null : gross - fee;
}

interface CampaignStats {
  sales: number;
  additionalSales: number;
  net: number;
  additionalNet: number;
  financialDataIncompleteSales: number;
  additionalFinancialDataIncompleteSales: number;
}

function emptyStats(): CampaignStats {
  return {
    sales: 0,
    additionalSales: 0,
    net: 0,
    additionalNet: 0,
    financialDataIncompleteSales: 0,
    additionalFinancialDataIncompleteSales: 0,
  };
}

export function buildDirectAttributionReport(input: {
  campaigns: CampaignRecord[];
  transactions: AttributionTransaction[];
  clicks: AttributionClick[];
  currency?: string;
}): DirectAttributionReport {
  const currency = (input.currency || 'BRL').toUpperCase();
  const campaignByCode = new Map(input.campaigns.map(campaign => [normalized(campaign.tracking_code)!, campaign]));
  const clicks = new Map<string, number>();
  for (const click of input.clicks) {
    const qualified = click.traffic_classification === undefined || click.traffic_classification === null
      ? !click.is_bot
      : click.traffic_classification === 'qualified';
    if (qualified) clicks.set(click.campaign_id, (clicks.get(click.campaign_id) || 0) + 1);
  }

  const campaignStats = new Map<string, CampaignStats>();
  const unknown = new Map<string, { sales: number; net: number }>();
  let approvedSales = 0;
  let trackedOriginSales = 0;
  let attributedSales = 0;
  let additionalProductSales = 0;
  let attributedNet = 0;
  let attributedAdditionalNet = 0;
  let ambiguousOriginSales = 0;
  let financialDataIncompleteSales = 0;
  let additionalFinancialDataIncompleteSales = 0;

  for (const transaction of input.transactions) {
    if (transaction.status !== 'approved' || !transactionMatchesCurrency(transaction, currency)) continue;
    const codes = originCodes(transaction);
    const codeMatches = [...new Map(
      codes.map(code => campaignByCode.get(code)).filter((campaign): campaign is CampaignRecord => Boolean(campaign))
        .map(campaign => [campaign.campaign_id, campaign]),
    ).values()];
    const primaryMatches = codeMatches.filter(campaign => sameProduct(transaction, campaign));
    const targetsCampaignProduct = input.campaigns.some(campaign => sameProduct(transaction, campaign));
    const net = transactionNet(transaction, currency);

    if (targetsCampaignProduct) {
      approvedSales += 1;
      if (codes.length) trackedOriginSales += 1;

      if (primaryMatches.length === 1) {
        const campaign = primaryMatches[0];
        const stats = campaignStats.get(campaign.campaign_id) || emptyStats();
        stats.sales += 1;
        if (net === null) {
          stats.financialDataIncompleteSales += 1;
          financialDataIncompleteSales += 1;
        } else {
          stats.net += net;
          attributedNet += net;
        }
        campaignStats.set(campaign.campaign_id, stats);
        attributedSales += 1;
        continue;
      }

      if (primaryMatches.length > 1) ambiguousOriginSales += 1;

      for (const code of codes) {
        if (campaignByCode.has(code)) continue;
        const stats = unknown.get(code) || { sales: 0, net: 0 };
        stats.sales += 1;
        if (net !== null) stats.net += net;
        unknown.set(code, stats);
      }
      continue;
    }

    if (codeMatches.length === 1) {
      const campaign = codeMatches[0];
      const stats = campaignStats.get(campaign.campaign_id) || emptyStats();
      stats.additionalSales += 1;
      additionalProductSales += 1;
      if (net === null) {
        stats.additionalFinancialDataIncompleteSales += 1;
        additionalFinancialDataIncompleteSales += 1;
      } else {
        stats.additionalNet += net;
        attributedAdditionalNet += net;
      }
      campaignStats.set(campaign.campaign_id, stats);
    }
  }

  const campaignRows = input.campaigns.map(campaign => {
    const stats = campaignStats.get(campaign.campaign_id) || emptyStats();
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
      additionalSales: stats.additionalSales,
      financialDataIncompleteSales: stats.financialDataIncompleteSales,
      additionalFinancialDataIncompleteSales: stats.additionalFinancialDataIncompleteSales,
      netAfterFees: round(stats.net),
      additionalNetAfterFees: round(stats.additionalNet),
      orderNetAfterFees: round(stats.net + stats.additionalNet),
      clickToSale: humanClicks ? ratio(stats.sales / humanClicks) : null,
    };
  }).sort((left, right) => right.orderNetAfterFees - left.orderNetAfterFees || right.sales - left.sales || right.clicks - left.clicks);

  return {
    currency,
    totals: {
      approvedSales,
      trackedOriginSales,
      attributedSales,
      additionalProductSales,
      unattributedSales: approvedSales - attributedSales,
      ambiguousOriginSales,
      financialDataIncompleteSales,
      additionalFinancialDataIncompleteSales,
      attributedNetAfterFees: round(attributedNet),
      attributedAdditionalNetAfterFees: round(attributedAdditionalNet),
      attributedOrderNetAfterFees: round(attributedNet + attributedAdditionalNet),
      coverage: approvedSales ? ratio(attributedSales / approvedSales) : 0,
      humanClicks: [...clicks.values()].reduce((total, value) => total + value, 0),
    },
    campaigns: campaignRows,
    unknownCodes: [...unknown.entries()]
      .map(([code, stats]) => ({ code, sales: stats.sales, netAfterFees: round(stats.net) }))
      .sort((left, right) => right.sales - left.sales || left.code.localeCompare(right.code)),
  };
}
