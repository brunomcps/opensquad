import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.resolve(directory, '../../../supabase/functions/ci-content/index.ts');
const source = () => fs.readFileSync(sourcePath, 'utf8');
const viewPath = path.resolve(directory, '../../../src/components/commercial-intelligence/StoryContentView.tsx');
const viewSource = () => fs.readFileSync(viewPath, 'utf8');

test('ci-content exige viewer para leitura e admin para mutação', () => {
  const code = source();
  assert.match(code, /authorizeMember\(request, client, 'viewer'\)/);
  assert.match(code, /authorizeMember\(request, client, 'admin'\)/);
  assert.match(code, /request\.method === 'GET'/);
  assert.match(code, /request\.method === 'POST'/);
  assert.match(code, /request\.method === 'PATCH'/);
});

test('ci-content usa operações atômicas para publicação e revisão', () => {
  const code = source();
  assert.match(code, /\.rpc\('story_create_publication'/);
  assert.match(code, /\.rpc\('story_update_publication'/);
  assert.match(code, /\.rpc\('story_request_publication_approval'/);
  assert.match(code, /\.rpc\('story_review_publication'/);
  assert.match(code, /parseCreateTemplateInput/);
  assert.match(code, /parseCreatePublicationInput/);
  assert.match(code, /parseUpdatePublicationInput/);
  assert.match(code, /parseReviewInput/);
  assert.match(code, /return loadSequence\(client, id\)/);
});

test('ci-content lista e cria referências pelo contrato atômico', () => {
  const code = source();
  const view = viewSource();
  assert.match(code, /section === 'references'/);
  assert.match(code, /\.eq\('kind', 'reference'\)/);
  assert.match(code, /parseCreateReferenceInput/);
  assert.match(code, /\.rpc\('story_create_reference'/);
  assert.match(code, /action\(body\) === 'create_reference'/);
  assert.match(view, /function ReferencesSection/);
  assert.match(view, /getStoryReferences/);
  assert.match(view, /createStoryReference/);
});

test('ci-content não expõe chave de serviço nem autoria sensível no DTO', () => {
  const code = source();
  assert.doesNotMatch(code, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(code, /created_by[^\n]*return/i);
});

test('interface recarrega o estado canônico quando outra aba vence a revisão', () => {
  const code = viewSource();
  assert.match(code, /CommercialIntelligenceApiError/);
  assert.match(code, /function isRevisionConflict/);
  assert.match(code, /cause\.status === 409/);
  assert.match(code, /onConflict/);
  assert.match(code, /A publicação mudou em outra aba/);
});

test('ci-content seleciona e devolve o dossiê JSONB sem reduzir definition, analysis ou metadata', () => {
  const code = source();
  assert.match(code, /definition:\s*row\.definition/);
  assert.match(code, /analysis:\s*row\.analysis/);
  assert.match(code, /metadata:\s*item\.metadata/);
  assert.match(code, /SEQUENCE_FIELDS[^\n]*\banalysis\b[^\n]*story_items\([^\n]*\bmetadata\b/);
});

test('criação propaga definition e analysis estruturadas até a persistência', () => {
  const code = source();
  assert.match(code, /definition:\s*input\.definition/);
  assert.match(code, /p_analysis:\s*input\.analysis/);
  assert.match(code, /p_items:\s*input\.items/);
});

test('TemplatesSection carrega templates, referências e publicações em conjunto', () => {
  const view = viewSource();
  const start = view.indexOf('function TemplatesSection');
  const end = view.indexOf('function ReferenceForm');
  assert.ok(start >= 0 && end > start, 'TemplatesSection precisa existir antes de ReferenceForm');
  const section = view.slice(start, end);
  assert.match(section, /Promise\.all\(\s*\[\s*getStoryTemplates\(\)\s*,\s*getStoryReferences\(\)\s*,\s*getStoryPublications\(\)\s*\]\s*\)/);
  assert.match(section, /setTemplates\(/);
  assert.match(section, /setReferences\(/);
  assert.match(section, /setPublications\(/);
});

test('biblioteca de Templates renderiza o dossiê integrado e suas regiões semânticas inline', () => {
  const view = viewSource();
  for (const className of [
    'ci-story-dossier', 'ci-story-evidence', 'ci-story-source-excerpt', 'ci-story-analysis',
    'ci-story-adaptation', 'ci-story-editorial-status', 'ci-story-mold-grid',
  ]) {
    assert.match(view, new RegExp(`className=[^\\n]*${className}`), `${className} deve ser renderizada no dossiê inline`);
  }
});

test('DTOs públicos declaram definition, analysis e metadata de evidência', () => {
  const apiPath = path.resolve(directory, '../../../ci-app/src/api.ts');
  const api = fs.readFileSync(apiPath, 'utf8');
  assert.match(api, /interface StoryTemplateDto[\s\S]*?\bdefinition\s*:/);
  assert.match(api, /interface StoryItemDto[\s\S]*?\bmetadata\s*:/);
  assert.match(api, /interface StoryPublicationDto[\s\S]*?\banalysis\s*:/);
  for (const field of ['sourcePage', 'canonicalPageUrl', 'canonicalPageAssetUrl', 'evidenceType', 'sourceExcerpt', 'criticism', 'brunoAdaptation', 'editorialStatus', 'moldConsequence']) {
    assert.match(api, new RegExp(`\\b${field}\\s*:`), `${field} precisa fazer parte do contrato público`);
  }
});
