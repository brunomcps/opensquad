import { buildDestinationUrl, classifyDevice, classifyTraffic, referrerHost, type TrafficClassificationResult } from '../_shared/campaigns.ts';
import { claimClickIngestNonce, verifyClickIngestRequest } from '../_shared/clickIngest.ts';
import { serviceClient } from '../_shared/client.ts';
import { CommercialIntelligenceError } from '../_shared/errors.ts';
import { errorResponse, json, preflight } from '../_shared/http.ts';

function validFingerprint(value: string | null): string | null {
  const normalized = value?.trim().toLowerCase() || '';
  return /^[a-f0-9]{64}$/.test(normalized) ? normalized : null;
}

// Cabeçalhos que ajudam a entender por que um clique ficou "unknown"
// (navegador de verdade sem sec-fetch? webview do app do YouTube?). Guardados
// 30 dias em ci_click_signals, só pros unknown, nunca com o endereço de quem clicou.
const SIGNAL_HEADERS = [
  'user-agent', 'accept', 'accept-language', 'sec-fetch-mode', 'sec-fetch-dest', 'sec-fetch-site', 'sec-fetch-user',
  'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform', 'upgrade-insecure-requests', 'x-requested-with',
] as const;

function collectSignals(request: Request): Record<string, string> {
  const signals: Record<string, string> = {};
  for (const name of SIGNAL_HEADERS) {
    const value = request.headers.get(name);
    if (value) signals[name] = value.slice(0, 300);
  }
  return signals;
}

function persistUnknownClickSignals(client: any, request: Request, clickId: number) {
  const task = client.from('ci_click_signals')
    .insert({ click_id: clickId, signals: collectSignals(request) })
    .then((result: { error: unknown }) => {
      if (result.error) console.warn(JSON.stringify({ event: 'click_signals_not_persisted', clickId }));
    })
    .catch(() => undefined);
  // Não atrasa o redirecionamento: o runtime termina a gravação depois da resposta.
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void } }).EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(task);
  return task;
}

async function recordOperationalFailure(client: any, campaignId: string, code: string | null) {
  const operational = await client.from('ci_operational_events').insert({
    event_type: 'click_persistence_failed',
    severity: 'error',
    details: { campaign_id: campaignId, error_code: code || 'unknown' },
  });
  if (operational.error) {
    console.error(JSON.stringify({ event: 'click_persistence_failed', campaignId, operationalEventPersisted: false }));
  }
}

Deno.serve(async request => {
  const options = preflight(request);
  if (options) return options;
  if (request.method !== 'GET' && request.method !== 'HEAD') return json(request, { ok: false, error: { code: 'method_not_allowed', message: 'Método não permitido.' } }, 405);
  try {
    const requestUrl = new URL(request.url);
    const slug = requestUrl.searchParams.get('slug')?.trim();
    if (!slug || !/^[a-z0-9-]{6,48}$/.test(slug)) {
      return json(request, { ok: false, error: { code: 'campaign_not_found', message: 'Link indisponível.' } }, 404);
    }
    if (requestUrl.searchParams.has('ci_test')) {
      throw new CommercialIntelligenceError('click_ingest_unauthorized', 'Origem do clique não autorizada.', 401);
    }
    const ciTest = false;
    const ingestClaim = await verifyClickIngestRequest(
      request,
      Deno.env.get('CLICK_INGEST_SECRET'),
      slug,
      ciTest,
    );
    const client = serviceClient();
    await claimClickIngestNonce(client, ingestClaim);
    const result = await client.from('ci_campaigns').select('*')
      .eq('slug', slug).eq('status', 'active').lte('starts_at', new Date().toISOString()).maybeSingle();
    if (result.error || !result.data) {
      return json(request, { ok: false, error: { code: 'campaign_not_found', message: 'Link indisponível.' } }, 404);
    }
    const destination = buildDestinationUrl(result.data);
    const userAgent = request.headers.get('user-agent');
    const fingerprintHash = request.method === 'GET'
      ? validFingerprint(request.headers.get('x-ci-fingerprint'))
      : null;
    if (request.method === 'GET' && !fingerprintHash) {
      throw new CommercialIntelligenceError(
        'click_fingerprint_missing',
        'Não foi possível validar o clique.',
        401,
      );
    }
    if (request.method === 'GET') {
      try {
        const traffic: TrafficClassificationResult = classifyTraffic({
          userAgent,
          accept: request.headers.get('accept'),
          secFetchMode: request.headers.get('sec-fetch-mode'),
          secFetchDest: request.headers.get('sec-fetch-dest'),
          technical: ciTest,
        });
        const click = await client.rpc('ci_record_campaign_click', {
          p_campaign_id: result.data.campaign_id,
          p_referrer_host: referrerHost(request.headers.get('referer')),
          p_device_type: classifyDevice(userAgent),
          p_is_bot: traffic.isBot,
          p_traffic_classification: traffic.classification,
          p_exclusion_reason: traffic.exclusionReason,
          p_fingerprint_hash: fingerprintHash,
        });
        if (click.error || !Array.isArray(click.data) || click.data.length !== 1) {
          await recordOperationalFailure(
            client,
            result.data.campaign_id,
            click.error?.code || 'empty_click_rpc_result',
          );
        } else if (click.data[0]?.recorded_traffic_classification === 'unknown' && click.data[0]?.recorded_click_id) {
          persistUnknownClickSignals(client, request, Number(click.data[0].recorded_click_id));
        }
      } catch (cause) {
        await recordOperationalFailure(client, result.data.campaign_id, cause instanceof Error ? cause.name : null).catch(() => undefined);
      }
    }
    return new Response(null, {
      status: 302,
      headers: { location: destination, 'cache-control': 'no-store, max-age=0' },
    });
  } catch (error) {
    return errorResponse(request, error);
  }
});
