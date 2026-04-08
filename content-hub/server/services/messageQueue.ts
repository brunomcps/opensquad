/**
 * Message Queue — replaces WebSocket with polling.
 *
 * Railway stores pending messages in memory. The local listener
 * polls every 3s to pick them up. If no poll for 30s, Railway
 * assumes PC is offline and processes with Sonnet.
 *
 * Endpoints:
 *   GET  /api/telegram/pending  → returns pending messages
 *   POST /api/telegram/respond  → listener sends response back
 */

import { sendMessage } from './telegram.js';
import { processWithHaiku } from './haikuConversation.js';
import { transcribeVoice } from './groqWhisper.js';
import type { BufferedMessage } from './messageBuffer.js';

// --- Types ---

export interface QueuedBatch {
  id: string;
  chatId: number;
  messages: BufferedMessage[];
  timestamp: string;
  status: 'pending' | 'processing' | 'done';
}

// --- State ---

const queue: QueuedBatch[] = [];
let lastPollAt: number = 0;
const LISTENER_TIMEOUT = 30_000; // 30s without poll = PC offline

const LISTENER_SECRET = process.env.LISTENER_SECRET || '';

// --- Public API ---

export function isListenerOnline(): boolean {
  return lastPollAt > 0 && (Date.now() - lastPollAt) < LISTENER_TIMEOUT;
}

export function getQueueStatus() {
  return {
    listenerOnline: isListenerOnline(),
    lastPollAt: lastPollAt ? new Date(lastPollAt).toISOString() : null,
    lastPollAgo: lastPollAt ? Math.round((Date.now() - lastPollAt) / 1000) : null,
    pendingMessages: queue.filter(b => b.status === 'pending').length,
    processingMessages: queue.filter(b => b.status === 'processing').length,
  };
}

/**
 * Add a batch of messages to the queue.
 * Called by messageBuffer after debounce.
 */
export async function enqueue(chatId: number, messages: BufferedMessage[]): Promise<void> {
  const hasVoice = messages.some(m => m.type === 'voice');
  const hasText = messages.some(m => m.type === 'text');

  // Send feedback to user immediately
  if (hasVoice) {
    await sendMessage('🎙️ Transcrevendo áudio...');
  } else if (hasText) {
    await sendMessage('🧠 Processando...');
  }

  // Transcribe voice messages on Railway (always, regardless of PC status)
  for (const msg of messages) {
    if (msg.type === 'voice' && msg.fileId && !msg.text) {
      console.log('[Queue] Transcribing voice message...');
      try {
        const text = await transcribeVoice(msg.fileId);
        msg.text = text;
        msg.type = 'text';
      } catch (e: any) {
        console.error('[Queue] Transcription failed:', e.message);
        msg.text = '[erro na transcricao]';
        msg.type = 'text';
      }
    }
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const batch: QueuedBatch = {
    id,
    chatId,
    messages,
    timestamp: new Date().toISOString(),
    status: 'pending',
  };

  if (isListenerOnline()) {
    // PC online → queue for listener pickup
    queue.push(batch);
    console.log(`[Queue] Enqueued batch ${id} for listener (${messages.length} msgs)`);

    // Safety: if listener doesn't pick up within 30s, process with Sonnet
    setTimeout(() => {
      const b = queue.find(q => q.id === id);
      if (b && b.status === 'pending') {
        console.log(`[Queue] Batch ${id} expired, falling back to Sonnet`);
        b.status = 'done';
        processWithSonnet(b.messages);
      }
    }, LISTENER_TIMEOUT);
  } else {
    // PC offline → process with Sonnet directly
    console.log(`[Queue] PC offline, processing ${messages.length} msgs with Sonnet`);
    await processWithSonnet(messages);
  }
}

/** Listener polls for pending messages */
export function pollPending(secret: string): QueuedBatch | null {
  if (LISTENER_SECRET && secret !== LISTENER_SECRET) return null;

  lastPollAt = Date.now();

  // Find first pending batch and mark as processing
  const batch = queue.find(b => b.status === 'pending');
  if (batch) {
    batch.status = 'processing';
    console.log(`[Queue] Listener picked up batch ${batch.id}`);
  }

  return batch || null;
}

/** Listener sends response back */
export async function submitResponse(id: string, text: string, secret: string): Promise<boolean> {
  if (LISTENER_SECRET && secret !== LISTENER_SECRET) return false;

  lastPollAt = Date.now();

  const batch = queue.find(b => b.id === id);
  if (!batch) return false;

  batch.status = 'done';
  await sendMessage(text);
  console.log(`[Queue] Response for batch ${id} sent to Telegram`);

  // Cleanup old entries
  cleanupQueue();

  return true;
}

// --- Sonnet fallback ---

async function processWithSonnet(messages: BufferedMessage[]): Promise<void> {
  try {
    const response = await processWithHaiku(messages);
    await sendMessage(response);
  } catch (err: any) {
    console.error('[Queue] Sonnet fallback error:', err.message);
    const textParts = messages.filter(m => m.text).map(m => m.text);
    let ack = '⚠️ PC desligado e Sonnet indisponivel.';
    if (textParts.length > 0) ack += ` Recebi: "${textParts.join(' / ').slice(0, 100)}"`;
    await sendMessage(ack);
  }
}

// --- Cleanup ---

function cleanupQueue(): void {
  const cutoff = Date.now() - 5 * 60 * 1000; // Remove entries older than 5 min
  const before = queue.length;
  while (queue.length > 0 && new Date(queue[0].timestamp).getTime() < cutoff) {
    queue.shift();
  }
  if (queue.length < before) {
    console.log(`[Queue] Cleaned up ${before - queue.length} old entries`);
  }
}
