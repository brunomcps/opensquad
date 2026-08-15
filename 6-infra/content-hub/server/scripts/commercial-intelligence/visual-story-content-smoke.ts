import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Locator, type Page } from 'playwright-core';

const executableCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean) as string[];
const executablePath = executableCandidates.find(candidate => fs.existsSync(candidate));
if (!executablePath) throw new Error('Chrome ou Edge não encontrado para o smoke visual.');

const baseUrl = process.env.CI_PREVIEW_URL || 'http://127.0.0.1:4175';
function bundledSupabaseUrl(): string | undefined {
  const assetDirectory = path.resolve(process.cwd(), 'dist-ci/assets');
  if (!fs.existsSync(assetDirectory)) return undefined;
  for (const file of fs.readdirSync(assetDirectory).filter(name => name.endsWith('.js'))) {
    const match = fs.readFileSync(path.join(assetDirectory, file), 'utf8').match(/https:\/\/[a-z0-9-]+\.supabase\.co/i);
    if (match) return match[0];
  }
  return undefined;
}
const supabaseUrl = process.env.VITE_SUPABASE_URL || bundledSupabaseUrl();
if (!supabaseUrl) throw new Error('VITE_SUPABASE_URL é necessária para preparar a sessão visual.');
const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
const evidence = path.resolve(process.cwd(), 'docs/commercial-intelligence/evidence/story-content');
fs.mkdirSync(evidence, { recursive: true });

const now = new Date('2026-07-24T13:00:00.000Z');
const session = {
  access_token: 'fixture-access-token', token_type: 'bearer', expires_in: 86_400,
  expires_at: Math.floor(Date.now() / 1000) + 86_400, refresh_token: 'fixture-refresh-token',
  user: {
    id: 'fixture-user', aud: 'authenticated', role: 'authenticated', email: 'contact@brunosalles.com',
    email_confirmed_at: now.toISOString(), phone: '', confirmation_sent_at: null, confirmed_at: now.toISOString(),
    last_sign_in_at: now.toISOString(), app_metadata: {}, user_metadata: {}, identities: [],
    created_at: now.toISOString(), updated_at: now.toISOString(), is_anonymous: false,
  },
};

const quality = {
  ok: true, member: { role: 'admin' },
  quality: {
    generatedAt: now.toISOString(), overallStatus: 'healthy',
    coverage: { requestedStart: '2026-06-20', requestedEnd: '2026-07-24', youtubeDatesPresent: 35, youtubeMissingDates: [] },
    configuration: { database: true, hotmartWebhook: true, buyerHmac: true }, sources: [], alerts: [],
  },
};

const templates = [
  {
    templateId: '20000000-0000-4000-8000-000000000001', name: 'Cena → lente → princípio',
    description: 'Parte de uma cena real, muda a leitura e termina revelando um princípio.',
    objective: 'Transformar rotina em posicionamento sem abrir com uma aula.',
    definition: {
      formula: 'História curta → pequena entrega → CTA específico',
      preserveRules: ['Abrir dentro de uma situação real.', 'Entregar valor antes do pedido.'],
      adaptRules: ['Trocar autoridade performática por observação clínica concreta.', 'Usar linguagem leiga sobre TDAH adulto.'],
      avoidRules: ['Promessa clínica.', 'CTA genérico sem relação com a história.'],
      risks: ['A explicação longa pode quebrar a progressão.'],
      steps: [
        { role: 'hook', instruction: 'Mostrar a cena real com uma frase curta.' },
        { role: 'development', instruction: 'Explicar o mecanismo em linguagem de gente.' },
        { role: 'closing', instruction: 'Fechar com uma pergunta ou convite específico.' },
      ],
      moldSteps: [
        { title: 'Cena', purpose: 'Entrar na história já em movimento.' },
        { title: 'Tensão', purpose: 'Nomear o atrito cotidiano.' },
        { title: 'Pequena entrega', purpose: 'Explicar um mecanismo útil sem aula longa.' },
        { title: 'CTA', purpose: 'Convidar para uma ação coerente com a história.' },
      ],
    },
    steps: [
      { role: 'hook', instruction: 'Mostrar a cena real com uma frase curta.' },
      { role: 'development', instruction: 'Explicar o mecanismo em linguagem de gente.' },
      { role: 'closing', instruction: 'Fechar com uma pergunta ou convite específico.' },
    ],
    tags: ['rotina', 'TDAH adulto', 'bastidor'], status: 'active', schemaVersion: 3,
    referenceCount: 7, publicationCount: 12, createdAt: now.toISOString(), updatedAt: now.toISOString(),
  },
  {
    templateId: '20000000-0000-4000-8000-000000000002', name: 'Contraste em três telas',
    description: 'Contraste visual com uma virada no segundo story.', objective: 'Quebrar uma leitura superficial do comportamento.',
    steps: [{ role: 'hook', instruction: 'Abrir com o contraste.' }, { role: 'closing', instruction: 'Entregar a virada.' }],
    tags: ['contraste', 'educação'], status: 'active', schemaVersion: 1,
    referenceCount: 3, publicationCount: 4, createdAt: now.toISOString(), updatedAt: now.toISOString(),
  },
];

