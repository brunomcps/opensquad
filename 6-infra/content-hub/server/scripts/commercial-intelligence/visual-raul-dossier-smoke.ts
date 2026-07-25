import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from 'playwright-core';

const executableCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean) as string[];
const executablePath = executableCandidates.find(candidate => fs.existsSync(candidate));
if (!executablePath) throw new Error('Chrome ou Edge não encontrado para o smoke visual.');

const baseUrl = process.env.CI_PREVIEW_URL || 'http://127.0.0.1:4182';
const assetDirectory = path.resolve(process.cwd(), 'dist-ci/assets');
const bundledJavascript = fs.readdirSync(assetDirectory)
  .filter(name => name.endsWith('.js'))
  .map(name => fs.readFileSync(path.join(assetDirectory, name), 'utf8'))
  .join('\n');
const supabaseUrl = process.env.VITE_SUPABASE_URL
  || bundledJavascript.match(/https:\/\/[a-z0-9-]+\.supabase\.co/i)?.[0];
if (!supabaseUrl) throw new Error('URL do Supabase não encontrada no bundle.');

const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
const evidenceDirectory = path.resolve(
  process.cwd(),
  'docs/commercial-intelligence/evidence/raul-visual-dossier',
);
fs.mkdirSync(evidenceDirectory, { recursive: true });

const now = '2026-07-24T18:00:00.000Z';
const raulTemplateId = '20000000-0000-4000-8000-000000000101';
const historyTemplateId = '20000000-0000-4000-8000-000000000102';

const templates = [
  {
    templateId: raulTemplateId,
    name: 'Cena → lente → princípio',
    description: 'Cena cotidiana reinterpretada pela lente do especialista.',
    objective: 'Transformar rotina em posicionamento sem abrir com uma aula.',
    definition: {
      formula: 'Cena real → lente do especialista → reação do público → princípio pessoal',
      preserveRules: ['Função, continuidade espacial e hierarquia entre cena, prova e texto.'],
      adaptRules: ['Cenário, roupa, paleta, fonte, dado e interação para a linguagem do Bruno.'],
      avoidRules: ['Copiar avião, piada financeira ou caixa preta da referência.'],
      risks: ['Virar aula antes de pagar o gancho.'],
      steps: [
        { role: 'hook', instruction: 'Abrir uma cena reconhecível.' },
        { role: 'development', instruction: 'Aplicar a lente do especialista.' },
        { role: 'closing', instruction: 'Revelar um princípio.' },
      ],
      moldSteps: [
        {
          title: 'Cena e gancho',
          purpose: 'Abrir uma situação banal e visualmente comprovável.',
          fixedFunction: 'Comprovar a cena e abrir uma pergunta.',
          placeholders: [
            { kind: 'copy', label: 'Gancho específico que para antes da decisão' },
            { kind: 'scene', label: 'Cena real reconhecível' },
            { kind: 'person', label: 'Rosto ou pessoa apontando para a prova' },
            { kind: 'reaction', label: 'Resposta espontânea, se houver' },
          ],
        },
        {
          title: 'Lente do especialista',
          purpose: 'Reinterpretar a cena com repertório de nicho.',
          fixedFunction: 'Reinterpretar sem interromper a história.',
          placeholders: [
            { kind: 'copy', label: 'Payoff e interpretação de nicho' },
            { kind: 'scene', label: 'Segundo ângulo do ambiente' },
            { kind: 'proof', label: 'Dado, gráfico, artigo ou prova visual' },
            { kind: 'reaction', label: 'Reações do público' },
          ],
        },
        {
          title: 'Resposta e princípio',
          purpose: 'Revelar como o criador pensa.',
          fixedFunction: 'Usar o público para revelar um princípio.',
          placeholders: [
            { kind: 'scene', label: 'Continuidade do ambiente' },
            { kind: 'response', label: 'Print de comentário ou mensagem' },
            { kind: 'principle', label: 'Resposta que revela um princípio' },
            { kind: 'reaction', label: 'Reações ou próxima conversa' },
          ],
        },
      ],
    },
    steps: [
      { role: 'hook', instruction: 'Abrir uma cena reconhecível.' },
      { role: 'development', instruction: 'Aplicar a lente do especialista.' },
      { role: 'closing', instruction: 'Revelar um princípio.' },
    ],
    tags: ['cena real', 'lente do especialista', 'posicionamento'],
    status: 'active',
    schemaVersion: 2,
    referenceCount: 1,
    publicationCount: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    templateId: historyTemplateId,
    name: 'História → pequena entrega → CTA',
    description: 'História curta que entrega valor antes de pedir uma ação.',
    objective: 'Conduzir a um CTA que nasce da própria história.',
    definition: {
      formula: 'História curta → pequena entrega → CTA específico',
      preserveRules: ['Abrir dentro de uma situação real.', 'Entregar valor antes do pedido.'],
      adaptRules: ['Usar linguagem leiga sobre TDAH adulto.'],
      avoidRules: ['Promessa clínica.', 'CTA genérico.'],
      risks: ['Explicação longa demais.'],
      steps: [
        { role: 'hook', instruction: 'Abrir dentro da história.' },
        { role: 'development', instruction: 'Fazer uma pequena entrega.' },
        { role: 'closing', instruction: 'Fechar com CTA específico.' },
      ],
      moldSteps: [
        { title: 'História', purpose: 'Abrir dentro de uma situação real.' },
        { title: 'Pequena entrega', purpose: 'Pagar a atenção com algo útil.' },
        { title: 'CTA', purpose: 'Pedir uma ação coerente com a história.' },
      ],
    },
    steps: [
      { role: 'hook', instruction: 'Abrir dentro da história.' },
      { role: 'development', instruction: 'Fazer uma pequena entrega.' },
      { role: 'closing', instruction: 'Fechar com CTA específico.' },
    ],
    tags: ['história', 'entrega', 'CTA'],
    status: 'active',
    schemaVersion: 3,
    referenceCount: 1,
    publicationCount: 0,
    createdAt: now,
    updatedAt: now,
  },
];

