import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(path.join(directory, '002-edge-app.sql'), 'utf8');

test('migration Edge adiciona membros, RLS e travas sem operação destrutiva', () => {
  assert.match(sql, /create table if not exists public\.ci_app_members/i);
  assert.match(sql, /references auth\.users\(id\)/i);
  assert.match(sql, /check \(role in \('viewer', 'admin'\)\)/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /ci_app_members_select_self/i);
  assert.match(sql, /create table if not exists public\.ci_sync_locks/i);
  assert.match(sql, /create or replace function public\.ci_acquire_sync_lock/i);
  assert.match(sql, /create or replace function public\.ci_release_sync_lock/i);
  assert.match(sql, /grant execute .* to service_role/i);
  assert.doesNotMatch(sql, /\bdrop\s+(table|schema|function)\b/i);
});
