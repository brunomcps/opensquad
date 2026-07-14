export interface WorkerEnv {
  SUPABASE_REDIRECT_URL: string;
}

const PUBLIC_PATH = /^\/m7p\/([a-z0-9-]{6,48})$/;
const FORWARDED_HEADERS = ['user-agent', 'referer'] as const;

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

  let upstreamUrl: URL;
  try {
    upstreamUrl = new URL(env.SUPABASE_REDIRECT_URL);
  } catch {
    return unavailable(request.method, 502);
  }
  upstreamUrl.searchParams.set('slug', slug);

  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

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
