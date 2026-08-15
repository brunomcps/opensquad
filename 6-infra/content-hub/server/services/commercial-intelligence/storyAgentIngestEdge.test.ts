import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canonicalAgentIngestPayload,
  canonicalAgentIngestRequestPath,
} from '../../../supabase/functions/_shared/agentIngestAuth.ts';
import {
  hmacSha256,
  sha256Bytes,
} from '../../../supabase/functions/_shared/crypto.ts';
import {
  expectedStoryAssetPath,
  handleStoryAgentIngest,
  STORY_REFERENCE_BUCKET,
} from '../../../supabase/functions/_shared/storyAgentIngest.ts';
import { createAgentReferenceFixture } from './storyReferenceAgentFixtures.ts';

const keyId = 'hermes-local';
const secret = 'hermes-agent-secret-with-at-least-32-bytes';
const now = Date.parse('2026-07-24T19:00:00.000Z');
const endpointPath = '/functions/v1/ci-story-ingest';

async function signedRequest(body: Record<string, unknown>, nonce: string): Promise<Request> {
  const bodyText = JSON.stringify(body);
  const bytes = new TextEncoder().encode(bodyText);
  const timestamp = String(now);
  const signature = await hmacSha256(secret, canonicalAgentIngestPayload(
    'POST',
    canonicalAgentIngestRequestPath(endpointPath),
    timestamp,
    nonce,
    await sha256Bytes(bytes),
  ));
  return new Request(`https://example.test${endpointPath}`, {
    method: 'POST',
    body: bodyText,
    headers: {
      'content-type': 'application/json',
      'x-ci-agent-key': keyId,
      'x-ci-agent-timestamp': timestamp,
      'x-ci-agent-nonce': nonce,
      'x-ci-agent-signature': signature,
    },
  });
}

async function payloadWithRealAssets() {
  const payload: any = createAgentReferenceFixture();
  const files = new Map<string, Blob>();
  for (const asset of payload.assets) {
    const bytes = new TextEncoder().encode(`fixture-image-${asset.narrativeOrder}`);
    asset.sha256 = await sha256Bytes(bytes);
    asset.sizeBytes = bytes.byteLength;
    const path = expectedStoryAssetPath(payload.referenceKey, asset);
    files.set(path, new Blob([bytes], { type: asset.mimeType }));
  }
  return { payload, files };
}

