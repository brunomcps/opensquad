import assert from 'node:assert/strict';
import test from 'node:test';
import {
  readStoryDeepLink,
  resolveStoryDeepLinkSelection,
  storyDeepLinkUrl,
} from '../../../src/components/commercial-intelligence/storyReferenceDeepLink';

const templates = [
  { templateId: 'template-a' },
  { templateId: 'template-b' },
];

const references = [
  { sequenceId: 'reference-a1', template: { templateId: 'template-a' } },
  { sequenceId: 'reference-a2', template: { templateId: 'template-a' } },
  { sequenceId: 'reference-b1', template: { templateId: 'template-b' } },
];

test('deep link reads the exact template and reference and preserves them in the URL', () => {
  const selection = readStoryDeepLink('?tab=content-templates&template=template-a&reference=reference-a2');
  assert.deepEqual(selection, { templateId: 'template-a', referenceId: 'reference-a2' });

  const url = storyDeepLinkUrl('https://example.test/?tab=overview', 'content-templates', selection);
  assert.equal(url.searchParams.get('tab'), 'content-templates');
  assert.equal(url.searchParams.get('template'), 'template-a');
  assert.equal(url.searchParams.get('reference'), 'reference-a2');
});

test('explicit reference selects its linked template instead of silently using the first dossier', () => {
  const selection = resolveStoryDeepLinkSelection(
    templates,
    references,
    { templateId: 'template-a', referenceId: 'reference-b1' },
    { templateId: null, referenceId: null },
  );

  assert.deepEqual(selection, { templateId: 'template-b', referenceId: 'reference-b1' });
});

test('invalid parameters fall back to the normal first-template behavior', () => {
  const selection = resolveStoryDeepLinkSelection(
    templates,
    references,
    { templateId: 'missing-template', referenceId: 'missing-reference' },
    { templateId: null, referenceId: null },
  );

  assert.deepEqual(selection, { templateId: 'template-a', referenceId: null });
});

test('manual selection replaces URL state without retaining a reference from another template', () => {
  const selection = resolveStoryDeepLinkSelection(
    templates,
    references,
    { templateId: null, referenceId: null },
    { templateId: 'template-a', referenceId: 'reference-b1' },
  );
  assert.deepEqual(selection, { templateId: 'template-a', referenceId: null });

  const url = storyDeepLinkUrl(
    'https://example.test/?tab=content-templates&template=template-b&reference=reference-b1',
    'content-templates',
    selection,
  );
  assert.equal(url.searchParams.get('template'), 'template-a');
  assert.equal(url.searchParams.has('reference'), false);
});

test('leaving the story library removes stale dossier parameters', () => {
  const url = storyDeepLinkUrl(
    'https://example.test/?tab=content-templates&template=template-a&reference=reference-a1',
    'overview',
  );
  assert.equal(url.searchParams.get('tab'), 'overview');
  assert.equal(url.searchParams.has('template'), false);
  assert.equal(url.searchParams.has('reference'), false);
});
