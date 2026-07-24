import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.resolve(
  directory,
  '../../../supabase/migrations/20260715130000_ci_hotmart_reconciliation_repair.sql',
);
const basePath = path.resolve(directory, '../../scripts/commercial-intelligence/001-base.sql');

test('migration de reparo permite reconciliação idempotente sem apagar dados ricos', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  const baseSql = fs.readFileSync(basePath, 'utf8');
  assert.match(sql, /create or replace function public\.ci_apply_hotmart_event/i);
  assert.match(sql, /if not v_inserted and p_event->>'source' <> 'reconciliation'/i);
  assert.match(sql, /when excluded\.status = 'unknown'[\s\S]*then ci_hotmart_transactions\.status/i);
  assert.match(sql, /when excluded\.status in \('refunded', 'chargeback'\)[\s\S]*then excluded\.status/i);
  assert.match(sql, /when v_current_src_is_campaign then ci_hotmart_transactions\.tracking_src/i);
  assert.match(sql, /when v_incoming_src_is_campaign then excluded\.tracking_src/i);
  assert.match(sql, /v_incoming_src_is_campaign[\s\S]*not v_current_src_is_campaign/i);
  assert.match(sql, /greatest\(excluded\.last_event_at, ci_hotmart_transactions\.last_event_at\)/i);
  assert.match(sql, /to_jsonb\(transactions\) - 'last_reconciled_at' - 'updated_at'/i);
  assert.match(sql, /return query select v_inserted, v_updated, v_repaired/i);
  assert.doesNotMatch(sql, /coalesce\(excluded\.tracking_src, ci_hotmart_transactions\.tracking_src\)/i);
  assert.doesNotMatch(sql, /drop table|truncate table|delete from public\.ci_hotmart/i);

  const functionPattern = /create or replace function public\.ci_apply_hotmart_event\([\s\S]*?\n\$\$;/i;
  assert.equal(sql.match(functionPattern)?.[0], baseSql.match(functionPattern)?.[0]);
});

type ApplyRow = {
  inserted_event: boolean;
  updated_transaction: boolean;
  repaired_transaction: boolean;
};

function hotmartEvent(input: {
  eventKey: string;
  transactionId: string;
  status: string;
  occurredAt: string;
  source: 'webhook' | 'reconciliation';
}) {
  return {
    event_key: input.eventKey,
    transaction_id: input.transactionId,
    event_type: input.source === 'reconciliation' ? `RECONCILIATION_${input.status}` : `PURCHASE_${input.status}`,
    raw_status: input.status.toUpperCase(),
    normalized_status: input.status,
    occurred_at: input.occurredAt,
    source: input.source,
    sanitized_payload: {},
  };
}

function hotmartTransaction(
  transactionId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    transaction_id: transactionId,
    buyer_key: 'buyer-key',
    product_id: '6966825',
    product_name: 'MAPA-7P',
    status: 'approved',
    order_date: '2026-07-15T11:03:18.000Z',
    approved_date: '2026-07-15T11:03:23.000Z',
    gross_value: 154.72,
    gross_currency: 'BRL',
    fee_value: 15.07,
    fee_currency: 'BRL',
    producer_net_value: 127.03,
    producer_net_currency: 'BRL',
    payment_type: 'CREDIT_CARD',
    offer_code: 'vyqym0gx',
    subscription_id: null,
    is_renewal: false,
    tracking_src: null,
    tracking_sck: null,
    tracking_xcod: null,
    last_event_at: '2026-07-16T12:00:00.000Z',
    last_reconciled_at: null,
    ...overrides,
  };
}

async function applyEvent(
  database: PGlite,
  event: ReturnType<typeof hotmartEvent>,
  transaction: ReturnType<typeof hotmartTransaction>,
): Promise<ApplyRow> {
  const result = await database.query<ApplyRow>(
    'select * from public.ci_apply_hotmart_event($1::jsonb, $2::jsonb)',
    [JSON.stringify(event), JSON.stringify(transaction)],
  );
  return result.rows[0];
}

