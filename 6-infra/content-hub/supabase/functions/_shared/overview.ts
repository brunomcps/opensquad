import { CommercialIntelligenceError } from './errors.ts';

export const OVERVIEW_TIMEZONE = 'America/Sao_Paulo';
export const OVERVIEW_GOALS = [30_000, 40_000, 50_000] as const;

export type OverviewStatus =
  | 'approved'
  | 'refunded'
  | 'chargeback'
  | 'canceled'
  | 'expired'
  | 'blocked'
  | 'disputed'
  | 'unknown';

export interface OverviewTransaction {
  buyer_key: string | null;
  product_id: string | null;
  product_name: string;
  status: OverviewStatus;
  order_date: string | null;
  approved_date: string | null;
  gross_value: number | string | null;
  gross_currency: string | null;
  fee_value: number | string | null;
  fee_currency: string | null;
  last_event_at: string;
  last_reconciled_at: string | null;
}

export interface OverviewFilters {
  start: string;
  end: string;
  currency: string;
  goal: number;
}

export interface CommercialOverview {
  period: { start: string; end: string; timezone: typeof OVERVIEW_TIMEZONE };
  currency: string;
  availableCurrencies: string[];
  totals: {
    gross: number;
    fees: number;
    netAfterFees: number;
    sales: number;
    buyers: number;
    averageTicket: number;
    refunds: number;
    refundGross: number;
    chargebacks: number;
    chargebackGross: number;
    cancellations: number;
  };
  goal: null | {
    value: number;
    progress: number;
    remaining: number;
    requiredDailyPace: number;
    daysRemaining: number;
  };
  daily: Array<{ date: string; gross: number; fees: number; netAfterFees: number; sales: number }>;
  products: Array<{
    key: string;
    name: string;
    sales: number;
    buyers: number;
    gross: number;
    fees: number;
    netAfterFees: number;
    netShare: number;
  }>;
  statusBreakdown: Array<{ status: OverviewStatus; count: number }>;
  insights: Array<{
    code: 'top_product' | 'best_day' | 'refund_rate' | 'goal_pace';
    title: string;
    body: string;
    tone: 'neutral' | 'positive' | 'warning';
  }>;
  warnings: string[];
  updatedAt: string | null;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: OVERVIEW_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function dateParts(date: Date): { year: string; month: string; day: string } {
  const parts = Object.fromEntries(
    dateFormatter.formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, part.value]),
  );
  return { year: parts.year, month: parts.month, day: parts.day };
}