function fakeClient(files: Map<string, Blob>) {
  let storedRow: any = null;
  const calls: Array<[string, any]> = [];
  return {
    calls,
    storage: {
      async getBucket(bucket: string) {
        assert.equal(bucket, STORY_REFERENCE_BUCKET);
        return {
          data: { id: STORY_REFERENCE_BUCKET, public: true },
          error: null,
        };
      },
      async createBucket() {
        throw new Error('createBucket should not run when the bucket already exists');
      },
      from(bucket: string) {
        assert.equal(bucket, STORY_REFERENCE_BUCKET);
        return {
          async createSignedUploadUrl(path: string) {
            return {
              data: { signedUrl: `https://upload.example.test/${path}` },
              error: null,
            };
          },
          getPublicUrl(path: string) {
            return {
              data: { publicUrl: `https://cdn.example.test/${STORY_REFERENCE_BUCKET}/${path}` },
            };
          },
          async download(path: string) {
            const data = files.get(path);
            return data
              ? { data, error: null }
              : { data: null, error: { code: 'not_found' } };
          },
        };
      },
    },
    async rpc(name: string, args: any) {
      calls.push([name, args]);
      if (name === 'ci_claim_agent_nonce') return { data: true, error: null };
      if (name === 'story_upsert_agent_reference') {
        const sequenceId = '70000000-0000-4000-8000-000000000001';
        const templateId = '71000000-0000-4000-8000-000000000001';
        storedRow = {
          sequence_id: sequenceId,
          reference_key: args.p_reference_key,
          content_hash: args.p_content_hash,
          kind: 'reference',
          title: args.p_reference.title,
          description: args.p_reference.description,
          analysis: args.p_reference.analysis,
          platform: args.p_reference.platform,
          source_account: args.p_reference.sourceAccount,
          source_url: args.p_reference.sourceUrl,
          source_started_at: args.p_reference.sourceStartedAt,
          source_ended_at: args.p_reference.sourceEndedAt,
          sequence_state: 'closed',
          publication_state: null,
          scheduled_for: null,
          published_at: null,
          content_revision: 1,
          approved_revision: null,
          approved_at: null,
          review_note: null,
          created_at: '2026-07-24T19:00:00.000Z',
          updated_at: '2026-07-24T19:00:00.000Z',
          template_sequence_links: [{
            is_primary: true,
            relationship: 'inspiration',
            story_templates: {
              template_id: templateId,
              canonical_key: args.p_template_canonical_key,
              name: args.p_template.name,
            },
          }],
          sequence_item_links: args.p_items.map((item: any, index: number) => ({
            narrative_order: item.narrativeOrder,
            narrative_role: item.narrativeRole,
            story_items: {
              item_id: `72000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
              media_type: item.mediaType,
              asset_url: item.assetUrl,
              thumbnail_url: null,
              text_content: item.textContent,
              metadata: item.metadata,
              source_occurred_at: item.sourceOccurredAt,
            },
          })),
        };
        return {
          data: [{
            sequence_id: sequenceId,
            template_id: templateId,
            content_revision: 1,
            operation: 'created',
          }],
          error: null,
        };
      }
      return { data: null, error: { code: 'unknown_rpc' } };
    },
    from(table: string) {
      assert.equal(table, 'story_sequences');
      return {
        select() {
          return {
            eq() {
              return {
                async single() {
                  return storedRow
                    ? { data: storedRow, error: null }
                    : { data: null, error: { code: 'not_found' } };
                },
              };
            },
          };
        },
      };
    },
  };
}

test('story agent ingest prepares deterministic uploads and publishes only after read-back', async () => {
  const { payload, files } = await payloadWithRealAssets();
  const client = fakeClient(files);
  const prepared: any = await handleStoryAgentIngest(
    await signedRequest({ action: 'prepare_assets', ...payload }, 'nonce_prepare_123456'),
    client,
    { [keyId]: secret },
    'https://opensquad-commercial-intelligence.pages.dev/',
    now,
  );
  assert.equal(prepared.assets.length, 4);
  assert.equal(prepared.assets[0].storagePath, expectedStoryAssetPath(payload.referenceKey, payload.assets[0]!));

  payload.assets.forEach((asset: any, index: number) => {
    asset.storagePath = prepared.assets[index]!.storagePath;
    asset.publicUrl = prepared.assets[index]!.publicUrl;
  });
  const published: any = await handleStoryAgentIngest(
    await signedRequest({ action: 'publish_reference', ...payload }, 'nonce_publish_123456'),
    client,
    { [keyId]: secret },
    'https://opensquad-commercial-intelligence.pages.dev/',
    now,
  );
  assert.equal(published.operation, 'created');
  assert.equal(published.revision, 1);
  assert.match(published.link, /tab=content-templates/);
  assert.match(published.link, /template=71000000-/);
  assert.match(published.link, /reference=70000000-/);
  assert.equal(published.reference.items.length, 4);
  assert.equal(published.reference.analysis.dossierContractVersion, '1.0');
  assert.equal(published.reference.analysis.sequenceConfirmed, true);
  assert.equal(published.reference.analysis.sequenceConfirmationSource, payload.reference.sequenceConfirmationSource);
  const publishCall = client.calls.find(([name]) => name === 'story_upsert_agent_reference');
  assert.ok(publishCall);
  assert.equal(publishCall[1].p_reference.analysis.dossierContractVersion, '1.0');
  assert.equal(publishCall[1].p_reference.analysis.sequenceConfirmed, true);
  assert.equal(publishCall[1].p_reference.analysis.sequenceConfirmationSource, payload.reference.sequenceConfirmationSource);
  assert.equal(client.calls.filter(([name]) => name === 'story_upsert_agent_reference').length, 1);
});

test('story agent ingest refuses a remote asset whose bytes do not match the manifest', async () => {
  const { payload, files } = await payloadWithRealAssets();
  const client = fakeClient(files);
  payload.assets.forEach((asset: any) => {
    asset.storagePath = expectedStoryAssetPath(payload.referenceKey, asset);
    asset.publicUrl = `https://cdn.example.test/${STORY_REFERENCE_BUCKET}/${asset.storagePath}`;
  });
  const firstPath = payload.assets[0]!.storagePath!;
  files.set(firstPath, new Blob([new TextEncoder().encode('tampered')], { type: 'image/jpeg' }));

  await assert.rejects(
    async () => handleStoryAgentIngest(
      await signedRequest({ action: 'publish_reference', ...payload }, 'nonce_tamper_123456'),
      client,
      { [keyId]: secret },
      'https://opensquad-commercial-intelligence.pages.dev/',
      now,
    ),
    (error: any) => ['agent_ingest_asset_metadata_mismatch', 'agent_ingest_asset_hash_mismatch'].includes(error.code),
  );
  assert.equal(client.calls.some(([name]) => name === 'story_upsert_agent_reference'), false);
});
