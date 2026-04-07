/**
 * Telegram bot routes — daily message + callback processing + Diario Inteligente.
 *
 * POST /api/telegram/send-daily  — trigger daily message (called by cron)
 * POST /api/telegram/poll        — process button callbacks
 * POST /api/telegram/webhook     — Telegram webhook (callbacks + messages)
 * GET  /api/telegram/status      — health check (includes listener status)
 */

import { Router } from 'express';
import { sendDaily, processCallbacks } from '../services/chefeBruno.js';
import { answerCallbackQuery, sendMessage } from '../services/telegram.js';
import { updateTarefaStatus, updateTarefaDue, updateProductionField, saveTelegramHistory } from '../db/bot.js';
import { supabase } from '../db/client.js';
import { bufferMessage } from '../services/messageBuffer.js';
import { getListenerStatus } from '../services/wsServer.js';

const router = Router();

// Shared secret for cron/external triggers
const SYNC_SECRET = process.env.SYNC_PUSH_SECRET || '';

function checkSecret(req: any, res: any): boolean {
  if (!SYNC_SECRET) return true; // no secret configured = allow all
  const auth = req.headers.authorization;
  if (auth === `Bearer ${SYNC_SECRET}`) return true;
  // Also check x-sync-secret header (used by Make.com cron)
  if (req.headers['x-sync-secret'] === SYNC_SECRET) return true;
  // Also check query param
  if (req.query.secret === SYNC_SECRET) return true;
  res.status(401).json({ ok: false, error: 'unauthorized' });
  return false;
}

// ============================
// SEND DAILY MESSAGE
// ============================

