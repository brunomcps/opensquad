import { CommercialIntelligenceError } from './errors.ts';
import { hmacSha256, secureEqual } from './crypto.ts';

export const CLICK_INGEST_MAX_CLOCK_SKEW_MS = 60_000;

export interface ClickIngestClaim {
  nonce: string;
  issuedAt: string;
}

export function canonicalClickIngestPayload(
  timestamp: string,
  nonce: string,
  slug: string,
  ciTest: boolean,
): string {
  return `${timestamp}\n${nonce}\n${slug}\n${ciTest ? '1' : '0'}`;
}

function reject(code = 'click_ingest_unauthorized', statusCode = 401): never {
  throw new CommercialIntelligenceError(code, 'Origem do clique não autorizada.', statusCode);
}

function strongSecret(secret: string | undefined): secret is string {
  return Boolean(secret && new TextEncoder().encode(secret).length >= 32);
}

export async function verifyClickIngestRequest(
  request: Request,
  secret: string | undefined,
  slug: string,
  ciTest: boolean,
  nowMs = Date.now(),
): Promise<ClickIngestClaim> {
  if (!strongSecret(secret)) {
    throw new CommercialIntelligenceError(
      'click_ingest_not_configured',
      'Ingestão de cliques não configurada.',
      503,
    );
  }

  const timestamp = request.headers.get('x-ci-ingest-timestamp')?.trim() || '';
  const nonce = request.headers.get('x-ci-ingest-nonce')?.trim().toLowerCase() || '';
  const signature = request.headers.get('x-ci-ingest-signature')?.trim().toLowerCase() || '';

  if (!/^\d{13}$/.test(timestamp) || !/^[a-f0-9]{32}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(signature)) {
    return reject();
  }

  const timestampMs = Number(timestamp);
  if (!Number.isSafeInteger(timestampMs) || Math.abs(nowMs - timestampMs) > CLICK_INGEST_MAX_CLOCK_SKEW_MS) {
    return reject('click_ingest_expired', 401);
  }

  const expected = await hmacSha256(secret, canonicalClickIngestPayload(timestamp, nonce, slug, ciTest));
  if (!secureEqual(expected, signature)) return reject();

  return { nonce, issuedAt: new Date(timestampMs).toISOString() };
}

export async function claimClickIngestNonce(client: any, claim: ClickIngestClaim): Promise<void> {
  const result = await client.rpc('ci_claim_click_ingest_nonce', {
    p_nonce: claim.nonce,
    p_issued_at: claim.issuedAt,
  });
  if (result.error) {
    throw new CommercialIntelligenceError(
      'click_ingest_nonce_unavailable',
      'Não foi possível validar a origem do clique.',
      503,
    );
  }
  if (result.data !== true) return reject('click_ingest_replay', 409);
}