const references = [
  {
    sequenceId: '31000000-0000-4000-8000-000000000001', kind: 'reference', title: 'Stories para Enriquecer, páginas 42–46',
    description: 'A referência mostra como uma história curta pode carregar uma pequena entrega e conduzir a um CTA sem separar método e exemplo.',
    analysis: {
      summary: 'A cena abre curiosidade, cada tela acrescenta uma função e o CTA nasce da entrega anterior.',
      narrativeArc: ['Situação reconhecível', 'Tensão concreta', 'Explicação útil', 'Convite específico'],
      whyItWorks: ['A progressão é visível.', 'A entrega paga a atenção antes do pedido.'],
      templateFit: 'A referência funciona como evidência metodológica do molde, não como anexo decorativo.',
    },
    platform: 'pdf', sourceAccount: 'Stories para Enriquecer', sourceUrl: 'https://example.com/stories-para-enriquecer.pdf',
    sourceStartedAt: '2026-07-23T18:00:00.000Z', sourceEndedAt: '2026-07-23T18:05:00.000Z',
    sequenceState: 'closed', publicationState: null, scheduledFor: null, publishedAt: null,
    contentRevision: 1, approvedRevision: null, approvedAt: null, reviewNote: null,
    template: { templateId: templates[0].templateId, name: templates[0].name },
    items: [
      {
        itemId: '41000000-0000-4000-8000-000000000001', mediaType: 'image',
        assetUrl: `${baseUrl}/story-references/stories-para-enriquecer/page-42.webp`, thumbnailUrl: null,
        textContent: 'A história cria contexto antes da entrega.', sourceOccurredAt: '2026-07-23T18:00:00.000Z', narrativeOrder: 1, narrativeRole: 'hook',
        metadata: { sourcePage: 42, canonicalPageAssetUrl: `${baseUrl}/story-references/stories-para-enriquecer/page-42.webp`, evidenceType: 'exemplo visual', sourceExcerpt: 'Use a história para preparar uma pequena entrega.', analysis: 'A página ancora o método em uma progressão concreta.', criticism: 'O exemplo original depende de autoridade performática.', brunoAdaptation: 'Usar uma cena real do consultório ou da rotina e explicar o mecanismo em linguagem leiga.', editorialStatus: 'adaptado', moldConsequence: 'O primeiro quadro abre dentro da cena, sem introdução didática.' },
      },
      {
        itemId: '41000000-0000-4000-8000-000000000002', mediaType: 'image',
        assetUrl: `${baseUrl}/story-references/stories-para-enriquecer/page-44.webp`, thumbnailUrl: null,
        textContent: 'A pequena entrega paga a atenção.', sourceOccurredAt: '2026-07-23T18:02:00.000Z', narrativeOrder: 2, narrativeRole: 'development',
        metadata: { sourcePage: 44, canonicalPageAssetUrl: `${baseUrl}/story-references/stories-para-enriquecer/page-44.webp`, evidenceType: 'diagrama', sourceExcerpt: 'Entregue algo pequeno e útil antes do CTA.', analysis: 'A entrega intermediária evita que a sequência vire só suspense.', criticism: 'A regra pode virar receita rígida se aplicada sem contexto.', brunoAdaptation: 'Dar uma explicação curta sobre TDAH adulto, sem prometer diagnóstico ou resultado.', editorialStatus: 'aprovado com adaptação', moldConsequence: 'Reservar um quadro específico para a pequena entrega.' },
      },
      {
        itemId: '41000000-0000-4000-8000-000000000003', mediaType: 'image',
        assetUrl: `${baseUrl}/story-references/stories-para-enriquecer/page-46.webp`, thumbnailUrl: null,
        textContent: 'O CTA fecha a progressão.', sourceOccurredAt: '2026-07-23T18:05:00.000Z', narrativeOrder: 3, narrativeRole: 'closing',
        metadata: { sourcePage: 46, canonicalPageAssetUrl: `${baseUrl}/story-references/stories-para-enriquecer/page-46.webp`, evidenceType: 'CTA', sourceExcerpt: 'O pedido precisa continuar a conversa aberta pela história.', analysis: 'O CTA funciona quando parece consequência, não interrupção.', criticism: 'CTAs agressivos enfraquecem a confiança.', brunoAdaptation: 'Convidar para responder, salvar ou conhecer o MAPA apenas quando houver ligação direta.', editorialStatus: 'adaptado', moldConsequence: 'Fechar com uma única ação específica.' },
      },
    ],
    createdAt: now.toISOString(), updatedAt: now.toISOString(),
  },
];