const roles = ['hook', 'development', 'closing'] as const;
const raulImages = [
  '01-conflito-no-aviao.jpg',
  '02-humor-e-inss.jpg',
  '03-principio-do-jato.jpg',
];
const visualTitles = [
  'Cena cotidiana com prova visual',
  'Virada de nicho com prova gráfica',
  'Status atribuído pelo público',
];
const raulItems = roles.map((role, index) => ({
  itemId: `41000000-0000-4000-8000-00000000010${index + 1}`,
  mediaType: 'image',
  assetUrl: `${baseUrl}/story-references/raul-sena/${raulImages[index]}`,
  thumbnailUrl: null,
  textContent: `Story ${index + 1} da referência do Raul.`,
  sourceOccurredAt: now,
  narrativeOrder: index + 1,
  narrativeRole: role,
  metadata: {
    evidenceType: 'reference_story',
    sourceExcerpt: `Trecho original do story ${index + 1}.`,
    analysis: `Evidência concreta do story ${index + 1}.`,
    audienceEffect: 'A sequência paga a promessa da tela anterior.',
    subtext: 'A autoridade aparece pela leitura da situação.',
    funnelFunction: 'Relacionamento e autoridade leve.',
    extractedRule: `Regra estrutural extraída do story ${index + 1}.`,
    editorialStatus: 'approved',
    moldConsequence: 'Preservar a função, sem copiar a superfície.',
    analysisSections: [
      {
        title: index === 1 ? 'O pulo do gato' : 'O que ele faz aqui',
        paragraphs: ['A cena continua enquanto o significado muda.'],
        bullets: ['Há evidência visual concreta.', 'A hierarquia conduz o olhar.'],
      },
    ],
    visual: {
      roleLabel: `Story ${index + 1} · ${['Rosto e contexto', 'POV e dado', 'Resposta e princípio'][index]}`,
      title: visualTitles[index],
      scene: 'Mesmo ambiente, com um elemento dominante diferente.',
      typography: 'Texto branco sobre caixa preta, com hierarquia consistente.',
      composition: 'Cena, prova e texto ocupam posições controladas.',
      graphic: index === 1 ? 'Gráfico vermelho como prova visual.' : undefined,
      palette: ['#111315', '#e9e5da', '#9f1831', '#d1ccc2'],
      impression: 'Espontaneidade com direção editorial.',
      markers: [
        { label: '1', description: 'Orienta o olhar para a evidência.' },
        { label: '2', description: 'Comprova visualmente a história.' },
      ],
    },
  },
}));