router.post('/send-daily', async (req, res) => {
  if (!checkSecret(req, res)) return;
  try {
    const result = await sendDaily();
    res.json(result);
  } catch (err: any) {
    console.error('[Telegram] send-daily error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================
// POLL CALLBACKS
// ============================

router.post('/poll', async (req, res) => {
  if (!checkSecret(req, res)) return;
  try {
    const processed = await processCallbacks();
    res.json({ ok: true, processed });
  } catch (err: any) {
    console.error('[Telegram] poll error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================
// TELEGRAM WEBHOOK (for button callbacks)
// ============================

router.post('/webhook', async (req, res) => {
  // Telegram sends updates directly — no auth needed (verified by webhook URL secrecy)
  try {
    const update = req.body;
    if (!update) return res.json({ ok: true });

    // === INCOMING MESSAGES (text, voice, photo) → Diario Inteligente ===
    const msg = update.message;
    if (msg) {
      const chatId = msg.chat?.id;
      const expectedChat = process.env.TELEGRAM_CHAT_ID;

      // Only process messages from Bruno's chat
      if (chatId && (!expectedChat || String(chatId) === expectedChat)) {
        if (msg.text && !msg.text.startsWith('/')) {
          // Text message (ignore commands like /start)
          bufferMessage(chatId, {
            type: 'text',
            text: msg.text,
            timestamp: new Date(msg.date * 1000).toISOString(),
          });
          saveTelegramHistory({
            source: 'listener',
            user_message: msg.text,
          }).catch(() => {});
        } else if (msg.voice) {
          // Voice message → Phase 3 will add Groq Whisper
          bufferMessage(chatId, {
            type: 'voice',
            fileId: msg.voice.file_id,
            timestamp: new Date(msg.date * 1000).toISOString(),
          });
        } else if (msg.photo) {
          // Photo → send largest version
          const photo = msg.photo[msg.photo.length - 1];
          bufferMessage(chatId, {
            type: 'photo',
            fileId: photo.file_id,
            caption: msg.caption,
            timestamp: new Date(msg.date * 1000).toISOString(),
          });
        }
      }
      return res.json({ ok: true });
    }

    // === CALLBACK QUERIES (button presses from daily message) ===
    const cb = update.callback_query;
    if (!cb) return res.json({ ok: true });

    const data = cb.data || '';

    // === TAREFAS (prefix T:) ===
    if (data.startsWith('T:')) {
      const [, action, slug] = data.split(':', 3);
      if (!slug) return res.json({ ok: true });

      const { data: tarefaData } = await supabase.from('tarefas').select('title').eq('slug', slug).limit(1);
      if (!tarefaData?.length) {
        await answerCallbackQuery(cb.id, '❌ Tarefa não encontrada');
        return res.json({ ok: true });
      }
      const title = tarefaData[0].title;

      let responseText = '';
      if (action === 'd') {
        await updateTarefaStatus(slug, 'concluido');
        await answerCallbackQuery(cb.id, '✅ Tarefa concluída!');
        responseText = `✅ ${title.slice(0, 40)} concluída!`;
        await sendMessage(`✅ <b>${title.slice(0, 40)}</b> concluída!`);
      } else if (action === 'r') {
        const now = new Date();
        const brt = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) - 3 * 3600000);
        const newDate = new Date(brt.getTime() + 2 * 86400000);
        const newDateStr = newDate.toISOString().slice(0, 10);
        const formatted = `${String(newDate.getDate()).padStart(2, '0')}/${String(newDate.getMonth() + 1).padStart(2, '0')}`;
        await updateTarefaDue(slug, newDateStr);
        await answerCallbackQuery(cb.id, `📅 Reagendada pra ${formatted}`);
        responseText = `📅 ${title.slice(0, 35)} → ${formatted}`;
        await sendMessage(`📅 <b>${title.slice(0, 35)}</b> → ${formatted}.\nMas não vira hábito.`);
      } else if (action === 'x') {
        await updateTarefaStatus(slug, 'arquivado');
        await answerCallbackQuery(cb.id, '🗑️ Tarefa descartada');
        responseText = `🗑️ ${title.slice(0, 40)} descartada.`;
        await sendMessage(`🗑️ <b>${title.slice(0, 40)}</b> descartada. Menos peso.`);
      }
      if (responseText) saveTelegramHistory({ source: 'railway', callback_data: data, assistant_response: responseText }).catch(() => {});
      return res.json({ ok: true });
    }

    // === VIDEOS (format action:slug:fc) ===
    const FIELD_CODE: Record<string, string> = { g: 'gravacao', e: 'edicao', p: 'publicacao', t: 'thumbnail_img' };
    const FIELD_INFO: Record<string, { emoji: string; verb: string }> = {
      gravacao: { emoji: '🎙️', verb: 'Gravar' },
      edicao: { emoji: '🎬', verb: 'Editar' },
      publicacao: { emoji: '📤', verb: 'Publicar' },
      thumbnail_img: { emoji: '🖼️', verb: 'Thumbnail' },
    };

    const parts = data.split(':');
    if (parts.length !== 3) return res.json({ ok: true });
    const [action, slug, fc] = parts;
    const field = FIELD_CODE[fc];
    if (!field) return res.json({ ok: true });

    const { data: prodData } = await supabase.from('productions').select('title').eq('slug', slug).limit(1);
    if (!prodData?.length) {
      await answerCallbackQuery(cb.id, '❌ Arquivo não encontrado');
      return res.json({ ok: true });
    }
    const fi = FIELD_INFO[field] || { emoji: '❓', verb: field };

    let vidResponse = '';
    if (action === 'd') {
      const now = new Date();
      const brt = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) - 3 * 3600000);
      await updateProductionField(slug, field, `✅ ${brt.toISOString().slice(0, 10)}`);
      await answerCallbackQuery(cb.id, `✅ ${fi.verb} concluído!`);
      vidResponse = `✅ ${fi.verb} de ${prodData[0].title.slice(0, 35)} concluído!`;
      await sendMessage(`✅ <b>${fi.verb}</b> de <b>${prodData[0].title.slice(0, 35)}</b> concluído!`);
    } else if (action === 'r') {
      const now = new Date();
      const brt = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) - 3 * 3600000);
      const newDate = new Date(brt.getTime() + 2 * 86400000);
      const newDateStr = newDate.toISOString().slice(0, 10);
      const formatted = `${String(newDate.getDate()).padStart(2, '0')}/${String(newDate.getMonth() + 1).padStart(2, '0')}`;
      await updateProductionField(slug, field, `📅 ${newDateStr}`);
      await answerCallbackQuery(cb.id, `📅 Reagendado pra ${formatted}`);
      vidResponse = `📅 ${fi.verb} de ${prodData[0].title.slice(0, 30)} → ${formatted}`;
      await sendMessage(`📅 ${fi.emoji} ${fi.verb} de <b>${prodData[0].title.slice(0, 30)}</b> → ${formatted}`);
    }
    if (vidResponse) saveTelegramHistory({ source: 'railway', callback_data: data, assistant_response: vidResponse }).catch(() => {});

    res.json({ ok: true });
  } catch (err: any) {
    console.error('[Telegram] webhook error:', err.message);
    res.json({ ok: true }); // Always 200 for Telegram
  }
});

// ============================
// STATUS
// ============================

router.get('/status', (_req, res) => {
  res.json({
    ok: true,
    bot: 'Chefe Bruno / Diario Inteligente V3',
    timestamp: new Date().toISOString(),
    hasToken: !!process.env.TELEGRAM_BOT_TOKEN,
    hasChatId: !!process.env.TELEGRAM_CHAT_ID,
    listener: getListenerStatus(),
  });
});

export default router;