const basePublication = {
  sequenceId: '30000000-0000-4000-8000-000000000001', kind: 'publication', title: 'Academia depois de uma manhã travada',
  description: null, platform: 'instagram', sourceAccount: null, sourceUrl: null, sourceStartedAt: null, sourceEndedAt: null,
  sequenceState: 'open', scheduledFor: '2026-07-24T17:30:00.000Z', publishedAt: null,
  contentRevision: 2, approvedRevision: null, approvedAt: null, reviewNote: null,
  template: { templateId: templates[0].templateId, name: templates[0].name },
  items: [
    { itemId: '40000000-0000-4000-8000-000000000001', mediaType: 'text', assetUrl: null, thumbnailUrl: null, textContent: 'Hoje eu fiquei negociando comigo mesmo pra levantar e ir treinar.', sourceOccurredAt: '2026-07-24T12:03:00.000Z', narrativeOrder: 1, narrativeRole: 'hook' },
    { itemId: '40000000-0000-4000-8000-000000000002', mediaType: 'text', assetUrl: null, thumbnailUrl: null, textContent: 'Quando a tarefa demora pra devolver recompensa, começar costuma custar mais energia.', sourceOccurredAt: '2026-07-24T12:01:00.000Z', narrativeOrder: 2, narrativeRole: 'development' },
    { itemId: '40000000-0000-4000-8000-000000000003', mediaType: 'text', assetUrl: null, thumbnailUrl: null, textContent: 'O que ajuda a pessoa a atravessar esse primeiro minuto?', sourceOccurredAt: '2026-07-24T12:05:00.000Z', narrativeOrder: 3, narrativeRole: 'closing' },
  ],
  createdAt: now.toISOString(), updatedAt: now.toISOString(),
};

const publications = [
  { ...basePublication, publicationState: 'draft' },
  { ...basePublication, sequenceId: '30000000-0000-4000-8000-000000000002', title: 'Consultório, preparação entre pacientes', publicationState: 'approved', approvedRevision: 2, approvedAt: now.toISOString() },
];
const approvals = [{ ...basePublication, sequenceId: '30000000-0000-4000-8000-000000000003', title: 'Café antes da gravação', publicationState: 'pending_approval' }];

