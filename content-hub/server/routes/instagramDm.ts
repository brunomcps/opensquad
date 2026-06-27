import { Router } from 'express';
import {
  fetchLiveConversationMessages,
  fetchLiveConversations,
  getInstagramDmStatus,
  getLocalConversations,
  getLocalMessages,
  ingestWebhookPayload,
  sendInstagramDm,
  verifyMetaSignature,
  verifyWebhook,
} from '../services/instagramDm.js';

const router = Router();

router.get('/status', (_req, res) => {
  res.json({ ok: true, ...getInstagramDmStatus() });
});

router.get('/webhook', (req, res) => {
  const challenge = verifyWebhook(req.query['hub.mode'], req.query['hub.verify_token'], req.query['hub.challenge']);
  if (challenge === null) return res.status(403).send('Forbidden');
  return res.status(200).send(challenge);
});

router.post('/webhook', (req: any, res) => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    if (!verifyMetaSignature(req.rawBody, signature)) {
      return res.status(403).json({ ok: false, error: 'invalid signature' });
    }

    const result = ingestWebhookPayload(req.body);
    res.json({ ok: true, eventId: result.eventId, messageCount: result.messages.length });
  } catch (err: any) {
    console.error('[InstagramDM] webhook error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/conversations', (_req, res) => {
  res.json({ ok: true, conversations: getLocalConversations() });
});

router.get('/messages', (req, res) => {
  const conversationKey = typeof req.query.conversationKey === 'string' ? req.query.conversationKey : undefined;
  res.json({ ok: true, messages: getLocalMessages(conversationKey) });
});

router.get('/live/conversations', async (req, res) => {
  try {
    const limit = Number(req.query.limit || 25);
    const data = await fetchLiveConversations(limit);
    res.json({ ok: true, data });
  } catch (err: any) {
    console.error('[InstagramDM] live conversations error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/live/conversations/:conversationId/messages', async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const data = await fetchLiveConversationMessages(req.params.conversationId, limit);
    res.json({ ok: true, data });
  } catch (err: any) {
    console.error('[InstagramDM] live messages error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/messages', async (req, res) => {
  try {
    const { recipientId, text } = req.body || {};
    const result = await sendInstagramDm(String(recipientId || ''), String(text || ''));
    res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error('[InstagramDM] send error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
