import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const directory = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.resolve(
  directory,
  '../../../supabase/migrations/20260724120000_ci_story_content.sql',
);
const enrichmentMigrationPath = path.resolve(
  directory,
  '../../../supabase/migrations/20260724195500_ci_story_dossier_enrichment.sql',
);
const reconciliationMigrationPath = path.resolve(
  directory,
  '../../../supabase/migrations/20260724202500_ci_story_dossier_reconcile.sql',
);
const raulRecoveryMigrationPath = path.resolve(
  directory,
  '../../../supabase/migrations/20260724214000_ci_raul_sena_story_recovery.sql',
);
const raulVisualDossierMigrationPath = path.resolve(
  directory,
  '../../../supabase/migrations/20260724223000_ci_raul_sena_visual_dossier.sql',
);

function migrationSql(): string {
  return fs.readFileSync(migrationPath, 'utf8');
}

function enrichmentMigrationSql(): string {
  return fs.readFileSync(enrichmentMigrationPath, 'utf8');
}

function reconciliationMigrationSql(): string {
  return fs.readFileSync(reconciliationMigrationPath, 'utf8');
}

function raulRecoveryMigrationSql(): string {
  return fs.readFileSync(raulRecoveryMigrationPath, 'utf8');
}

function raulVisualDossierMigrationSql(): string {
  return fs.readFileSync(raulVisualDossierMigrationPath, 'utf8');
}

test('enriquecimento vive em migração aditiva posterior sem recriar as entidades base', () => {
  assert.equal(fs.existsSync(enrichmentMigrationPath), true);
  const sql = enrichmentMigrationSql();
  assert.doesNotMatch(sql, /create\s+table\s+public\.(?:story_templates|story_sequences|story_items|sequence_item_links|template_sequence_links)/i);
  assert.doesNotMatch(sql, /\bdrop\s+(?:table|column|function|schema)\b/i);
  assert.match(sql, /alter table public\.story_sequences\s+add column if not exists analysis jsonb not null default '\{\}'::jsonb/i);
  assert.match(sql, /alter table public\.story_items\s+add column if not exists metadata jsonb not null default '\{\}'::jsonb/i);
  assert.match(sql, /story_sequences_analysis_object_check/i);
  assert.match(sql, /story_items_metadata_object_check/i);
});

test('migração cria as cinco entidades centrais de stories', () => {
  const sql = migrationSql();
  for (const table of [
    'story_templates',
    'story_sequences',
    'story_items',
    'sequence_item_links',
    'template_sequence_links',
  ]) {
    assert.match(sql, new RegExp(`create table public\\.${table}`, 'i'));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
    assert.match(sql, new RegExp(`grant [^;]*select[^;]* on table public\\.${table} to service_role`, 'i'));
  }
  assert.doesNotMatch(sql, /\bdrop\s+(table|schema)\b/i);
});

test('migração separa cronologia real da ordem narrativa', () => {
  const sql = migrationSql();
  assert.match(sql, /source_occurred_at timestamptz/i);
  assert.match(sql, /narrative_order integer not null/i);
  assert.match(sql, /unique \(sequence_id, narrative_order\)\s+deferrable initially immediate/i);
});

test('migração trava aprovação na revisão atual e protege o browser', () => {
  const sql = migrationSql();
  assert.match(sql, /approved_revision = content_revision/i);
  assert.match(sql, /revoke all on table public\.story_templates from anon, authenticated/i);
  assert.match(sql, /revoke all on table public\.story_sequences from anon, authenticated/i);
  assert.match(sql, /template_sequence_links_one_primary_idx/i);
  assert.match(sql, /story_items_source_identity_idx/i);
  assert.match(sql, /story_invalidate_publication_revision/i);
  assert.match(sql, /approved_revision\s*=\s*null/i);
  assert.match(sql, /story_update_publication/i);
  assert.match(sql, /content_revision\s*=\s*content_revision\s*\+\s*1/i);
});

