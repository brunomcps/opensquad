import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { createAgentReferenceFixture } from '../../services/commercial-intelligence/storyReferenceAgentFixtures.ts';

const directory = path.dirname(fileURLToPath(import.meta.url));
const baseMigrationPath = path.resolve(
  directory,
  '../../../supabase/migrations/20260724120000_ci_story_content.sql',
);
const migrationPath = path.resolve(
  directory,
  '../../../supabase/migrations/20260725030000_ci_story_reference_agent_ingest.sql',
);
const sql = () => fs.readFileSync(migrationPath, 'utf8');

async function createDatabase(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key);
    create role anon;
    create role authenticated;
    create role service_role;
    create table public.ci_app_members (user_id uuid primary key references auth.users(id));
  `);
  await db.exec(fs.readFileSync(baseMigrationPath, 'utf8'));
  return db;
}

function rpcPayload(contentHash = 'a'.repeat(64)) {
  const fixture = createAgentReferenceFixture();
  fixture.contentHash = contentHash;
  return {
    ...fixture,
    items: fixture.reference.items.map((item) => ({
      ...item,
      assetUrl: `https://cdn.example.com/${item.narrativeOrder}-${contentHash.slice(0, 8)}.jpg`,
    })),
  };
}

async function upsert(db: PGlite, payload: ReturnType<typeof rpcPayload>) {
  return db.query<{
    sequence_id: string;
    template_id: string;
    content_revision: number;
    operation: string;
  }>(
    `select * from public.story_upsert_agent_reference($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb)`,
    [
      payload.referenceKey,
      payload.contentHash,
      payload.template.canonicalKey,
      JSON.stringify(payload.template),
      JSON.stringify(payload.reference),
      JSON.stringify(payload.items),
    ],
  );
}

test('agent migration is additive and protects both RPCs from browser roles', () => {
  const migration = sql();
  assert.doesNotMatch(migration, /\bdrop\s+(table|column|function|schema)\b/i);
  assert.match(migration, /add column if not exists canonical_key/i);
  assert.match(migration, /add column if not exists reference_key/i);
  assert.match(migration, /create table if not exists public\.story_reference_revisions/i);
  assert.match(migration, /create table if not exists public\.ci_agent_request_nonces/i);
  assert.match(migration, /revoke all on function public\.story_upsert_agent_reference[\s\S]*?anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.story_upsert_agent_reference[\s\S]*?service_role/i);
});

test('agent migration creates, repeats and corrects the same canonical reference', async () => {
  const db = await createDatabase();
  try {
    const protectedBefore = await db.query<{ snapshot: string }>(`
      select jsonb_build_object(
        'templateId', template_id,
        'name', name,
        'definition', definition,
        'status', status
      )::text as snapshot
      from public.story_templates
      where lower(btrim(name)) = lower('História → pequena entrega → CTA')
    `);

    await db.exec(sql());

    const canonicalTemplates = await db.query<{ name: string; canonical_key: string }>(`
      select name, canonical_key
      from public.story_templates
      where lower(btrim(name)) in (
        lower('Cena → lente → princípio'),
        lower('História → pequena entrega → CTA')
      )
      order by name
    `);
    assert.equal(canonicalTemplates.rows.length, 2);
    assert.equal(new Set(canonicalTemplates.rows.map(row => row.canonical_key)).size, 2);

    const created = await upsert(db, rpcPayload());
    assert.equal(created.rows[0]?.operation, 'created');
    assert.equal(created.rows[0]?.content_revision, 1);
    const sequenceId = created.rows[0]!.sequence_id;

    const repeated = await upsert(db, rpcPayload());
    assert.equal(repeated.rows[0]?.operation, 'unchanged');
    assert.equal(repeated.rows[0]?.sequence_id, sequenceId);
    assert.equal(repeated.rows[0]?.content_revision, 1);

    const correction = rpcPayload('b'.repeat(64));
    correction.reference.title = 'Título corrigido, mesma referência';
    const updated = await upsert(db, correction);
    assert.equal(updated.rows[0]?.operation, 'updated');
    assert.equal(updated.rows[0]?.sequence_id, sequenceId);
    assert.equal(updated.rows[0]?.content_revision, 2);

    const state = await db.query<{
      references: number;
      revisions: number;
      stories: number;
      title: string;
    }>(`
      select
        count(distinct sequence.sequence_id)::int as references,
        count(distinct revision.revision_id)::int as revisions,
        count(distinct item_link.item_id)::int as stories,
        max(sequence.title) as title
      from public.story_sequences sequence
      left join public.story_reference_revisions revision
        on revision.sequence_id = sequence.sequence_id
      left join public.sequence_item_links item_link
        on item_link.sequence_id = sequence.sequence_id
      where sequence.reference_key = 'instagram-bruno-2026-07-24-sequencia-001'
    `);
    assert.deepEqual(state.rows[0], {
      references: 1,
      revisions: 1,
      stories: 4,
      title: 'Título corrigido, mesma referência',
    });

    const protectedAfter = await db.query<{ snapshot: string }>(`
      select jsonb_build_object(
        'templateId', template_id,
        'name', name,
        'definition', definition,
        'status', status
      )::text as snapshot
      from public.story_templates
      where lower(btrim(name)) = lower('História → pequena entrega → CTA')
    `);
    assert.equal(protectedAfter.rows[0]?.snapshot, protectedBefore.rows[0]?.snapshot);
  } finally {
    await db.close();
  }
});

test('agent migration rolls back a failed reference and rejects nonce replay', async () => {
  const db = await createDatabase();
  try {
    await db.exec(sql());
    const invalid = rpcPayload();
    invalid.referenceKey = 'instagram-bruno-rollback';
    invalid.items[2]!.narrativeRole = 'invalid-role';
    await assert.rejects(() => upsert(db, invalid), /constraint|narrative_role/i);

    const count = await db.query<{ count: number }>(`
      select count(*)::int as count
      from public.story_sequences
      where reference_key = 'instagram-bruno-rollback'
    `);
    assert.equal(count.rows[0]?.count, 0);

    const first = await db.query<{ claimed: boolean }>(`
      select public.ci_claim_agent_nonce(
        'hermes-local',
        'nonce_1234567890abcdef',
        now()
      ) as claimed
    `);
    const replay = await db.query<{ claimed: boolean }>(`
      select public.ci_claim_agent_nonce(
        'hermes-local',
        'nonce_1234567890abcdef',
        now()
      ) as claimed
    `);
    assert.equal(first.rows[0]?.claimed, true);
    assert.equal(replay.rows[0]?.claimed, false);

    const privileges = await db.query<{ anon_execute: boolean; service_execute: boolean }>(`
      select
        has_function_privilege(
          'anon',
          'public.story_upsert_agent_reference(text,text,text,jsonb,jsonb,jsonb)',
          'EXECUTE'
        ) as anon_execute,
        has_function_privilege(
          'service_role',
          'public.story_upsert_agent_reference(text,text,text,jsonb,jsonb,jsonb)',
          'EXECUTE'
        ) as service_execute
    `);
    assert.deepEqual(privileges.rows[0], { anon_execute: false, service_execute: true });
  } finally {
    await db.close();
  }
});
