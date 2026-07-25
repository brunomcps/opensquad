import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { handleStoryAgentIngest } from '../../../supabase/functions/_shared/storyAgentIngest.ts';
import { createAgentReferenceFixture } from './storyReferenceAgentFixtures.ts';

const execFileAsync = promisify(execFile);
const directory = path.dirname(fileURLToPath(import.meta.url));
const contentHubRoot = path.resolve(directory, '../../..');
const baseMigrationPath = path.join(
  contentHubRoot,
  'supabase/migrations/20260724120000_ci_story_content.sql',
);
const agentMigrationPath = path.join(
  contentHubRoot,
  'supabase/migrations/20260725030000_ci_story_reference_agent_ingest.sql',
);
const clientPath = path.join(
  contentHubRoot,
  'hermes-skills/catalog-story-reference/scripts/publish_story_reference.py',
);
const keyId = 'hermes-local';
const secret = 'hermes-agent-secret-with-at-least-32-bytes';

async function createDatabase() {
  const db = new PGlite();
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key);
    create role anon;
    create role authenticated;
    create role service_role;
    create table public.ci_app_members (user_id uuid primary key references auth.users(id));
  `);
  await db.exec(await fs.readFile(baseMigrationPath, 'utf8'));
  await db.exec(await fs.readFile(agentMigrationPath, 'utf8'));
  return db;
}

async function sequenceRow(db: PGlite, sequenceId: string) {
  const sequence = await db.query<Record<string, any>>(
    'select * from public.story_sequences where sequence_id = $1',
    [sequenceId],
  );
  const row = sequence.rows[0];
  if (!row) return null;
  const templates = await db.query<Record<string, any>>(`
    select link.is_primary, link.relationship, template.template_id,
      template.canonical_key, template.name
    from public.template_sequence_links link
    join public.story_templates template on template.template_id = link.template_id
    where link.sequence_id = $1
    order by link.is_primary desc, template.template_id
  `, [sequenceId]);
  const items = await db.query<Record<string, any>>(`
    select link.narrative_order, link.narrative_role,
      item.item_id, item.media_type, item.asset_url, item.thumbnail_url,
      item.text_content, item.metadata, item.source_occurred_at
    from public.sequence_item_links link
    join public.story_items item on item.item_id = link.item_id
    where link.sequence_id = $1
    order by link.narrative_order
  `, [sequenceId]);
  return {
    ...row,
    template_sequence_links: templates.rows.map(template => ({
      is_primary: template.is_primary,
      relationship: template.relationship,
      story_templates: [{
        template_id: template.template_id,
        canonical_key: template.canonical_key,
        name: template.name,
      }],
    })),
    sequence_item_links: items.rows.map(item => ({
      narrative_order: item.narrative_order,
      narrative_role: item.narrative_role,
      story_items: [{
        item_id: item.item_id,
        media_type: item.media_type,
        asset_url: item.asset_url,
        thumbnail_url: item.thumbnail_url,
        text_content: item.text_content,
        metadata: item.metadata,
        source_occurred_at: item.source_occurred_at,
      }],
    })),
  };
}

function databaseClient(
  db: PGlite,
  files: Map<string, Blob>,
  uploadBaseUrl: () => string,
) {
  return {
    storage: {
      from() {
        return {
          async createSignedUploadUrl(storagePath: string) {
            return {
              data: { signedUrl: `${uploadBaseUrl()}/upload/${encodeURIComponent(storagePath)}` },
              error: null,
            };
          },
          getPublicUrl(storagePath: string) {
            return {
              data: { publicUrl: `https://cdn.example.test/story-reference-assets/${storagePath}` },
            };
          },
          async download(storagePath: string) {
            const data = files.get(storagePath);
            return data ? { data, error: null } : { data: null, error: { code: 'not_found' } };
          },
        };
      },
    },
    async rpc(name: string, args: Record<string, any>) {
      try {
        if (name === 'ci_claim_agent_nonce') {
          const result = await db.query<{ claimed: boolean }>(
            'select public.ci_claim_agent_nonce($1, $2, $3::timestamptz) as claimed',
            [args.p_key_id, args.p_nonce, args.p_requested_at],
          );
          return { data: result.rows[0]?.claimed, error: null };
        }
        if (name === 'story_upsert_agent_reference') {
          const result = await db.query(`
            select * from public.story_upsert_agent_reference(
              $1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb
            )
          `, [
            args.p_reference_key,
            args.p_content_hash,
            args.p_template_canonical_key,
            JSON.stringify(args.p_template),
            JSON.stringify(args.p_reference),
            JSON.stringify(args.p_items),
          ]);
          return { data: result.rows, error: null };
        }
        return { data: null, error: { code: 'unknown_rpc' } };
      } catch (error) {
        return { data: null, error };
      }
    },
    from(table: string) {
      assert.equal(table, 'story_sequences');
      return {
        select() {
          return {
            eq(column: string, value: string) {
              assert.equal(column, 'sequence_id');
              return {
                async single() {
                  const data = await sequenceRow(db, value);
                  return data ? { data, error: null } : { data: null, error: { code: 'not_found' } };
                },
              };
            },
          };
        },
      };
    },
  };
}

