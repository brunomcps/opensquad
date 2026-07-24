import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(
  path.resolve(directory, '../../../supabase/migrations/20260714193000_ci_campaign_comment_reply.sql'),
  'utf8',
);

test('migration inclui resposta a comentário e contrato Hotmart-safe', () => {
  assert.match(sql, /comment_reply/i);
  assert.match(sql, /ci_campaigns_tracking_code_hotmart_safe_check/i);
  assert.match(sql, /\^\[A-Za-z0-9\|\]\+\$/i);
  assert.match(sql, /validate constraint/i);
  assert.doesNotMatch(sql, /\bdrop\s+(table|schema|function)\b/i);
});
