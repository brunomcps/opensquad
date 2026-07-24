import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('hotmart-pages-mapa7p-tracking-v1.js', import.meta.url), 'utf8');
const GLOBAL_KEY = '__MAPA7P_HOTMART_TRACKING_BRIDGE_V1__';

type Bridge = {
  version: string;
  isValidTrackingCode(value: unknown): boolean;
  readPageTracking(href: string): { trackingCode: string; utms: Record<string, string> } | null;
  buildTrackedCheckoutHref(checkoutHref: string, pageHref: string): string;
};

function loadBridge(extra: Record<string, unknown> = {}): { bridge: Bridge; context: Record<string, any> } {
  const context: Record<string, any> = { URL, ...extra };
  vm.runInNewContext(source, context, { filename: 'hotmart-pages-mapa7p-tracking-v1.js' });
  return { bridge: context[GLOBAL_KEY] as Bridge, context };
}

function fakeAnchor(href: string) {
  return {
    href,
    getAttribute(name: string) {
      return name === 'href' ? this.href : null;
    },
    setAttribute(name: string, value: string) {
      if (name === 'href') this.href = value;
    },
    matches(selector: string) {
      return selector === 'a[href]';
    },
    querySelectorAll() {
      return [];
    },
  };
}

test('aceita somente código Hotmart-safe com no máximo 30 caracteres e sem underline', () => {
  const { bridge } = loadBridge();
  assert.equal(bridge.version, '1.0.0');
  assert.equal(bridge.isValidTrackingCode('yt|g4q82cnz30|d|c4df'), true);
  assert.equal(bridge.isValidTrackingCode('yt-video-1-d-a1b2'), true);
  assert.equal(bridge.isValidTrackingCode('yt|g_4Q82Cnz30|d|c4df'), false);
  assert.equal(bridge.isValidTrackingCode('x'.repeat(31)), false);
  assert.equal(bridge.isValidTrackingCode(' campanha '), false);
  assert.equal(bridge.isValidTrackingCode('campanha?x=1'), false);
});

test('copia sck e somente UTMs permitidas sem apagar parâmetros nem fragmento do checkout', () => {
  const { bridge } = loadBridge();
  const page = 'https://brunosallesphd.kpages.online/mapa-triagem-tdah'
    + '?sck=yt%7Cg4q82cnz30%7Cd%7Cc4df&utm_source=youtube&utm_medium=organic'
    + '&utm_campaign=mapa7p-youtube&utm_content=g4q82cnz30-description&utm_id=nao-copiar';
  const checkout = 'https://pay.hotmart.com/K103806991N?off=vyqym0gx&checkoutMode=10&hotfeature=51#oferta';
  const tracked = new URL(bridge.buildTrackedCheckoutHref(checkout, page));

  assert.equal(tracked.searchParams.get('off'), 'vyqym0gx');
  assert.equal(tracked.searchParams.get('checkoutMode'), '10');
  assert.equal(tracked.searchParams.get('hotfeature'), '51');
  assert.equal(tracked.searchParams.get('sck'), 'yt|g4q82cnz30|d|c4df');
  assert.equal(tracked.searchParams.get('utm_source'), 'youtube');
  assert.equal(tracked.searchParams.get('utm_medium'), 'organic');
  assert.equal(tracked.searchParams.get('utm_campaign'), 'mapa7p-youtube');
  assert.equal(tracked.searchParams.get('utm_content'), 'g4q82cnz30-description');
  assert.equal(tracked.searchParams.get('utm_id'), null);
  assert.equal(tracked.hash, '#oferta');
});

test('usa utm_term válido como fallback e ignora sck inválido', () => {
  const { bridge } = loadBridge();
  const page = 'https://brunosallesphd.kpages.online/mapa-triagem-tdah'
    + '?sck=yt%7Cg_4Q82Cnz30%7Cd%7Cc4df&utm_term=yt%7Cg4q82cnz30%7Cd%7Cc4df';
  const checkout = 'https://pay.hotmart.com/K103806991N?off=vyqym0gx';
  const tracked = new URL(bridge.buildTrackedCheckoutHref(checkout, page));
  assert.equal(tracked.searchParams.get('sck'), 'yt|g4q82cnz30|d|c4df');
  assert.equal(tracked.searchParams.get('utm_term'), 'yt|g4q82cnz30|d|c4df');
});