async function requestBody(request: http.IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

test('Hermes client publishes, repeats, corrects and reads back one canonical reference', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ci-story-agent-e2e-'));
  const receiptDirectory = path.join(tempRoot, 'receipts');
  const db = await createDatabase();
  const files = new Map<string, Blob>();
  let baseUrl = '';
  const client = databaseClient(db, files, () => baseUrl);
  const server = http.createServer(async (incoming, response) => {
    const body = await requestBody(incoming);
    try {
      if (incoming.method === 'PUT' && incoming.url?.startsWith('/upload/')) {
        const storagePath = decodeURIComponent(incoming.url.slice('/upload/'.length));
        files.set(storagePath, new Blob([Uint8Array.from(body)], {
          type: String(incoming.headers['content-type'] || ''),
        }));
        response.writeHead(200).end();
        return;
      }
      const headers = new Headers();
      Object.entries(incoming.headers).forEach(([name, value]) => {
        if (Array.isArray(value)) value.forEach(entry => headers.append(name, entry));
        else if (value != null) headers.set(name, value);
      });
      const request = new Request(`${baseUrl}${incoming.url}`, {
        method: incoming.method,
        headers,
        body: Uint8Array.from(body),
      });
      const result = await handleStoryAgentIngest(
        request,
        client,
        { [keyId]: secret },
        `${baseUrl}/`,
      );
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ ok: true, ...result }));
    } catch (error: any) {
      response.writeHead(error?.statusCode || 500, { 'content-type': 'application/json' });
      response.end(JSON.stringify({
        ok: false,
        error: { code: error?.code || 'internal_error', message: error?.message || 'Failure' },
      }));
    }
  });

  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    baseUrl = `http://127.0.0.1:${address.port}`;

    const fixture: any = createAgentReferenceFixture();
    const localAssets = [];
    for (const asset of fixture.assets) {
      const localPath = path.join(tempRoot, `story-${asset.narrativeOrder}.jpg`);
      await fs.writeFile(localPath, `fixture-image-${asset.narrativeOrder}`);
      localAssets.push({
        narrativeOrder: asset.narrativeOrder,
        localPath,
        mimeType: asset.mimeType,
      });
    }
    const payload = {
      referenceKey: fixture.referenceKey,
      template: fixture.template,
      reference: fixture.reference,
      assets: localAssets,
    };
    const payloadPath = path.join(tempRoot, 'payload.json');
    await fs.writeFile(payloadPath, JSON.stringify(payload), 'utf8');
    const environment = {
      ...process.env,
      HERMES_STORY_INGEST_URL: `${baseUrl}/functions/v1/ci-story-ingest`,
      HERMES_STORY_INGEST_KEY_ID: keyId,
      HERMES_STORY_INGEST_SECRET: secret,
      HERMES_STORY_RECEIPT_DIR: receiptDirectory,
    };
    const runClient = async () => {
      const result = await execFileAsync('python', [clientPath, 'publish', payloadPath], {
        cwd: contentHubRoot,
        env: environment,
        encoding: 'utf8',
      });
      assert.doesNotMatch(result.stdout + result.stderr, new RegExp(secret));
      return JSON.parse(result.stdout);
    };

    const created = await runClient();
    assert.equal(created.operation, 'created');
    assert.equal(created.revision, 1);
    assert.equal(new URL(created.link).searchParams.get('template'), created.templateId);
    assert.equal(new URL(created.link).searchParams.get('reference'), created.referenceId);
    assert.equal(created.reference.items.length, 4);

    const repeated = await runClient();
    assert.equal(repeated.operation, 'receipt');
    assert.equal(repeated.referenceId, created.referenceId);

    payload.reference.analysis.summary = 'Resumo transversal corrigido sem perder as camadas.';
    await fs.writeFile(payloadPath, JSON.stringify(payload), 'utf8');
    const updated = await runClient();
    assert.equal(updated.operation, 'updated');
    assert.equal(updated.referenceId, created.referenceId);
    assert.equal(updated.revision, 2);

    const state = await db.query<{
      references: number;
      revisions: number;
      revision: number;
      summary: string;
    }>(`
      select
        count(distinct sequence.sequence_id)::int as references,
        count(distinct revision.revision_id)::int as revisions,
        max(sequence.content_revision)::int as revision,
        max(sequence.analysis ->> 'summary') as summary
      from public.story_sequences sequence
      left join public.story_reference_revisions revision
        on revision.sequence_id = sequence.sequence_id
      where sequence.reference_key = $1
    `, [fixture.referenceKey]);
    assert.deepEqual(state.rows[0], {
      references: 1,
      revisions: 1,
      revision: 2,
      summary: payload.reference.analysis.summary,
    });

    const canonical = await sequenceRow(db, created.referenceId);
    assert.equal(canonical?.sequence_item_links.length, 4);
    for (const link of canonical?.sequence_item_links || []) {
      const metadata = link.story_items[0].metadata;
      assert.ok(metadata.quick);
      assert.ok(metadata.visual);
      assert.ok(metadata.deep);
      assert.match(link.story_items[0].asset_url, /^https:\/\/cdn\.example\.test\//);
    }
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await db.close();
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
