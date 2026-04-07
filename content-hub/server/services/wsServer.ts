/**
 * WebSocket server for PC listener connection.
 *
 * The local listener (Bruno's PC) connects via WebSocket.
 * When connected, Railway forwards Telegram messages to the PC for
 * Claude CLI processing. When disconnected, Railway falls back to Haiku.
 *
 * Protocol:
 *   Railway → Listener: { type: "messages", id, chatId, messages[], timestamp }
 *   Listener → Railway: { type: "response", id, text, parseMode? }
 *   Heartbeat: ping/pong every 30s
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { randomUUID } from 'crypto';

const LISTENER_SECRET = process.env.LISTENER_SECRET || '';

let listenerWs: WebSocket | null = null;
let connectedAt: number | null = null;

// Pending responses: id → { resolve, reject, timeout }
const pendingResponses = new Map<string, {
  resolve: (text: string) => void;
  reject: (err: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();

// --- Public API ---

export function isListenerConnected(): boolean {
  return listenerWs !== null && listenerWs.readyState === WebSocket.OPEN;
}

export function getListenerStatus() {
  return {
    connected: isListenerConnected(),
    connectedAt: connectedAt ? new Date(connectedAt).toISOString() : null,
    pendingMessages: pendingResponses.size,
  };
}

/**
 * Send a message batch to the listener and wait for the response.
 * Rejects if listener is offline or times out.
 */
export function sendToListener(payload: Record<string, any>): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!isListenerConnected()) {
      return reject(new Error('Listener not connected'));
    }

    const id = randomUUID();
    const message = { ...payload, id };

    // 2 min timeout for Claude CLI processing (can be slow)
    const timeout = setTimeout(() => {
      pendingResponses.delete(id);
      reject(new Error('Listener timeout (120s)'));
    }, 120_000);

    pendingResponses.set(id, { resolve, reject, timeout });
    listenerWs!.send(JSON.stringify(message));
    console.log(`[WS] Sent message batch ${id} (${payload.messages?.length || 0} msgs)`);
  });
}

// --- Setup ---

export function setupWebSocket(server: Server): void {
  if (!LISTENER_SECRET) {
    console.log('[WS] No LISTENER_SECRET set — WebSocket disabled');
    return;
  }

  const wss = new WebSocketServer({ server, path: '/ws/listener' });

  wss.on('connection', (ws, req) => {
    // Auth: check secret in query param
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const secret = url.searchParams.get('secret');

    if (secret !== LISTENER_SECRET) {
      console.log('[WS] Rejected connection: invalid secret');
      ws.close(4001, 'unauthorized');
      return;
    }

    // Only allow one listener at a time
    if (listenerWs && listenerWs.readyState === WebSocket.OPEN) {
      console.log('[WS] Replacing existing listener connection');
      listenerWs.close(4002, 'replaced');
    }

    listenerWs = ws;
    connectedAt = Date.now();
    console.log('[WS] Listener connected from', req.socket.remoteAddress);

    // --- Handle incoming messages ---
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === 'pong') return;

        if (msg.type === 'response' && msg.id) {
          const pending = pendingResponses.get(msg.id);
          if (pending) {
            clearTimeout(pending.timeout);
            pendingResponses.delete(msg.id);
            pending.resolve(msg.text || '(sem resposta)');
            console.log(`[WS] Got response for ${msg.id}`);
          }
          return;
        }

        if (msg.type === 'status') {
          console.log(`[WS] Listener status: ${msg.status}`);
          return;
        }
      } catch (e: any) {
        console.error('[WS] Bad message from listener:', e.message);
      }
    });

    // --- Disconnect handling ---
    ws.on('close', (code, reason) => {
      console.log(`[WS] Listener disconnected (code=${code}, reason=${reason.toString()})`);
      if (listenerWs === ws) {
        listenerWs = null;
        connectedAt = null;
      }
      // Reject all pending responses
      for (const [id, pending] of pendingResponses) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Listener disconnected'));
        pendingResponses.delete(id);
      }
    });

    ws.on('error', (err) => {
      console.error('[WS] Listener error:', err.message);
    });

    // --- Heartbeat: WebSocket-level ping every 30s ---
    // Detects stale/dead connections that text-level pings miss
    let isAlive = true;

    ws.on('pong', () => { isAlive = true; }); // WebSocket-level pong

    const pingInterval = setInterval(() => {
      if (!isAlive) {
        console.log('[WS] Listener failed pong check — terminating stale connection');
        clearInterval(pingInterval);
        ws.terminate(); // force close (triggers 'close' event)
        return;
      }
      isAlive = false;
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping(); // WebSocket-level ping (not text message)
      } else {
        clearInterval(pingInterval);
      }
    }, 30_000);

    ws.on('close', () => clearInterval(pingInterval));

    // Notify listener that connection is established
    ws.send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }));
  });

  console.log('[WS] WebSocket server ready on /ws/listener');
}
