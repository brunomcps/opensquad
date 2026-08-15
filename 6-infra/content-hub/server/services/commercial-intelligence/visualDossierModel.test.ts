import assert from 'node:assert/strict';
import test from 'node:test';
import type { StoryReferenceDto, StoryTemplateDto } from '../../../ci-app/src/api.ts';
import {
  buildVisualDossierViewModel,
  hasCompleteVisualDossier,
} from '../../../src/components/commercial-intelligence/story-dossier/visualDossierModel.ts';

const canonicalRaulUrl = 'https://www.instagram.com/_raulsena/';

function createTemplate(): StoryTemplateDto {
  return {
    templateId: '20000000-0000-4000-8000-000000000101',
    name: 'Cena -> lente -> principio',
    description: 'Template tecnico do dossie.',
    objective: 'Transformar uma cena comum em posicionamento.',
    definition: {
      editorialName: 'Cena comum -> lente do especialista -> valor pessoal',
      editorialSummary: 'Raul Sena · 3 telas · dossiê completo',
      formula: 'Cena -> lente -> principio',
      risks: [],
      preserveRules: ['Preservar a funcao narrativa.'],
      adaptRules: ['Adaptar a superficie.'],
      avoidRules: ['Evitar copiar o tema.'],
      moldSteps: [],
      steps: [
        { role: 'hook', instruction: 'Abrir com uma cena real.' },
        { role: 'development', instruction: 'Aplicar a lente do especialista.' },
        { role: 'closing', instruction: 'Fechar com um principio pessoal.' },
      ],
    },
    steps: [
      { role: 'hook', instruction: 'Abrir com uma cena real.' },
      { role: 'development', instruction: 'Aplicar a lente do especialista.' },
      { role: 'closing', instruction: 'Fechar com um principio pessoal.' },
    ],
    tags: ['raul-sena'],
    status: 'active',
    schemaVersion: 2,
    referenceCount: 1,
    publicationCount: 0,
    createdAt: '2026-07-24T12:00:00.000Z',
    updatedAt: '2026-07-24T12:00:00.000Z',
  };
}