test('não toca checkout de outro produto, outro host, protocolo inseguro ou URL sem campanha válida', () => {
  const { bridge } = loadBridge();
  const validPage = 'https://brunosallesphd.kpages.online/mapa-triagem-tdah?sck=yt%7Cvideo%7Cd%7Ca1b2';
  const invalidPage = 'https://brunosallesphd.kpages.online/mapa-triagem-tdah?sck=yt_video';
  const links = [
    'https://pay.hotmart.com/OUTRO?off=1',
    'https://pay.hotmart.com.evil.example/K103806991N?off=1',
    'http://pay.hotmart.com/K103806991N?off=1',
    'javascript:alert(1)',
  ];
  for (const link of links) {
    assert.equal(bridge.buildTrackedCheckoutHref(link, validPage), link);
  }
  const mapa = 'https://pay.hotmart.com/K103806991N?off=vyqym0gx';
  assert.equal(bridge.buildTrackedCheckoutHref(mapa, invalidPage), mapa);
});

test('reescreve anchors iniciais e anchors inseridos depois via MutationObserver', () => {
  const initial = fakeAnchor('https://pay.hotmart.com/K103806991N?off=vyqym0gx');
  const otherProduct = fakeAnchor('https://pay.hotmart.com/OUTRO?off=1');
  const mutation = { callback: null as ((records: any[]) => void) | null };
  let observed = false;

  class FakeMutationObserver {
    constructor(callback: (records: any[]) => void) {
      mutation.callback = callback;
    }
    observe(_target: unknown, options: Record<string, unknown>) {
      observed = options.childList === true && options.subtree === true && options.attributes === true;
    }
  }

  const document = {
    documentElement: {},
    querySelectorAll(selector: string) {
      return selector === 'a[href]' ? [initial, otherProduct] : [];
    },
  };
  loadBridge({
    document,
    location: {
      href: 'https://brunosallesphd.kpages.online/mapa-triagem-tdah?utm_term=yt%7Cvideo%7Cd%7Ca1b2&utm_source=youtube',
    },
    MutationObserver: FakeMutationObserver,
  });

  assert.equal(observed, true);
  assert.equal(new URL(initial.href).searchParams.get('sck'), 'yt|video|d|a1b2');
  assert.equal(otherProduct.href, 'https://pay.hotmart.com/OUTRO?off=1');

  const late = fakeAnchor('https://pay.hotmart.com/K103806991N?off=vyqym0gx&checkoutMode=10');
  assert.ok(mutation.callback);
  mutation.callback([{ type: 'childList', addedNodes: [late] }]);
  assert.equal(new URL(late.href).searchParams.get('sck'), 'yt|video|d|a1b2');
  assert.equal(new URL(late.href).searchParams.get('checkoutMode'), '10');
});

test('falha aberto quando DOM ou MutationObserver dá erro', () => {
  const original = 'https://pay.hotmart.com/K103806991N?off=vyqym0gx';
  const brokenAnchor = {
    getAttribute() { return original; },
    setAttribute() { throw new Error('DOM bloqueado'); },
    matches() { return true; },
    querySelectorAll() { return []; },
  };
  const document = {
    documentElement: {},
    querySelectorAll() { return [brokenAnchor]; },
  };
  const { context } = loadBridge({
    document,
    location: { href: 'https://example.test/?sck=yt%7Cvideo%7Cd%7Ca1b2' },
    MutationObserver: class {
      constructor() { throw new Error('observer indisponível'); }
    },
  });
  assert.equal(context[GLOBAL_KEY].runtime.active, true);
  assert.equal(context[GLOBAL_KEY].runtime.observer, null);
  assert.equal(brokenAnchor.getAttribute(), original);
});