async function prepare(page: Page) {
  let revisionConflict = false;
  page.on('console', message => {
    if (message.type() === 'error') console.error(`[browser console] ${message.text()}`);
  });
  page.on('pageerror', error => console.error(`[browser pageerror] ${error.message}`));
  await page.addInitScript(([key, value]) => localStorage.setItem(key, JSON.stringify(value)), [storageKey, session] as const);
  await page.route('**/functions/v1/ci-quality*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(quality) }));
  await page.route('**/functions/v1/ci-content*', route => {
    if (route.request().method() !== 'GET') {
      const payload = route.request().postDataJSON() as { action?: string };
      if (payload.action === 'request_approval' && !revisionConflict) {
        revisionConflict = true;
        return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'publication revision conflict or invalid state' }) });
      }
    }
    const section = new URL(route.request().url()).searchParams.get('section');
    const refreshedPublications = revisionConflict
      ? publications.map((publication, index) => index === 0 ? { ...publication, contentRevision: 3, title: 'Academia, revisão atualizada em outra aba' } : publication)
      : publications;
    const body = section === 'templates'
      ? { ok: true, member: { role: 'admin' }, templates }
      : section === 'references'
        ? { ok: true, member: { role: 'admin' }, references }
        : { ok: true, member: { role: 'admin' }, publications: section === 'approvals' ? approvals : refreshedPublications };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  const templatesButton = page.getByRole('button', { name: 'Biblioteca de stories' });
  try {
    await templatesButton.waitFor();
  } catch (error) {
    console.error(`[smoke body] ${(await page.locator('body').innerText()).slice(0, 1200)}`);
    throw error;
  }
}

type ScrollOwner = 'document' | '.ci-conteudo';
const FINAL_EDGE_TOLERANCE_PX = 48;

type ScrollDiagnostics = {
  expectedOwner: ScrollOwner;
  actualScrollableOwners: ScrollOwner[];
  window: { scrollY: number; scrollHeight: number; clientHeight: number; maxScrollY: number; htmlOverflowY: string; bodyOverflowY: string };
  appRoot: { scrollTop: number; scrollHeight: number; clientHeight: number; overflowY: string } | null;
  content: { scrollTop: number; scrollHeight: number; clientHeight: number; overflowY: string } | null;
};

async function scrollDiagnostics(page: Page, expectedOwner: ScrollOwner): Promise<ScrollDiagnostics> {
  return page.evaluate(expected => {
    const root = document.documentElement;
    const body = document.body;
    const appRoot = document.querySelector<HTMLElement>('#root');
    const content = document.querySelector<HTMLElement>('.ci-conteudo');
    const documentScrollHeight = Math.max(root.scrollHeight, body.scrollHeight);
    const documentClientHeight = root.clientHeight;
    const htmlOverflowY = getComputedStyle(root).overflowY;
    const bodyOverflowY = getComputedStyle(body).overflowY;
    const documentCanScroll = documentScrollHeight > documentClientHeight + 1
      && !['hidden', 'clip'].includes(htmlOverflowY)
      && !['hidden', 'clip'].includes(bodyOverflowY);
    const contentCanScroll = Boolean(content
      && content.scrollHeight > content.clientHeight + 1
      && ['auto', 'scroll', 'overlay'].includes(getComputedStyle(content).overflowY));
    const actualScrollableOwners: ScrollOwner[] = [];
    if (documentCanScroll) actualScrollableOwners.push('document');
    if (contentCanScroll) actualScrollableOwners.push('.ci-conteudo');
    return {
      expectedOwner: expected,
      actualScrollableOwners,
      window: {
        scrollY: window.scrollY,
        scrollHeight: documentScrollHeight,
        clientHeight: documentClientHeight,
        maxScrollY: Math.max(0, documentScrollHeight - documentClientHeight),
        htmlOverflowY,
        bodyOverflowY,
      },
      appRoot: appRoot ? {
        scrollTop: appRoot.scrollTop,
        scrollHeight: appRoot.scrollHeight,
        clientHeight: appRoot.clientHeight,
        overflowY: getComputedStyle(appRoot).overflowY,
      } : null,
      content: content ? {
        scrollTop: content.scrollTop,
        scrollHeight: content.scrollHeight,
        clientHeight: content.clientHeight,
        overflowY: getComputedStyle(content).overflowY,
      } : null,
    };
  }, expectedOwner);
}