function createReference(): StoryReferenceDto {
  const template = createTemplate();
  const story = (narrativeOrder: number) => ({
    itemId: `30000000-0000-4000-8000-00000000010${narrativeOrder}`,
    mediaType: 'image' as const,
    assetUrl: `https://example.com/raul-${narrativeOrder}.jpg`,
    thumbnailUrl: null,
    textContent: `Story ${narrativeOrder}`,
    metadata: {
      quick: {
        roleLabel: `Quick ${narrativeOrder}`,
        title: `Titulo rapido ${narrativeOrder}`,
        summary: `Resumo rapido ${narrativeOrder}`,
        evidence: `Evidencia ${narrativeOrder}`,
        audienceEffect: `Efeito ${narrativeOrder}`,
        subtext: `Subtexto ${narrativeOrder}`,
        funnelFunction: `Funcao ${narrativeOrder}`,
        extractedRule: `Regra rapida ${narrativeOrder}`,
      },
      visual: {
        roleLabel: `Visual ${narrativeOrder}`,
        title: `Titulo visual ${narrativeOrder}`,
        scene: `Cena ${narrativeOrder}`,
        typography: `Tipografia ${narrativeOrder}`,
        composition: `Composicao ${narrativeOrder}`,
        graphic: `Grafico ${narrativeOrder}`,
        palette: ['#111111', '#f5f5f5'],
        impression: `Impressao ${narrativeOrder}`,
        markers: [{ label: `Marcador ${narrativeOrder}`, description: `Descricao ${narrativeOrder}` }],
      },
      deep: {
        roleLabel: `Deep ${narrativeOrder}`,
        title: `Titulo profundo ${narrativeOrder}`,
        lead: `Abertura profunda ${narrativeOrder}`,
        sections: [{
          title: `Secao ${narrativeOrder}`,
          paragraphs: [`Paragrafo ${narrativeOrder}`],
          bullets: [`Ponto ${narrativeOrder}`],
        }],
        extractedRule: `Regra profunda ${narrativeOrder}`,
      },
    },
    sourceOccurredAt: null,
    narrativeOrder,
    narrativeRole: narrativeOrder === 1
      ? 'hook' as const
      : narrativeOrder === 2
        ? 'development' as const
        : 'closing' as const,
  });

  return {
    sequenceId: '40000000-0000-4000-8000-000000000101',
    kind: 'reference',
    publicationState: null,
    title: 'Raul Sena, cena -> humor -> principio',
    description: 'Dossie visual completo.',
    analysis: {
      summary: 'O assunto aparente e uma troca de assento.',
      overview: ['A cena cotidiana vira posicionamento.'],
      sequenceMap: [
        { label: '1 · Gancho', value: 'Identificacao + curiosidade' },
        { label: '2 · Recompensa', value: 'Humor + autoridade' },
        { label: '3 · Fechamento', value: 'Prova social + confianca' },
        { label: 'Produto real', value: 'Persona financeiramente racional' },
      ],
      visualGrammar: 'A producao parece nativa, mas a hierarquia e controlada.',
      synthesis: [{
        title: 'Leitura transversal',
        paragraphs: ['Cada tela muda o estimulo sem abandonar a mesma historia.'],
      }],
      productRevealed: 'Um Raul acessivel, espirituoso e financeiramente racional.',
      registeredTemplate: {
        name: 'Cena cotidiana -> piada de nicho -> resposta do publico -> valores',
        steps: [
          { title: 'Cena cotidiana', description: 'Abrir com uma situacao reconhecivel.' },
          { title: 'Piada de nicho', description: 'Aplicar repertorio sem dar aula.' },
          { title: 'Resposta do publico', description: 'Usar a reacao como prova.' },
          { title: 'Valores', description: 'Fechar revelando um principio.' },
        ],
      },
      transferRules: ['Preservar a funcao e adaptar a superficie.'],
      sourceNote: 'Referencia publicada por @_raulsena no Instagram.',
    },
    platform: 'instagram',
    sourceAccount: '@_raulsena',
    sourceUrl: canonicalRaulUrl,
    sourceStartedAt: null,
    sourceEndedAt: null,
    sequenceState: 'closed',
    scheduledFor: null,
    publishedAt: null,
    contentRevision: 1,
    approvedRevision: null,
    approvedAt: null,
    reviewNote: null,
    template: { templateId: template.templateId, name: template.name },
    items: [story(3), story(1), story(2)],
    createdAt: '2026-07-24T12:00:00.000Z',
    updatedAt: '2026-07-24T12:00:00.000Z',
  };
}

function createSizedReference(count: number): StoryReferenceDto {
  const reference = createReference();
  const seed = reference.items[0]!;
  reference.title = `Referência genérica com ${count} stories`;
  reference.sourceAccount = '@criador_generico';
  reference.sourceUrl = 'https://www.instagram.com/criador_generico/';
  reference.items = Array.from({ length: count }, (_, index) => {
    const narrativeOrder = index + 1;
    const item = structuredClone(seed);
    item.itemId = `50000000-0000-4000-8000-${String(narrativeOrder).padStart(12, '0')}`;
    item.narrativeOrder = narrativeOrder;
    item.metadata.quick!.title = `Rápido ${narrativeOrder}`;
    item.metadata.visual!.title = `Visual ${narrativeOrder}`;
    item.metadata.deep!.title = `Detalhado ${narrativeOrder}`;
    return item;
  });
  return reference;
}

