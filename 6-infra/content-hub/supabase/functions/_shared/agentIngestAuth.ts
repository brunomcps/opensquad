import { CommercialIntelligenceError } from './errors.ts';
import { hmacSha256, secureEqual, sha256Bytes } from './crypto.ts';

export const AGENT_INGEST_MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

export interface AgentIngestClaim {
  keyId: string;
  nonce: string;
  requestedAt: string;
}

export function canonicalAgentIngestRequestPath(pathname: string): string {
  const publicFunctionPath = pathname.match(/^\/functions\/v1\/([^/]+)\/?$/);
  return publicFunctionPath
    ? `/${publicFunctionPath[1]}`
    : pathname;
}

export function canonicalAgentIngestPayload(
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  bodyHash: string,
): string {
  return [
    method.toUpperCase(),
    path,
    timestamp,
    nonce,
    bodyHash.toLowerCase(),
  ].join('\n');
}

function reject(code = 'agent_ingest_unauthorized', statusCode = 401): never {
  throw new CommercialIntelligenceError(code, 'Publicação do agente não autorizada.', statusCode);
}

export function parseAgentIngestKeys(value: string | undefined): Record<string, string> {
  if (!value) {
    throw new CommercialIntelligenceError(
      'agent_ingest_not_configured',
      'Publicação do agente não configurada.',
      503,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    parsed = null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new CommercialIntelligenceError(
      'agent_ingest_not_configured',
      'Publicação do agente não configurada.',
      503,
    );
  }
  const entries = Object.entries(parsed as Record<string, unknown>);
  if (entries.length < 1 || entries.some(([keyId, secret]) => (
    !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(keyId)
    || typeof secret !== 'string'
    || new TextEncoder().encode(secret).length < 32
  ))) {
    throw new CommercialIntelligenceError(
      'agent_ingest_not_configured',
      'Publicação do agente não configurada.',
      503,
    );
  }
  return Object.fromEntries(entries) as Record<string, string>;
}

export async function verifyAgentIngestRequest(
  request: Request,
  bodyBytes: Uint8Array,
  keys: Record<string, string>,
  nowMs = Date.now(),
): Promise<AgentIngestClaim> {
  const keyId = request.headers.get('x-ci-agent-key')?.trim() || '';
  const timestamp = request.headers.get('x-ci-agent-timestamp')?.trim() || '';
  const nonce = request.headers.get('x-ci-agent-nonce')?.trim() || '';
  const signature = request.headers.get('x-ci-agent-signature')?.trim().toLowerCase() || '';
  if (!/^[a-z0-9][a-z0-9._-]{0,79}$/.test(keyId)
    || !/^\d{13}$/.test(timestamp)
    || !/^[A-Za-z0-9_-]{16,160}$/.test(nonce)
    || !/^[0-9a-f]{64}$/.test(signature)
  ) {
    return reject();
  }

  const timestampMs = Number(timestamp);
  if (!Number.isSafeInteger(timestampMs)
    || timestampMs < nowMs - AGENT_INGEST_MAX_CLOCK_SKEW_MS
    || timestampMs > nowMs + 30_000
  ) {
    return reject('agent_ingest_expired');
  }

  const secret = keys[keyId];
  if (!secret) return reject();
  const bodyHash = await sha256Bytes(bodyBytes);
  const expected = await hmacSha256(secret, canonicalAgentIngestPayload(
    request.method,
    canonicalAgentIngestRequestPath(new URL(request.url).pathname),
    timestamp,
    nonce,
    bodyHash,
  ));
  if (!secureEqual(expected, signature)) return reject();
  return {
    keyId,
    nonce,
    requestedAt: new Date(timestampMs).toISOString(),
  };
}

export async function claimAgentIngestNonce(
  client: any,
  claim: AgentIngestClaim,
): Promise<void> {
  const result = await client.rpc('ci_claim_agent_nonce', {
    p_key_id: claim.keyId,
    p_nonce: claim.nonce,
    p_requested_at: claim.requestedAt,
  });
  if (result.error) {
    throw new CommercialIntelligenceError(
      'agent_ingest_nonce_unavailable',
      'Não foi possível validar a publicação do agente.',
      503,
    );
  }
  if (result.data !== true) return reject('agent_ingest_replay', 409);
}

