import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { authorizeAdminOrCron, authorizeMember } from '../../../supabase/functions/_shared/auth.ts';
import { secureEqual } from '../../../supabase/functions/_shared/crypto.ts';
import { parseAllowedOrigins, resolveAllowedOrigin } from '../../../supabase/functions/_shared/cors.ts';
import { defaultDateRange } from '../../../supabase/functions/_shared/dates.ts';
import { normalizeHotmartPayload } from '../../../supabase/functions/_shared/hotmart.ts';
import { parseYoutubeDailyReport } from '../../../supabase/functions/_shared/youtube.ts';

const directory = path.dirname(fileURLToPath(import.meta.url));
const approvedFixture = JSON.parse(fs.readFileSync(
  path.resolve(directory, '../../fixtures/commercial-intelligence/hotmart-approved.json'),
  'utf8',
));

function authClient(role: 'viewer' | 'admin', enabled = true) {
  const query = {
    select() { return this; },
    eq() { return this; },
    async maybeSingle() { return { data: { role, enabled }, error: null }; },
  };
  return {
    auth: { async getUser() { return { data: { user: { id: 'user-1' } }, error: null }; } },
    from() { return query; },
  };
}

test('runtime Edge preserva data de negócio e comparação de segredos', () => {
  assert.deepEqual(defaultDateRange(35, new Date('2026-07-10T15:00:00.000Z')), {
    startDate: '2026-06-06',
    endDate: '2026-07-10',
  });
  assert.equal(secureEqual('segredo', 'segredo'), true);
  assert.equal(secureEqual('segredo', 'errado'), false);
  assert.equal(secureEqual('segredo', undefined), false);
});

test('CORS Edge aceita somente origens configuradas', () => {
  assert.deepEqual(parseAllowedOrigins('https://app.example, localhost'), ['https://app.example', 'localhost']);
  assert.equal(resolveAllowedOrigin('https://app.example', 'https://app.example'), 'https://app.example');
  assert.equal(resolveAllowedOrigin('http://localhost:5175', 'https://app.example,localhost'), 'http://localhost:5175');
  assert.equal(resolveAllowedOrigin('https://evil.example', 'https://app.example'), null);
});

test('normalizador Edge anonimiza comprador e não retém PII', async () => {
  const normalized = await normalizeHotmartPayload(approvedFixture, {
    source: 'webhook',
    buyerHmacSecret: 'fixture-secret',
    now: new Date('2026-07-10T12:00:00.000Z'),
  });
  assert.equal(normalized.transaction.status, 'approved');
  assert.equal(normalized.transaction.buyer_key?.length, 64);
  assert.equal(normalized.warnings.length, 0);
  const serialized = JSON.stringify(normalized);
  assert.doesNotMatch(serialized, /buyer@example\.com/i);
  assert.doesNotMatch(serialized, /buyerName|buyerEmail|document|phone/i);
});

test('parser Edge preserva ajustes negativos de engajamento', () => {
  const rows = parseYoutubeDailyReport({
    columnHeaders: [
      { name: 'day' }, { name: 'video' }, { name: 'views' },
      { name: 'estimatedMinutesWatched' }, { name: 'likes' },
    ],
    rows: [['2026-07-10', 'video-1', 10, 20, -2]],
  }, '2026-07-10T12:00:00.000Z');
  assert.equal(rows[0].likes, -2);
});

test('autorização Edge diferencia viewer, admin e Cron', async () => {
  const request = new Request('https://example.test', {
    headers: { authorization: 'Bearer fixture-token' },
  });
  assert.equal((await authorizeMember(request, authClient('viewer'), 'viewer')).role, 'viewer');
  await assert.rejects(
    () => authorizeMember(request, authClient('viewer'), 'admin'),
    (error: any) => error.code === 'admin_required' && error.statusCode === 403,
  );
  assert.equal((await authorizeMember(request, authClient('admin'), 'admin')).role, 'admin');

  const cronRequest = new Request('https://example.test', {
    headers: { 'x-ci-cron-secret': 'cron-secret' },
  });
  assert.deepEqual(
    await authorizeAdminOrCron(cronRequest, {}, 'cron-secret'),
    { actor: 'cron' },
  );
});
