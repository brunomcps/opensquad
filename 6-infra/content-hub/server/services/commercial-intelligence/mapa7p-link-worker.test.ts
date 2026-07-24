import assert from 'node:assert/strict';
import test from 'node:test';
import { extractSlug, handleRequest, type WorkerEnv } from '../../../cloudflare-mapa7p-links/worker.ts';
import { verifyClickIngestRequest } from '../../../supabase/functions/_shared/clickIngest.ts';

const env: WorkerEnv = {
  SUPABASE_REDIRECT_URL: 'https://example.supabase.co/functions/v1/ci-campaign-redirect',
  CLICK_FINGERPRINT_SECRET: 'fingerprint-secret-fixture-32-bytes-minimum',
  CLICK_INGEST_SECRET: 'ingest-secret-fixture-32-bytes-minimum-value',
};

test('Worker aceita somente o caminho curto do MAPA-7P', async () => {
  assert.equal(extractSlug('https://link.example/m7p/0okxyzoxzuk-d'), '0okxyzoxzuk-d');
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
  const response = await handleRequest(new Request('https://link.example/m7p/0okxyzoxzuk-d', {
    headers: {
      'user-agent': 'Mozilla/5.0', referer: 'https://www.youtube.com/watch?v=video',
      accept: 'text/html', 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'document',
      'cf-connecting-ip': '203.0.113.10',
    },
  }), env, async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.searchParams.get('slug'), '0okxyzoxzuk-d');
    assert.equal(init?.method, 'GET');
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('user-agent'), 'Mozilla/5.0');
    assert.match(headers.get('referer') || '', /youtube\.com/);
    assert.equal(headers.get('accept'), 'text/html');
    assert.equal(headers.get('sec-fetch-mode'), 'navigate');
    assert.equal(headers.get('cf-connecting-ip'), null);
    assert.match(headers.get('x-ci-fingerprint') || '', /^[a-f0-9]{64}$/);
    const claim = await verifyClickIngestRequest(
      new Request(String(input), init),
      env.CLICK_INGEST_SECRET,
      '0okxyzoxzuk-d',
      false,
    );
    assert.match(claim.nonce, /^[a-f0-9]{32}$/);
    return new Response(null, { status: 302, headers: { location: 'https://go.hotmart.com/K103806991N?src=fixture' } });
  });
  assert.equal(response.status, 302);
  assert.match(response.headers.get('location') || '', /go\.hotmart\.com/);
  assert.equal(response.headers.get('cache-control'), 'no-store, max-age=0');
});

test('Worker cria fingerprint HMAC sem encaminhar IP e ignora tentativa pública de subcontagem', async () => {
  const request = new Request('https://link.example/m7p/0okxyzoxzuk-d?ci_test=1', {
    headers: { 'user-agent': 'Mozilla/5.0', 'cf-connecting-ip': '203.0.113.10' },
  });
  const response = await handleRequest(request, {
    ...env,
  }, async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.searchParams.get('ci_test'), null);
    const headers = new Headers(init?.headers);
    assert.match(headers.get('x-ci-fingerprint') || '', /^[a-f0-9]{64}$/);
    assert.equal(headers.get('cf-connecting-ip'), null);
    await verifyClickIngestRequest(
      new Request(String(input), init),
      env.CLICK_INGEST_SECRET,
      '0okxyzoxzuk-d',
      false,
    );
    await assert.rejects(
      () => verifyClickIngestRequest(
        new Request(String(input), init),
        env.CLICK_INGEST_SECRET,
        '0okxyzoxzuk-d',
        true,
      ),
      (error: any) => error.code === 'click_ingest_unauthorized',
    );
    return new Response(null, { status: 302, headers: { location: 'https://go.hotmart.com/K103806991N?src=fixture' } });
  });
  assert.equal(response.status, 302);
});

test('Worker falha fechado antes do Edge quando os segredos de integridade estão ausentes ou fracos', async () => {
  const request = new Request('https://link.example/m7p/0okxyzoxzuk-d', {
    headers: { 'user-agent': 'Mozilla/5.0', 'cf-connecting-ip': '203.0.113.10' },
  });
  for (const brokenEnv of [
    { ...env, CLICK_INGEST_SECRET: '' },
    { ...env, CLICK_INGEST_SECRET: 'curto' },
    { ...env, CLICK_FINGERPRINT_SECRET: '' },
    { ...env, CLICK_FINGERPRINT_SECRET: 'curto' },
  ]) {
    let calls = 0;
    const response = await handleRequest(request, brokenEnv, async () => {
      calls += 1;
      return new Response(null, { status: 302, headers: { location: 'https://example.test' } });
    });
    assert.equal(response.status, 502);
    assert.equal(calls, 0);
  }
});

test('Worker preserva HEAD para validar sem registrar clique', async () => {
  const response = await handleRequest(new Request('https://link.example/m7p/0okxyzoxzuk-d', { method: 'HEAD' }), env, async (_input, init) => {
    assert.equal(init?.method, 'HEAD');
    return new Response(null, { status: 302, headers: { location: 'https://go.hotmart.com/K103806991N?src=fixture' } });
  });
  assert.equal(response.status, 302);
  assert.equal(await response.text(), '');
});

test('Worker fecha métodos e falhas do backend sem vazar detalhes', async () => {
  const method = await handleRequest(new Request('https://link.example/m7p/0okxyzoxzuk-d', { method: 'POST' }), env);
  assert.equal(method.status, 405);

  const validRequest = () => new Request('https://link.example/m7p/0okxyzoxzuk-d', {
    headers: { 'user-agent': 'Mozilla/5.0', 'cf-connecting-ip': '203.0.113.10' },
  });
  const missing = await handleRequest(validRequest(), env, async () => new Response(null, { status: 404 }));
  assert.equal(missing.status, 404);

  const broken = await handleRequest(validRequest(), env, async () => new Response(null, { status: 302 }));
  assert.equal(broken.status, 502);
});
