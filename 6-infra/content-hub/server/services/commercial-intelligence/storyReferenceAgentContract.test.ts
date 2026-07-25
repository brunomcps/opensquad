import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAgentReferenceInput } from '../../../supabase/functions/_shared/storyContent.ts';
import { createAgentReferenceFixture } from './storyReferenceAgentFixtures.ts';

test('agent reference contract accepts a complete dossier', () => {
  const parsed = parseAgentReferenceInput(createAgentReferenceFixture());
  assert.equal(parsed.reference.items.length, 4);
  assert.equal(parsed.assets.length, 4);
  assert.deepEqual(parsed.reference.items.map(item => item.narrativeOrder), [1, 2, 3, 4]);
});

test('agent reference contract preserves canonical machine fields', () => {
  const fixture = createAgentReferenceFixture();
  (fixture.template.definition.moldSteps[0]!.placeholders[0]! as { slot?: string }).slot = 'top';
  const parsed = parseAgentReferenceInput(fixture);

  assert.equal(parsed.dossierContractVersion, '1.0');
  assert.equal(parsed.reference.sequenceConfirmed, true);
  assert.equal(parsed.reference.analysis?.sequenceMap?.at(-1)?.kind, 'product');
  assert.deepEqual(
    parsed.reference.analysis?.synthesis?.map(block => block.key),
    ['screen-roles', 'stimulus-change', 'aesthetics-production', 'strengths-limitations'],
  );
  assert.deepEqual(
    parsed.reference.items[0]?.metadata?.deep?.sections[0]?.covers,
    ['narrative', 'continuity'],
  );
  assert.deepEqual(parsed.template.definition?.moldSteps?.[1]?.templateStepIds, ['reinterpret-scene', 'support-reading']);
  assert.equal(parsed.template.definition?.moldSteps?.[0]?.placeholders?.[0]?.slot, 'top');
});

test('agent reference contract rejects an invalid placeholder slot', () => {
  const fixture = createAgentReferenceFixture();
  (fixture.template.definition.moldSteps[0]!.placeholders[0]! as { slot?: string }).slot = 'overlap';
  assert.throws(() => parseAgentReferenceInput(fixture), /posição.*placeholder.*inválida/i);
});

for (const layer of ['quick', 'visual', 'deep'] as const) {
  test(`agent reference contract rejects missing ${layer}`, () => {
    const fixture = createAgentReferenceFixture();
    delete fixture.reference.items[1]!.metadata[layer];
    assert.throws(() => parseAgentReferenceInput(fixture), new RegExp(layer, 'i'));
  });
}

test('agent reference contract keeps quick visual and deep titles distinct', () => {
  const fixture = createAgentReferenceFixture();
  fixture.reference.items[0]!.metadata.visual.title = fixture.reference.items[0]!.metadata.quick.title;
  assert.throws(() => parseAgentReferenceInput(fixture), /títulos.*distintos/i);
});

test('agent reference contract requires continuous narrative order', () => {
  const fixture = createAgentReferenceFixture();
  fixture.reference.items[2]!.narrativeOrder = 7;
  fixture.assets[2]!.narrativeOrder = 7;
  assert.throws(() => parseAgentReferenceInput(fixture), /contínua/i);
});

test('agent reference contract validates identity hashes and asset manifest', () => {
  const invalidKey = createAgentReferenceFixture();
  invalidKey.referenceKey = 'Chave com espaços';
  assert.throws(() => parseAgentReferenceInput(invalidKey), /referenceKey/i);

  const invalidHash = createAgentReferenceFixture();
  invalidHash.assets[0]!.sha256 = 'abc';
  assert.throws(() => parseAgentReferenceInput(invalidHash), /SHA-256/i);

  const missingAsset = createAgentReferenceFixture();
  missingAsset.assets.pop();
  assert.throws(() => parseAgentReferenceInput(missingAsset), /asset/i);
});

test('agent reference contract requires all transversal analysis layers and mold rules', () => {
  const missingOverview = createAgentReferenceFixture();
  missingOverview.reference.analysis.overview = [];
  assert.throws(() => parseAgentReferenceInput(missingOverview), /overview/i);

  const missingMold = createAgentReferenceFixture();
  missingMold.template.definition.moldSteps = [];
  assert.throws(() => parseAgentReferenceInput(missingMold), /molde/i);

  const missingAvoid = createAgentReferenceFixture();
  missingAvoid.template.definition.avoidRules = [];
  assert.throws(() => parseAgentReferenceInput(missingAvoid), /evitar/i);
});