function createCanonicalDossier(): {
  template: StoryTemplateDto;
  reference: StoryReferenceDto;
} {
  const template = createTemplate();
  const reference = createReference();
  const conceptualSteps: StoryTemplateDto['steps'] = [
    {
      role: 'hook',
      instruction: 'Abrir com uma cena real.',
      templateStepIds: ['open-scene'],
    },
    {
      role: 'development',
      instruction: 'Aplicar a lente do especialista.',
      templateStepIds: ['apply-lens'],
    },
    {
      role: 'closing',
      instruction: 'Fechar com um principio pessoal.',
      templateStepIds: ['close-principle'],
    },
  ];

  template.steps = structuredClone(conceptualSteps);
  template.definition.steps = structuredClone(conceptualSteps);
  template.definition.moldSteps = [
    {
      id: 'screen-scene',
      templateStepIds: ['open-scene'],
      title: 'Cena e gancho',
      purpose: 'Abrir uma pergunta narrativa.',
      fixedFunction: 'Mostrar uma cena real e especifica.',
      placeholders: [
        { kind: 'scene', label: 'Cena reconhecivel' },
        { kind: 'copy', label: 'Gancho especifico' },
      ],
    },
    {
      id: 'screen-lens',
      templateStepIds: ['apply-lens'],
      title: 'Lente do especialista',
      purpose: 'Mudar o significado da cena.',
      fixedFunction: 'Reinterpretar a cena sem interromper a historia.',
      placeholders: [
        { kind: 'proof', label: 'Prova visual' },
        { kind: 'copy', label: 'Leitura do especialista' },
      ],
    },
    {
      id: 'screen-principle',
      templateStepIds: ['close-principle'],
      title: 'Resposta e principio',
      purpose: 'Revelar como o criador pensa.',
      fixedFunction: 'Fechar com um principio transferivel.',
      placeholders: [
        { kind: 'response', label: 'Resposta do publico' },
        { kind: 'principle', label: 'Principio pessoal' },
      ],
    },
  ];

  reference.analysis.dossierContractVersion = '1.0';
  reference.analysis.sequenceConfirmed = true;
  reference.analysis.sequenceConfirmationSource = 'Sequencia confirmada pelo Bruno.';
  reference.analysis.apparentProduct = 'Uma historia cotidiana sobre uma decisao.';
  reference.analysis.personaConstructed = 'Especialista acessivel e criterioso.';
  reference.analysis.sequenceMap = [
    { kind: 'story', storyOrder: 1, label: '1 · Gancho', value: 'Cena e curiosidade' },
    { kind: 'story', storyOrder: 2, label: '2 · Lente', value: 'Interpretacao' },
    { kind: 'story', storyOrder: 3, label: '3 · Fechamento', value: 'Principio' },
    { kind: 'product', label: 'Produto real', value: 'Persona financeiramente racional' },
  ];
  reference.analysis.synthesis = [
    {
      key: 'screen-roles',
      title: 'Papel de cada tela',
      paragraphs: ['Cada story cumpre uma funcao narrativa especifica.'],
    },
    {
      key: 'stimulus-change',
      title: 'Mudanca de estimulo',
      paragraphs: ['A sequencia muda o estimulo e preserva a continuidade.'],
    },
    {
      key: 'aesthetics-production',
      title: 'Estetica e producao',
      paragraphs: ['A unidade visual sustenta a progressao.'],
    },
    {
      key: 'strengths-limitations',
      title: 'Forcas e limitacoes',
      paragraphs: ['A forca esta na prova concreta e o limite depende do contexto.'],
    },
  ];
  reference.analysis.registeredTemplate = {
    name: 'Cena real -> lente do especialista -> principio',
    formula: 'Cena concreta -> pergunta -> releitura -> principio',
    useWhen: 'Quando uma situacao cotidiana permite revelar repertorio.',
    primaryFunction: 'Transformar rotina em autoridade sem interromper a historia.',
    requiredElements: ['Cena comprovavel', 'Leitura especializada', 'Principio transferivel'],
    optionalElements: [],
    executionRisks: ['Transformar a lente em aula desconectada da cena.'],
    capturesOrInputs: ['Registro da cena', 'Prova visual ou reacao'],
    brunoAdaptation: 'Usar situacoes reais sem expor dados sensiveis.',
    steps: [
      {
        id: 'open-scene',
        title: 'Abrir a pergunta',
        description: 'Apresentar uma cena concreta.',
        mechanism: 'O detalhe observavel antecipa uma decisao.',
        condition: 'A cena precisa ser reconhecivel.',
        expectedResult: 'Curiosidade sem promessa artificial.',
        evidenceStoryOrders: [1],
      },
      {
        id: 'apply-lens',
        title: 'Mudar o significado',
        description: 'Aplicar a lente do especialista.',
        mechanism: 'A interpretacao transforma o caso em repertorio.',
        condition: 'A leitura precisa nascer da cena.',
        expectedResult: 'Autoridade percebida sem tom de aula.',
        evidenceStoryOrders: [2],
      },
      {
        id: 'close-principle',
        title: 'Fechar com principio',
        description: 'Converter a resposta em uma regra pessoal.',
        mechanism: 'O desfecho revela como o criador decide.',
        condition: 'O principio precisa resolver a tensao inicial.',
        expectedResult: 'Posicionamento e confianca.',
        evidenceStoryOrders: [3],
      },
    ],
  };

  reference.items.forEach(item => {
    item.metadata.sourceExcerpt = item.narrativeOrder === 2
      ? null
      : `Trecho original ${item.narrativeOrder}.`;
    item.metadata.noSourceTextReason = item.narrativeOrder === 2
      ? 'O story usa apenas imagem, sem texto-fonte legivel.'
      : null;
    item.metadata.deep!.dimensionAssessments = {
      interaction: { status: 'present', rationale: 'A tela convoca uma resposta observavel.' },
      critique: { status: 'present', rationale: 'Ha evidencia suficiente para avaliar a escolha.' },
    };
    item.metadata.deep!.sections[0]!.covers = ['narrative', 'continuity'];
  });

  return { template, reference };
}

