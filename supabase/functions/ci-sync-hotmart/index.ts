import { authorizeAdminOrCron } from '../_shared/auth.ts';
import { edgeRepository, serviceClient } from '../_shared/client.ts';
import { CommercialIntelligenceError } from '../_shared/errors.ts';
import { reconcileHotmart } from '../_shared/hotmart.ts';
import { errorResponse, json, preflight, readJson } from '../_shared/http.ts';

Deno.serve(async request => {
  const options = preflight(request);
  if (options) return options;
  if (request.method !== 'POST') return json(request, { ok: false, error: { code: 'method_not_allowed', message: 'Método não permitido.' } }, 405);
  const repository = edgeRepository();
  const ownerId = crypto.randomUUID();
  let locked = false;
  const startedAt = performance.now();
  try {
    await authorizeAdminOrCron(request, serviceClient(), Deno.env.get('CI_CRON_SECRET'));
    const body = await readJson(request);
    locked = await repository.acquireLock('hotmart_reconciliation', ownerId);
    if (!locked) throw new CommercialIntelligenceError('sync_in_progress', 'Já existe uma reconciliação Hotmart em andamento.', 409);
    const result = await reconcileHotmart({
      repository,
      startDate: typeof body.startDate === 'string' ? body.startDate : undefined,
      endDate: typeof body.endDate === 'string' ? body.endDate : undefined,
      buyerHmacSecret: Deno.env.get('CI_BUYER_HMAC_SECRET'),
    });
    return json(request, { ok: true, result, durationMs: Math.round(performance.now() - startedAt) });
  } catch (error) {
    return errorResponse(request, error);
  } finally {
    if (locked) await repository.releaseLock('hotmart_reconciliation', ownerId).catch(() => undefined);
  }
});
