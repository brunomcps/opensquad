import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../../..');
const payloadPath = path.join(
  root,
  'docs/commercial-intelligence/stories-para-enriquecer/reference-payload.json',
);
const migrationPath = path.join(
  root,
  'supabase/migrations/20260725120000_ci_stories_para_enriquecer_library.sql',
);
const skillPath = path.join(
  root,
  'hermes-skills/catalog-story-reference/scripts/publish_story_reference.py',
);

function payload() {
  return JSON.parse(readFileSync(payloadPath, 'utf8'));
}

test('catalog covers the actionable PDF range with 17 continuous modules', () => {
  const library = payload().reference.analysis.sourceLibrary;
  assert.equal(library.modules.length, 17);
  assert.equal(library.categories.length, 6);
  assert.deepEqual(
    library.modules.map((module: any) => module.order),
    Array.from({ length: 17 }, (_, index) => index + 1),
  );

  const coveredPages = new Set<number>();
  for (const module of library.modules) {
    for (let page = module.pageStart; page <= module.pageEnd; page += 1) {
      coveredPages.add(page);
    }
    assert.ok(module.quick.summary);
    assert.ok(module.principles.length);
    assert.ok(module.techniques.length);
    assert.ok(module.cautions.length);
    assert.ok(module.brunoApplications.length);
    assert.ok(module.mold.steps.length);
  }
  assert.deepEqual(
    [...coveredPages],
    Array.from({ length: 69 }, (_, index) => index + 4),
  );
});

test('catalog uses four real page-44 crops instead of five PDF pages as stories', async () => {
  const value = payload();
  assert.equal(value.reference.items.length, 4);
  assert.deepEqual(
    value.reference.items.map((item: any) => item.metadata.sourcePage),
    [44, 44, 44, 44],
  );

  for (const asset of value.assets) {
    const assetPath = path.resolve(path.dirname(payloadPath), asset.localPath);
    assert.ok(statSync(assetPath).size > 0);
    const metadata = await sharp(assetPath).metadata();
    assert.equal(metadata.format, 'webp');
    assert.ok((metadata.width || 0) >= 300);
    assert.ok((metadata.height || 0) >= 500);
  }
});

test('Hermes skill validates the canonical payload and migration uses the same hash', () => {
  const result = spawnSync(
    'python',
    [skillPath, 'validate', payloadPath],
    { cwd: root, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.ok, true);
  assert.equal(receipt.stories, 4);
  assert.equal(receipt.assets, 4);
  assert.match(readFileSync(migrationPath, 'utf8'), new RegExp(receipt.contentHash));
});
