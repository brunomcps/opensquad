import { Router } from 'express';
import { commercialIntelligenceRepository } from '../db/commercialIntelligence.js';
import {
  CommercialIntelligenceError,
  type CommercialIntelligenceRepository,
} from '../services/commercial-intelligence/contracts.js';
import { getDataQualityReport } from '../services/commercial-intelligence/dataQuality.js';
import { reconcileHotmart } from '../services/commercial-intelligence/hotmartReconcile.js';
import { processHotmartWebhook } from '../services/commercial-intelligence/hotmartWebhook.js';
import { syncYoutubeDaily } from '../services/commercial-intelligence/youtubeDaily.js';

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function sendError(res: any, error: unknown): void {
  const known = error instanceof CommercialIntelligenceError
    ? error
    : new CommercialIntelligenceError(
        'commercial_intelligence_error',
        'Falha na Inteligência Comercial.',
        500,
      );
  console.error(`[commercial-intelligence] ${known.code}`);
  res.status(known.statusCode).json({
    ok: false,
    error: { code: known.code, message: known.message },
  });
}

export function createCommercialIntelligenceRouter(
  repository: CommercialIntelligenceRepository = commercialIntelligenceRepository,
): Router {
  const router = Router();

  router.post('/hotmart/webhook', async (req, res) => {
    try {
      const result = await processHotmartWebhook({
        payload: req.body,
        receivedSecret: req.get('X-HOTMART-HOTTOK') || undefined,
        configuredSecret: process.env.HOTMART_HOTTOK,
        buyerHmacSecret: process.env.CI_BUYER_HMAC_SECRET,
        repository,
      });
      res.status(200).json({ ok: true, ...result });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/data-quality', async (_req, res) => {
    try {
      const quality = await getDataQualityReport({
        repository,
        hotmartWebhookConfigured: Boolean(process.env.HOTMART_HOTTOK),
        buyerHmacConfigured: Boolean(process.env.CI_BUYER_HMAC_SECRET),
      });
      res.json({ ok: true, quality });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/sync/hotmart', async (req, res) => {
    try {
      const result = await reconcileHotmart({
        repository,
        startDate: optionalString(req.body?.startDate),
        endDate: optionalString(req.body?.endDate),
        buyerHmacSecret: process.env.CI_BUYER_HMAC_SECRET,
      });
      res.json({ ok: true, result });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/sync/youtube', async (req, res) => {
    try {
      const result = await syncYoutubeDaily({
        repository,
        startDate: optionalString(req.body?.startDate),
        endDate: optionalString(req.body?.endDate),
      });
      res.json({ ok: true, result });
    } catch (error) {
      sendError(res, error);
    }
  });

  return router;
}

export default createCommercialIntelligenceRouter();