const historyItems = [42, 43, 44, 45, 46].map((pageNumber, index) => ({
  itemId: `42000000-0000-4000-8000-00000000010${index + 1}`,
  mediaType: 'image',
  assetUrl: `${baseUrl}/story-references/stories-para-enriquecer/page-${pageNumber}.webp`,
  thumbnailUrl: null,
  textContent: `Evidência da página ${pageNumber}.`,
  sourceOccurredAt: now,
  narrativeOrder: index + 1,
  narrativeRole: index === 0 ? 'hook' : index === 4 ? 'closing' : 'development',
  metadata: {
    sourcePage: pageNumber,
    canonicalPageAssetUrl: `${baseUrl}/story-references/stories-para-enriquecer/page-${pageNumber}.webp`,
    evidenceType: 'evidência metodológica',
    sourceExcerpt: `Ensinamento original da página ${pageNumber}.`,
    analysis: 'A página sustenta o método sem depender do dossiê do Raul.',
    criticism: 'A regra exige adaptação ao contexto.',
    brunoAdaptation: 'Aplicar ao conteúdo do Bruno.',
    editorialStatus: 'adaptado',
    moldConsequence: 'Preservar a progressão história, entrega e CTA.',
  },
}));

const references = [
  {
    sequenceId: '31000000-0000-4000-8000-000000000101',
    kind: 'reference',
    title: 'Raul Sena, cena → humor → princípio',
    description: 'A sequência vende uma forma de pensar.',
    analysis: {
      summary: 'O assunto aparente é a troca de assento; o produto real é a forma como Raul pensa.',
      overview: ['Cena cotidiana, humor de nicho, resposta do público e declaração de valores.'],
      narrativeArc: ['Identificação', 'Humor', 'Confiança'],
      whyItWorks: ['Cada tela paga a promessa anterior.'],
      templateFit: 'Cena cotidiana → piada de nicho → resposta → princípio.',
      sequenceMap: [
        { label: '1 · Gancho', value: 'Identificação + curiosidade' },
        { label: '2 · Recompensa', value: 'Humor + autoridade' },
        { label: '3 · Fechamento', value: 'Prova social + confiança' },
        { label: 'Produto real', value: 'Persona financeiramente racional' },
      ],
      visualGrammar: 'O ambiente continua; rosto, gráfico e print alternam como elemento dominante.',
      productRevealed: 'Uma persona acessível, espirituosa e financeiramente racional.',
      transferRules: ['Começar pela vida real.', 'Deixar a autoridade aparecer pela interpretação.'],
    },
    platform: 'instagram',
    sourceAccount: '@_raulsena',
    sourceUrl: 'https://www.instagram.com/_raulsena/',
    sourceStartedAt: now,
    sourceEndedAt: now,
    sequenceState: 'closed',
    publicationState: null,
    scheduledFor: null,
    publishedAt: null,
    contentRevision: 1,
    approvedRevision: null,
    approvedAt: null,
    reviewNote: null,
    template: { templateId: raulTemplateId, name: templates[0].name },
    items: raulItems,
    createdAt: now,
    updatedAt: now,
  },
  {
    sequenceId: '31000000-0000-4000-8000-000000000102',
    kind: 'reference',
    title: 'Stories para Enriquecer, páginas 42–46',
    description: 'Referência metodológica do template independente.',
    analysis: {
      summary: 'A história cria contexto, entrega valor e conduz ao CTA.',
      narrativeArc: ['História', 'Pequena entrega', 'CTA'],
      whyItWorks: ['O pedido nasce da entrega anterior.'],
      templateFit: 'História → pequena entrega → CTA.',
    },
    platform: 'pdf',
    sourceAccount: 'Stories para Enriquecer',
    sourceUrl: 'https://example.com/stories-para-enriquecer.pdf',
    sourceStartedAt: now,
    sourceEndedAt: now,
    sequenceState: 'closed',
    publicationState: null,
    scheduledFor: null,
    publishedAt: null,
    contentRevision: 1,
    approvedRevision: null,
    approvedAt: null,
    reviewNote: null,
    template: { templateId: historyTemplateId, name: templates[1].name },
    items: historyItems,
    createdAt: now,
    updatedAt: now,
  },
];

const session = {
  access_token: 'fixture-access-token',
  token_type: 'bearer',
  expires_in: 86_400,
  expires_at: Math.floor(Date.now() / 1000) + 86_400,
  refresh_token: 'fixture-refresh-token',
  user: {
    id: 'fixture-user',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'contact@brunosalles.com',
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: now,
    updated_at: now,
    is_anonymous: false,
  },
};

