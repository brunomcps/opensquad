import { CommercialIntelligenceError, safeError } from './errors.ts';
import { resolveAllowedOrigin } from './cors.ts';

export function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('origin');
  const allowOrigin = resolveAllowedOrigin(origin, Deno.env.get('CI_ALLOWED_ORIGINS'));
  return {
    ...(allowOrigin ? { 'access-control-allow-origin': allowOrigin, vary: 'Origin' } : {}),
    'access-control-allow-headers': 'authorization, content-type, x-ci-cron-secret, x-hotmart-hottok',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'content-type': 'application/json; charset=utf-8',
  };
}

export function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(request) });
}

export function preflight(request: Request): Response | null {
  if (request.method !== 'OPTIONS') return null;
  if (request.headers.has('origin') && !resolveAllowedOrigin(request.headers.get('origin'), Deno.env.get('CI_ALLOWED_ORIGINS'))) {
    return new Response(null, { status: 403, headers: { 'content-type': 'application/json; charset=utf-8' } });
  }
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function errorResponse(request: Request, error: unknown): Response {
  const known = safeError(error);
  console.error(`[commercial-intelligence] ${known.code}`);
  return json(request, {
    ok: false,
    error: { code: known.code, message: known.message },
  }, known.statusCode);
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (!request.body) return {};
  try {
    const body = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {};
  } catch {
    throw new CommercialIntelligenceError('invalid_json', 'Corpo JSON inválido.', 400);
  }
}