test('monta o dossie Raul em ordem narrativa sem misturar os tres titulos editoriais', () => {
  const template = createTemplate();
  const reference = createReference();

  assert.equal(hasCompleteVisualDossier(reference), true);

  const dossier = buildVisualDossierViewModel(template, reference);

  assert.equal(dossier.templateId, template.templateId);
  assert.equal(dossier.editorialName, template.definition.editorialName);
  assert.equal(dossier.editorialSummary, template.definition.editorialSummary);
  assert.deepEqual(dossier.stories.map(story => story.narrativeOrder), [1, 2, 3]);
  assert.deepEqual(dossier.stories.map(story => story.quick.title), [
    'Titulo rapido 1',
    'Titulo rapido 2',
    'Titulo rapido 3',
  ]);
  assert.deepEqual(dossier.stories.map(story => story.visual.title), [
    'Titulo visual 1',
    'Titulo visual 2',
    'Titulo visual 3',
  ]);
  assert.deepEqual(dossier.stories.map(story => story.deep.title), [
    'Titulo profundo 1',
    'Titulo profundo 2',
    'Titulo profundo 3',
  ]);
  assert.ok(dossier.stories.every(story => new Set([
    story.quick.title,
    story.visual.title,
    story.deep.title,
  ]).size === 3));
});

test('reconhece qualquer criador e sequencias de 1, 3, 4 e 8 stories pelo conteúdo', () => {
  for (const count of [1, 3, 4, 8]) {
    const reference = createSizedReference(count);
    assert.equal(hasCompleteVisualDossier(reference), true);
    const dossier = buildVisualDossierViewModel(createTemplate(), reference);
    assert.equal(dossier.stories.length, count);
    assert.equal(dossier.sourceAccount, '@criador_generico');
  }
});

test('valida o vínculo com o template apenas ao montar o dossiê', () => {
  const reference = createReference();
  const wrongTemplate = structuredClone(reference);
  wrongTemplate.template = {
    templateId: '20000000-0000-4000-8000-000000000999',
    name: 'Outro template',
  };
  assert.equal(hasCompleteVisualDossier(wrongTemplate), true);
  assert.throws(
    () => buildVisualDossierViewModel(createTemplate(), wrongTemplate),
    { message: 'Dossiê visual incompleto.' },
  );
});

