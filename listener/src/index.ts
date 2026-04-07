/**
 * Local Listener — runs on Bruno's PC.
 *
 * Connects to Railway via WebSocket. When Railway receives a Telegram
 * message, it forwards here. This listener processes it with Claude CLI
 * (which has full vault access: Read, Write, Glob, Grep, Bash) and
 * sends the response back via WebSocket → Railway → Telegram.
 *
 * Auto-reconnects with exponential backoff when disconnected.
 *
 * Usage:
 *   cd listener && npm install && npm start
 */

import 'dotenv/config';
import WebSocket from 'ws';
import { processWithClaude } from './processor.js';

// --- Config ---

const WS_URL = process.env.RAILWAY_WS_URL || 'wss://hub.brunosallesphd.com.br/ws/listener';
const SECRET = process.env.LISTENER_SECRET || '';

if (!SECRET) {
  console.error('[Listener] LISTENER_SECRET not set. Create a .env file.');
  process.exit(1);
}

// --- Reconnect state ---

let ws: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 30_000; // 30s max
const BASE_RECONNECT_DELAY = 1_000; // 1s initial

// --- Connect ---

function connect(): void {
  const url = `${WS_URL}?secret=${encodeURIComponent(SECRET)}`;
  console.log(`[Listener] Connecting to ${WS_URL}...`);

  ws = new WebSocket(url);

  ws.on('open', () => {
    reconnectAttempts = 0;
    console.log('[Listener] Connected to Railway!');
    ws!.send(JSON.stringify({ type: 'status', status: 'ready' }));
  });

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      // Heartbeat
      if (msg.type === 'ping') {
        ws?.send(JSON.stringify({ type: 'pong' }));
        return;
      }

      // Connection confirmation
      if (msg.type === 'connected') {
        console.log('[Listener] Server confirmed connection');
        return;
      }

      // Message batch from Telegram
      if (msg.type === 'messages' && msg.id) {
        console.log(`[Listener] Received batch ${msg.id}: ${msg.messages?.length || 0} messages`);

        try {
          const response = await processWithClaude(msg);
          ws?.send(JSON.stringify({
            type: 'response',
            id: msg.id,
            text: response,
          }));
          console.log(`[Listener] Sent response for ${msg.id}`);
        } catch (err: any) {
          console.error(`[Listener] Processing error for ${msg.id}:`, err.message);
          ws?.send(JSON.stringify({
            type: 'response',
            id: msg.id,
            text: `⚠️ Erro ao processar: ${err.message.slice(0, 100)}`,
          }));
        }
        return;
      }
    } catch (e: any) {
      console.error('[Listener] Bad message:', e.message);
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`[Listener] Disconnected (code=${code}, reason=${reason.toString()})`);
    ws = null;
    // 4002 = replaced by another listener instance — stop to avoid reconnect loop
    if (code === 4002) {
      console.log('[Listener] Replaced by another instance. Exiting.');
      process.exit(0);
    }
    scheduleReconnect();
  });

  ws.on('error', (err) => {
    console.error('[Listener] WebSocket error:', err.message);
    // close event will fire after error, which triggers reconnect
  });
}

// --- Reconnect with exponential backoff ---

function scheduleReconnect(): void {
  reconnectAttempts++;
  const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1), MAX_RECONNECT_DELAY);
  console.log(`[Listener] Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts})...`);
  setTimeout(connect, delay);
}

// --- Graceful shutdown ---

function shutdown(): void {
  console.log('[Listener] Shutting down...');
  if (ws) {
    ws.close(1000, 'shutdown');
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// --- Start ---

console.log('=== Diario Inteligente V3 — Local Listener ===');
console.log(`Server: ${WS_URL}`);
connect();
