import { commercialIntelligenceRepository } from '../../db/commercialIntelligence.js';
import { reconcileHotmart } from '../../services/commercial-intelligence/hotmartReconcile.js';
import { syncYoutubeDaily } from '../../services/commercial-intelligence/youtubeDaily.js';

async function main(): Promise<void> {
  if (!commercialIntelligenceRepository.configured) {
    throw new Error('Commercial Intelligence repository is not configured');
  }

  const onlyHotmart = process.argv.includes('--hotmart');
  const onlyYoutube = process.argv.includes('--youtube');
  const runHotmart = onlyHotmart || !onlyYoutube;
  const runYoutube = onlyYoutube || !onlyHotmart;
  const result: Record<string, unknown> = {};

  if (runHotmart) {
    result.hotmart = await reconcileHotmart({
      repository: commercialIntelligenceRepository,
      buyerHmacSecret: process.env.CI_BUYER_HMAC_SECRET,
    });
  }

  if (runYoutube) {
    result.youtube = await syncYoutubeDaily({
      repository: commercialIntelligenceRepository,
    });
  }

  console.log(JSON.stringify({ ok: true, result }));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown synchronization failure';
  const cause = error instanceof Error && error.cause instanceof Error
    ? error.cause.message
    : undefined;
  console.error(JSON.stringify({ ok: false, error: message, cause }));
  process.exitCode = 1;
});
