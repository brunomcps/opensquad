import { authorizeAdminOrCron } from '../_shared/auth.ts';
import { serviceClient } from '../_shared/client.ts';
import { CommercialIntelligenceError } from '../_shared/errors.ts';
import { errorResponse, json, preflight, readJson } from '../_shared/http.ts';

// Teste horário do link curto (etapa 4 da faxina, 18/09/2026). Faz um HEAD no
// link público (HEAD não conta clique), espera 302 pra Hotmart com o código de
// rastreio, grava em ci_redirect_checks e abre/fecha o incidente em
// ci_operational_events. A luz "Redirecionador" da tela lê daqui.
const PUBLIC_LINK_BASE = 'https://link.brunosallesphd.com.br/m7p/';
const TIMEOUT_MS = 10_000;

interface CheckOutcome {
  slug: string;
  ok: boolean;
  httpStatus: number | null;
  latencyMs: number;
  fallback: boolean;
  detail: string | null;
  location: string | null;
}

export function evaluateRedirectResponse(input: {
  status: number;
  location: string | null;
  fallbackHeader: string | null;
  trackingCode: string;
}): { ok: boolean; fallback: boolean; detail: string | null } {
  const fallback = input.fallbackHeader !== null;
  let decoded = input.location || '';
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // fica com o valor cru
  }
  if (input.status !== 302) return { ok: false, fallback, detail: `respondeu ${input.status} em vez de 302` };
  if (!decoded.includes('go.hotmart.com')) return { ok: false, fallback, detail: 'o destino não é a Hotmart' };
  if (fallback) {
    return { ok: false, fallback, detail: `plano B ativo (${input.fallbackHeader}): o link manda pra Hotmart, mas sem contar clique` };
  }
  if (!decoded.includes(input.trackingCode)) return { ok: false, fallback, detail: 'o destino chegou sem o código de rastreio' };
  return { ok: true, fallback, detail: null };
}

async function probe(slug: string, trackingCode: string): Promise<CheckOutcome> {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${PUBLIC_LINK_BASE}${slug}`, {
      method: 'HEAD',
      redirect: 'manual',
      signal: controller.signal,
      headers: { 'user-agent': 'ci-redirect-check/1 (painel Inteligencia Comercial)' },
    });
    const location = response.headers.get('location');
    const verdict = evaluateRedirectResponse({
      status: response.status,
      location,
      fallbackHeader: response.headers.get('x-ci-fallback'),
      trackingCode,
    });
    return {
      slug,
      ok: verdict.ok,
      httpStatus: response.status,
      latencyMs: Math.round(performance.now() - started),
      fallback: verdict.fallback,
      detail: verdict.detail,
      location,
    };
  } catch (cause) {
    const aborted = cause instanceof Error && cause.name === 'AbortError';
    return {
      slug,
      ok: false,
      httpStatus: null,
      latencyMs: Math.round(performance.now() - started),
      fallback: false,
      detail: aborted ? `sem resposta em ${TIMEOUT_MS / 1000} s` : (cause instanceof Error ? cause.message : 'falha desconhecida'),
      location: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async request => {
  const options = preflight(request);
  if (options) return options;
  if (request.method !== 'POST') return json(request, { ok: false, error: { code: 'method_not_allowed', message: 'Método não permitido.' } }, 405);
  try {
    const client = serviceClient();
    await authorizeAdminOrCron(request, client, Deno.env.get('CI_CRON_SECRET'));
    const body = await readJson(request);
    const requestedSlug = typeof body.slug === 'string' && /^[a-z0-9-]{6,48}$/.test(body.slug) ? body.slug : null;
    // Teste manual (botão "Testar" na tela): só responde, não grava nem mexe
    // no incidente; a luz do redirecionador é do teste horário.
    const manual = body.manual === true;

    let query = client.from('ci_campaigns').select('slug,tracking_code').eq('status', 'active');
    query = requestedSlug ? query.eq('slug', requestedSlug) : query.eq('channel', 'youtube').order('starts_at', { ascending: false });
    const campaign = await query.limit(1).maybeSingle();
    if (campaign.error) throw new CommercialIntelligenceError('database_error', 'Não foi possível escolher o link de teste.', 500);
    if (!campaign.data) throw new CommercialIntelligenceError('campaign_not_found', 'Nenhum link ativo pra testar.', 404);

    const outcome = await probe(String(campaign.data.slug), String(campaign.data.tracking_code));
    if (manual) return json(request, { ok: true, check: outcome, manual: true });

    const saved = await client.from('ci_redirect_checks').insert({
      slug: outcome.slug,
      ok: outcome.ok,
      http_status: outcome.httpStatus,
      latency_ms: outcome.latencyMs,
      fallback: outcome.fallback,
      detail: outcome.detail,
    });
    if (saved.error) throw new CommercialIntelligenceError('database_error', 'Não foi possível gravar o teste.', 500);

    if (outcome.ok) {
      await client.from('ci_operational_events')
        .update({ resolved_at: new Date().toISOString() })
        .eq('event_type', 'redirect_check_failed')
        .is('resolved_at', null);
    } else {
      // Um incidente aberto por vez: se já existe, não empilha.
      const open = await client.from('ci_operational_events').select('event_id')
        .eq('event_type', 'redirect_check_failed').is('resolved_at', null).limit(1).maybeSingle();
      if (!open.data) {
        await client.from('ci_operational_events').insert({
          event_type: 'redirect_check_failed',
          severity: outcome.fallback ? 'warning' : 'error',
          details: {
            slug: outcome.slug,
            http_status: outcome.httpStatus,
            latency_ms: outcome.latencyMs,
            fallback: outcome.fallback,
            detail: outcome.detail,
          },
        });
      }
    }

    return json(request, { ok: true, check: outcome });
  } catch (error) {
    return errorResponse(request, error);
  }
});
