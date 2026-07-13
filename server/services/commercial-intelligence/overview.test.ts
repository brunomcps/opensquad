import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCommercialOverview,
  parseOverviewFilters,
  type OverviewTransaction,
} from '../../../supabase/functions/_shared/overview.ts';

function row(overrides: Partial<OverviewTransaction> = {}): OverviewTransaction {
  return {
    buyer_key: 'buyer-1',
    product_id: 'product-1',
    product_name: 'Produto principal',
    status: 'approved',
    order_date: '2026-07-02T13:00:00.000Z',
    approved_date: '2026-07-02T14:00:00.000Z',
    gross_value: 100,
    gross_currency: 'BRL',
    fee_value: 10,
    fee_currency: 'BRL',
    last_event_at: '2026-07-02T14:00:00.000Z',
    last_reconciled_at: '2026-07-13T12:00:00.000Z',
    ...overrides,
  };
}

const filters = { start: '2026-07-01', end: '2026-07-13', currency: 'BRL', goal: 30_000 };
const now = new Date('2026-07-13T15:00:00.000Z');

test('agrega vendas aprovadas, compradores, produtos e série diária', () => {
  const overview = buildCommercialOverview({
    filters,
    now,
    rows: [
      row(),
      row({ buyer_key: 'buyer-1', gross_value: '200.50', fee_value: '20.25' }),
      row({ buyer_key: 'buyer-2', product_id: 'product-2', product_name: 'Outro produto', gross_value: 50, fee_value: 5 }),
    ],
  });

  assert.deepEqual(overview.totals, {
    gross: 350.5,
    fees: 35.25,
    netAfterFees: 315.25,
    sales: 3,
    buyers: 2,
    averageTicket: 105.08,
    refunds: 0,
    refundGross: 0,
    chargebacks: 0,
    chargebackGross: 0,
    cancellations: 0,
  });
  assert.equal(overview.products.length, 2);
  assert.equal(overview.products[0].name, 'Produto principal');
  assert.equal(overview.products[0].buyers, 1);
  assert.equal(overview.daily[0].sales, 3);
  assert.equal(overview.daily[0].netAfterFees, 315.25);
  assert.equal(overview.goal?.daysRemaining, 19);
  assert.equal(overview.goal?.requiredDailyPace, 1562.36);
  assert.equal(overview.goal?.progress, 0.0105);
});

test('não infla receita com reembolso, chargeback ou cancelamento', () => {
  const overview = buildCommercialOverview({
    filters,
    now,
    rows: [
      row(),
      row({ status: 'refunded', gross_value: 80 }),
      row({ status: 'chargeback', gross_value: 70 }),
      row({ status: 'canceled', gross_value: 60 }),
    ],
  });

  assert.equal(overview.totals.gross, 100);
  assert.equal(overview.totals.sales, 1);
  assert.equal(overview.totals.refunds, 1);
  assert.equal(overview.totals.refundGross, 80);
  assert.equal(overview.totals.chargebacks, 1);
  assert.equal(overview.totals.chargebackGross, 70);
  assert.equal(overview.totals.cancellations, 1);
});

test('separa moedas e rejeita subtração entre moedas diferentes', () => {
  const brl = buildCommercialOverview({
    filters,
    now,
    rows: [
      row(),
      row({ gross_currency: 'USD', fee_currency: 'USD', gross_value: 20, fee_value: 2 }),
      row({ fee_currency: 'USD' }),
    ],
  });

  assert.deepEqual(brl.availableCurrencies, ['BRL', 'USD']);
  assert.equal(brl.totals.sales, 2);
  assert.equal(brl.totals.netAfterFees, 90);
  assert.ok(brl.warnings.includes('currency_mismatch:1'));

  const usd = buildCommercialOverview({
    filters: { ...filters, currency: 'USD' },
    now,
    rows: [row(), row({ gross_currency: 'USD', fee_currency: 'USD', gross_value: 20, fee_value: 2 })],
  });
  assert.equal(usd.totals.netAfterFees, 18);
  assert.equal(usd.goal, null);
});

test('trata fallback de data, produto e período vazio sem PII na saída', () => {
  const overview = buildCommercialOverview({
    filters,
    now,
    fallbackUpdatedAt: '2026-07-13T10:00:00.000Z',
    rows: [row({ approved_date: null, product_id: null, product_name: 'Sem código' })],
  });
  assert.equal(overview.products[0].key, 'name:Sem código');
  assert.ok(overview.warnings.includes('approved_date_fallback:1'));
  const serialized = JSON.stringify(overview);
  assert.doesNotMatch(serialized, /buyer-1|buyer_key|transaction_id|subscription_id/i);

  const empty = buildCommercialOverview({ filters, now, rows: [], fallbackUpdatedAt: '2026-07-13T10:00:00.000Z' });
  assert.equal(empty.totals.netAfterFees, 0);
  assert.deepEqual(empty.daily, []);
  assert.deepEqual(empty.products, []);
  assert.equal(empty.updatedAt, '2026-07-13T10:00:00.000Z');
});

test('decodifica entidades HTML no nome do produto sem renderizar HTML', () => {
  const overview = buildCommercialOverview({
    filters,
    now,
    rows: [row({ product_name: 'Autismo &amp; Superdotação &#40;2AS&#41;' })],
  });
  assert.equal(overview.products[0].name, 'Autismo & Superdotação (2AS)');
});

test('valida filtros, meta e limite de período', () => {
  assert.deepEqual(
    parseOverviewFilters(new URL('https://example.test?currency=usd&goal=50000'), now),
    { start: '2026-07-01', end: '2026-07-13', currency: 'USD', goal: 50_000 },
  );
  assert.throws(
    () => parseOverviewFilters(new URL('https://example.test?start=2026-07-20&end=2026-07-01'), now),
    (error: any) => error.code === 'invalid_period' && error.statusCode === 400,
  );
  assert.throws(
    () => parseOverviewFilters(new URL('https://example.test?goal=42000'), now),
    (error: any) => error.code === 'invalid_goal',
  );
  assert.throws(
    () => parseOverviewFilters(new URL('https://example.test?start=2010-01-01&end=2026-07-13'), now),
    (error: any) => error.code === 'period_too_large',
  );
});
