import { authorizeMember } from '../_shared/auth.ts';
import type { DirectAttributionReport } from '../_shared/attribution.ts';
import { serviceClient } from '../_shared/client.ts';
import { CommercialIntelligenceError } from '../_shared/errors.ts';
import { errorResponse, json, preflight } from '../_shared/http.ts';

// Etapa 2 da faxina (18/09/2026): a atribuição saiu do TypeScript e foi para a
// função ci_campaign_attribution_report, no banco. Antes esta função baixava
// campanhas, vendas e cliques em páginas de 1.000 linhas (11 buscas para 90
// dias) e refazia a conta aqui; o resumo do topo (ci_tracking_series) fazia
// OUTRA conta em SQL, e os dois discordavam (venda em moeda estrangeira caía
// fora daqui, devolução não aparecia). Agora é uma chamada e uma regra só.

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T12:00:00.000Z`).toISOString().slice(0, 10) === value;
}

function shift(date: string, days: number): string {
  return new Date(Date.parse(`${date}T12:00:00.000Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

function num(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function ratio(value: number): number {
  return Math.round((value + Number.EPSILON) * 10_000) / 10_000;
}

type ReportCampaignRow = DirectAttributionReport['campaigns'][number] & {
  channel: string;
  campaignStatus: string;
  clicksTotal: number;
  refunds: number;
  additionalRefunds: number;
  foreignSales: number;
  foreignBreakdown: Record<string, number>;
  lastClickAt: string | null;
  lastQualifiedClickAt: string | null;
};

Deno.serve(async request => {
  const options = preflight(request);
  if (options) return options;
  if (request.method !== 'GET') return json(request, { ok: false, error: { code: 'method_not_allowed', message: 'Método não permitido.' } }, 405);
  try {
    const client = serviceClient();
    const member = await authorizeMember(request, client, 'viewer');
    const url = new URL(request.url);
    const today = new Date().toISOString().slice(0, 10);
    const start = url.searchParams.get('start') || shift(today, -180);
    const end = url.searchParams.get('end') || today;
    const currency = (url.searchParams.get('currency') || 'BRL').trim().toUpperCase();
    const channelParam = url.searchParams.get('channel');
    const channel = !channelParam || channelParam === 'all' ? null : channelParam;
    if (!validDate(start) || !validDate(end) || start > end) throw new CommercialIntelligenceError('invalid_period', 'Período inválido.', 400);
    if (!/^[A-Z]{3}$/.test(currency)) throw new CommercialIntelligenceError('invalid_currency', 'Moeda inválida.', 400);
    if (channel && !['youtube', 'instagram'].includes(channel)) throw new CommercialIntelligenceError('invalid_channel', 'Canal inválido.', 400);
    // Período em horário de Brasília, fim EXCLUSIVO (dia seguinte 00:00), igual ao resumo do topo.
    const startIso = `${start}T00:00:00-03:00`;
    const endExclusiveIso = `${shift(end, 1)}T00:00:00-03:00`;

    const { data, error } = await client.rpc('ci_campaign_attribution_report', {
      p_start: startIso,
      p_end: endExclusiveIso,
      p_currency: currency,
      p_channel: channel,
    });
    if (error || !data) throw new CommercialIntelligenceError('database_error', 'Não foi possível calcular a atribuição.', 503);

    const report = data as Record<string, any>;
    const totalsRow = report.totals || {};
    const campaigns: ReportCampaignRow[] = (report.campaigns || []).map((row: Record<string, any>) => {
      const clicks = num(row.clicks);
      const sales = num(row.sales);
      const net = num(row.net);
      const additionalNet = num(row.additional_net);
      return {
        campaignId: row.campaign_id,
        campaignName: row.name,
        trackingCode: row.tracking_code,
        videoId: row.video_id,
        productName: row.product_name,
        ctaLabel: row.cta_label,
        ctaPosition: row.cta_position,
        channel: row.channel,
        campaignStatus: row.campaign_status,
        clicks,
        clicksTotal: num(row.clicks_total),
        sales,
        additionalSales: num(row.additional_sales),
        refunds: num(row.refunds),
        additionalRefunds: num(row.additional_refunds),
        financialDataIncompleteSales: num(row.financial_incomplete),
        additionalFinancialDataIncompleteSales: num(row.additional_financial_incomplete),
        netAfterFees: net,
        additionalNetAfterFees: additionalNet,
        orderNetAfterFees: Math.round((net + additionalNet + Number.EPSILON) * 100) / 100,
        clickToSale: clicks ? ratio(sales / clicks) : null,
        foreignSales: num(row.foreign_sales),
        foreignBreakdown: row.foreign_breakdown || {},
        lastClickAt: row.last_click_at || null,
        lastQualifiedClickAt: row.last_qualified_click_at || null,
      };
    });

    const approvedSales = num(totalsRow.approved_sales);
    const attributedSales = num(totalsRow.attributed_sales);
    const attributedNet = num(totalsRow.attributed_net);
    const attributedAdditionalNet = num(totalsRow.attributed_additional_net);
    const attribution = {
      currency,
      channel,
      period: { start, end },
      totals: {
        approvedSales,
        trackedOriginSales: num(totalsRow.tracked_origin_sales),
        attributedSales,
        additionalProductSales: num(totalsRow.additional_product_sales),
        unattributedSales: approvedSales - attributedSales,
        ambiguousOriginSales: num(totalsRow.ambiguous_origin_sales),
        financialDataIncompleteSales: num(totalsRow.financial_incomplete),
        additionalFinancialDataIncompleteSales: num(totalsRow.additional_financial_incomplete),
        attributedNetAfterFees: attributedNet,
        attributedAdditionalNetAfterFees: attributedAdditionalNet,
        attributedOrderNetAfterFees: Math.round((attributedNet + attributedAdditionalNet + Number.EPSILON) * 100) / 100,
        coverage: approvedSales ? ratio(attributedSales / approvedSales) : 0,
        humanClicks: num(report.humanClicks),
        refunds: num(totalsRow.refunds),
        foreignSales: num(totalsRow.foreign_sales),
      },
      campaigns,
      unknownCodes: (report.unknownCodes || []).map((row: Record<string, any>) => ({
        code: row.code,
        sales: num(row.sales),
        netAfterFees: num(row.net),
      })),
    };
    return json(request, { ok: true, attribution, member: { role: member.role } });
  } catch (error) {
    return errorResponse(request, error);
  }
});
