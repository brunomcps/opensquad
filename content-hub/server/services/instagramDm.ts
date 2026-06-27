import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.resolve(__dirname, '../../data/instagram-dm.json');
const GRAPH_BASE = 'https://graph.facebook.com/v21.0';

export interface InstagramDmMessage {
  id: string;
  conversationKey: string;
  senderId: string;
  recipientId: string;
  direction: 'inbound' | 'outbound';
  text: string;
  timestamp: string;
  attachments?: unknown[];
  raw?: unknown;
}

export interface InstagramDmEvent {
  id: string;
  object?: string;
  receivedAt: string;
  raw: unknown;
}

export interface InstagramDmConversation {
  id: string;
  participantId: string;
  lastMessageAt: string;
  lastMessageText: string;
  messageCount: number;
}

interface InstagramDmStore {
  updatedAt: string;
  events: InstagramDmEvent[];
  messages: InstagramDmMessage[];
}

interface GraphError {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

function getPageToken(): string {
  return process.env.INSTAGRAM_PAGE_TOKEN || '';
}

function getPageId(): string {
  return process.env.INSTAGRAM_PAGE_ID || process.env.FACEBOOK_PAGE_ID || '';
}

function getVerifyToken(): string {
  return process.env.INSTAGRAM_DM_VERIFY_TOKEN || process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.SYNC_PUSH_SECRET || '';
}

function ensureStoreDir() {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
}

function emptyStore(): InstagramDmStore {
  return { updatedAt: new Date().toISOString(), events: [], messages: [] };
}

function readStore(): InstagramDmStore {
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
  } catch {
    return emptyStore();
  }
}

function writeStore(store: InstagramDmStore) {
  ensureStoreDir();
  store.updatedAt = new Date().toISOString();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}

function normalizeTimestamp(value: unknown): string {
  if (typeof value === 'number') return new Date(value).toISOString();
  if (typeof value === 'string' && value) return value;
  return new Date().toISOString();
}

function conversationKeyFor(senderId: string, recipientId: string): string {
  const pageId = getPageId();
  if (senderId === pageId) return recipientId;
  return senderId || recipientId;
}

function parseWebhookMessages(payload: any): InstagramDmMessage[] {
  const messages: InstagramDmMessage[] = [];
  for (const entry of payload?.entry || []) {
    for (const item of entry?.messaging || []) {
      const senderId = String(item?.sender?.id || '');
      const recipientId = String(item?.recipient?.id || entry?.id || '');
      const message = item?.message;
      if (!senderId || !recipientId || !message) continue;

      const text = typeof message.text === 'string' ? message.text : '';
      const attachments = Array.isArray(message.attachments) ? message.attachments : undefined;
      messages.push({
        id: String(message.mid || createId('igdm_msg')),
        conversationKey: conversationKeyFor(senderId, recipientId),
        senderId,
        recipientId,
        direction: message.is_echo ? 'outbound' : 'inbound',
        text,
        timestamp: normalizeTimestamp(item?.timestamp),
        attachments,
        raw: item,
      });
    }
  }
  return messages;
}

