import { edgeRepository } from '../_shared/client.ts';
import { errorResponse, json, preflight, readJson } from '../_shared/http.ts';
import { processHotmartWebhook } from '../_shared/hotmart.ts';

Deno.serve(async request => {
  const options = preflight(request);
  if (options) return options;
  if (request.method !== 'POST') return json(request, { ok: false, error: { code: 'method_not_allowed', message: 'Método não permitido.' } }, 405);
  try {
    const result = await processHotmartWebhook({
      payload: await readJson(request),
      receivedSecret: request.headers.get('x-hotmart-hottok') || undefined,
      configuredSecret: Deno.env.get('HOTMART_HOTTOK'),
      buyerHmacSecret: Deno.env.get('CI_BUYER_HMAC_SECRET'),
      repository: edgeRepository(),
    });
    return json(request, { ok: true, ...result });
  } catch (error) {
    return errorResponse(request, error);
  }
});