export function businessDate(date = new Date()): string {
  const parts = dateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function daysBetween(start: string, end: string): number {
  return Math.floor((Date.parse(`${end}T12:00:00.000Z`) - Date.parse(`${start}T12:00:00.000Z`)) / 86_400_000);
}

export function parseOverviewFilters(url: URL, now = new Date()): OverviewFilters {
  const today = businessDate(now);
  const start = url.searchParams.get('start') || `${today.slice(0, 8)}01`;
  const end = url.searchParams.get('end') || today;
  const currency = (url.searchParams.get('currency') || 'BRL').trim().toUpperCase();
  const goal = Number(url.searchParams.get('goal') || 50_000);

  if (!isIsoDate(start) || !isIsoDate(end) || start > end) {
    throw new CommercialIntelligenceError('invalid_period', 'Período inválido.', 400);
  }
  if (daysBetween(start, end) > 3_652) {
    throw new CommercialIntelligenceError('period_too_large', 'O período máximo é de dez anos.', 400);
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new CommercialIntelligenceError('invalid_currency', 'Moeda inválida.', 400);
  }
  if (!OVERVIEW_GOALS.includes(goal as (typeof OVERVIEW_GOALS)[number])) {
    throw new CommercialIntelligenceError('invalid_goal', 'Meta inválida.', 400);
  }
  return { start, end, currency, goal };
}

function rowDate(row: OverviewTransaction): string | null {
  const raw = row.approved_date || row.order_date;
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : businessDate(parsed);
}

function numberValue(value: number | string | null): number | null {
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundRatio(value: number): number {
  return Math.round((value + Number.EPSILON) * 10_000) / 10_000;
}

function decodeText(value: string): string {
  const named: Record<string, string> = {
    amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ',
  };
  return value.replace(/&(#\d+|#x[\da-f]+|amp|quot|apos|lt|gt|nbsp);/gi, (entity, code: string) => {
    if (code.startsWith('#')) {
      const point = Number.parseInt(code.slice(code.startsWith('#x') ? 2 : 1), code.startsWith('#x') ? 16 : 10);
      return Number.isInteger(point) && point >= 0 && point <= 0x10FFFF ? String.fromCodePoint(point) : entity;
    }
    return named[code.toLowerCase()] || entity;
  });
}

function latestIso(current: string | null, candidate: string | null): string | null {
  if (!candidate || Number.isNaN(Date.parse(candidate))) return current;
  if (!current || Date.parse(candidate) > Date.parse(current)) return candidate;
  return current;
}

function money(value: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
}

export function buildCommercialOverview(input: {
  rows: OverviewTransaction[];
  filters: OverviewFilters;
  now?: Date;
  fallbackUpdatedAt?: string | null;
}): CommercialOverview {
  const now = input.now || new Date();
  const { start, end, currency, goal } = input.filters;
  const warningCounts = new Map<string, number>();
  const warn = (code: string) => warningCounts.set(code, (warningCounts.get(code) || 0) + 1);
  const periodRows: Array<{ row: OverviewTransaction; date: string }> = [];

  for (const row of input.rows) {
    const date = rowDate(row);
    if (!date) {
      warn('missing_transaction_date');
      continue;
    }
    if (date >= start && date <= end) periodRows.push({ row, date });
  }

  const availableCurrencies = [...new Set(
    periodRows.map(({ row }) => row.gross_currency?.toUpperCase()).filter((value): value is string => Boolean(value)),
  )].sort((left, right) => left === 'BRL' ? -1 : right === 'BRL' ? 1 : left.localeCompare(right));

  const selected = periodRows.filter(({ row }) => row.gross_currency?.toUpperCase() === currency);
  const buyers = new Set<string>();
  const statusCounts = new Map<OverviewStatus, number>();
  const daily = new Map<string, { gross: number; fees: number; netAfterFees: number; sales: number }>();
  const products = new Map<string, {
    name: string;
    buyers: Set<string>;
    gross: number;
    fees: number;
    netAfterFees: number;
    sales: number;
  }>();
  let gross = 0;
  let fees = 0;
  let sales = 0;
  let refunds = 0;
  let refundGross = 0;
  let chargebacks = 0;
  let chargebackGross = 0;
  let cancellations = 0;
  let updatedAt: string | null = null;

  for (const { row, date } of selected) {
    statusCounts.set(row.status, (statusCounts.get(row.status) || 0) + 1);
    updatedAt = latestIso(updatedAt, row.last_reconciled_at);
    updatedAt = latestIso(updatedAt, row.last_event_at);

    const rowGross = numberValue(row.gross_value);
    const rowFee = numberValue(row.fee_value);
    const currenciesMatch = row.gross_currency?.toUpperCase() === row.fee_currency?.toUpperCase();

    if (row.status === 'refunded') {
      refunds += 1;
      if (rowGross !== null) refundGross += rowGross;
      continue;
    }
    if (row.status === 'chargeback') {
      chargebacks += 1;
      if (rowGross !== null) chargebackGross += rowGross;
      continue;
    }
    if (row.status === 'canceled') {
      cancellations += 1;
      continue;
    }
    if (row.status !== 'approved') continue;

    sales += 1;
    if (!row.approved_date && row.order_date) warn('approved_date_fallback');
    if (row.buyer_key) buyers.add(row.buyer_key);
    else warn('buyer_key_missing');

    const productName = decodeText(row.product_name || 'Produto desconhecido');
    const productKey = row.product_id || `name:${productName}`;
    const product = products.get(productKey) || {
      name: productName,
      buyers: new Set<string>(),
      gross: 0,
      fees: 0,
      netAfterFees: 0,
      sales: 0,
    };
    product.sales += 1;
    if (row.buyer_key) product.buyers.add(row.buyer_key);
    products.set(productKey, product);

    const day = daily.get(date) || { gross: 0, fees: 0, netAfterFees: 0, sales: 0 };
    day.sales += 1;
    daily.set(date, day);

    if (!currenciesMatch) {
      warn('currency_mismatch');
      continue;
    }
    if (rowGross === null || rowFee === null) {
      warn('monetary_value_missing');
      continue;
    }

    const rowNet = rowGross - rowFee;
    gross += rowGross;
    fees += rowFee;
    day.gross += rowGross;
    day.fees += rowFee;
    day.netAfterFees += rowNet;
    product.gross += rowGross;
    product.fees += rowFee;
    product.netAfterFees += rowNet;
  }

  gross = round(gross);
  fees = round(fees);
  refundGross = round(refundGross);
  chargebackGross = round(chargebackGross);
  const netAfterFees = round(gross - fees);

  const dailyRows = [...daily.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({
      date,
      gross: round(value.gross),
      fees: round(value.fees),
      netAfterFees: round(value.netAfterFees),
      sales: value.sales,
    }));

  const productRows = [...products.entries()]
    .map(([key, value]) => ({
      key,
      name: value.name,
      sales: value.sales,
      buyers: value.buyers.size,
      gross: round(value.gross),
      fees: round(value.fees),
      netAfterFees: round(value.netAfterFees),
      netShare: netAfterFees ? roundRatio(value.netAfterFees / netAfterFees) : 0,
    }))
    .sort((left, right) => right.netAfterFees - left.netAfterFees || right.sales - left.sales);

  const today = businessDate(now);
  const currentMonth = start === `${today.slice(0, 8)}01` && end === today;
  let goalResult: CommercialOverview['goal'] = null;
  if (currency === 'BRL' && currentMonth) {
    const { year, month, day } = dateParts(now);
    const daysInMonth = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
    const daysRemaining = daysInMonth - Number(day) + 1;
    const remaining = round(Math.max(0, goal - netAfterFees));
    goalResult = {
      value: goal,
      progress: goal ? roundRatio(netAfterFees / goal) : 0,
      remaining,
      requiredDailyPace: daysRemaining ? round(remaining / daysRemaining) : 0,
      daysRemaining,
    };
  }

  const insights: CommercialOverview['insights'] = [];
  const topProduct = productRows[0];
  if (topProduct) {
    insights.push({
      code: 'top_product',
      title: 'Produto líder',
      body: `${topProduct.name} respondeu por ${(topProduct.netShare * 100).toFixed(1)}% do líquido após taxas no período.`,
      tone: 'positive',
    });
  }
  const bestDay = [...dailyRows].sort((left, right) => right.netAfterFees - left.netAfterFees)[0];
  if (bestDay) {
    insights.push({
      code: 'best_day',
      title: 'Melhor dia',
      body: `${bestDay.date} registrou ${money(bestDay.netAfterFees, currency)} após taxas em ${bestDay.sales} venda(s).`,
      tone: 'neutral',
    });
  }
  if (refunds > 0) {
    const refundRate = refunds / Math.max(1, sales + refunds);
    insights.push({
      code: 'refund_rate',
      title: 'Reembolsos',
      body: `${refunds} reembolso(s), equivalentes a ${(refundRate * 100).toFixed(1)}% das vendas aprovadas mais reembolsadas no período.`,
      tone: refundRate >= 0.05 ? 'warning' : 'neutral',
    });
  }
  if (goalResult) {
    insights.push({
      code: 'goal_pace',
      title: goalResult.remaining > 0 ? 'Ritmo para a meta' : 'Meta alcançada',
      body: goalResult.remaining > 0
        ? `Faltam ${money(goalResult.remaining, currency)}; o ritmo necessário é ${money(goalResult.requiredDailyPace, currency)} por dia.`
        : `O líquido após taxas já superou a meta de ${money(goalResult.value, currency)}.`,
      tone: goalResult.remaining > 0 ? 'neutral' : 'positive',
    });
  }

  return {
    period: { start, end, timezone: OVERVIEW_TIMEZONE },
    currency,
    availableCurrencies,
    totals: {
      gross,
      fees,
      netAfterFees,
      sales,
      buyers: buyers.size,
      averageTicket: sales ? round(netAfterFees / sales) : 0,
      refunds,
      refundGross,
      chargebacks,
      chargebackGross,
      cancellations,
    },
    goal: goalResult,
    daily: dailyRows,
    products: productRows,
    statusBreakdown: [...statusCounts.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((left, right) => right.count - left.count),
    insights,
    warnings: [...warningCounts.entries()].map(([code, count]) => `${code}:${count}`).sort(),
    updatedAt: updatedAt || input.fallbackUpdatedAt || null,
  };
}