function mergeMessages(existing: InstagramDmMessage[], incoming: InstagramDmMessage[]): InstagramDmMessage[] {
  const byId = new Map(existing.map(message => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return Array.from(byId.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

async function graphGet(pathname: string, params: Record<string, string>) {
  const token = getPageToken();
  if (!token) throw new Error('INSTAGRAM_PAGE_TOKEN not set');

  const url = new URL(`${GRAPH_BASE}${pathname}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set('access_token', token);

  const response = await fetch(url);
  const data = await response.json() as GraphError & Record<string, unknown>;
  if (!response.ok || data.error) {
    throw new Error(data.error?.message || `Graph API error ${response.status}`);
  }
  return data;
}

async function graphPost(pathname: string, body: Record<string, unknown>) {
  const token = getPageToken();
  if (!token) throw new Error('INSTAGRAM_PAGE_TOKEN not set');

  const url = new URL(`${GRAPH_BASE}${pathname}`);
  url.searchParams.set('access_token', token);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json() as GraphError & Record<string, unknown>;
  if (!response.ok || data.error) {
    throw new Error(data.error?.message || `Graph API error ${response.status}`);
  }
  return data;
}

export function getInstagramDmStatus() {
  const store = readStore();
  return {
    configured: {
      hasPageToken: !!getPageToken(),
      hasPageId: !!getPageId(),
      hasVerifyToken: !!getVerifyToken(),
      hasAppSecret: !!process.env.FACEBOOK_APP_SECRET,
    },
    store: {
      updatedAt: store.updatedAt,
      eventCount: store.events.length,
      messageCount: store.messages.length,
      conversationCount: getLocalConversations().length,
    },
  };
}

export function verifyWebhook(mode: unknown, token: unknown, challenge: unknown): string | null {
  if (mode !== 'subscribe') return null;
  const expected = getVerifyToken();
  if (!expected || token !== expected) return null;
  return typeof challenge === 'string' ? challenge : String(challenge || '');
}

export function verifyMetaSignature(rawBody: Buffer | undefined, signature: string | undefined): boolean {
  const appSecret = process.env.FACEBOOK_APP_SECRET || '';
  if (!appSecret || !signature || !rawBody) return true;
  const [algorithm, receivedHash] = signature.split('=');
  if (algorithm !== 'sha256' || !receivedHash) return false;
  const expectedHash = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(receivedHash), Buffer.from(expectedHash));
}

export function ingestWebhookPayload(payload: unknown): { eventId: string; messages: InstagramDmMessage[] } {
  const store = readStore();
  const eventId = createId('igdm_evt');
  const messages = parseWebhookMessages(payload);

  store.events.unshift({
    id: eventId,
    object: (payload as any)?.object,
    receivedAt: new Date().toISOString(),
    raw: payload,
  });
  store.messages = mergeMessages(store.messages, messages);
  store.events = store.events.slice(0, 200);
  store.messages = store.messages.slice(0, 1000);
  writeStore(store);

  return { eventId, messages };
}

export function getLocalMessages(conversationKey?: string): InstagramDmMessage[] {
  const messages = readStore().messages;
  if (!conversationKey) return messages;
  return messages.filter(message => message.conversationKey === conversationKey);
}

export function getLocalConversations(): InstagramDmConversation[] {
  const conversations = new Map<string, InstagramDmConversation>();
  for (const message of readStore().messages) {
    const current = conversations.get(message.conversationKey);
    if (!current) {
      conversations.set(message.conversationKey, {
        id: message.conversationKey,
        participantId: message.conversationKey,
        lastMessageAt: message.timestamp,
        lastMessageText: message.text,
        messageCount: 1,
      });
      continue;
    }
    current.messageCount += 1;
    if (new Date(message.timestamp).getTime() > new Date(current.lastMessageAt).getTime()) {
      current.lastMessageAt = message.timestamp;
      current.lastMessageText = message.text;
    }
  }
  return Array.from(conversations.values()).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
}

export async function fetchLiveConversations(limit = 25) {
  const pageId = getPageId();
  if (!pageId) throw new Error('INSTAGRAM_PAGE_ID or FACEBOOK_PAGE_ID not set');
  return graphGet(`/${pageId}/conversations`, {
    platform: 'instagram',
    fields: 'id,updated_time,link,participants,messages.limit(1){id,created_time,from,to,message}',
    limit: String(limit),
  });
}

export async function fetchLiveConversationMessages(conversationId: string, limit = 50) {
  return graphGet(`/${conversationId}/messages`, {
    fields: 'id,created_time,from,to,message,attachments',
    limit: String(limit),
  });
}

export async function sendInstagramDm(recipientId: string, text: string) {
  if (!recipientId) throw new Error('recipientId is required');
  if (!text.trim()) throw new Error('text is required');

  const data = await graphPost('/me/messages', {
    messaging_type: 'RESPONSE',
    recipient: { id: recipientId },
    message: { text },
  });

  const pageId = getPageId();
  const sent: InstagramDmMessage = {
    id: String((data as any).message_id || createId('igdm_out')),
    conversationKey: recipientId,
    senderId: pageId,
    recipientId,
    direction: 'outbound',
    text,
    timestamp: new Date().toISOString(),
    raw: data,
  };

  const store = readStore();
  store.messages = mergeMessages(store.messages, [sent]);
  writeStore(store);

  return { data, message: sent };
}
