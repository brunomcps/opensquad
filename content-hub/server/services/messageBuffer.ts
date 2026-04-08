/**
 * Message buffer with 5s debounce.
 *
 * Groups rapid-fire Telegram messages into a single batch before
 * forwarding to the message queue. The queue handles routing
 * (listener polling vs Sonnet fallback).
 */

import { enqueue } from './messageQueue.js';

// --- Types ---

export interface BufferedMessage {
  type: 'text' | 'voice' | 'photo';
  text?: string;
  fileId?: string;
  caption?: string;
  timestamp: string;
}

interface ChatBuffer {
  chatId: number;
  messages: BufferedMessage[];
  timer: ReturnType<typeof setTimeout>;
}

// --- State ---

const buffers = new Map<number, ChatBuffer>();
const DEBOUNCE_MS = 5_000; // 5 seconds

// --- Public API ---

export function bufferMessage(chatId: number, message: BufferedMessage): void {
  let buf = buffers.get(chatId);

  if (buf) {
    clearTimeout(buf.timer);
    buf.messages.push(message);
  } else {
    buf = {
      chatId,
      messages: [message],
      timer: null as any,
    };
    buffers.set(chatId, buf);
  }

  buf.timer = setTimeout(() => flushBuffer(chatId), DEBOUNCE_MS);
  console.log(`[Buffer] Buffered msg for ${chatId} (${buf.messages.length} in queue, ${DEBOUNCE_MS}ms timer)`);
}

export function getBufferStats() {
  return {
    activeBuffers: buffers.size,
    totalBuffered: Array.from(buffers.values()).reduce((sum, b) => sum + b.messages.length, 0),
  };
}

// --- Flush ---

async function flushBuffer(chatId: number): Promise<void> {
  const buf = buffers.get(chatId);
  if (!buf) return;
  buffers.delete(chatId);

  const { messages } = buf;
  const msgSummary = messages.map(m => m.type === 'text' ? m.text?.slice(0, 30) : `[${m.type}]`).join(' | ');
  console.log(`[Buffer] Flushing ${messages.length} msg(s) from ${chatId}: ${msgSummary}`);

  // Queue handles everything: transcription, routing (listener vs Sonnet), fallback
  await enqueue(chatId, messages);
}
