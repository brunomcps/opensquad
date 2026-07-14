import { buildDestinationUrl, classifyDevice, probableBot, referrerHost } from '../_shared/campaigns.ts';
import { serviceClient } from '../_shared/client.ts';
import { errorResponse, json, preflight } from '../_shared/http.ts';

Deno.serve(async request => {
  const options = preflight(request);
  if (options) return options;
  if (request.method !== 'GET' && request.method !== 'HEAD') return json(request, { ok: false, error: { code: 'method_not_allowed', message: 'Método não permitido.' } }, 405);
  try {
    const slug = new URL(request.url).searchParams.get('slug')?.trim();
    if (!slug || !/^[a-z0-9-]{6,48}$/.test(slug)) {
      return json(request, { ok: false, error: { code: 'campaign_not_found', message: 'Link indisponível.' } }, 404);
    }
    const client = serviceClient();
    const result = await client.from('ci_campaigns').select('*')
      .eq('slug', slug).eq('status', 'active').lte('starts_at', new Date().toISOString()).maybeSingle();
    if (result.error || !result.data) {
      return json(request, { ok: false, error: { code: 'campaign_not_found', message: 'Link indisponível.' } }, 404);
    }
    const destination = buildDestinationUrl(result.data);
    const userAgent = request.headers.get('user-agent');
    if (request.method === 'GET') {
      try {
        const click = await client.from('ci_click_events').insert({
          campaign_id: result.data.campaign_id,
          referrer_host: referrerHost(request.headers.get('referer')),
          device_type: classifyDevice(userAgent),
          is_bot: probableBot(userAgent),
        });
        if (click.error) console.error('[commercial-intelligence] click_persistence_failed');
      } catch {
        console.error('[commercial-intelligence] click_persistence_failed');
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
