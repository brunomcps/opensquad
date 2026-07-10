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
