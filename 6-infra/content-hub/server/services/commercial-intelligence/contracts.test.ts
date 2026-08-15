import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('migration contém schema base, atomicidade e RLS sem operação destrutiva', () => {
  const sql = fs.readFileSync(
    path.join(base, 'scripts/commercial-intelligence/001-base.sql'),
    'utf8',
  );
  for (const table of [
    'ci_youtube_videos',
    'ci_youtube_daily',
    'ci_hotmart_transactions',
    'ci_hotmart_events',
    'ci_sync_runs',
  ]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}`, 'i'));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
  }
  assert.match(sql, /create or replace function public\.ci_apply_hotmart_event/i);
  assert.match(sql, /on conflict \(event_key\) do nothing/i);
  assert.match(sql, /if not v_inserted and p_event->>'source' <> 'reconciliation'/i);
  assert.match(sql, /gross_currency = case[\s\S]*p_event->>'source' = 'reconciliation'[\s\S]*coalesce/i);
  assert.match(sql, /when v_current_src_is_campaign then ci_hotmart_transactions\.tracking_src/i);
  assert.match(sql, /when v_incoming_src_is_campaign then excluded\.tracking_src/i);
  assert.match(sql, /return query select v_inserted, v_updated, v_repaired/i);
  assert.match(sql, /last_event_at = greatest\(excluded\.last_event_at, ci_hotmart_transactions\.last_event_at\)/i);
  assert.doesNotMatch(sql, /\bdrop\s+(table|function|schema)\b/i);
});

test('golden dataset mantém valores aprovados e não contém PII', () => {
  const goldenPath = path.join(
    base,
    'fixtures/commercial-intelligence/golden-2026-07-10/analysis-results.json',
  );
  const raw = fs.readFileSync(goldenPath, 'utf8');
  const golden = JSON.parse(raw);
  assert.equal(golden.descriptive.sales, 769);
  assert.equal(golden.descriptive.buyers, 457);
  assert.equal(golden.descriptive.net_revenue, 66422.28);
  assert.equal(golden.partial_correlations.watch_hours_sales_lag_0, 0.40947012978018515);
  assert.equal(raw.includes('@'), false);
  assert.equal(/buyer(Name|Email)|documento|telefone/i.test(raw), false);
});