async function prepare(page: Page) {
  page.on('console', message => {
    if (message.type() === 'error') console.error(`[browser console] ${message.text()}`);
  });
  page.on('pageerror', error => console.error(`[browser pageerror] ${error.message}`));
  await page.addInitScript(([key, value]) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [storageKey, session] as const);
  await page.route('**/functions/v1/ci-quality*', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, member: { role: 'admin' }, quality: { overallStatus: 'healthy' } }),
  }));
  await page.route('**/functions/v1/ci-content*', route => {
    const section = new URL(route.request().url()).searchParams.get('section');
    const body = section === 'templates'
      ? { ok: true, member: { role: 'admin' }, templates }
      : section === 'references'
        ? { ok: true, member: { role: 'admin' }, references }
        : { ok: true, member: { role: 'admin' }, publications: [] };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  const templatesButton = page.getByRole('button', { name: 'Templates' });
  try {
    await templatesButton.waitFor({ timeout: 10_000 });
  } catch (error) {
    console.error(`[smoke body] ${(await page.locator('body').innerText()).slice(0, 1600)}`);
    throw error;
  }
  await templatesButton.click();
}

async function assertNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(
    () => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
  );
  if (overflow > 1) throw new Error(`${label} tem overflow horizontal de ${overflow}px.`);
}

async function assertImagesLoaded(page: Page, selector: string, expected: number) {
  const images = page.locator(selector);
  if (await images.count() !== expected) {
    throw new Error(`${selector} deveria ter ${expected} imagens.`);
  }
  for (let index = 0; index < expected; index += 1) {
    await images.nth(index).scrollIntoViewIfNeeded();
  }
  await page.waitForFunction(targetSelector => {
    const nodes = [...document.querySelectorAll<HTMLImageElement>(targetSelector)];
    return nodes.length > 0 && nodes.every(image => image.complete);
  }, selector);
  const broken = await images.evaluateAll(nodes => nodes.filter(node => {
    const image = node as HTMLImageElement;
    return !image.complete || !image.naturalWidth;
  }).length);
  if (broken) throw new Error(`${broken} imagens falharam em ${selector}.`);
}

const browser = await chromium.launch({ executablePath, headless: true });
try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await prepare(desktop);
  await desktop.getByText('Raio-X visual da referência', { exact: true }).waitFor();
  await desktop.getByText('Um storyboard funcional para modelar a estrutura', { exact: true }).waitFor();
  await desktop.getByText('Análise completa · Referência fundadora', { exact: true }).waitFor();
  await desktop.getByRole('button', { name: /Story 2/ }).click();
  await desktop.getByText('Virada de nicho com prova gráfica', { exact: true }).first().waitFor();
  await desktop.getByRole('button', { name: 'Sequência completa' }).click();
  await desktop.getByText('A história vende uma forma de pensar', { exact: true }).waitFor();
  await assertImagesLoaded(desktop, '.ci-visual-xray-grid img', 3);
  await assertNoHorizontalOverflow(desktop, 'Dossiê Raul no desktop');
  await desktop.screenshot({
    path: path.join(evidenceDirectory, 'desktop-raul-dossier.png'),
    fullPage: true,
  });

  await desktop.getByText('História → pequena entrega → CTA', { exact: true }).first().click();
  await desktop.getByText('Regras do método', { exact: true }).waitFor();
  await desktop.getByText('Stories para Enriquecer, páginas 42–46', { exact: true }).waitFor();
  await desktop.getByText('Molde aprovado · 9:16', { exact: true }).waitFor();
  if (await desktop.getByText('Raio-X visual da referência', { exact: true }).count()) {
    throw new Error('O template História → pequena entrega → CTA recebeu o dossiê do Raul.');
  }
  await assertImagesLoaded(desktop, '.ci-story-evidence img', 5);
  await desktop.screenshot({
    path: path.join(evidenceDirectory, 'desktop-history-delivery-cta.png'),
    fullPage: true,
  });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await prepare(mobile);
  await mobile.getByText('Raio-X visual da referência', { exact: true }).waitFor();
  await mobile.getByText('Um storyboard funcional para modelar a estrutura', { exact: true }).waitFor();
  await assertNoHorizontalOverflow(mobile, 'Dossiê Raul no mobile');
  await mobile.screenshot({
    path: path.join(evidenceDirectory, 'mobile-raul-dossier.png'),
    fullPage: true,
  });

  await mobile.getByText('História → pequena entrega → CTA', { exact: true }).first().click();
  await mobile.getByText('Stories para Enriquecer, páginas 42–46', { exact: true }).waitFor();
  await assertNoHorizontalOverflow(mobile, 'Template história no mobile');
  await assertImagesLoaded(mobile, '.ci-story-evidence img', 5);
  await mobile.screenshot({
    path: path.join(evidenceDirectory, 'mobile-history-delivery-cta.png'),
    fullPage: true,
  });

  console.log(JSON.stringify({
    ok: true,
    templatesVerified: [templates[0].name, templates[1].name],
    raulStories: raulItems.length,
    historyPages: historyItems.length,
    screenshots: 4,
  }));
} finally {
  await browser.close();
}
