// Cloudflare Worker: Instagram DM API + proxy fallback for Content Hub.
const DEFAULT_RAILWAY_URL = 'https://web-production-47e8f.up.railway.app';
const DEFAULT_GRAPH_VERSION = 'v21.0';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization,Content-Type,X-Hub-Signature-256,X-Instagram-DM-Secret,X-Sync-Secret',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
    },
  });
}

function text(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      ...CORS_HEADERS,
    },
  });
}

function getPageToken(env) {
  return env.INSTAGRAM_PAGE_TOKEN || env.FACEBOOK_PAGE_TOKEN || '';
}

function getPageId(env) {
  return env.INSTAGRAM_PAGE_ID || env.FACEBOOK_PAGE_ID || '';
}

function getInstagramBusinessId(env) {
  return env.INSTAGRAM_BUSINESS_ID || env.INSTAGRAM_USER_ID || '';
}

function getGraphVersion(env) {
  return env.META_GRAPH_VERSION || DEFAULT_GRAPH_VERSION;
}

function getVerifyToken(env) {
  return env.INSTAGRAM_DM_VERIFY_TOKEN || env.META_WEBHOOK_VERIFY_TOKEN || env.SYNC_PUSH_SECRET || '';
}

function getApiSecret(env) {
  return env.INSTAGRAM_DM_API_SECRET || env.SYNC_PUSH_SECRET || '';
}

function parseAuthUsers(value) {
  const users = new Map();
  if (!value) return users;
  for (const entry of value.split(',')) {
    const [user, ...passParts] = entry.split(':');
    if (user && passParts.length > 0) users.set(user, passParts.join(':'));
  }
  return users;
}

function isAuthorized(request, env) {
  const apiSecret = getApiSecret(env);
  const bearer = request.headers.get('Authorization') || '';
  const headerSecret = request.headers.get('X-Instagram-DM-Secret') || request.headers.get('X-Sync-Secret') || '';

  if (apiSecret && (bearer === `Bearer ${apiSecret}` || headerSecret === apiSecret)) return true;

  const authUsers = parseAuthUsers(env.AUTH_USERS || '');
  if (!authUsers.size || !bearer.startsWith('Basic ')) return false;

  try {
    const decoded = atob(bearer.slice('Basic '.length));
    const [user, ...passParts] = decoded.split(':');
    return authUsers.get(user) === passParts.join(':');
  } catch {
    return false;
  }
}

function unauthorized() {
  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Instagram DM"',
      ...CORS_HEADERS,
    },
  });
}

async function verifyMetaSignature(rawBody, signature, appSecret) {
  if (!appSecret) return true;
  if (!signature) return false;

  const [algorithm, receivedHash] = signature.split('=');
  if (algorithm !== 'sha256' || !receivedHash) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, rawBody);
  const expectedHash = [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');

  if (expectedHash.length !== receivedHash.length) return false;
  let diff = 0;
  for (let index = 0; index < expectedHash.length; index += 1) {
    diff |= expectedHash.charCodeAt(index) ^ receivedHash.charCodeAt(index);
  }
  return diff === 0;
}

function extractWebhookMessages(payload, pageId) {
  const messages = [];
  for (const entry of payload?.entry || []) {
    for (const item of entry?.messaging || []) {
      const senderId = String(item?.sender?.id || '');
      const recipientId = String(item?.recipient?.id || entry?.id || '');
      const message = item?.message;
      if (!senderId || !recipientId || !message) continue;

      messages.push({
        id: String(message.mid || ''),
        conversationKey: senderId === pageId ? recipientId : senderId,
        senderId,
        recipientId,
        direction: message.is_echo ? 'outbound' : 'inbound',
        hasText: typeof message.text === 'string' && message.text.length > 0,
        attachmentCount: Array.isArray(message.attachments) ? message.attachments.length : 0,
        timestamp: typeof item?.timestamp === 'number' ? new Date(item.timestamp).toISOString() : new Date().toISOString(),
      });
    }
  }
  return messages;
}