async function insertEvent(database: PGlite, event: ReturnType<typeof hotmartEvent>) {
  await database.query(
    `insert into public.ci_hotmart_events (
      event_key, transaction_id, event_type, raw_status, normalized_status,
      occurred_at, source, sanitized_payload
    ) values ($1, $2, $3, $4, $5, $6::timestamptz, $7, $8::jsonb)`,
    [
      event.event_key,
      event.transaction_id,
      event.event_type,
      event.raw_status,
      event.normalized_status,
      event.occurred_at,
      event.source,
      JSON.stringify(event.sanitized_payload),
    ],
  );
}

test('função SQL repara status e tracking sem regressão nem reparo inflado', async () => {
  const database = new PGlite();
  try {
    await database.exec(`
      create table public.ci_campaigns (
        tracking_code text not null unique
      );
      create table public.ci_hotmart_events (
        event_key text primary key,
        transaction_id text not null,
        event_type text not null,
        raw_status text not null,
        normalized_status text not null,
        occurred_at timestamptz not null,
        source text not null,
        sanitized_payload jsonb not null default '{}'::jsonb,
        received_at timestamptz not null default now()
      );
      create table public.ci_hotmart_transactions (
        transaction_id text primary key,
        buyer_key text,
        product_id text,
        product_name text not null,
        status text not null,
        order_date timestamptz,
        approved_date timestamptz,
        gross_value numeric(16,2),
        gross_currency text,
        fee_value numeric(16,2),
        fee_currency text,
        producer_net_value numeric(16,2),
        producer_net_currency text,
        payment_type text,
        offer_code text,
        subscription_id text,
        is_renewal boolean not null default false,
        tracking_src text,
        tracking_sck text,
        tracking_xcod text,
        last_event_at timestamptz not null,
        last_reconciled_at timestamptz,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
    `);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    const functionSql = sql.match(
      /create or replace function public\.ci_apply_hotmart_event\([\s\S]*?\n\$\$;/i,
    )?.[0];
    assert.ok(functionSql);
    await database.exec(functionSql);

    const refundId = 'TX-REFUND';
    await applyEvent(
      database,
      hotmartEvent({
        eventKey: 'initial-refund', transactionId: refundId, status: 'approved',
        occurredAt: '2026-07-16T12:00:00.000Z', source: 'webhook',
      }),
      hotmartTransaction(refundId),
    );
    const duplicateRefund = hotmartEvent({
      eventKey: 'duplicate-refund', transactionId: refundId, status: 'refunded',
      occurredAt: '2026-07-15T11:03:23.000Z', source: 'reconciliation',
    });
    await insertEvent(database, duplicateRefund);
    assert.deepEqual(
      await applyEvent(database, duplicateRefund, hotmartTransaction(refundId, {
        status: 'refunded',
        last_event_at: '2026-07-15T11:03:23.000Z',
        last_reconciled_at: '2026-07-16T13:00:00.000Z',
      })),
      { inserted_event: false, updated_transaction: true, repaired_transaction: true },
    );
    await applyEvent(
      database,
      hotmartEvent({
        eventKey: 'late-approved', transactionId: refundId, status: 'approved',
        occurredAt: '2026-07-17T12:00:00.000Z', source: 'webhook',
      }),
      hotmartTransaction(refundId, { last_event_at: '2026-07-17T12:00:00.000Z' }),
    );
    assert.equal(
      (await database.query<{ status: string }>(
        'select status from public.ci_hotmart_transactions where transaction_id = $1',
        [refundId],
      )).rows[0].status,
      'refunded',
    );

    const terminalOrderId = 'TX-TERMINAL-ORDER';
    await applyEvent(
      database,
      hotmartEvent({
        eventKey: 'initial-chargeback', transactionId: terminalOrderId, status: 'chargeback',
        occurredAt: '2026-07-16T12:00:00.000Z', source: 'webhook',
      }),
      hotmartTransaction(terminalOrderId, {
        status: 'chargeback', last_event_at: '2026-07-16T12:00:00.000Z',
      }),
    );
    await applyEvent(
      database,
      hotmartEvent({
        eventKey: 'older-refund', transactionId: terminalOrderId, status: 'refunded',
        occurredAt: '2026-07-15T12:00:00.000Z', source: 'webhook',
      }),
      hotmartTransaction(terminalOrderId, {
        status: 'refunded', last_event_at: '2026-07-15T12:00:00.000Z',
      }),
    );
    assert.equal(
      (await database.query<{ status: string }>(
        'select status from public.ci_hotmart_transactions where transaction_id = $1',
        [terminalOrderId],
      )).rows[0].status,
      'chargeback',
    );

    const unknownId = 'TX-UNKNOWN';
    await applyEvent(
      database,
      hotmartEvent({
        eventKey: 'initial-unknown', transactionId: unknownId, status: 'approved',
        occurredAt: '2026-07-16T12:00:00.000Z', source: 'webhook',
      }),
      hotmartTransaction(unknownId),
    );
    await applyEvent(
      database,
      hotmartEvent({
        eventKey: 'late-unknown', transactionId: unknownId, status: 'unknown',
        occurredAt: '2026-07-17T12:00:00.000Z', source: 'webhook',
      }),
      hotmartTransaction(unknownId, {
        status: 'unknown', last_event_at: '2026-07-17T12:00:00.000Z',
      }),
    );
    assert.equal(
      (await database.query<{ status: string }>(
        'select status from public.ci_hotmart_transactions where transaction_id = $1',
        [unknownId],
      )).rows[0].status,
      'approved',
    );

    const trackingCode = 'yt|WrWsJ4MjP04|d|e17e';
    await database.query('insert into public.ci_campaigns (tracking_code) values ($1)', [trackingCode]);
    const trackingId = 'TX-TRACKING';
    await applyEvent(
      database,
      hotmartEvent({
        eventKey: 'initial-tracking', transactionId: trackingId, status: 'approved',
        occurredAt: '2026-07-16T12:00:00.000Z', source: 'webhook',
      }),
      hotmartTransaction(trackingId, { tracking_src: 'HOTMART_PRODUCT_PAGE' }),
    );
    const duplicateTracking = hotmartEvent({
      eventKey: 'duplicate-tracking', transactionId: trackingId, status: 'approved',
      occurredAt: '2026-07-15T11:03:23.000Z', source: 'reconciliation',
    });
    await insertEvent(database, duplicateTracking);
    await applyEvent(database, duplicateTracking, hotmartTransaction(trackingId, {
      tracking_src: trackingCode,
      last_event_at: '2026-07-15T11:03:23.000Z',
      last_reconciled_at: '2026-07-16T13:00:00.000Z',
    }));
    await applyEvent(
      database,
      hotmartEvent({
        eventKey: 'late-generic', transactionId: trackingId, status: 'approved',
        occurredAt: '2026-07-17T12:00:00.000Z', source: 'webhook',
      }),
      hotmartTransaction(trackingId, {
        tracking_src: 'HOTMART_PRODUCT_PAGE', last_event_at: '2026-07-17T12:00:00.000Z',
      }),
    );
    assert.equal(
      (await database.query<{ tracking_src: string }>(
        'select tracking_src from public.ci_hotmart_transactions where transaction_id = $1',
        [trackingId],
      )).rows[0].tracking_src,
      trackingCode,
    );

    const unchangedId = 'TX-UNCHANGED';
    await applyEvent(
      database,
      hotmartEvent({
        eventKey: 'initial-unchanged', transactionId: unchangedId, status: 'approved',
        occurredAt: '2026-07-16T12:00:00.000Z', source: 'webhook',
      }),
      hotmartTransaction(unchangedId),
    );
    assert.deepEqual(
      await applyEvent(
        database,
        hotmartEvent({
          eventKey: 'reconcile-unchanged', transactionId: unchangedId, status: 'approved',
          occurredAt: '2026-07-16T12:00:00.000Z', source: 'reconciliation',
        }),
        hotmartTransaction(unchangedId, { last_reconciled_at: '2026-07-16T15:00:00.000Z' }),
      ),
      { inserted_event: true, updated_transaction: true, repaired_transaction: false },
    );
  } finally {
    await database.close();
  }
});
