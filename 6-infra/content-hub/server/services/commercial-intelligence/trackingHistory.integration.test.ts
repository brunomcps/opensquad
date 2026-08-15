import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../../..');

function migration(relativePath: string): string {
  return fs.readFileSync(path.resolve(root, relativePath), 'utf8');
}

function baseMigrationForPGlite(): string {
  // gen_random_uuid() is part of the bundled PostgreSQL runtime, but PGlite
  // does not ship the pgcrypto extension control file.
  return migration('server/scripts/commercial-intelligence/001-base.sql')
    .replace(/create extension if not exists pgcrypto;\s*/i, '');
}

async function insertTransaction(db: PGlite, input: {
  id: string;
  status?: string;
  approvedAt: string;
  productId: string;
  productName?: string;
  trackingSrc?: string | null;
  trackingSck?: string | null;
  producerNetValue?: number | null;
  producerNetCurrency?: string | null;
  grossValue?: number | null;
  grossCurrency?: string | null;
  feeValue?: number | null;
  feeCurrency?: string | null;
}) {
  await db.query(`
    insert into public.ci_hotmart_transactions (
      transaction_id, product_id, product_name, status, approved_date,
      gross_value, gross_currency, fee_value, fee_currency,
      producer_net_value, producer_net_currency,
      tracking_src, tracking_sck, last_event_at
    ) values ($1, $2, $3, $4, $5::timestamptz, $6, $7, $8, $9, $10, $11, $12, $13, $5::timestamptz)
  `, [
    input.id,
    input.productId,
    input.productName || (input.productId === '6966825' ? 'MAPA-7P' : 'Produto adicional'),
    input.status || 'approved',
    input.approvedAt,
    input.grossValue ?? null,
    input.grossCurrency ?? null,
    input.feeValue ?? null,
    input.feeCurrency ?? null,
    input.producerNetValue ?? null,
    input.producerNetCurrency ?? null,
    input.trackingSrc ?? null,
    input.trackingSck ?? null,
  ]);
}

function count(rows: Array<Record<string, unknown>>, attribution: string): number {
  return rows
    .filter(row => row.event_type === 'sale' && row.attribution === attribution)
    .reduce((total, row) => total + Number(row.event_count), 0);
}

function saleEventId(transactionId: string): string {
  return `sale:${createHash('md5').update(`ci-sale:${transactionId}`).digest('hex')}`;
}

