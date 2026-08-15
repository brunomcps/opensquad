export interface WorkerEnv {
  SUPABASE_REDIRECT_URL: string;
  CLICK_FINGERPRINT_SECRET: string;
  CLICK_INGEST_SECRET: string;
}

const PUBLIC_PATH = /^\/m7p\/([a-z0-9-]{6,48})$/;
const FORWARDED_HEADERS = ['user-agent', 'referer', 'accept', 'accept-language', 'sec-fetch-mode', 'sec-fetch-dest'] as const;
const encoder = new TextEncoder();

function hasStrongSecret(value: string | undefined): value is string {
  return Boolean(value && encoder.encode(value).length >= 32);
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function canonicalIngestPayload(timestamp: string, nonce: string, slug: string, ciTest: boolean): string {
  return `${timestamp}\n${nonce}\n${slug}\n${ciTest ? '1' : '0'}`;
}

async function hmac(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  return toHex(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

async function fingerprint(request: Request, secret: string, slug: string): Promise<string | null> {
  const ip = request.headers.get('cf-connecting-ip');
  const userAgent = request.headers.get('user-agent');
  if (!ip || !userAgent) return null;
  const dailyScope = new Date().toISOString().slice(0, 10);
  return hmac(secret, `${dailyScope}\n${slug}\n${ip}\n${userAgent}`);
}

function unavailable(method: string, status: 404 | 405 | 502): Response {
  const body = method === 'HEAD' ? null : status === 404 ? 'Link indisponível.' : 'Serviço indisponível.';
  return new Response(body, {
    status,
    headers: {
      'cache-control': 'no-store, max-age=0',
      'content-type': 'text/plain; charset=utf-8',
      'x-content-type-options': 'nosniff',
    },
  });
}

export function extractSlug(requestUrl: string): string | null {
  const match = new URL(requestUrl).pathname.match(PUBLIC_PATH);
  return match?.[1] || null;
}

export async function handleRequest(
  request: Request,
  env: WorkerEnv,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return unavailable(request.method, 405);
  const slug = extractSlug(request.url);
  if (!slug) return unavailable(request.method, 404);
  if (!hasStrongSecret(env.CLICK_INGEST_SECRET)) return unavailable(request.method, 502);
  if (request.method === 'GET' && !hasStrongSecret(env.CLICK_FINGERPRINT_SECRET)) {
    return unavailable(request.method, 502);
  }

  let upstreamUrl: URL;
  try {
    upstreamUrl = new URL(env.SUPABASE_REDIRECT_URL);
  } catch {
    return unavailable(request.method, 502);
  }
  upstreamUrl.searchParams.set('slug', slug);
  // There is deliberately no public `ci_test` switch: otherwise any visitor
  // could force a real click out of the qualified metric.
  const ciTest = false;

  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (request.method === 'GET') {
    const fingerprintHash = await fingerprint(request, env.CLICK_FINGERPRINT_SECRET, slug);
    // A GET without the inputs needed for the one-way fingerprint cannot be
    // counted with integrity. Fail before reaching the ingest endpoint.
    if (!fingerprintHash) return unavailable(request.method, 502);
    headers.set('x-ci-fingerprint', fingerprintHash);
  }

  const timestamp = Date.now().toString();
  const nonce = randomNonce();
  headers.set('x-ci-ingest-timestamp', timestamp);
  headers.set('x-ci-ingest-nonce', nonce);
  headers.set(
    'x-ci-ingest-signature',
    await hmac(env.CLICK_INGEST_SECRET, canonicalIngestPayload(timestamp, nonce, slug, ciTest)),
  );

  let upstream: Response;
  try {
    upstream = await fetcher(upstreamUrl, {
      method: request.method,
      headers,
      redirect: 'manual',
    });
  } catch {
    return unavailable(request.method, 502);
  }

  if (upstream.status === 404) return unavailable(request.method, 404);
  if (upstream.status !== 302) return unavailable(request.method, 502);
  const location = upstream.headers.get('location');
  if (!location) return unavailable(request.method, 502);

  return new Response(null, {
    status: 302,
    headers: {
      location,
      'cache-control': 'no-store, max-age=0',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
    },
  });
}

export default {
  fetch(request: Request, env: WorkerEnv): Promise<Response> {
    return handleRequest(request, env);
  },
};