test('dados incompletos nunca produzem um dossie parcial', () => {
  const reference = createReference();
  delete reference.items[1]?.metadata.quick;

  assert.equal(hasCompleteVisualDossier(reference), false);
  assert.throws(
    () => buildVisualDossierViewModel(createTemplate(), reference),
    { message: 'Dossiê visual incompleto.' },
  );

  const discontinuous = createSizedReference(3);
  discontinuous.items[2]!.narrativeOrder = 5;
  assert.equal(hasCompleteVisualDossier(discontinuous), false);
});

test('preserva a biblioteca documental como camada separada do dossie de stories', () => {
  const reference = createReference();
  reference.analysis.sourceLibrary = {
    title: 'Biblioteca Stories para Enriquecer',
    description: 'Métodos extraídos do PDF.',
    sourceDocument: 'Stories para Enriquecer.pdf',
    totalPages: 73,
    coveredPageStart: 4,
    coveredPageEnd: 72,
    categories: [{ key: 'fundamentos', label: 'Fundamentos' }],
    modules: [{
      key: 'clareza-visual',
      order: 1,
      category: 'fundamentos',
      lessonLabel: 'Aula 01',
      title: 'Clareza visual',
      pageStart: 4,
      pageEnd: 8,
      quick: {
        summary: 'A mensagem vem antes da decoração.',
        outcome: 'Uma tela legível.',
        useWhen: 'Ao revisar um story.',
      },
      principles: ['Um foco por tela.'],
      techniques: ['Remover elementos sem função.'],
      cautions: ['Minimalismo não é descuido.'],
      brunoApplications: ['Usar contraste alto.'],
      mold: {
        name: 'Ideia → foco',
        formula: 'Mensagem → hierarquia',
        steps: ['Definir a mensagem.', 'Remover o excesso.'],
      },
    }],
  };

  const dossier = buildVisualDossierViewModel(createTemplate(), reference);

  assert.equal(dossier.stories.length, 3);
  assert.equal(dossier.sourceLibrary?.modules.length, 1);
  assert.equal(dossier.sourceLibrary?.modules[0]?.key, 'clareza-visual');
});

test('preserva os campos canônicos no modelo visual sem alterar o caminho legado', () => {
  const { template, reference } = createCanonicalDossier();

  assert.equal(hasCompleteVisualDossier(reference), true);
  const dossier = buildVisualDossierViewModel(template, reference);

  assert.equal(dossier.dossierContractVersion, '1.0');
  assert.equal(dossier.apparentProduct, 'Uma historia cotidiana sobre uma decisao.');
  assert.equal(dossier.personaConstructed, 'Especialista acessivel e criterioso.');
  assert.deepEqual(dossier.synthesis.map(entry => entry.key), [
    'screen-roles',
    'stimulus-change',
    'aesthetics-production',
    'strengths-limitations',
  ]);
  assert.equal(dossier.stories[0]?.sourceExcerpt, 'Trecho original 1.');
  assert.equal(
    dossier.stories[1]?.noSourceTextReason,
    'O story usa apenas imagem, sem texto-fonte legivel.',
  );
  assert.deepEqual(
    dossier.stories[2]?.deep.sections[0]?.covers,
    ['narrative', 'continuity'],
  );
  assert.deepEqual(
    dossier.registeredTemplate.steps.map(step => step.id),
    ['open-scene', 'apply-lens', 'close-principle'],
  );
});

test('barra um dossie canônico sem síntese obrigatória ou sem vínculo entre molde e template', () => {
  const missingSynthesis = createCanonicalDossier();
  missingSynthesis.reference.analysis.synthesis = missingSynthesis.reference.analysis.synthesis
    ?.filter(entry => entry.key !== 'strengths-limitations');

  assert.equal(hasCompleteVisualDossier(missingSynthesis.reference), false);

  const brokenMoldLink = createCanonicalDossier();
  brokenMoldLink.template.definition.moldSteps![0]!.templateStepIds = ['missing-step'];

  assert.throws(
    () => buildVisualDossierViewModel(brokenMoldLink.template, brokenMoldLink.reference),
    { message: 'Dossiê visual incompleto.' },
  );
});
