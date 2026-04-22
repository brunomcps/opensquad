// Cloudflare Worker: proxy hub.brunosallesphd.com.br → Railway
// Supports HTTP + WebSocket (for Diario Inteligente listener)
const RAILWAY_URL = 'https://web-production-47e8f.up.railway.app';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const railwayUrl = RAILWAY_URL + url.pathname + url.search;

    // WebSocket upgrade: pass request through directly
    if (request.headers.get('upgrade') === 'websocket') {
      return fetch(railwayUrl, request);
    }

    // Regular HTTP: proxy with Host header rewrite
    const headers = new Headers(request.headers);
    headers.set('Host', 'web-production-47e8f.up.railway.app');

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
  },
};
