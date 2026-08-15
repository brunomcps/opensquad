import { authorizeMember } from '../_shared/auth.ts';
import { edgeRepository, serviceClient } from '../_shared/client.ts';
import { errorResponse, json, preflight } from '../_shared/http.ts';
import { getDataQualityReport } from '../_shared/quality.ts';

Deno.serve(async request => {
  const options = preflight(request);
  if (options) return options;
  if (request.method !== 'GET') return json(request, { ok: false, error: { code: 'method_not_allowed', message: 'Método não permitido.' } }, 405);
  try {
    const client = serviceClient();
    const member = await authorizeMember(request, client, 'viewer');
    const quality = await getDataQualityReport({
      repository: edgeRepository(),
      hotmartWebhookConfigured: Boolean(Deno.env.get('HOTMART_HOTTOK')),
      buyerHmacConfigured: Boolean(Deno.env.get('CI_BUYER_HMAC_SECRET')),
    });
    return json(request, { ok: true, quality, member: { role: member.role } });
  } catch (error) {
    return errorResponse(request, error);
  }
});
