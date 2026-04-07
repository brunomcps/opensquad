/**
 * Message buffer with 5s debounce.
 *
 * Groups rapid-fire Telegram messages into a single batch before
 * forwarding to the listener or Haiku. This way "fiz supino" + "80kg"
 * + "4x8" sent in quick succession become one processing request.
 */

import { sendToListener, isListenerConnected } from './wsServer.js';
import { sendMessage } from './telegram.js';
import { processWithHaiku } from './haikuConversation.js';
import { transcribeVoice } from './groqWhisper.js';

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
    // Existing buffer: add message and reset timer
    clearTimeout(buf.timer);
    buf.messages.push(message);
  } else {
    // New buffer
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

  if (isListenerConnected()) {
    // PC online → forward to listener via WebSocket
    try {
      const response = await sendToListener({
        type: 'messages',
        chatId,
        messages,
        timestamp: new Date().toISOString(),
      });
      // Send response back to Telegram
      await sendMessage(response);
    } catch (err: any) {
      console.error('[Buffer] Listener error, attempting fallback:', err.message);
      // Listener connected but errored (timeout, disconnect mid-flight)
      await handleOffline(messages);
    }
  } else {
    // PC offline
    await handleOffline(messages);
  }
}

async function handleOffline(messages: BufferedMessage[]): Promise<void> {
  // Transcribe voice messages via Groq Whisper
  for (const msg of messages) {
    if (msg.type === 'voice' && msg.fileId && !msg.text) {
      console.log('[Buffer] Transcribing voice message...');
      const text = await transcribeVoice(msg.fileId);
      msg.text = text;
      msg.type = 'text'; // promote to text after transcription
    }
  }

  // Process with Haiku (PC offline fallback)
  try {
    const response = await processWithHaiku(messages);
    await sendMessage(response);
  } catch (err: any) {
    console.error('[Buffer] Haiku fallback error:', err.message);
    // Last resort: acknowledge receipt
    const textParts = messages.filter(m => m.text).map(m => m.text);
    let ack = '⚠️ PC desligado e Haiku indisponivel.';
    if (textParts.length > 0) {
      ack += ` Recebi: "${textParts.join(' / ').slice(0, 100)}"`;
    }
    await sendMessage(ack);
  }
}