test('agent reference contract enforces asset and total size limits', () => {
  const oversized = createAgentReferenceFixture();
  oversized.assets[0]!.sizeBytes = 20 * 1024 * 1024 + 1;
  assert.throws(() => parseAgentReferenceInput(oversized), /20 MiB/i);

  const tooMany = createAgentReferenceFixture();
  tooMany.reference.items = Array.from({ length: 21 }, (_, index) => ({
    ...structuredClone(tooMany.reference.items[0]!),
    narrativeOrder: index + 1,
  }));
  assert.throws(() => parseAgentReferenceInput(tooMany), /20 stories/i);
});

test('agent reference contract requires the explicit contract version', () => {
  const fixture = createAgentReferenceFixture() as any;
  delete fixture.dossierContractVersion;
  assert.throws(() => parseAgentReferenceInput(fixture), /dossierContractVersion.*1\.0/i);
});

test('agent reference contract requires exclusive source provenance', () => {
  const missing = createAgentReferenceFixture() as any;
  missing.reference.items[0]!.metadata.sourceExcerpt = null;
  missing.reference.items[0]!.metadata.noSourceTextReason = null;
  assert.throws(() => parseAgentReferenceInput(missing), /sourceExcerpt.*noSourceTextReason/i);

  const conflicting = createAgentReferenceFixture() as any;
  conflicting.reference.items[0]!.metadata.noSourceTextReason = 'Não deveria coexistir.';
  assert.throws(() => parseAgentReferenceInput(conflicting), /não pode usar.*ao mesmo tempo/i);
});

test('agent reference contract requires narrative and continuity coverage', () => {
  const fixture = createAgentReferenceFixture();
  fixture.reference.items[1]!.metadata.deep.sections[0]!.covers = ['evidence'];
  assert.throws(() => parseAgentReferenceInput(fixture), /narrative.*continuity/i);
});

test('agent reference contract requires one product in the sequence map', () => {
  const fixture = createAgentReferenceFixture();
  fixture.reference.analysis.sequenceMap.pop();
  assert.throws(() => parseAgentReferenceInput(fixture), /entrada product/i);
});

test('agent reference contract requires the four canonical synthesis keys', () => {
  const fixture = createAgentReferenceFixture();
  fixture.reference.analysis.synthesis.pop();
  assert.throws(() => parseAgentReferenceInput(fixture), /quatro chaves canônicas/i);
});

test('agent reference contract rejects conceptual movements without a mold screen', () => {
  const fixture = createAgentReferenceFixture();
  fixture.template.definition.moldSteps[1]!.templateStepIds = ['reinterpret-scene'];
  assert.throws(() => parseAgentReferenceInput(fixture), /Movimentos sem tela.*support-reading/i);
});

test('agent reference contract requires a confirmed sequence', () => {
  const fixture = createAgentReferenceFixture() as any;
  fixture.reference.sequenceConfirmed = false;
  assert.throws(() => parseAgentReferenceInput(fixture), /confirmação.*verdadeira|sequência.*confirmada/i);
});

test('agent reference contract accepts a document library without turning pages into stories', () => {
  const fixture = createAgentReferenceFixture() as any;
  fixture.reference.analysis.sourceLibrary = {
    title: 'Biblioteca do documento',
    description: 'Catálogo completo de técnicas da fonte.',
    sourceDocument: 'curso.pdf',
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

  const parsed = parseAgentReferenceInput(fixture);

  assert.equal(parsed.reference.items.length, 4);
  assert.equal(parsed.reference.analysis?.sourceLibrary?.modules.length, 1);
  assert.equal(parsed.reference.analysis?.sourceLibrary?.modules[0]?.pageStart, 4);
});

test('agent reference contract rejects invalid document library provenance', () => {
  const fixture = createAgentReferenceFixture() as any;
  fixture.reference.analysis.sourceLibrary = {
    title: 'Biblioteca do documento',
    description: 'Catálogo completo de técnicas da fonte.',
    sourceDocument: 'curso.pdf',
    totalPages: 10,
    coveredPageStart: 2,
    coveredPageEnd: 9,
    categories: [{ key: 'fundamentos', label: 'Fundamentos' }],
    modules: [{
      key: 'modulo',
      order: 1,
      category: 'fundamentos',
      lessonLabel: 'Aula',
      title: 'Módulo',
      pageStart: 8,
      pageEnd: 11,
      quick: { summary: 'Resumo.', outcome: 'Resultado.', useWhen: 'Quando usar.' },
      principles: ['Princípio.'],
      techniques: ['Técnica.'],
      cautions: ['Cuidado.'],
      brunoApplications: ['Aplicação.'],
      mold: { name: 'Molde', formula: 'A → B', steps: ['A.', 'B.'] },
    }],
  };

  assert.throws(() => parseAgentReferenceInput(fixture), /página.*inválid/i);
});