async function waitForDocumentScrollToSettle(page: Page) {
  await page.evaluate(() => {
    (window as Window & { __ciDocumentScrollProbe?: { lastY: number; stableFrames: number } }).__ciDocumentScrollProbe = {
      lastY: window.scrollY,
      stableFrames: 0,
    };
  });
  await page.waitForFunction(() => {
    const probeWindow = window as Window & { __ciDocumentScrollProbe?: { lastY: number; stableFrames: number } };
    const root = document.documentElement;
    const maxScrollY = Math.max(0, Math.max(root.scrollHeight, document.body.scrollHeight) - root.clientHeight);
    const y = window.scrollY;
    const probe = probeWindow.__ciDocumentScrollProbe;
    if (!probe) return false;
    if (Math.abs(y - maxScrollY) <= 1) return true;
    if (Math.abs(y - probe.lastY) <= 0.5) probe.stableFrames += 1;
    else probe.stableFrames = 0;
    probe.lastY = y;
    return probe.stableFrames >= 3;
  }, undefined, { polling: 'raf', timeout: 2_000 });
}

function reportScrollDiagnostics(label: string, phase: 'initial' | 'final', diagnostics: ScrollDiagnostics) {
  console.log(`[scroll diagnostic] ${JSON.stringify({ label, phase, ...diagnostics })}`);
}

