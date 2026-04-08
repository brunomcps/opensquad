/**
 * Local Listener — runs on Bruno's PC.
 *
 * Polls Railway every 3s for pending messages.
 * Processes with Claude CLI (Opus, free).
 * Sends response back via HTTP POST.
 *
 * No WebSocket. No persistent connection. Survives sleep/wake.
 *
 * Usage:
 *   cd listener && npm install && npm start
 */

import 'dotenv/config';
import { processWithClaude } from './processor.js';

// --- Config ---

const RAILWAY_URL = process.env.RAILWAY_URL || 'https://hub.brunosallesphd.com.br';
const SECRET = process.env.LISTENER_SECRET || '';
const POLL_INTERVAL = 3_000; // 3 seconds

if (!SECRET) {
  console.error('[Listener] LISTENER_SECRET not set. Create a .env file.');
  process.exit(1);
}

// --- Polling ---

let running = true;
let consecutiveErrors = 0;

async function poll(): Promise<void> {
  try {
    const res = await fetch(`${RAILWAY_URL}/api/telegram/pending?secret=${encodeURIComponent(SECRET)}`, {
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json() as any;

    if (data.batch) {
      consecutiveErrors = 0;
      const batch = data.batch;
      console.log(`[Listener] Got batch ${batch.id}: ${batch.messages?.length || 0} messages`);

      try {
        const response = await processWithClaude(batch);

        await fetch(`${RAILWAY_URL}/api/telegram/respond`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-listener-secret': SECRET,
          },
          body: JSON.stringify({ id: batch.id, text: response }),
          signal: AbortSignal.timeout(10_000),
        });

        console.log(`[Listener] Response sent for ${batch.id}`);
      } catch (err: any) {
        console.error(`[Listener] Processing error for ${batch.id}:`, err.message);
        // Send error response so Railway doesn't timeout
        await fetch(`${RAILWAY_URL}/api/telegram/respond`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-listener-secret': SECRET,
          },
          body: JSON.stringify({
            id: batch.id,
            text: `⚠️ Erro ao processar: ${err.message.slice(0, 100)}`,
          }),
          signal: AbortSignal.timeout(10_000),
        }).catch(() => {});
      }
    } else {
      // No pending messages — reset error counter
      consecutiveErrors = 0;
    }
  } catch (err: any) {
    consecutiveErrors++;
    if (consecutiveErrors <= 3 || consecutiveErrors % 20 === 0) {
      console.error(`[Listener] Poll error (${consecutiveErrors}):`, err.message);
    }
  }
}

async function loop(): Promise<void> {
  console.log('=== Diario Inteligente V3 — Local Listener (Polling) ===');
  console.log(`Server: ${RAILWAY_URL}`);
  console.log(`Poll interval: ${POLL_INTERVAL / 1000}s`);

  while (running) {
    await poll();
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }
}

// --- Graceful shutdown ---

process.on('SIGINT', () => { running = false; console.log('\n[Listener] Shutting down...'); });
process.on('SIGTERM', () => { running = false; });

// --- Start ---

loop();