test('migração base preserva o seed histórico do template e da referência piloto', () => {
  const sql = migrationSql();
  assert.match(sql, /'Cena → lente → princípio'/);
  assert.match(sql, /where not exists\s*\(\s*select 1\s*from public\.story_templates/i);
  assert.match(sql, /Raul Sena, cena → humor → princípio/);
  assert.match(sql, /where kind = 'reference'[\s\S]*source_url = 'https:\/\/www\.instagram\.com\/_raulsena\/'/i);
});

test('recuperação do Raul usa os assets publicados e não altera o template independente', async () => {
  const publicDirectory = path.resolve(directory, '../../../ci-app/public');
  for (const asset of [
    '01-conflito-no-aviao.jpg',
    '02-humor-e-inss.jpg',
    '03-principio-do-jato.jpg',
  ]) {
    assert.equal(
      fs.existsSync(path.join(publicDirectory, 'story-references/raul-sena', asset)),
      true,
      `${asset} precisa existir em public`,
    );
  }

  const db = new PGlite();
  try {
    await db.exec(`
      create schema auth;
      create table auth.users (id uuid primary key);
      create role anon;
      create role authenticated;
      create role service_role;
      create table public.ci_app_members (user_id uuid primary key references auth.users(id));
    `);
    await db.exec(migrationSql());
    await db.exec(enrichmentMigrationSql());
    await db.exec(reconciliationMigrationSql());

    await db.exec(`
      delete from public.story_sequences
      where kind = 'reference'
        and source_url = 'https://www.instagram.com/_raulsena/';
      delete from public.story_items item
      where item.asset_url like '%/story-references/raul-sena/%'
        and not exists (
          select 1 from public.sequence_item_links link where link.item_id = item.item_id
        );
      delete from public.story_templates
      where lower(btrim(name)) = lower('Cena → lente → princípio');
    `);

    await db.exec(raulRecoveryMigrationSql());
    await db.exec(raulRecoveryMigrationSql());

    const independentBefore = await db.query<{
      definition: string;
      analysis: string;
      items: string;
    }>(`
      select
        template.definition::text as definition,
        sequence.analysis::text as analysis,
        jsonb_agg(
          jsonb_build_object(
            'order', item_link.narrative_order,
            'text', item.text_content,
            'metadata', item.metadata
          )
          order by item_link.narrative_order
        )::text as items
      from public.story_templates template
      join public.template_sequence_links template_link on template_link.template_id = template.template_id
      join public.story_sequences sequence on sequence.sequence_id = template_link.sequence_id
      join public.sequence_item_links item_link on item_link.sequence_id = sequence.sequence_id
      join public.story_items item on item.item_id = item_link.item_id
      where lower(btrim(template.name)) = lower('História → pequena entrega → CTA')
        and sequence.title = 'Stories para Enriquecer'
      group by template.definition, sequence.analysis
    `);

    await db.exec(raulVisualDossierMigrationSql());
    await db.exec(raulVisualDossierMigrationSql());

    const graph = await db.query<{
      templates: number;
      references: number;
      links: number;
      stories: number;
      assets: string[];
    }>(`
      select
        count(distinct template.template_id)::int as templates,
        count(distinct sequence.sequence_id)::int as references,
        count(distinct template_link.template_id || ':' || template_link.sequence_id)::int as links,
        count(item.item_id)::int as stories,
        array_agg(item.asset_url order by item_link.narrative_order) as assets
      from public.story_templates template
      join public.template_sequence_links template_link on template_link.template_id = template.template_id
      join public.story_sequences sequence on sequence.sequence_id = template_link.sequence_id
      join public.sequence_item_links item_link on item_link.sequence_id = sequence.sequence_id
      join public.story_items item on item.item_id = item_link.item_id
      where lower(btrim(template.name)) = lower('Cena → lente → princípio')
        and sequence.kind = 'reference'
        and sequence.title = 'Raul Sena, cena → humor → princípio'
        and sequence.source_url = 'https://www.instagram.com/_raulsena/'
        and template_link.relationship = 'inspiration'
        and template_link.is_primary
    `);
    assert.deepEqual(graph.rows[0], {
      templates: 1,
      references: 1,
      links: 1,
      stories: 3,
      assets: [
        'https://opensquad-commercial-intelligence.pages.dev/story-references/raul-sena/01-conflito-no-aviao.jpg',
        'https://opensquad-commercial-intelligence.pages.dev/story-references/raul-sena/02-humor-e-inss.jpg',
        'https://opensquad-commercial-intelligence.pages.dev/story-references/raul-sena/03-principio-do-jato.jpg',
      ],
    });

    const richDossier = await db.query<{
      schema_version: number;
      has_visual_mold: boolean;
      has_sequence_analysis: boolean;
      rich_items: number;
    }>(`
      select
        template.schema_version::int as schema_version,
        (template.definition ? 'moldSteps'
          and template.definition #> '{moldSteps,0,placeholders}' is not null) as has_visual_mold,
        (sequence.analysis ?& array[
          'overview', 'sequenceMap', 'visualGrammar', 'productRevealed', 'transferRules'
        ]) as has_sequence_analysis,
        count(*) filter (
          where item.metadata ?& array[
            'sourceExcerpt', 'analysis', 'audienceEffect', 'subtext',
            'funnelFunction', 'extractedRule', 'analysisSections', 'visual'
          ]
        )::int as rich_items
      from public.story_templates template
      join public.template_sequence_links template_link on template_link.template_id = template.template_id
      join public.story_sequences sequence on sequence.sequence_id = template_link.sequence_id
      join public.sequence_item_links item_link on item_link.sequence_id = sequence.sequence_id
      join public.story_items item on item.item_id = item_link.item_id
      where lower(btrim(template.name)) = lower('Cena → lente → princípio')
        and sequence.source_url = 'https://www.instagram.com/_raulsena/'
      group by template.schema_version, template.definition, sequence.analysis
    `);
    assert.deepEqual(richDossier.rows[0], {
      schema_version: 2,
      has_visual_mold: true,
      has_sequence_analysis: true,
      rich_items: 3,
    });

    const independentDossier = await db.query<{ templates: number; references: number; stories: number }>(`
      select
        count(distinct template.template_id)::int as templates,
        count(distinct sequence.sequence_id)::int as references,
        count(item.item_id)::int as stories
      from public.story_templates template
      join public.template_sequence_links template_link on template_link.template_id = template.template_id
      join public.story_sequences sequence on sequence.sequence_id = template_link.sequence_id
      join public.sequence_item_links item_link on item_link.sequence_id = sequence.sequence_id
      join public.story_items item on item.item_id = item_link.item_id
      where lower(btrim(template.name)) = lower('História → pequena entrega → CTA')
        and sequence.title = 'Stories para Enriquecer'
    `);
    assert.deepEqual(independentDossier.rows[0], {
      templates: 1,
      references: 1,
      stories: 5,
    });

    const independentAfter = await db.query<{
      definition: string;
      analysis: string;
      items: string;
    }>(`
      select
        template.definition::text as definition,
        sequence.analysis::text as analysis,
        jsonb_agg(
          jsonb_build_object(
            'order', item_link.narrative_order,
            'text', item.text_content,
            'metadata', item.metadata
          )
          order by item_link.narrative_order
        )::text as items
      from public.story_templates template
      join public.template_sequence_links template_link on template_link.template_id = template.template_id
      join public.story_sequences sequence on sequence.sequence_id = template_link.sequence_id
      join public.sequence_item_links item_link on item_link.sequence_id = sequence.sequence_id
      join public.story_items item on item.item_id = item_link.item_id
      where lower(btrim(template.name)) = lower('História → pequena entrega → CTA')
        and sequence.title = 'Stories para Enriquecer'
      group by template.definition, sequence.analysis
    `);
    assert.deepEqual(independentAfter.rows, independentBefore.rows);
  } finally {
    await db.close();
  }
});

test('migração rejeita lista nula de stories em referência, criação e edição de publicação', () => {
  const sql = migrationSql();
  const guards = sql.match(/p_items\s+is\s+null\s+or\s+jsonb_typeof\(p_items\)\s*<>\s*'array'/gi) || [];
  assert.equal(guards.length, 3);
});

test('migração restaura a supressão de revisão mesmo quando a operação falha', () => {
  const sql = migrationSql();
  assert.match(sql, /v_previous_revision_suppression\s+text/i);
  const restores = sql.match(/set_config\(\s*'app\.story_suppress_revision_bump',\s*coalesce\(v_previous_revision_suppression,\s*'off'\),\s*true\s*\)/gi) || [];
  assert.ok(restores.length >= 4, 'criação e edição devem restaurar a flag no sucesso e na exceção');
  assert.match(sql, /exception\s+when others then[\s\S]*?raise;/i);
});

test('migração preserva estados finais e bloqueia a publicação antes de trocar filhos', () => {
  const sql = migrationSql();
  assert.match(sql, /publication_state\s+in\s*\(\s*'draft',\s*'pending_approval',\s*'changes_requested',\s*'approved',\s*'failed'\s*\)/i);
  assert.match(sql, /old\.publication_state\s+in\s*\(\s*'draft',\s*'pending_approval',\s*'changes_requested',\s*'approved',\s*'failed'\s*\)/i);

  const updateFunction = sql.slice(sql.indexOf('create or replace function public.story_update_publication'));
  const lockPosition = updateFunction.indexOf('for update');
  const childReadPosition = updateFunction.indexOf('select array_agg(item_id)');
  assert.ok(lockPosition >= 0 && lockPosition < childReadPosition, 'a linha pai deve ser bloqueada antes da leitura dos vínculos');
});

test('migração exige steps válidos no template e restringe mutações concorrentes ao RPC', () => {
  const sql = migrationSql();
  assert.match(sql, /definition jsonb not null\s+check \(jsonb_typeof\(definition\) = 'object'\)\s+check \(definition \? 'steps'\)/i);
  assert.doesNotMatch(sql, /definition jsonb not null default/i);
  assert.match(sql, /grant select, insert on table public\.story_templates to service_role/i);
  assert.match(sql, /create or replace function public\.story_create_reference/i);
  assert.match(sql, /grant execute on function public\.story_create_reference/i);
  for (const table of ['story_sequences', 'story_items', 'sequence_item_links', 'template_sequence_links']) {
    assert.match(sql, new RegExp(`grant select on table public\\.${table} to service_role`, 'i'));
    assert.doesNotMatch(sql, new RegExp(`grant (?:all|[^;]*update|[^;]*delete) on table public\\.${table} to service_role`, 'i'));
  }
});

test('migração executa e preserva contratos editoriais em PostgreSQL isolado', async () => {
  const db = new PGlite();
  const userId = '10000000-0000-4000-8000-000000000001';
  const templateId = '20000000-0000-4000-8000-000000000001';
  try {
    await db.exec(`
      create schema auth;
      create table auth.users (id uuid primary key);
      create role anon;
      create role authenticated;
      create role service_role;
      create table public.ci_app_members (user_id uuid primary key references auth.users(id));
      insert into auth.users (id) values ('${userId}');
      insert into public.ci_app_members (user_id) values ('${userId}');
    `);
    await db.exec(migrationSql());

    await assert.rejects(
      db.query(`
        insert into public.story_templates (name, objective, status, created_by)
        values ('Sem definição', 'Deve falhar sem steps', 'active', '${userId}')
      `),
      /not-null constraint/i,
    );
    await assert.rejects(
      db.query(`
        insert into public.story_templates (name, objective, definition, status, created_by)
        values ('Sem steps', 'Deve falhar sem steps', '{}'::jsonb, 'active', '${userId}')
      `),
      /check constraint/i,
    );

    await db.exec(`
      insert into public.story_templates (template_id, name, objective, definition, status, created_by)
      values (
        '${templateId}',
        'Cena real e explicação',
        'Validar o fluxo editorial',
        '{"steps":[{"role":"hook","instruction":"Abrir com a cena"}]}'::jsonb,
        'active',
        '${userId}'
      );
    `);

    const reference = await db.query<{ story_create_reference: string }>(`
      select public.story_create_reference(
        'Referência funcional',
        'Análise da arquitetura narrativa',
        'instagram',
        '@criador',
        'https://instagram.com/criador',
        '2026-07-24T11:00:00Z',
        '2026-07-24T11:05:00Z',
        '${templateId}',
        '[{"mediaType":"image","assetUrl":"https://example.com/story.jpg","textContent":"Cena real","sourceOccurredAt":"2026-07-24T11:00:00Z","narrativeOrder":1,"narrativeRole":"hook"}]'::jsonb,
        '${userId}'
      )
    `);
    const referenceId = reference.rows[0]?.story_create_reference;
    assert.ok(referenceId);
    const referenceState = await db.query<{ kind: string; publication_state: string | null; stories: number; relationship: string }>(`
      select sequence.kind, sequence.publication_state, count(item_link.item_id)::int as stories, template_link.relationship
      from public.story_sequences sequence
      join public.template_sequence_links template_link on template_link.sequence_id = sequence.sequence_id
      left join public.sequence_item_links item_link on item_link.sequence_id = sequence.sequence_id
      where sequence.sequence_id = '${referenceId}'
      group by sequence.sequence_id, template_link.relationship
    `);
    assert.deepEqual(referenceState.rows[0], {
      kind: 'reference',
      publication_state: null,
      stories: 1,
      relationship: 'inspiration',
    });

    await assert.rejects(
      db.query(`
        select public.story_create_reference(
          'Referência cronologicamente inválida',
          null,
          'instagram',
          '@origem',
          'https://instagram.com/origem',
          '2026-07-24T12:00:00Z',
          '2026-07-24T13:00:00Z',
          '${templateId}',
          '[{"mediaType":"image","assetUrl":"https://cdn.example.com/story.jpg","textContent":"fora da janela","sourceOccurredAt":"2026-07-24T11:59:59Z","narrativeOrder":1,"narrativeRole":"hook"}]'::jsonb,
          '${userId}'
        )
      `),
      /before sequence start/i,
    );
    const invalidReference = await db.query<{ count: number }>(`
      select count(*)::int as count
      from public.story_sequences
      where title = 'Referência cronologicamente inválida'
    `);
    assert.equal(invalidReference.rows[0]?.count, 0);

    const privileges = await db.query<{
      can_update_items: boolean;
      can_delete_links: boolean;
      can_insert_template: boolean;
      anon_can_create_reference: boolean;
      authenticated_can_create_reference: boolean;
      service_can_create_reference: boolean;
    }>(`
      select
        has_table_privilege('service_role', 'public.story_items', 'UPDATE') as can_update_items,
        has_table_privilege('service_role', 'public.sequence_item_links', 'DELETE') as can_delete_links,
        has_table_privilege('service_role', 'public.story_templates', 'INSERT') as can_insert_template,
        has_function_privilege('anon', 'public.story_create_reference(text,text,text,text,text,timestamptz,timestamptz,uuid,jsonb,uuid)', 'EXECUTE') as anon_can_create_reference,
        has_function_privilege('authenticated', 'public.story_create_reference(text,text,text,text,text,timestamptz,timestamptz,uuid,jsonb,uuid)', 'EXECUTE') as authenticated_can_create_reference,
        has_function_privilege('service_role', 'public.story_create_reference(text,text,text,text,text,timestamptz,timestamptz,uuid,jsonb,uuid)', 'EXECUTE') as service_can_create_reference
    `);
    assert.deepEqual(privileges.rows[0], {
      can_update_items: false,
      can_delete_links: false,
      can_insert_template: true,
      anon_can_create_reference: false,
      authenticated_can_create_reference: false,
      service_can_create_reference: true,
    });

    await assert.rejects(
      db.query(`select public.story_create_publication('Sem stories', '${templateId}', null, null, '${userId}')`),
      /at least one story/i,
    );

    const created = await db.query<{ story_create_publication: string }>(`
      select public.story_create_publication(
        'Publicação funcional',
        '${templateId}',
        null,
        '[{"mediaType":"text","textContent":"Gancho inicial","narrativeOrder":1,"narrativeRole":"hook"}]'::jsonb,
        '${userId}'
      )
    `);
    const sequenceId = created.rows[0]?.story_create_publication;
    assert.ok(sequenceId);

    await assert.rejects(
      db.query(`select public.story_update_publication('${sequenceId}', 1, 'Inválida', '${templateId}', null, null, '${userId}')`),
      /at least one story/i,
    );

    await db.query(`
      select public.story_update_publication(
        '${sequenceId}',
        1,
        'Publicação revisada',
        '${templateId}',
        null,
        '[{"mediaType":"text","textContent":"Gancho revisado","narrativeOrder":1,"narrativeRole":"hook"}]'::jsonb,
        '${userId}'
      )
    `);
    const revised = await db.query<{ content_revision: number; publication_state: string; stories: number }>(`
      select sequence.content_revision, sequence.publication_state, count(link.item_id)::int as stories
      from public.story_sequences sequence
      left join public.sequence_item_links link on link.sequence_id = sequence.sequence_id
      where sequence.sequence_id = '${sequenceId}'
      group by sequence.sequence_id
    `);
    assert.deepEqual(revised.rows[0], { content_revision: 2, publication_state: 'draft', stories: 1 });

    const setting = await db.query<{ value: string }>(`
      select current_setting('app.story_suppress_revision_bump', true) as value
    `);
    assert.notEqual(setting.rows[0]?.value, 'on');

    await db.query(`select public.story_request_publication_approval('${sequenceId}', 2)`);
    await db.query(`select public.story_review_publication('${sequenceId}', 2, 'approved', null, '${userId}')`);
    await db.exec(`
      update public.story_sequences
      set publication_state = 'published', published_at = now()
      where sequence_id = '${sequenceId}';
      update public.story_items
      set text_content = 'Correção histórica que não reabre publicação'
      where item_id in (
        select item_id from public.sequence_item_links where sequence_id = '${sequenceId}'
      );
    `);
    const published = await db.query<{ content_revision: number; publication_state: string; approved_revision: number }>(`
      select content_revision, publication_state, approved_revision
      from public.story_sequences
      where sequence_id = '${sequenceId}'
    `);
    assert.deepEqual(published.rows[0], { content_revision: 2, publication_state: 'published', approved_revision: 2 });
  } finally {
    await db.close();
  }
});

test('migração armazena e propaga analysis e metadata como JSONB estruturado', () => {
  const sql = enrichmentMigrationSql();
  assert.match(sql, /story_sequences[\s\S]*?\banalysis\s+jsonb[\s\S]*?check\s*\(\s*jsonb_typeof\(analysis\)\s*=\s*'object'\s*\)/i);
  assert.match(sql, /story_items[\s\S]*?\bmetadata\s+jsonb[\s\S]*?check\s*\(\s*jsonb_typeof\(metadata\)\s*=\s*'object'\s*\)/i);
  assert.match(sql, /story_create_reference[\s\S]*?p_analysis\s+jsonb/i);
  assert.match(sql, /insert\s+into\s+public\.story_sequences[\s\S]*?\banalysis\b[\s\S]*?p_analysis/i);
  assert.match(sql, /insert\s+into\s+public\.story_items[\s\S]*?\bmetadata\b[\s\S]*?item\s*->\s*'metadata'/i);
});

test("seed integra o template 'História → pequena entrega → CTA' à referência canônica e páginas 42–46", () => {
  const sql = enrichmentMigrationSql();
  assert.match(sql, /'História → pequena entrega → CTA'/);
  assert.match(sql, /'Stories para Enriquecer'/);
  for (const page of [42, 43, 44, 45, 46]) {
    assert.match(sql, new RegExp(`['\"]?sourcePage['\"]?\\s*[:,]\\s*${page}|page-${page}\\.webp`, 'i'), `página ${page} precisa estar no seed`);
  }
  for (const field of ['formula', 'risks', 'preserveRules', 'adaptRules', 'avoidRules', 'moldSteps']) {
    assert.match(sql, new RegExp(`['\"]${field}['\"]`, 'i'), `${field} precisa ser persistido em definition`);
  }
  for (const field of ['canonicalPageUrl', 'canonicalPageAssetUrl', 'evidenceType', 'sourceExcerpt', 'analysis', 'criticism', 'brunoAdaptation', 'editorialStatus', 'moldConsequence']) {
    assert.match(sql, new RegExp(`['\"]${field}['\"]`, 'i'), `${field} precisa ser persistido no dossiê`);
  }
});

test('contrato aponta para os cinco assets públicos canônicos das páginas 42–46', () => {
  const sql = enrichmentMigrationSql();
  const publicDirectory = path.resolve(directory, '../../../ci-app/public');
  for (const page of [42, 43, 44, 45, 46]) {
    const relativeAsset = `story-references/stories-para-enriquecer/page-${page}.webp`;
    assert.match(sql, new RegExp(relativeAsset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.equal(fs.existsSync(path.join(publicDirectory, relativeAsset)), true, `${relativeAsset} precisa existir em public`);
  }
});

test('migração aditiva enriquece um schema base já aplicado e é idempotente', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create schema auth;
      create table auth.users (id uuid primary key);
      create role anon;
      create role authenticated;
      create role service_role;
      create table public.ci_app_members (user_id uuid primary key references auth.users(id));
    `);
    await db.exec(migrationSql());

    // Reproduz o estado remoto: as entidades e o RPC legado existem, mas não
    // o enriquecimento acrescentado localmente à migração antiga já aplicada.
    await db.exec(`
      delete from public.story_sequences
      where title = 'Stories para Enriquecer'
        and source_url = 'https://opensquad.com.br/stories-para-enriquecer.pdf';
      delete from public.story_items item
      where item.asset_url like '%/stories-para-enriquecer/page-%'
        and not exists (select 1 from public.sequence_item_links link where link.item_id = item.item_id);
      delete from public.story_templates
      where lower(btrim(name)) = lower('História → pequena entrega → CTA');
      drop function public.story_create_reference(text, text, jsonb, text, text, text, timestamptz, timestamptz, uuid, jsonb, uuid);
      drop function public.story_create_reference(text, text, text, text, text, timestamptz, timestamptz, uuid, jsonb, uuid);
      alter table public.story_sequences drop column analysis;
      alter table public.story_items drop column metadata;
    `);

    await db.exec(enrichmentMigrationSql());
    await db.exec(enrichmentMigrationSql());

    const columns = await db.query<{ analysis_type: string; metadata_type: string }>(`
      select
        (select data_type from information_schema.columns where table_schema = 'public' and table_name = 'story_sequences' and column_name = 'analysis') as analysis_type,
        (select data_type from information_schema.columns where table_schema = 'public' and table_name = 'story_items' and column_name = 'metadata') as metadata_type
    `);
    assert.deepEqual(columns.rows[0], { analysis_type: 'jsonb', metadata_type: 'jsonb' });

    const dossier = await db.query<{ references: number; pages: number; enriched_pages: number }>(`
      select
        count(distinct sequence.sequence_id)::int as references,
        count(item.item_id)::int as pages,
        count(*) filter (where item.metadata ? 'moldConsequence')::int as enriched_pages
      from public.story_sequences sequence
      join public.sequence_item_links link on link.sequence_id = sequence.sequence_id
      join public.story_items item on item.item_id = link.item_id
      where sequence.title = 'Stories para Enriquecer'
        and sequence.source_url = 'https://opensquad.com.br/stories-para-enriquecer.pdf'
    `);
    assert.deepEqual(dossier.rows[0], { references: 1, pages: 5, enriched_pages: 5 });

    const legacy = await db.query<{ story_create_reference: string }>(`
      select public.story_create_reference(
        'Compatibilidade legado', null, 'other', '@legado', null::text, null, null,
        (select template_id from public.story_templates where name = 'História → pequena entrega → CTA' limit 1),
        '[{"mediaType":"text","textContent":"Contrato anterior preservado","narrativeOrder":1,"narrativeRole":"hook"}]'::jsonb,
        null
      )
    `);
    const legacyId = legacy.rows[0]?.story_create_reference;
    assert.ok(legacyId);
    const legacyPayload = await db.query<{ analysis: Record<string, never>; metadata: Record<string, never> }>(`
      select sequence.analysis, item.metadata
      from public.story_sequences sequence
      join public.sequence_item_links link on link.sequence_id = sequence.sequence_id
      join public.story_items item on item.item_id = link.item_id
      where sequence.sequence_id = '${legacyId}'
    `);
    assert.deepEqual(legacyPayload.rows[0], { analysis: {}, metadata: {} });

    const functions = await db.query<{ rich_service: boolean; legacy_service: boolean; legacy_anon: boolean }>(`
      select
        has_function_privilege('service_role', 'public.story_create_reference(text,text,jsonb,text,text,text,timestamptz,timestamptz,uuid,jsonb,uuid)', 'EXECUTE') as rich_service,
        has_function_privilege('service_role', 'public.story_create_reference(text,text,text,text,text,timestamptz,timestamptz,uuid,jsonb,uuid)', 'EXECUTE') as legacy_service,
        has_function_privilege('anon', 'public.story_create_reference(text,text,text,text,text,timestamptz,timestamptz,uuid,jsonb,uuid)', 'EXECUTE') as legacy_anon
    `);
    assert.deepEqual(functions.rows[0], { rich_service: true, legacy_service: true, legacy_anon: false });
  } finally {
    await db.close();
  }
});

test('reconciliação completa referência preexistente sem metadata nem vínculo', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create schema auth;
      create table auth.users (id uuid primary key);
      create role anon;
      create role authenticated;
      create role service_role;
      create table public.ci_app_members (user_id uuid primary key references auth.users(id));
    `);
    await db.exec(migrationSql());

    // Estado bloqueador observado: a referência e seus cinco itens já existem,
    // mas o dossiê está vazio e o vínculo com o molde aprovado está ausente.
    await db.exec(`
      update public.story_items item
      set asset_url = 'https://example.com/legacy-story.webp',
          text_content = 'Conteúdo legado sem dossiê',
          metadata = '{}'::jsonb
      where item.item_id in (
        select link.item_id
        from public.story_sequences sequence
        join public.sequence_item_links link on link.sequence_id = sequence.sequence_id
        where sequence.kind = 'reference'
          and sequence.title = 'Stories para Enriquecer'
          and sequence.source_url = 'https://opensquad.com.br/stories-para-enriquecer.pdf'
      );

      delete from public.template_sequence_links template_link
      using public.story_sequences sequence, public.story_templates template
      where template_link.sequence_id = sequence.sequence_id
        and template_link.template_id = template.template_id
        and sequence.kind = 'reference'
        and sequence.title = 'Stories para Enriquecer'
        and sequence.source_url = 'https://opensquad.com.br/stories-para-enriquecer.pdf'
        and lower(btrim(template.name)) = lower('História → pequena entrega → CTA');
    `);

    await db.exec(enrichmentMigrationSql());
    await db.exec(reconciliationMigrationSql());
    await db.exec(reconciliationMigrationSql());

    const dossier = await db.query<{
      references: number;
      items: number;
      pages: number[];
      canonical_assets: number;
      rich_metadata: number;
    }>(`
      select
        count(distinct sequence.sequence_id)::int as references,
        count(item.item_id)::int as items,
        array_agg((item.metadata ->> 'sourcePage')::int order by link.narrative_order) as pages,
        count(*) filter (
          where item.asset_url = 'https://opensquad-commercial-intelligence.pages.dev/story-references/stories-para-enriquecer/page-'
            || (item.metadata ->> 'sourcePage') || '.webp'
        )::int as canonical_assets,
        count(*) filter (
          where item.metadata ?& array[
            'canonicalPageUrl', 'canonicalPageAssetUrl', 'evidenceType', 'sourceExcerpt',
            'analysis', 'criticism', 'brunoAdaptation', 'editorialStatus', 'moldConsequence'
          ]
        )::int as rich_metadata
      from public.story_sequences sequence
      join public.sequence_item_links link on link.sequence_id = sequence.sequence_id
      join public.story_items item on item.item_id = link.item_id
      where sequence.kind = 'reference'
        and sequence.title = 'Stories para Enriquecer'
        and sequence.source_url = 'https://opensquad.com.br/stories-para-enriquecer.pdf'
        and link.narrative_order between 1 and 5
    `);
    assert.deepEqual(dossier.rows[0], {
      references: 1,
      items: 5,
      pages: [42, 43, 44, 45, 46],
      canonical_assets: 5,
      rich_metadata: 5,
    });

    const moldLink = await db.query<{
      links: number;
      relationship: string;
      is_primary: boolean;
    }>(`
      select count(*)::int as links, min(template_link.relationship) as relationship,
        bool_and(template_link.is_primary) as is_primary
      from public.template_sequence_links template_link
      join public.story_sequences sequence on sequence.sequence_id = template_link.sequence_id
      join public.story_templates template on template.template_id = template_link.template_id
      where sequence.kind = 'reference'
        and sequence.title = 'Stories para Enriquecer'
        and sequence.source_url = 'https://opensquad.com.br/stories-para-enriquecer.pdf'
        and lower(btrim(template.name)) = lower('História → pequena entrega → CTA')
    `);
    assert.deepEqual(moldLink.rows[0], {
      links: 1,
      relationship: 'inspiration',
      is_primary: true,
    });

    await db.exec(`
      delete from public.sequence_item_links
      where narrative_order = 5
        and sequence_id = (
          select sequence_id from public.story_sequences
          where kind = 'reference'
            and title = 'Stories para Enriquecer'
            and source_url = 'https://opensquad.com.br/stories-para-enriquecer.pdf'
          order by created_at, sequence_id limit 1
        );
    `);
    await assert.rejects(
      db.exec(reconciliationMigrationSql()),
      /missing narrative_order\(s\): 5/i,
    );
  } finally {
    await db.close();
  }
});