async function assertNativeDocumentReach(page: Page, label: string, finalTarget: Locator) {
  await finalTarget.waitFor({ state: 'attached' });
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    const appRoot = document.querySelector<HTMLElement>('#root');
    const content = document.querySelector<HTMLElement>('.ci-conteudo');
    if (appRoot) appRoot.scrollTop = 0;
    if (content) content.scrollTop = 0;
  });
  const initial = await scrollDiagnostics(page, 'document');
  reportScrollDiagnostics(label, 'initial', initial);

  // Depois do reset, só o viewport/documento pode ser movimentado. Em particular,
  // não use scrollIntoView: ele pode rolar .ci-conteudo e mascarar o bug mobile.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await waitForDocumentScrollToSettle(page);

  const targetState = await finalTarget.evaluate((element, tolerance) => {
    const target = element.getBoundingClientRect();
    const contentAreaElement = document.querySelector<HTMLElement>('.ci-content-area');
    if (!contentAreaElement) throw new Error('.ci-content-area não encontrada.');
    const contentArea = contentAreaElement.getBoundingClientRect();
    return {
      bottomEdgeReachable: target.bottom >= -tolerance && target.bottom <= window.innerHeight + tolerance,
      target: { top: target.top, right: target.right, bottom: target.bottom, left: target.left, width: target.width, height: target.height },
      contentArea: { top: contentArea.top, right: contentArea.right, bottom: contentArea.bottom, left: contentArea.left, width: contentArea.width, height: contentArea.height },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      bottomGap: Math.abs(contentArea.bottom - target.bottom),
    };
  }, FINAL_EDGE_TOLERANCE_PX);
  const final = await scrollDiagnostics(page, 'document');
  reportScrollDiagnostics(label, 'final', final);

  if (final.window.scrollY <= initial.window.scrollY) {
    throw new Error(`[mobile/${label}] rolagem nativa do documento não avançou: window.scrollY ${initial.window.scrollY} -> ${final.window.scrollY} (esperado > ${initial.window.scrollY}); dono esperado: document; donos roláveis detectados: ${JSON.stringify(final.actualScrollableOwners)}. Diagnóstico geométrico completo: ${JSON.stringify({ initial, final, targetState })}`);
  }
  if (!final.actualScrollableOwners.includes('document') || final.actualScrollableOwners.includes('.ci-conteudo')) {
    throw new Error(`[mobile/${label}] donos roláveis detectados foram ${JSON.stringify(final.actualScrollableOwners)}; esperado document presente e .ci-conteudo ausente. Diagnóstico geométrico completo: ${JSON.stringify({ initial, final, targetState })}`);
  }
  if (final.appRoot?.scrollTop !== initial.appRoot?.scrollTop) {
    throw new Error(`[mobile/${label}] #root.scrollTop mudou durante a rolagem do documento: ${initial.appRoot?.scrollTop ?? 'indisponível'} -> ${final.appRoot?.scrollTop ?? 'indisponível'}.`);
  }
  if (final.content?.scrollTop !== initial.content?.scrollTop) {
    throw new Error(`[mobile/${label}] .ci-conteudo.scrollTop mudou durante a rolagem do documento: ${initial.content?.scrollTop ?? 'indisponível'} -> ${final.content?.scrollTop ?? 'indisponível'}.`);
  }
  if (!targetState.bottomEdgeReachable) {
    throw new Error(`[mobile/${label}] borda inferior do alvo terminal não ficou dentro/próxima do viewport (tolerância=${FINAL_EDGE_TOLERANCE_PX}px). Diagnóstico geométrico completo: ${JSON.stringify({ initial, final, targetState })}`);
  }
  if (targetState.bottomGap > FINAL_EDGE_TOLERANCE_PX) {
    throw new Error(`[mobile/${label}] alvo terminal não representa o fim de .ci-content-area: distância entre bordas inferiores=${targetState.bottomGap}px (tolerância=${FINAL_EDGE_TOLERANCE_PX}px). Diagnóstico geométrico completo: ${JSON.stringify({ initial, final, targetState })}`);
  }
}

async function assertDesktopInternalScroll(page: Page) {
  const content = page.locator('.ci-conteudo');
  await content.waitFor();
  const originalContentScrollTop = await content.evaluate(element => element.scrollTop);
  const originalWindowScrollY = await page.evaluate(() => window.scrollY);
  await content.evaluate(element => element.scrollTo(0, 0));
  const initial = await scrollDiagnostics(page, '.ci-conteudo');
  reportScrollDiagnostics('Desktop', 'initial', initial);
  if (!initial.content) throw new Error('[desktop] .ci-conteudo não encontrado para diagnosticar rolagem interna.');
  if (initial.content.overflowY !== 'auto') {
    throw new Error(`[desktop] .ci-conteudo deveria preservar overflow-y:auto, mas recebeu ${initial.content.overflowY}.`);
  }
  if (initial.content.scrollHeight <= initial.content.clientHeight + 1) {
    throw new Error(`[desktop] conteúdo não excedeu o painel: scrollHeight=${initial.content.scrollHeight}, clientHeight=${initial.content.clientHeight}.`);
  }
  await content.evaluate(element => element.scrollTo(0, element.scrollHeight));
  await page.waitForFunction(() => (document.querySelector<HTMLElement>('.ci-conteudo')?.scrollTop || 0) > 0);
  const final = await scrollDiagnostics(page, '.ci-conteudo');
  reportScrollDiagnostics('Desktop', 'final', final);
  if (!final.actualScrollableOwners.includes('.ci-conteudo') || final.actualScrollableOwners.includes('document')) {
    throw new Error(`[desktop] donos roláveis detectados foram ${JSON.stringify(final.actualScrollableOwners)}; esperado .ci-conteudo presente e document ausente. Diagnóstico: ${JSON.stringify({ initial, final })}`);
  }
  if (!final.content || final.content.scrollTop <= initial.content.scrollTop) {
    throw new Error(`[desktop] scrollTop de .ci-conteudo não avançou: ${initial.content.scrollTop} -> ${final.content?.scrollTop ?? 'indisponível'}.`);
  }
  if (final.window.scrollY !== originalWindowScrollY) {
    throw new Error(`[desktop] window.scrollY mudou durante a rolagem interna: ${originalWindowScrollY} -> ${final.window.scrollY}. Diagnóstico: ${JSON.stringify({ initial, final })}`);
  }
  await content.evaluate((element, scrollTop) => element.scrollTo(0, scrollTop), originalContentScrollTop);
  await page.waitForFunction(expected => Math.abs((document.querySelector<HTMLElement>('.ci-conteudo')?.scrollTop ?? -1) - expected) <= 1, originalContentScrollTop, { polling: 'raf', timeout: 2_000 });
}

