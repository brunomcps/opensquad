import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  canonicalClickIngestPayload,
  claimClickIngestNonce,
  verifyClickIngestRequest,
} from '../../../supabase/functions/_shared/clickIngest.ts';
import { hmacSha256 } from '../../../supabase/functions/_shared/crypto.ts';

const directory = path.dirname(fileURLToPath(import.meta.url));
const secret = 'ingest-secret-fixture-32-bytes-minimum-value';
const slug = '0okxyzoxzuk-d';
const now = Date.parse('2026-07-15T12:00:00.000Z');

async function signedRequest(input: {
  requestSlug?: string;
  signedSlug?: string;
  ciTest?: boolean;
  signedCiTest?: boolean;
  timestamp?: number;
  nonce?: string;
  signature?: string;
} = {}): Promise<Request> {
  const timestamp = String(input.timestamp ?? now);
  const nonce = input.nonce || '0123456789abcdef0123456789abcdef';
  const ciTest = input.ciTest ?? false;
  const signedCiTest = input.signedCiTest ?? ciTest;
  const signature = input.signature || await hmacSha256(secret, canonicalClickIngestPayload(
    timestamp,
    nonce,
    input.signedSlug || slug,
    signedCiTest,
  ));
  const url = new URL(`https://example.test/?slug=${input.requestSlug || slug}`);
  if (ciTest) url.searchParams.set('ci_test', '1');
  return new Request(url, {
    headers: {
      'x-ci-ingest-timestamp': timestamp,
      'x-ci-ingest-nonce': nonce,
      'x-ci-ingest-signature': signature,
    },
  });
}

test('assinatura de ingestão autentica timestamp, nonce, slug e flag técnica fechada', async () => {
  const request = await signedRequest();
  assert.deepEqual(await verifyClickIngestRequest(request, secret, slug, false, now), {
    nonce: '0123456789abcdef0123456789abcdef',
    issuedAt: '2026-07-15T12:00:00.000Z',
  });

  for (const invalid of [
    () => verifyClickIngestRequest(new Request(request.url), secret, slug, false, now),
    () => verifyClickIngestRequest(request, 'curto', slug, false, now),
    () => verifyClickIngestRequest(request, secret, 'slug-adulterado', false, now),
    () => verifyClickIngestRequest(request, secret, slug, true, now),
    async () => verifyClickIngestRequest(
      await signedRequest({ timestamp: now - 60_001 }),
      secret,
      slug,
      false,
      now,
    ),
  ]) {
    await assert.rejects(invalid, (error: any) => error.code.startsWith('click_ingest_'));
  }
});

test('claim de nonce rejeita replay e falha de persistência sem liberar o request', async () => {
  const claim = { nonce: '0123456789abcdef0123456789abcdef', issuedAt: '2026-07-15T12:00:00.000Z' };
  const calls: unknown[] = [];
  await claimClickIngestNonce({
    async rpc(name: string, args: unknown) {
      calls.push([name, args]);
      return { data: true, error: null };
    },
  }, claim);
  assert.deepEqual(calls, [['ci_claim_click_ingest_nonce', {
    p_nonce: claim.nonce,
    p_issued_at: claim.issuedAt,
  }]]);

  await assert.rejects(
    () => claimClickIngestNonce({ async rpc() { return { data: false, error: null }; } }, claim),
    (error: any) => error.code === 'click_ingest_replay' && error.statusCode === 409,
  );
  await assert.rejects(
    () => claimClickIngestNonce({ async rpc() { return { data: null, error: { code: 'db' } }; } }, claim),
    (error: any) => error.code === 'click_ingest_nonce_unavailable' && error.statusCode === 503,
  );
});

test('redirect exige Worker autenticado, recusa ci_test público e grava clique via RPC atômica', () => {
  const source = fs.readFileSync(
    path.resolve(directory, '../../../supabase/functions/ci-campaign-redirect/index.ts'),
    'utf8',
  );
  assert.match(source, /verifyClickIngestRequest/);
  assert.match(source, /claimClickIngestNonce/);
  assert.match(source, /searchParams\.has\('ci_test'\)/);
  assert.match(source, /rpc\('ci_record_campaign_click'/);
  assert.doesNotMatch(source, /from\('ci_click_events'\)/);
  assert.doesNotMatch(source, /resolved_at|resolveClickPersistenceFailures/);
  assert.doesNotMatch(source, /cf-connecting-ip|ip_address|raw_user_agent/i);
});

test('migration implementa nonce anti-replay e dedupe transacional sem PII', () => {
  const sql = fs.readFileSync(
    path.resolve(directory, '../../../supabase/migrations/20260715120000_ci_tracking_history.sql'),
    'utf8',
  );
  assert.match(sql, /create table if not exists public\.ci_click_ingest_nonces/i);
  assert.match(sql, /nonce text primary key/i);
  assert.match(sql, /create or replace function public\.ci_claim_click_ingest_nonce/i);
  assert.match(sql, /on conflict \(nonce\) do nothing/i);
  assert.match(sql, /create or replace function public\.ci_record_campaign_click/i);
  assert.match(sql, /pg_advisory_xact_lock/i);
  assert.match(sql, /same_fingerprint_within_30s/i);
  assert.doesNotMatch(sql, /\bip_address\b|\braw_user_agent\b|\bbuyer_email\b/i);
});
