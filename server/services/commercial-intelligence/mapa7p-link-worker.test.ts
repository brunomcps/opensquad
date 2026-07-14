import assert from 'node:assert/strict';
import test from 'node:test';
import { extractSlug, handleRequest, type WorkerEnv } from '../../../cloudflare-mapa7p-links/worker.ts';

const env: WorkerEnv = {
  SUPABASE_REDIRECT_URL: 'https://example.supabase.co/functions/v1/ci-campaign-redirect',
};

test('Worker aceita somente o caminho curto do MAPA-7P', async () => {
  assert.equal(extractSlug('https://link.example/m7p/a7k3d9qz'), 'a7k3d9qz');
  assert.equal(extractSlug('https://link.example/'), null);
  assert.equal(extractSlug('https://link.example/m7p/invalido_'), null);

  let calls = 0;
  const response = await handleRequest(new Request('https://link.example/'), env, async () => {
    calls += 1;
    return new Response(null, { status: 500 });
  });
  assert.equal(response.status, 404);
  assert.equal(calls, 0);
});

test('Worker preserva GET, headers mínimos e redirect válido', async () => {
  const response = await handleRequest(new Request('https://link.example/m7p/a7k3d9qz', {
    headers: { 'user-agent': 'Mozilla/5.0', referer: 'https://www.youtube.com/watch?v=video' },
  }), env, async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.searchParams.get('slug'), 'a7k3d9qz');
    assert.equal(init?.method, 'GET');
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('user-agent'), 'Mozilla/5.0');
    assert.match(headers.get('referer') || '', /youtube\.com/);
    return new Response(null, { status: 302, headers: { location: 'https://go.hotmart.com/K103806991N?src=fixture' } });
  });
  assert.equal(response.status, 302);
  assert.match(response.headers.get('location') || '', /go\.hotmart\.com/);
  assert.equal(response.headers.get('cache-control'), 'no-store, max-age=0');
});

test('Worker preserva HEAD para validar sem registrar clique', async () => {
  const response = await handleRequest(new Request('https://link.example/m7p/a7k3d9qz', { method: 'HEAD' }), env, async (_input, init) => {
    assert.equal(init?.method, 'HEAD');
    return new Response(null, { status: 302, headers: { location: 'https://go.hotmart.com/K103806991N?src=fixture' } });
  });
  assert.equal(response.status, 302);
  assert.equal(await response.text(), '');
});

test('Worker fecha métodos e falhas do backend sem vazar detalhes', async () => {
  const method = await handleRequest(new Request('https://link.example/m7p/a7k3d9qz', { method: 'POST' }), env);
  assert.equal(method.status, 405);

  const missing = await handleRequest(new Request('https://link.example/m7p/a7k3d9qz'), env, async () => new Response(null, { status: 404 }));
  assert.equal(missing.status, 404);

  const broken = await handleRequest(new Request('https://link.example/m7p/a7k3d9qz'), env, async () => new Response(null, { status: 302 }));
  assert.equal(broken.status, 502);
});
