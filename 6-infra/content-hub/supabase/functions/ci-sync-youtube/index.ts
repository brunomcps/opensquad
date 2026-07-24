import { authorizeAdminOrCron } from '../_shared/auth.ts';
import { edgeRepository, serviceClient } from '../_shared/client.ts';
import { CommercialIntelligenceError } from '../_shared/errors.ts';
import { errorResponse, json, preflight, readJson } from '../_shared/http.ts';
import { syncYoutubeDaily } from '../_shared/youtube.ts';

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
    locked = await repository.acquireLock('youtube', ownerId);
    if (!locked) throw new CommercialIntelligenceError('sync_in_progress', 'Já existe uma sincronização YouTube em andamento.', 409);
    const result = await syncYoutubeDaily({
      repository,
      startDate: typeof body.startDate === 'string' ? body.startDate : undefined,
      endDate: typeof body.endDate === 'string' ? body.endDate : undefined,
    });
    return json(request, { ok: true, result, durationMs: Math.round(performance.now() - startedAt) });
  } catch (error) {
    return errorResponse(request, error);
  } finally {
    if (locked) await repository.releaseLock('youtube', ownerId).catch(() => undefined);
  }
});