async function graphRequest(env, pathname, params = {}, init = {}) {
  const token = getPageToken(env);
  if (!token) throw new Error('INSTAGRAM_PAGE_TOKEN is not configured');

  const url = new URL(`https://graph.facebook.com/${getGraphVersion(env)}${pathname}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  url.searchParams.set('access_token', token);

  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error) {
    throw new Error(data?.error?.message || `Graph API returned HTTP ${response.status}`);
  }
  return data;
}

function sanitizeGraphResponse(value) {
  if (Array.isArray(value)) return value.map(sanitizeGraphResponse);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, sanitizeGraphResponse(nestedValue)]),
    );
  }
  if (typeof value !== 'string' || !value.includes('access_token=')) return value;

  try {
    const url = new URL(value);
    if (url.searchParams.has('access_token')) url.searchParams.set('access_token', 'REDACTED');
    return url.toString();
  } catch {
    return value.replace(/access_token=[^&\s]+/g, 'access_token=REDACTED');
  }
}

async function handleWebhookGet(request, env) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode !== 'subscribe' || !challenge || token !== getVerifyToken(env)) {
    return text('Forbidden', 403);
  }

  return text(challenge);
}

async function handleWebhookPost(request, env) {
  const rawBody = await request.arrayBuffer();
  const signature = request.headers.get('X-Hub-Signature-256') || '';
  const signatureOk = await verifyMetaSignature(rawBody, signature, env.FACEBOOK_APP_SECRET || '');
  if (!signatureOk) return json({ ok: false, error: 'invalid signature' }, 403);

  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(rawBody));
  } catch {
    return json({ ok: false, error: 'invalid json' }, 400);
  }

  const messages = extractWebhookMessages(payload, getPageId(env));
  console.log(`[InstagramDM] webhook object=${payload?.object || 'unknown'} entries=${payload?.entry?.length || 0} messages=${messages.length}`);

  return json({
    ok: true,
    runtime: 'cloudflare-worker',
    receivedAt: new Date().toISOString(),
    messageCount: messages.length,
  });
}

async function handleStatus(env) {
  return json({
    ok: true,
    runtime: 'cloudflare-worker',
    graphVersion: getGraphVersion(env),
    configured: {
      hasPageToken: !!getPageToken(env),
      hasPageId: !!getPageId(env),
      hasVerifyToken: !!getVerifyToken(env),
      hasAppSecret: !!env.FACEBOOK_APP_SECRET,
      hasApiSecret: !!getApiSecret(env),
      persistentStorage: false,
    },
    routes: {
      webhook: '/api/instagram-dm/webhook',
      liveConversations: '/api/instagram-dm/live/conversations',
      liveMessages: '/api/instagram-dm/live/conversations/:conversationId/messages',
      sendMessage: '/api/instagram-dm/messages',
    },
  });
}

async function handleLiveConversations(request, env) {
  const pageId = getPageId(env);
  if (!pageId) throw new Error('INSTAGRAM_PAGE_ID or FACEBOOK_PAGE_ID is not configured');

  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 25), 1), 100);
  const includeMessages = url.searchParams.get('includeMessages') !== 'false';
  const after = url.searchParams.get('after') || '';
  const userId = url.searchParams.get('userId') || '';
  const params = {
    platform: 'instagram',
    fields: includeMessages
      ? 'id,updated_time,link,participants,messages.limit(1){id,created_time,from,to,message}'
      : 'id,updated_time,link,participants',
    limit,
  };
  if (after) params.after = after;
  if (userId) params.user_id = userId;

  const data = await graphRequest(env, `/${pageId}/conversations`, params);

  return json({ ok: true, data: sanitizeGraphResponse(data) });
}

async function handleLiveUserLookup(env, username) {
  const instagramBusinessId = getInstagramBusinessId(env);
  if (!instagramBusinessId) throw new Error('INSTAGRAM_BUSINESS_ID or INSTAGRAM_USER_ID is not configured');
  if (!username) throw new Error('username is required');

  const safeUsername = username.replace(/[^A-Za-z0-9._]/g, '');
  if (!safeUsername) throw new Error('invalid username');

  const data = await graphRequest(env, `/${instagramBusinessId}`, {
    fields: `business_discovery.username(${safeUsername}){id,username,name,profile_picture_url}`,
  });

  return json({ ok: true, data: sanitizeGraphResponse(data) });
}

async function handleLiveMessages(request, env, conversationId) {
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 50), 1), 100);

  const data = await graphRequest(env, `/${conversationId}/messages`, {
    fields: 'id,created_time,from,to,message,attachments',
    limit,
  });

  return json({ ok: true, data: sanitizeGraphResponse(data) });
}

async function handleSendMessage(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid json' }, 400);
  }

  const recipientId = String(body?.recipientId || '').trim();
  const messageText = String(body?.text || '').trim();
  if (!recipientId) return json({ ok: false, error: 'recipientId is required' }, 400);
  if (!messageText) return json({ ok: false, error: 'text is required' }, 400);

  const data = await graphRequest(env, '/me/messages', {}, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_type: 'RESPONSE',
      recipient: { id: recipientId },
      message: { text: messageText },
    }),
  });

  return json({ ok: true, data: sanitizeGraphResponse(data) });
}

async function handleInstagramDm(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

  if (path === '/api/instagram-dm/webhook' && request.method === 'GET') return handleWebhookGet(request, env);
  if (path === '/api/instagram-dm/webhook' && request.method === 'POST') return handleWebhookPost(request, env);

  if (!isAuthorized(request, env)) return unauthorized();

  try {
    if (path === '/api/instagram-dm/status' && request.method === 'GET') return handleStatus(env);
    if (path === '/api/instagram-dm/live/conversations' && request.method === 'GET') return await handleLiveConversations(request, env);

    const userLookupMatch = path.match(/^\/api\/instagram-dm\/live\/users\/([^/]+)$/);
    if (userLookupMatch && request.method === 'GET') return await handleLiveUserLookup(env, decodeURIComponent(userLookupMatch[1]));

    const messageMatch = path.match(/^\/api\/instagram-dm\/live\/conversations\/([^/]+)\/messages$/);
    if (messageMatch && request.method === 'GET') return await handleLiveMessages(request, env, decodeURIComponent(messageMatch[1]));

    if (path === '/api/instagram-dm/messages' && request.method === 'POST') return await handleSendMessage(request, env);

    if ((path === '/api/instagram-dm/messages' || path === '/api/instagram-dm/conversations') && request.method === 'GET') {
      return json({
        ok: false,
        error: 'local storage is not configured in the Worker; use live Graph API routes',
      }, 501);
    }

    return json({ ok: false, error: 'not found' }, 404);
  } catch (error) {
    console.error(`[InstagramDM] ${request.method} ${path}: ${error.message}`);
    return json({ ok: false, error: error.message }, 500);
  }
}

async function proxyToRailway(request, env) {
  const url = new URL(request.url);
  const railwayBase = env.RAILWAY_URL || DEFAULT_RAILWAY_URL;
  const railwayUrl = railwayBase + url.pathname + url.search;

  if (request.headers.get('upgrade') === 'websocket') {
    return fetch(railwayUrl, request);
  }

  const headers = new Headers(request.headers);
  headers.set('Host', new URL(railwayBase).host);

  const response = await fetch(railwayUrl, {
    method: request.method,
    headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    redirect: 'manual',
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/instagram-dm/')) {
      return handleInstagramDm(request, env);
    }
    return proxyToRailway(request, env);
  },
};
