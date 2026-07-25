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
  'docs/commercial-intelligence/evidence/raul-dossier-fidelity',
);
fs.mkdirSync(evidenceDirectory, { recursive: true });

const now = '2026-07-24T18:00:00.000Z';
const raulTemplateId = '20000000-0000-4000-8000-000000000101';
const historyTemplateId = '20000000-0000-4000-8000-000000000102';
const historyPayloadPath = path.resolve(
  process.cwd(),
  'docs/commercial-intelligence/stories-para-enriquecer/reference-payload.json',
);
const historyPayload = JSON.parse(fs.readFileSync(historyPayloadPath, 'utf8'));

const templates = [
  {
    templateId: raulTemplateId,
    name: 'Cena → lente → princípio',
    description: 'Cena cotidiana reinterpretada pela lente do especialista.',
    objective: 'Transformar rotina em posicionamento sem abrir com uma aula.',
    definition: {
      editorialName: 'Cena comum → lente do especialista → valor pessoal',
      editorialSummary: 'Raul Sena · 3 telas · dossiê completo',
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
const quickLayers = [
  {
    roleLabel: 'Story 1 · Identificação e curiosidade',
    title: 'A cena já contém a pergunta narrativa',
    summary: 'Uma situação cotidiana e comprovável abre uma pergunta antes da decisão.',
    evidence: 'O número “uma vez a cada 10 voos” dá aparência de observação real.',
    audienceEffect: 'A frase para antes da decisão e produz: “ele troca ou se recusa?”',
    subtext: 'A viagem comunica status, mas o assunto permanece cotidiano e acessível.',
    funnelFunction: 'Relacionamento. A situação discutível convida respostas espontâneas.',
    extractedRule: 'Comece por uma cena banal, específica e visualmente comprovável que já abra uma pergunta.',
  },
  {
    roleLabel: 'Story 2 · Recompensa, humor e autoridade',
    title: 'A cena muda de significado pela lente financeira',
    summary: 'O mesmo ambiente reaparece como POV e a situação vira uma interpretação de nicho.',
    evidence: 'O gráfico sobre o rombo do INSS materializa a piada financeira.',
    audienceEffect: 'A recompensa vem em humor e repertório, sem interromper a história.',
    subtext: 'Raul demonstra especialidade pela associação que faz, não por uma aula.',
    funnelFunction: 'Autoridade. O público reconhece uma leitura que pertence ao nicho.',
    extractedRule: 'A lente do especialista deve reinterpretar a cena e continuar a história.',
  },
  {
    roleLabel: 'Story 3 · Prova social, posicionamento e confiança',
    title: 'O público introduz o status e Raul revela o princípio',
    summary: 'A resposta de um seguidor permite fechar a sequência com um valor pessoal.',
    evidence: 'O print do comentário atribui status antes de Raul responder.',
    audienceEffect: 'A audiência recebe uma declaração de princípio sem autopromoção direta.',
    subtext: 'O status aparece pela voz do público; a resposta preserva sobriedade.',
    funnelFunction: 'Confiança. O fechamento revela como o criador toma decisões.',
    extractedRule: 'Use a reação da audiência para revelar um valor que organize suas escolhas.',
  },
];
const deepLayers = [
  {
    roleLabel: 'Story 1 · Identificação e curiosidade',
    title: 'A cena e o gancho',
    lead: 'Selfie no avião, uma família ao fundo e um dado específico. A pessoa entra pela situação concreta e quer descobrir como Raul vai reagir.',
    sections: [
      {
        title: 'O que ele faz aqui',
        bullets: [
          'Usa uma situação reconhecível e levemente incômoda.',
          'A família ao fundo comprova visualmente a história.',
        ],
      },
      {
        title: 'Função narrativa',
        paragraphs: ['É a abertura da novela: a pessoa avança para descobrir a decisão e comparar com a própria.'],
      },
    ],
    extractedRule: 'A cena inicial precisa ser específica, discutível e visualmente comprovável.',
  },
  {
    roleLabel: 'Story 2 · Recompensa, humor e autoridade',
    title: 'A virada para o nicho',
    lead: 'O POV do assento paga a curiosidade. A troca vira uma piada financeira sobre uma criança a mais colaborando com o INSS.',
    sections: [
      {
        title: 'O pulo do gato',
        paragraphs: ['A autoridade aparece como repertório espontâneo, sem virar explicação didática.'],
      },
      {
        title: 'Por que o gráfico está ali',
        bullets: ['O gráfico ancora a piada.', 'A mudança de enquadramento renova o estímulo.'],
      },
    ],
    extractedRule: 'A lente do especialista precisa reinterpretar a cena e continuar a história.',
  },
  {
    roleLabel: 'Story 3 · Prova social, posicionamento e confiança',
    title: 'Dinheiro, status e valores',
    lead: 'O público atribui status e Raul responde com sobriedade. A cena termina revelando um princípio de decisão financeira.',
    sections: [
      {
        title: 'O que está sendo comunicado',
        paragraphs: ['A resposta transforma elogio em posicionamento e fecha a narrativa com um valor pessoal.'],
      },
      {
        title: 'Prova social indireta',
        bullets: ['O status vem do seguidor.', 'Raul controla o fechamento pela resposta.'],
      },
    ],
    extractedRule: 'O fechamento deve revelar um princípio sem transformar status em autopropaganda.',
  },
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
    quick: quickLayers[index],
    deep: deepLayers[index],
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

const historyAssets = new Map(
  historyPayload.assets.map((asset: { localPath: string; narrativeOrder: number }) => [
    asset.narrativeOrder,
    path.basename(asset.localPath),
  ]),
);
const historyItems = historyPayload.reference.items.map((
  item: Record<string, unknown> & {
    metadata: Record<string, unknown>;
    narrativeOrder: number;
    sourceOccurredAt: string | null;
  },
  index: number,
) => {
  const assetName = historyAssets.get(item.narrativeOrder);
  if (!assetName) throw new Error(`Asset ausente para o story ${item.narrativeOrder}.`);
  const assetUrl = `${baseUrl}/story-references/stories-para-enriquecer/sequence-page-44/${assetName}`;
  return {
    ...item,
    itemId: `42000000-0000-4000-8000-00000000010${index + 1}`,
    assetUrl,
    thumbnailUrl: null,
    sourceOccurredAt: item.sourceOccurredAt || now,
    metadata: {
      ...item.metadata,
      canonicalPageAssetUrl: assetUrl,
    },
  };
});

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
      synthesis: [
        {
          title: 'Papel de cada tela',
          paragraphs: [
            'Story 1: identificação e curiosidade.',
            'Story 2: recompensa, humor e autoridade.',
            'Story 3: prova social, posicionamento e confiança.',
          ],
        },
        {
          title: 'Mudança de estímulo',
          paragraphs: ['Rosto → ambiente com gráfico → ambiente com print de seguidor.'],
        },
        {
          title: 'Estética e produção',
          paragraphs: ['Selfie, câmera no chão, print de mensagem e texto nativo do Instagram.'],
        },
        {
          title: 'Forças e limitações',
          paragraphs: [
            'A sequência combina prova visual, humor, autoridade indireta e status atribuído por terceiro.',
            'O gráfico é pouco legível e a piada depende de contexto.',
          ],
        },
      ],
      registeredTemplate: {
        name: 'Cena comum → lente do especialista → valor pessoal',
        steps: [
          {
            title: 'Cena real com pequeno conflito',
            description: 'Acontecimento banal, específico e visualmente comprovável.',
          },
          {
            title: 'Virada de nicho',
            description: 'Piada, dado ou interpretação que somente aquele especialista faria.',
          },
          {
            title: 'Resposta do público',
            description: 'Comentário ou mensagem vira continuação narrativa.',
          },
          {
            title: 'Declaração de princípio',
            description: 'A resposta revela como o criador pensa e toma decisões.',
          },
        ],
      },
      sourceNote: 'Referência fundadora: sequência de 3 stories de Raul Sena. Análise vinculada ao template, sem separar referência e abstração.',
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

Object.assign(templates[1], historyPayload.template, {
  templateId: historyTemplateId,
  status: 'active',
  schemaVersion: 4,
  referenceCount: 1,
  publicationCount: 0,
  createdAt: now,
  updatedAt: now,
});
Object.assign(references[1], historyPayload.reference, {
  sequenceId: '31000000-0000-4000-8000-000000000102',
  template: { templateId: historyTemplateId, name: historyPayload.template.name },
  items: historyItems,
  createdAt: now,
  updatedAt: now,
});

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

async function prepare(page: Page, initialPath = '/?tab=content-templates') {
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
  await page.goto(`${baseUrl}${initialPath}`, { waitUntil: 'networkidle' });
  const templatesButton = page.getByRole('button', { name: 'Biblioteca de stories' });
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

async function assertSelectorCount(page: Page, selector: string, expected: number) {
  const actual = await page.locator(selector).count();
  if (actual !== expected) {
    throw new Error(`${selector} deveria ter ${expected} elementos, mas tem ${actual}.`);
  }
}

async function assertExpandedSectionSpansLibrary(page: Page, selector: string) {
  const geometry = await page.evaluate(targetSelector => {
    const library = document.querySelector('.ci-content-library-grid.is-visual-dossier')?.getBoundingClientRect();
    const section = document.querySelector(targetSelector)?.getBoundingClientRect();
    return library && section
      ? { leftDelta: Math.abs(section.left - library.left), widthDelta: Math.abs(section.width - library.width) }
      : null;
  }, selector);
  if (!geometry || geometry.leftDelta > 2 || geometry.widthDelta > 2) {
    throw new Error(`${selector} não cobre a largura da lista e do modo rápido.`);
  }
}

async function assertActiveAnchor(page: Page, id: string) {
  await page.waitForFunction(
    targetId => document.activeElement?.id === targetId,
    id,
  );
}

async function captureViewport(page: Page, selector: string, fileName: string) {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(evidenceDirectory, fileName),
    fullPage: false,
  });
}

async function assertIndependentTemplate(page: Page, expectDesktopSpan = true) {
  try {
    await page
      .getByRole('heading', {
        name: 'Pergunta concreta → microdiagnóstico → progressão → CTA',
        exact: true,
      })
      .waitFor({ timeout: 10_000 });
  } catch (error) {
    console.error(`[independent template body] ${(await page.locator('body').innerText()).slice(0, 3000)}`);
    throw error;
  }
  await page.getByText('A audiência se localiza pelo crescimento', { exact: true }).waitFor();
  await assertImagesLoaded(page, '.ci-dossier-quick img', 5);
  await assertSelectorCount(page, '.ci-dossier-quick', 1);
  await assertSelectorCount(page, '.ci-dossier-xray-grid > article', 4);
  await assertSelectorCount(page, '.ci-dossier-deep-story', 4);
  await page
    .locator('.ci-dossier-deep')
    .getByText('O sintoma cotidiano vira uma porta para o sistema', { exact: true })
    .waitFor();
  await page.locator('.ci-dossier-story-rail').evaluate(element => {
    element.scrollLeft = 0;
  });
  await captureViewport(
    page,
    '.ci-dossier-quick',
    expectDesktopSpan ? 'desktop-stories-quick.png' : 'mobile-stories-quick.png',
  );
  for (const raulCopy of [
    'A cena já contém a pergunta narrativa',
    'Cena cotidiana com prova visual',
    'Como esta sequência revela o posicionamento de @_raulsena',
  ]) {
    if (await page.getByText(raulCopy, { exact: true }).count()) {
      throw new Error(`A referência do PDF recebeu conteúdo específico do Raul: ${raulCopy}.`);
    }
  }

  await page.getByRole('tab', { name: 'Biblioteca do PDF · 17', exact: true }).click();
  await page.getByRole('heading', { name: 'Biblioteca Stories para Enriquecer', exact: true }).waitFor();
  await assertSelectorCount(page, '.ci-source-library-index > button', 17);
  if (expectDesktopSpan) {
    await assertExpandedSectionSpansLibrary(page, '.ci-source-library');
  }

  const search = page.getByLabel('Buscar na biblioteca do PDF');
  await search.fill('oratória');
  await page.getByRole('heading', { name: 'Oratória, dicção e presença', exact: true }).waitFor();
  await assertSelectorCount(page, '.ci-source-library-index > button', 1);
  await search.fill('');
  await assertSelectorCount(page, '.ci-source-library-index > button', 17);
  await page.locator('.ci-source-library-index > button').first().click();
  await page.getByRole('heading', { name: 'Capricho sem enfeite', exact: true }).waitFor();
}

function assertFixtureIntegrity() {
  if (raulItems.length !== 3) throw new Error('A fixture do Raul deve ter exatamente três stories.');
  for (const [index, item] of raulItems.entries()) {
    const titles = [
      item.metadata.quick.title,
      item.metadata.visual.title,
      item.metadata.deep.title,
    ].map(title => title.trim().toLocaleLowerCase('pt-BR'));
    if (new Set(titles).size !== 3) {
      throw new Error(`Story ${index + 1} mistura títulos das camadas quick, visual e deep.`);
    }
  }
  const analysis = references[0].analysis;
  if (analysis.synthesis?.length !== 4) throw new Error('A fixture deve conter quatro sínteses.');
  if (analysis.registeredTemplate?.steps.length !== 4) {
    throw new Error('A fixture deve conter quatro passos do template registrado.');
  }
  if (historyItems.length !== 4) {
    throw new Error('A referência do PDF deve conter os quatro stories reais da página 44.');
  }
  for (const [index, item] of historyItems.entries()) {
    if (item.metadata.sourcePage !== 44) {
      throw new Error(`Story ${index + 1} não aponta para a página 44.`);
    }
    if (!item.metadata.quick || !item.metadata.visual || !item.metadata.deep) {
      throw new Error(`Story ${index + 1} não contém as três camadas do dossiê.`);
    }
  }
  if (historyPayload.reference.analysis.sourceLibrary.modules.length !== 17) {
    throw new Error('A biblioteca do PDF deve conter os 17 módulos catalogados.');
  }
}

assertFixtureIntegrity();

const browser = await chromium.launch({ executablePath, headless: true });
try {
  const quickId = `dossier-${raulTemplateId}`;
  const visualId = `${quickId}-visual`;
  const deepId = `${quickId}-deep`;
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await prepare(
    desktop,
    `/?tab=content-templates&template=${raulTemplateId}&reference=${references[0].sequenceId}`,
  );
  const loadedUrl = new URL(desktop.url());
  if (loadedUrl.searchParams.get('template') !== raulTemplateId
    || loadedUrl.searchParams.get('reference') !== references[0].sequenceId) {
    throw new Error('O deep link não preservou template e referência após a hidratação.');
  }
  await desktop.getByRole('heading', { name: 'Biblioteca de stories', exact: true }).waitFor();
  await desktop.locator('.ci-dossier-quick').waitFor();
  if (await desktop.getByText(/Dossiê vivo · versão/i).count()) {
    throw new Error('O cabeçalho administrativo antigo ainda aparece antes do modo rápido.');
  }
  if (await desktop.getByRole('heading', { name: 'Templates de stories', exact: true }).count()) {
    throw new Error('O cabeçalho genérico de templates ainda precede o dossiê visual.');
  }
  for (const oldTab of ['Leitura', 'Arquitetura', 'Template', 'Aplicação']) {
    if (await desktop.getByRole('tab', { name: oldTab, exact: true }).count()) {
      throw new Error(`A aba experimental ${oldTab} ainda existe.`);
    }
  }
  await desktop.getByText(quickLayers[0].title, { exact: true }).waitFor();
  await assertNoHorizontalOverflow(desktop, 'Modo rápido no desktop 1440');
  await captureViewport(desktop, '.ci-dossier-quick', 'desktop-quick.png');

  for (const [index, layer] of quickLayers.entries()) {
    await desktop.getByRole('button', { name: new RegExp(`Story ${index + 1}`) }).click();
    await desktop.locator('.ci-dossier-quick').getByText(layer.title, { exact: true }).waitFor();
  }
  await desktop.getByRole('button', { name: 'Sequência completa' }).click();
  await assertImagesLoaded(desktop, '.ci-dossier-quick img', 6);
  await desktop.getByRole('button', { name: /Story 1/ }).click();

  await desktop.getByRole('button', { name: 'Ver raio-X visual' }).click();
  await assertActiveAnchor(desktop, visualId);
  await desktop.getByText('Raio-X visual da referência', { exact: true }).waitFor();
  await assertSelectorCount(desktop, '.ci-dossier-xray-grid > article', 3);
  await assertExpandedSectionSpansLibrary(desktop, '.ci-dossier-xray');
  await assertImagesLoaded(desktop, '.ci-dossier-xray-grid img', 3);
  for (const title of visualTitles) {
    await desktop.locator('.ci-dossier-xray-grid').getByText(title, { exact: true }).waitFor();
  }
  await captureViewport(desktop, '.ci-dossier-xray-grid', 'desktop-xray.png');

  await desktop.getByText('Um storyboard funcional para modelar a estrutura', { exact: true }).waitFor();
  await assertSelectorCount(desktop, '.ci-dossier-mold-grid .ci-dossier-mold-phone', 3);
  await captureViewport(desktop, '.ci-dossier-mold-grid', 'desktop-mold.png');

  await desktop.getByRole('button', { name: 'Abrir análise completa' }).click();
  await assertActiveAnchor(desktop, deepId);
  await desktop.getByText('Leitura geral', { exact: true }).waitFor();
  await assertExpandedSectionSpansLibrary(desktop, '.ci-dossier-deep');
  await assertSelectorCount(desktop, '.ci-dossier-deep-story', 3);
  await assertImagesLoaded(desktop, '.ci-dossier-deep-story img', 3);
  for (const layer of deepLayers) {
    await desktop.locator(`#${deepId}`).getByText(layer.title, { exact: true }).waitFor();
  }
  await assertSelectorCount(desktop, '.ci-dossier-synthesis-grid > article', 4);
  await desktop.getByText('Template registrado', { exact: true }).waitFor();
  await assertSelectorCount(desktop, '.ci-dossier-registered-template .ci-dossier-template-step', 4);
  for (const rule of references[0].analysis.transferRules || []) {
    await desktop.getByText(rule, { exact: true }).waitFor();
  }
  await desktop.getByText(references[0].analysis.sourceNote || '', { exact: true }).waitFor();
  await captureViewport(desktop, `#${deepId}`, 'desktop-deep.png');

  await desktop.getByRole('button', { name: 'Voltar ao modo rápido' }).click();
  await assertActiveAnchor(desktop, quickId);
  await desktop.getByRole('button', { name: 'Usar este molde' }).click();
  await desktop.getByRole('heading', { name: 'Publicações de stories', exact: true }).waitFor();
  const selectedTemplate = desktop.getByLabel('Template');
  await selectedTemplate.waitFor();
  if (await selectedTemplate.inputValue() !== raulTemplateId) {
    throw new Error('Usar este molde não abriu Publicações com o template do Raul selecionado.');
  }

  await desktop.getByRole('button', { name: 'Biblioteca de stories' }).click();
  await desktop
    .locator('.ci-content-template-list button')
    .filter({ hasText: 'História → pequena entrega → CTA' })
    .click();
  await assertIndependentTemplate(desktop);
  await assertNoHorizontalOverflow(desktop, 'Biblioteca do PDF no desktop');
  await captureViewport(desktop, '.ci-source-library', 'desktop-stories-library.png');

  const wideDesktop = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await prepare(wideDesktop);
  await wideDesktop.locator('.ci-dossier-quick').waitFor();
  await assertNoHorizontalOverflow(wideDesktop, 'Dossiê Raul no desktop 1920');
  await wideDesktop.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await prepare(mobile);
  await mobile.locator('.ci-dossier-quick').waitFor();
  await assertNoHorizontalOverflow(mobile, 'Modo rápido no mobile');
  await captureViewport(mobile, '.ci-dossier-quick', 'mobile-quick.png');

  await mobile.getByRole('button', { name: 'Abrir análise completa' }).click();
  await assertActiveAnchor(mobile, deepId);
  await assertSelectorCount(mobile, '.ci-dossier-deep-story', 3);
  await assertNoHorizontalOverflow(mobile, 'Análise completa no mobile');
  await captureViewport(mobile, `#${deepId}`, 'mobile-deep.png');

  await mobile.getByRole('button', { name: 'Biblioteca de stories' }).click();
  await mobile
    .locator('.ci-content-template-list button')
    .filter({ hasText: 'História → pequena entrega → CTA' })
    .click();
  await assertIndependentTemplate(mobile, false);
  await assertNoHorizontalOverflow(mobile, 'Biblioteca do PDF no mobile');
  await captureViewport(mobile, '.ci-source-library', 'mobile-stories-library.png');

  console.log(JSON.stringify({
    ok: true,
    templatesVerified: 2,
    raulStories: raulItems.length,
    historyStories: historyItems.length,
    sourceLibraryModules: historyPayload.reference.analysis.sourceLibrary.modules.length,
    screenshots: 11,
  }));
} finally {
  await browser.close();
}
