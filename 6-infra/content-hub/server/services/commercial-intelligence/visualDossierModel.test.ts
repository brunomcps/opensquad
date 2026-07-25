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
