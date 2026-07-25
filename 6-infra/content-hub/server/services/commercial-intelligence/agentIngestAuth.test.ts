import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canonicalAgentIngestPayload,
  claimAgentIngestNonce,
  parseAgentIngestKeys,
  verifyAgentIngestRequest,
} from '../../../supabase/functions/_shared/agentIngestAuth.ts';
import { hmacSha256, sha256Bytes } from '../../../supabase/functions/_shared/crypto.ts';

const secret = 'hermes-agent-secret-with-at-least-32-bytes';
const keyId = 'hermes-local';
const now = Date.parse('2026-07-24T18:00:00.000Z');
const body = JSON.stringify({ action: 'prepare_assets', referenceKey: 'reference-1' });
const bodyBytes = new TextEncoder().encode(body);

async function signedRequest(input: {
  method?: string;
  signedMethod?: string;
  requestPath?: string;
  signedPath?: string;
  timestamp?: number;
  nonce?: string;
  key?: string;
  signedBody?: Uint8Array;
  requestBody?: string;
} = {}): Promise<Request> {
  const method = input.method || 'POST';
  const requestPath = input.requestPath || '/functions/v1/ci-story-ingest';
  const timestamp = String(input.timestamp ?? now);
  const nonce = input.nonce || 'nonce_0123456789abcdef';
  const signedBody = input.signedBody || bodyBytes;
  const signature = await hmacSha256(secret, canonicalAgentIngestPayload(
    input.signedMethod || method,
    input.signedPath || requestPath,
    timestamp,
    nonce,
    await sha256Bytes(signedBody),
  ));
  return new Request(`https://example.test${requestPath}`, {
    method,
    body: method === 'GET' ? undefined : input.requestBody ?? body,
    headers: {
      'content-type': 'application/json',
      'x-ci-agent-key': input.key || keyId,
      'x-ci-agent-timestamp': timestamp,
      'x-ci-agent-nonce': nonce,
      'x-ci-agent-signature': signature,
    },
  });
}

test('agent ingest auth verifies method path timestamp nonce and body bytes', async () => {
  const request = await signedRequest();
  assert.deepEqual(
    await verifyAgentIngestRequest(request, bodyBytes, { [keyId]: secret }, now),
    {
      keyId,
      nonce: 'nonce_0123456789abcdef',
      requestedAt: '2026-07-24T18:00:00.000Z',
    },
  );

  const invalidRequests = [
    await signedRequest({ method: 'PATCH', signedMethod: 'POST' }),
    await signedRequest({
      requestPath: '/functions/v1/other',
      signedPath: '/functions/v1/ci-story-ingest',
    }),
    await signedRequest({ timestamp: now - 5 * 60 * 1000 - 1 }),
    await signedRequest({ timestamp: now + 30_001 }),
    await signedRequest({ key: 'unknown-key' }),
  ];
  for (const invalid of invalidRequests) {
    await assert.rejects(
      () => verifyAgentIngestRequest(invalid, bodyBytes, { [keyId]: secret }, now),
      (error: any) => error.code.startsWith('agent_ingest_') && !JSON.stringify(error).includes(secret),
    );
  }

  const tamperedBody = new TextEncoder().encode(`${body} `);
  await assert.rejects(
    () => verifyAgentIngestRequest(request, tamperedBody, { [keyId]: secret }, now),
    (error: any) => error.code === 'agent_ingest_unauthorized',
  );
});

test('agent ingest auth validates the configured key map without exposing secrets', () => {
  assert.deepEqual(parseAgentIngestKeys(JSON.stringify({ [keyId]: secret })), { [keyId]: secret });
  for (const invalid of [
    undefined,
    'not-json',
    JSON.stringify([]),
    JSON.stringify({ 'Bad Key': secret }),
    JSON.stringify({ [keyId]: 'short' }),
  ]) {
    assert.throws(
      () => parseAgentIngestKeys(invalid),
      (error: any) => error.code === 'agent_ingest_not_configured'
        && !error.message.includes(secret),
    );
  }
});

test('agent ingest auth claims nonce once and fails closed on persistence errors', async () => {
  const claim = {
    keyId,
    nonce: 'nonce_0123456789abcdef',
    requestedAt: '2026-07-24T18:00:00.000Z',
  };
  const calls: unknown[] = [];
  await claimAgentIngestNonce({
    async rpc(name: string, args: unknown) {
      calls.push([name, args]);
      return { data: true, error: null };
    },
  }, claim);
  assert.deepEqual(calls, [['ci_claim_agent_nonce', {
    p_key_id: keyId,
    p_nonce: claim.nonce,
    p_requested_at: claim.requestedAt,
  }]]);

  await assert.rejects(
    () => claimAgentIngestNonce({ async rpc() { return { data: false, error: null }; } }, claim),
    (error: any) => error.code === 'agent_ingest_replay' && error.statusCode === 409,
  );
  await assert.rejects(
    () => claimAgentIngestNonce({ async rpc() { return { data: null, error: { code: 'db' } }; } }, claim),
    (error: any) => error.code === 'agent_ingest_nonce_unavailable' && error.statusCode === 503,
  );
});
