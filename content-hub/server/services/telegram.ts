/**
 * Telegram Bot API wrapper.
 * Thin layer for sending messages, answering callbacks, and polling updates.
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

if (!BOT_TOKEN) console.warn('[Telegram] TELEGRAM_BOT_TOKEN not set');
if (!CHAT_ID) console.warn('[Telegram] TELEGRAM_CHAT_ID not set');

interface TelegramResponse {
  ok: boolean;
  result?: any;
  description?: string;
}

async function callApi(method: string, payload?: Record<string, any>): Promise<TelegramResponse> {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: payload ? JSON.stringify(payload) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  return res.json() as Promise<TelegramResponse>;
}

export async function sendMessage(
  text: string,
  keyboard?: { inline_keyboard: any[][] } | null,
): Promise<TelegramResponse> {
  const data: Record<string, any> = {
    chat_id: CHAT_ID,
    text,
    parse_mode: 'HTML',
  };
  if (keyboard) data.reply_markup = keyboard;
  return callApi('sendMessage', data);
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text: string,
): Promise<TelegramResponse> {
  return callApi('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
  });
}

export async function getUpdates(
  offset: number,
  timeout = 5,
): Promise<TelegramResponse> {
  return callApi('getUpdates', {
    offset,
    allowed_updates: ['callback_query'],
    timeout,
  });
}