test('RPCs de histórico aplicam o contrato MAPA, status, financeiro e paginação em PostgreSQL', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    `);

    for (const sql of [
      baseMigrationForPGlite(),
      migration('supabase/migrations/20260713180000_ci_edge_app.sql'),
      migration('supabase/migrations/20260713230000_ci_campaign_tracking.sql'),
      migration('supabase/migrations/20260714193000_ci_campaign_comment_reply.sql'),
      migration('supabase/migrations/20260715120000_ci_tracking_history.sql'),
      migration('supabase/migrations/20260715130000_ci_hotmart_reconciliation_repair.sql'),
      migration('supabase/migrations/20260717021000_ci_youtube_card_tracking.sql'),
    ]) await db.exec(sql);

    await db.exec(`
      insert into public.ci_youtube_videos (video_id, title, metadata_refreshed_at) values
        ('video000001', 'Vídeo do MAPA', '2026-07-15T08:00:00Z');

      insert into public.ci_campaigns (
        campaign_id, tracking_code, slug, name, video_id, product_id, product_name,
        offer_code, destination_url, tracking_parameter, cta_label, cta_position, utm_campaign
      ) values
        ('00000000-0000-0000-0000-000000000001', 'MAPA1', 'mapa1-d', 'MAPA descrição', 'video000001', '6966825', 'MAPA-7P', 'offer-mapa', 'https://example.test/mapa', 'src', 'Conheça', 'description', 'mapa7p-youtube'),
        ('00000000-0000-0000-0000-000000000002', 'MAPA2', 'mapa2-c', 'MAPA comentário', 'video000001', '6966825', 'MAPA-7P', 'offer-mapa', 'https://example.test/mapa', 'src', 'Conheça', 'pinned_comment', 'mapa7p-youtube'),
        ('00000000-0000-0000-0000-000000000005', 'MAPAV', 'mapa-v', 'MAPA card', 'video000001', '6966825', 'MAPA-7P', 'offer-mapa', 'https://example.test/mapa', 'src', 'Conheça', 'video', 'mapa7p-youtube'),
        ('00000000-0000-0000-0000-000000000003', 'BIO1', 'mapa-bio', 'MAPA bio', 'video000001', '6966825', 'MAPA-7P', 'offer-mapa', 'https://example.test/mapa', 'src', 'Conheça', 'bio', 'mapa7p-bio'),
        ('00000000-0000-0000-0000-000000000004', 'OTHER1', 'other-d', 'Outro produto', 'video000001', '9999999', 'Outro produto', null, 'https://example.test/other', 'src', 'Conheça', 'description', 'other-youtube');

      insert into public.ci_click_events (
        campaign_id, clicked_at, device_type, is_bot, traffic_classification, classified_at
      ) values
        ('00000000-0000-0000-0000-000000000001', '2026-07-15T10:00:00Z', 'desktop', false, 'qualified', '2026-07-15T10:00:00Z'),
        ('00000000-0000-0000-0000-000000000005', '2026-07-15T10:30:00Z', 'desktop', false, 'qualified', '2026-07-15T10:30:00Z'),
        ('00000000-0000-0000-0000-000000000003', '2026-07-15T11:00:00Z', 'desktop', false, 'qualified', '2026-07-15T11:00:00Z'),
        ('00000000-0000-0000-0000-000000000004', '2026-07-15T12:00:00Z', 'desktop', false, 'qualified', '2026-07-15T12:00:00Z');
    `);

    const firstNonce = await db.query<{ claimed: boolean }>(`
      select public.ci_claim_click_ingest_nonce(
        '0123456789abcdef0123456789abcdef',
        clock_timestamp()
      ) as claimed
    `);
    const replayedNonce = await db.query<{ claimed: boolean }>(`
      select public.ci_claim_click_ingest_nonce(
        '0123456789abcdef0123456789abcdef',
        clock_timestamp()
      ) as claimed
    `);
    assert.equal(firstNonce.rows[0].claimed, true);
    assert.equal(replayedNonce.rows[0].claimed, false);

    const clickRpcArgs = `
      '00000000-0000-0000-0000-000000000004'::uuid,
      'youtube.com',
      'desktop',
      false,
      'qualified',
      null,
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    `;
    const firstRecordedClick = await db.query<Record<string, unknown>>(
      `select * from public.ci_record_campaign_click(${clickRpcArgs})`,
    );
    const duplicateRecordedClick = await db.query<Record<string, unknown>>(
      `select * from public.ci_record_campaign_click(${clickRpcArgs})`,
    );
    assert.equal(firstRecordedClick.rows[0].recorded_traffic_classification, 'qualified');
    assert.equal(duplicateRecordedClick.rows[0].recorded_traffic_classification, 'duplicate');
    assert.equal(duplicateRecordedClick.rows[0].recorded_exclusion_reason, 'same_fingerprint_within_30s');

    await insertTransaction(db, {
      id: 'approved-primary', approvedAt: '2026-07-15T09:00:00Z', productId: '6966825',
      trackingSrc: 'MAPA1', producerNetValue: 90, producerNetCurrency: 'BRL',
    });
    await insertTransaction(db, {
      id: 'refunded-primary', status: 'refunded', approvedAt: '2026-07-15T09:05:00Z', productId: '6966825',
      trackingSrc: 'MAPA1', producerNetValue: 90, producerNetCurrency: 'BRL',
    });
    await insertTransaction(db, {
      id: 'approved-additional', approvedAt: '2026-07-15T09:10:00Z', productId: '7777777',
      trackingSrc: 'MAPA1', producerNetValue: null, producerNetCurrency: 'BRL',
      grossValue: 50, grossCurrency: 'BRL', feeValue: 5, feeCurrency: 'BRL',
    });
    await insertTransaction(db, {
      id: 'approved-ambiguous', approvedAt: '2026-07-15T09:15:00Z', productId: '6966825',
      trackingSrc: 'MAPA1', trackingSck: 'MAPA2', producerNetValue: 80, producerNetCurrency: 'BRL',
    });
    await insertTransaction(db, {
      id: 'approved-scope-external-conflict', approvedAt: '2026-07-15T09:17:00Z', productId: '6966825',
      trackingSrc: 'MAPA1', trackingSck: 'OTHER1', producerNetValue: 80, producerNetCurrency: 'BRL',
    });
    await insertTransaction(db, {
      id: 'approved-unattributed', approvedAt: '2026-07-15T09:20:00Z', productId: '6966825',
      producerNetValue: 80, producerNetCurrency: 'BRL',
    });
    await insertTransaction(db, {
      id: 'approved-incomplete', approvedAt: '2026-07-15T09:25:00Z', productId: '6966825',
      trackingSrc: 'MAPA1', producerNetValue: null, producerNetCurrency: 'BRL',
      grossValue: 100, grossCurrency: 'BRL', feeValue: null, feeCurrency: 'BRL',
    });
    await insertTransaction(db, {
      id: 'transação-ç/💳|A+B', approvedAt: '2026-07-15T09:30:00Z', productId: '6966825',
      trackingSrc: 'MAPA1', producerNetValue: 0, producerNetCurrency: 'BRL',
    });
    await insertTransaction(db, {
      id: 'approved-video-card', approvedAt: '2026-07-15T09:32:00Z', productId: '6966825',
      trackingSrc: 'MAPAV', producerNetValue: 70, producerNetCurrency: 'BRL',
    });
    await insertTransaction(db, {
      id: 'excluded-bio', approvedAt: '2026-07-15T09:35:00Z', productId: '6966825',
      trackingSrc: 'BIO1', producerNetValue: 80, producerNetCurrency: 'BRL',
    });
    await insertTransaction(db, {
      id: 'excluded-unrelated', approvedAt: '2026-07-15T09:40:00Z', productId: '9999999',
      trackingSrc: 'OTHER1', producerNetValue: 80, producerNetCurrency: 'BRL',
    });

    const seriesResult = await db.query<Record<string, unknown>>(`
      select * from public.ci_tracking_series(
        '2026-07-15T00:00:00Z'::timestamptz,
        '2026-07-16T00:00:00Z'::timestamptz,
        'hour', null, null, 'all'
      )
    `);
    const series = seriesResult.rows;
    assert.equal(series.filter(row => row.event_type === 'click').reduce((total, row) => total + Number(row.event_count), 0), 2);
    assert.equal(count(series, 'direct_primary'), 4);
    assert.equal(count(series, 'direct_additional'), 1);
    assert.equal(count(series, 'ambiguous'), 2);
    assert.equal(count(series, 'unattributed'), 1);
    assert.equal(
      series.filter(row => row.event_type === 'sale' && row.financial_incomplete === true)
        .reduce((total, row) => total + Number(row.event_count), 0),
      1,
    );
    assert.equal(
      series.filter(row => ['direct_primary', 'direct_additional'].includes(String(row.attribution)))
        .reduce((total, row) => total + Number(row.net_amount), 0),
      205,
    );

    const cardSeries = await db.query<Record<string, unknown>>(`
      select * from public.ci_tracking_series(
        '2026-07-15T00:00:00Z'::timestamptz,
        '2026-07-16T00:00:00Z'::timestamptz,
        'hour', null, 'video', 'all'
      )
    `);
    assert.equal(cardSeries.rows.filter(row => row.event_type === 'click').reduce((total, row) => total + Number(row.event_count), 0), 1);
    assert.equal(count(cardSeries.rows, 'direct_primary'), 1);
    assert.equal(cardSeries.rows.every(row => row.cta_position === 'video'), true);

    const eventArgs = `'2026-07-15T00:00:00Z'::timestamptz, '2026-07-16T00:00:00Z'::timestamptz, null, null, 'all', true, true`;
    const eventsResult = await db.query<Record<string, unknown>>(`
      select * from public.ci_tracking_events(${eventArgs}, null, null, 100)
    `);
    const events = eventsResult.rows;
    assert.equal(events.length, 11);
    assert.equal(events.find(row => row.event_id === saleEventId('approved-video-card'))?.cta_position, 'video');
    assert.equal(events.filter(row => row.event_type === 'sale' && row.transaction_status === 'refunded').length, 1);
    assert.equal(events.some(row => row.event_id === saleEventId('excluded-bio')), false);
    assert.equal(events.some(row => row.event_id === saleEventId('excluded-unrelated')), false);
    assert.equal(events.find(row => row.event_id === saleEventId('approved-additional'))?.amount, '45.00');
    assert.equal(events.find(row => row.event_id === saleEventId('approved-incomplete'))?.amount, null);
    assert.equal(events.find(row => row.event_id === saleEventId('approved-scope-external-conflict'))?.attribution, 'ambiguous');
    assert.equal(events.find(row => row.event_id === saleEventId('approved-scope-external-conflict'))?.video_id, null);
    assert.equal(events.some(row => String(row.event_id).includes('approved-')), false);
    assert.equal(events.some(row => String(row.event_sort_id).includes('approved-')), false);

    const firstPage = await db.query<Record<string, unknown>>(`
      select * from public.ci_tracking_events(${eventArgs}, null, null, 2)
    `);
    assert.equal(firstPage.rows.length, 2);
    const cursorRow = firstPage.rows.at(-1)!;
    const secondPage = await db.query<Record<string, unknown>>(`
      select * from public.ci_tracking_events(${eventArgs}, $1::timestamptz, $2::text, 100)
    `, [cursorRow.occurred_at, cursorRow.event_sort_id]);
    assert.equal(secondPage.rows.length, 9);
    assert.equal(secondPage.rows.some(row => firstPage.rows.some(first => first.event_id === row.event_id)), false);

    await db.exec(`
      insert into public.ci_sync_runs (
        run_id, source, job_type, status, warnings, error_code, error_message, started_at, finished_at
      ) values
        ('10000000-0000-0000-0000-000000000001', 'hotmart_reconciliation', 'sales_history', 'success', '[]', null, null, '2026-07-15T06:00:00Z', '2026-07-15T06:01:00Z'),
        ('10000000-0000-0000-0000-000000000002', 'hotmart_reconciliation', 'sales_history', 'partial', '["hotmart_partial_statuses:CHARGEBACK"]', null, null, '2026-07-15T07:00:00Z', '2026-07-15T07:01:00Z'),
        ('10000000-0000-0000-0000-000000000003', 'hotmart_reconciliation', 'sales_history', 'failed', '["hotmart_no_statuses_read"]', 'hotmart_no_statuses_read', 'Nenhum grupo lido.', '2026-07-15T08:00:00Z', '2026-07-15T08:01:00Z');
    `);

    const freshness = await db.query<Record<string, unknown>>('select * from public.ci_tracking_freshness()');
    assert.equal(new Date(String(freshness.rows[0].last_click_at)).toISOString(), '2026-07-15T10:30:00.000Z');
    assert.equal(new Date(String(freshness.rows[0].last_qualified_click_at)).toISOString(), '2026-07-15T10:30:00.000Z');
    assert.equal(new Date(String(freshness.rows[0].last_hotmart_reconciliation_at)).toISOString(), '2026-07-15T06:01:00.000Z');
    assert.equal(new Date(String(freshness.rows[0].last_hotmart_reconciliation_success_at)).toISOString(), '2026-07-15T06:01:00.000Z');
    assert.equal(new Date(String(freshness.rows[0].last_hotmart_reconciliation_partial_at)).toISOString(), '2026-07-15T07:01:00.000Z');
    assert.equal(new Date(String(freshness.rows[0].last_hotmart_reconciliation_attempt_at)).toISOString(), '2026-07-15T08:00:00.000Z');
    assert.equal(freshness.rows[0].last_hotmart_reconciliation_status, 'failed');
    assert.deepEqual(freshness.rows[0].last_hotmart_reconciliation_warnings, ['hotmart_no_statuses_read']);
    assert.equal(freshness.rows[0].last_hotmart_reconciliation_error_code, 'hotmart_no_statuses_read');
    assert.equal(freshness.rows[0].hotmart_schedule_active, false);

    await db.exec(`
      create schema cron;
      create table cron.job (
        jobname text not null,
        schedule text not null,
        active boolean not null
      );
      insert into cron.job (jobname, schedule, active)
      values ('ci-hotmart-daily', '40 9 * * *', true);
    `);

    const scheduledFreshness = await db.query<Record<string, unknown>>(
      'select * from public.ci_tracking_freshness()',
    );
    assert.equal(scheduledFreshness.rows[0].hotmart_schedule_active, true);
    assert.equal(scheduledFreshness.rows[0].hotmart_schedule_expression, '40 9 * * *');
  } finally {
    await db.close();
  }
});
