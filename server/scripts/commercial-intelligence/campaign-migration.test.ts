import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(
  path.resolve(directory, '../../../supabase/migrations/20260713230000_ci_campaign_tracking.sql'),
  'utf8',
);

test('migration cria campanhas e cliques com RLS sem operação destrutiva', () => {
  assert.match(sql, /create table if not exists public\.ci_campaigns/i);
  assert.match(sql, /tracking_code text not null unique/i);
  assert.match(sql, /char_length\(tracking_code\) between 1 and 30/i);
  assert.match(sql, /tracking_code !~ '_'/i);
  assert.match(sql, /create table if not exists public\.ci_click_events/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all .* from anon, authenticated/i);
  assert.match(sql, /grant all .* to service_role/i);
  assert.doesNotMatch(sql, /\bdrop\s+(table|schema|function)\b/i);
  assert.doesNotMatch(sql, /\bip(address)?\b/i);
});
