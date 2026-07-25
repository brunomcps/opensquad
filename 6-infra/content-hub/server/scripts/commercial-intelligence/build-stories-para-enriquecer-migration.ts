import { createHash } from 'node:crypto';
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface RawAsset {
  narrativeOrder: number;
  localPath: string;
  mimeType: string;
}

interface PreparedAsset {
  narrativeOrder: number;
  fileName: string;
  sha256: string;
  mimeType: string;
  sizeBytes: number;
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, '../../..');
const payloadPath = path.join(
  root,
  'docs/commercial-intelligence/stories-para-enriquecer/reference-payload.json',
);
const migrationPath = path.join(
  root,
  'supabase/migrations/20260725120000_ci_stories_para_enriquecer_library.sql',
);
const publicBaseUrl = 'https://opensquad-commercial-intelligence.pages.dev/story-references/stories-para-enriquecer/sequence-page-44';

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortValue(entry)]),
  );
}

function canonicalJson(value: unknown) {
  return JSON.stringify(sortValue(value));
}

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}

async function fileSha256(filePath: string) {
  return createHash('sha256').update(await readFile(filePath)).digest('hex');
}

const raw = JSON.parse(await readFile(payloadPath, 'utf8'));
const rawAssets = raw.assets as RawAsset[];
const preparedAssets: PreparedAsset[] = [];
const publicUrls = new Map<number, string>();

for (const asset of rawAssets) {
  const absolutePath = path.resolve(path.dirname(payloadPath), asset.localPath);
  const metadata = await stat(absolutePath);
  preparedAssets.push({
    narrativeOrder: asset.narrativeOrder,
    fileName: path.basename(absolutePath),
    sha256: await fileSha256(absolutePath),
    mimeType: asset.mimeType,
    sizeBytes: metadata.size,
  });
  publicUrls.set(
    asset.narrativeOrder,
    `${publicBaseUrl}/${encodeURIComponent(path.basename(absolutePath))}`,
  );
}
preparedAssets.sort((left, right) => left.narrativeOrder - right.narrativeOrder);

const hashInput = {
  dossierContractVersion: raw.dossierContractVersion,
  template: raw.template,
  reference: raw.reference,
  assets: preparedAssets,
};
const contentHash = createHash('sha256')
  .update(Buffer.from(canonicalJson(hashInput), 'utf8'))
  .digest('hex');
const { items: referenceItems, ...reference } = raw.reference;
const persistedItems = referenceItems.map((item: Record<string, unknown>) => ({
  ...item,
  assetUrl: item.mediaType === 'text'
    ? null
    : publicUrls.get(Number(item.narrativeOrder)),
}));

const sql = `begin;

-- Generated from docs/commercial-intelligence/stories-para-enriquecer/reference-payload.json.
-- It updates only the canonical Stories para Enriquecer identity. The Raul Sena
-- template and reference are intentionally outside this migration.
update public.story_templates
set description = $template_description$${raw.template.description}$template_description$,
    objective = $template_objective$${raw.template.objective}$template_objective$,
    definition = $template_definition$${pretty(raw.template.definition)}$template_definition$::jsonb,
    tags = array[${raw.template.tags.map((tag: string) => `'${tag.replaceAll("'", "''")}'`).join(', ')}]::text[],
    status = 'active'
where canonical_key = '${raw.template.canonicalKey}'
  and lower(btrim(name)) = lower('${raw.template.name.replaceAll("'", "''")}')
  and status <> 'archived';

do $migration$
declare
  v_result record;
begin
  if not exists (
    select 1
    from public.story_templates
    where canonical_key = '${raw.template.canonicalKey}'
      and lower(btrim(name)) = lower('${raw.template.name.replaceAll("'", "''")}')
      and status <> 'archived'
  ) then
    raise exception 'Stories para Enriquecer template identity is missing';
  end if;

  select *
  into v_result
  from public.story_upsert_agent_reference(
    '${raw.referenceKey}',
    '${contentHash}',
    '${raw.template.canonicalKey}',
    $template$${pretty(raw.template)}$template$::jsonb,
    $reference$${pretty(reference)}$reference$::jsonb,
    $items$${pretty(persistedItems)}$items$::jsonb
  );

  if v_result.sequence_id is null
    or v_result.template_id is null
    or v_result.content_revision < 1
  then
    raise exception 'Stories para Enriquecer canonical read-back is incomplete';
  end if;
end
$migration$;

commit;
`;

await writeFile(migrationPath, sql, 'utf8');
console.log(JSON.stringify({
  migrationPath,
  referenceKey: raw.referenceKey,
  contentHash,
  modules: raw.reference.analysis.sourceLibrary.modules.length,
  stories: referenceItems.length,
  assets: preparedAssets.length,
}, null, 2));
