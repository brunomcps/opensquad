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