const keepOpen = process.env.CI_KEEP_OPEN === '1';
const browser = await chromium.launch({ executablePath, headless: !keepOpen });
try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await prepare(desktop);
  await desktop.getByRole('button', { name: 'Biblioteca de stories' }).click();
  await desktop.getByText('Cena → lente → princípio', { exact: true }).first().waitFor();
  await assertDesktopInternalScroll(desktop);
  await desktop.screenshot({ path: path.join(evidence, 'desktop-templates.png'), fullPage: true });
  await desktop.getByText('Ensinamento original', { exact: true }).first().scrollIntoViewIfNeeded();
  const brokenEvidenceImages = await desktop.locator('.ci-story-evidence img').evaluateAll(images => images.filter(image => !(image as HTMLImageElement).complete || !(image as HTMLImageElement).naturalWidth).length);
  if (brokenEvidenceImages) throw new Error(`${brokenEvidenceImages} imagens de evidência não carregaram.`);
  await desktop.screenshot({ path: path.join(evidence, 'desktop-template-evidence.png') });
  await desktop.getByText('Molde aprovado · 9:16', { exact: true }).scrollIntoViewIfNeeded();
  await desktop.screenshot({ path: path.join(evidence, 'desktop-template-mold.png') });

  await desktop.getByRole('button', { name: 'Referências' }).click();
  await desktop.getByText('Stories para Enriquecer, páginas 42–46', { exact: true }).first().waitFor();
  await desktop.getByText('Contribuição de cada story', { exact: true }).waitFor();
  const referenceAspect = await desktop.locator('.ci-content-reference-detail .ci-content-preview').evaluate(element => {
    const box = element.getBoundingClientRect();
    return box.width / box.height;
  });
  if (Math.abs(referenceAspect - 9 / 16) > 0.015) throw new Error(`Preview da referência fora de 9:16: ${referenceAspect}`);
  await desktop.getByRole('button', { name: 'Nova referência' }).click();
  const pilotTemplate = await desktop.getByLabel('Template').inputValue();
  if (pilotTemplate !== templates[0].templateId) throw new Error('Piloto não selecionou o template Cena → lente → princípio.');
  if (await desktop.getByLabel(/URL da referência/).count() !== 3) throw new Error('Piloto precisa preservar os três prints ordenados.');
  await desktop.screenshot({ path: path.join(evidence, 'desktop-references.png'), fullPage: true });
  if (keepOpen) {
    console.log(JSON.stringify({ ok: true, interactivePreview: true, url: baseUrl }));
    await new Promise<void>(() => {});
  }

  await desktop.getByRole('button', { name: 'Publicações' }).click();
  await desktop.locator('.ci-content-preview').waitFor();
  const aspect = await desktop.locator('.ci-content-preview').evaluate(element => {
    const box = element.getBoundingClientRect();
    return box.width / box.height;
  });
  if (Math.abs(aspect - 9 / 16) > 0.015) throw new Error(`Preview fora de 9:16: ${aspect}`);
  await desktop.getByRole('button', { name: 'Enviar para aprovação' }).click();
  await desktop.getByText('A publicação mudou em outra aba. Recarreguei a revisão mais recente.', { exact: true }).waitFor();
  await desktop.getByText('Academia, revisão atualizada em outra aba', { exact: true }).first().waitFor();
  await desktop.screenshot({ path: path.join(evidence, 'desktop-publications.png'), fullPage: true });

  await desktop.getByRole('button', { name: 'Para aprovar' }).click();
  await desktop.getByRole('button', { name: /Aprovar revisão 2/ }).waitFor();
  await desktop.screenshot({ path: path.join(evidence, 'desktop-approvals.png'), fullPage: true });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await prepare(mobile);
  const mobileScrollFailures: Error[] = [];
  await mobile.getByRole('button', { name: 'Biblioteca de stories' }).click();
  await mobile.getByText('Ensinamento original', { exact: true }).first().waitFor();
  let overflow = await mobile.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  if (overflow > 1) throw new Error(`Dossiê integrado no móvel com overflow horizontal de ${overflow}px.`);
  await mobile.screenshot({ path: path.join(evidence, 'mobile-templates-integrated.png'), fullPage: true });
  await mobile.getByText('Ensinamento original', { exact: true }).first().scrollIntoViewIfNeeded();
  await mobile.screenshot({ path: path.join(evidence, 'mobile-template-evidence.png') });
  await mobile.getByText('Molde aprovado · 9:16', { exact: true }).scrollIntoViewIfNeeded();
  await mobile.screenshot({ path: path.join(evidence, 'mobile-template-mold.png') });
  try {
    await assertNativeDocumentReach(mobile, 'Biblioteca de stories', mobile.locator('.ci-story-learnings'));
    await mobile.screenshot({ path: path.join(evidence, 'mobile-templates-bottom.png') });
  } catch (error) {
    mobileScrollFailures.push(error instanceof Error ? error : new Error(String(error)));
  }

  await mobile.getByRole('button', { name: 'Publicações' }).click();
  await mobile.locator('.ci-content-preview').waitFor();
  overflow = await mobile.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  if (overflow > 1) throw new Error(`Layout móvel com overflow horizontal de ${overflow}px.`);
  await mobile.screenshot({ path: path.join(evidence, 'mobile-publications.png'), fullPage: true });
  try {
    // No mobile o preview tem order:-1; a borda inferior da cópia encerra o detalhe após o preview.
    await assertNativeDocumentReach(mobile, 'Publicações', mobile.locator('.ci-content-publication-detail .ci-content-detail-copy'));
  } catch (error) {
    mobileScrollFailures.push(error instanceof Error ? error : new Error(String(error)));
  }

  await mobile.getByRole('button', { name: 'Referências' }).click();
  await mobile.getByText('Contribuição de cada story', { exact: true }).waitFor();
  overflow = await mobile.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  if (overflow > 1) throw new Error(`Referências no móvel com overflow horizontal de ${overflow}px.`);
  await mobile.screenshot({ path: path.join(evidence, 'mobile-references.png'), fullPage: true });
  try {
    // No mobile o preview tem order:-1; a borda inferior da cópia encerra o detalhe após o preview.
    await assertNativeDocumentReach(mobile, 'Referências', mobile.locator('.ci-content-reference-detail .ci-content-detail-copy'));
  } catch (error) {
    mobileScrollFailures.push(error instanceof Error ? error : new Error(String(error)));
  }

  if (mobileScrollFailures.length) {
    throw new Error(`Rolagem nativa mobile falhou em ${mobileScrollFailures.length}/3 páginas:\n${mobileScrollFailures.map(error => `- ${error.message}`).join('\n')}`);
  }

  console.log(JSON.stringify({ ok: true, previewAspect: aspect, referenceAspect, mobileOverflow: overflow, brokenEvidenceImages, screenshots: 12 }));
} finally {
  await browser.close();
}
