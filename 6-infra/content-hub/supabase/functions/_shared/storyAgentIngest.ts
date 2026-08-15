import { CommercialIntelligenceError } from './errors.ts';
import { claimAgentIngestNonce, verifyAgentIngestRequest } from './agentIngestAuth.ts';
import { sha256Bytes } from './crypto.ts';
import {
  MAX_AGENT_BODY_BYTES,
  parseAgentReferenceInput,
  type StoryAgentAssetInput,
  type StoryAgentReferenceInput,
} from './storyContent.ts';
import { loadSequence, relationRows } from './storyContentRepository.ts';

export const STORY_REFERENCE_BUCKET = 'story-reference-assets';
const STORY_REFERENCE_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
];
const STORY_REFERENCE_FILE_SIZE_LIMIT = 20 * 1024 * 1024;

const extensionByMime: Record<StoryAgentAssetInput['mimeType'], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

function fail(code: string, message: string, statusCode = 400): never {
  throw new CommercialIntelligenceError(code, message, statusCode);
}

export function expectedStoryAssetPath(
  referenceKey: string,
  asset: StoryAgentAssetInput,
): string {
  return `story-references/${referenceKey}/${asset.narrativeOrder}-${asset.sha256}.${extensionByMime[asset.mimeType]}`;
}

function publicAppUrl(value: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return fail('agent_ingest_not_configured', 'Link da plataforma não configurado.', 503);
  }
  if (parsed.protocol !== 'https:' && parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost') {
    return fail('agent_ingest_not_configured', 'Link da plataforma não configurado.', 503);
  }
  return parsed;
}

async function readBody(request: Request): Promise<{ bytes: Uint8Array; body: Record<string, unknown> }> {
  const declaredLength = Number(request.headers.get('content-length') || '0');
  if (declaredLength > MAX_AGENT_BODY_BYTES) {
    return fail('agent_ingest_payload_too_large', 'Payload maior que 1 MiB.', 413);
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > MAX_AGENT_BODY_BYTES) {
    return fail('agent_ingest_payload_too_large', 'Payload maior que 1 MiB.', 413);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return fail('agent_ingest_invalid_json', 'Payload JSON inválido.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return fail('agent_ingest_invalid_json', 'Payload JSON inválido.');
  }
  return { bytes, body: parsed as Record<string, unknown> };
}

function parsePayload(body: Record<string, unknown>): StoryAgentReferenceInput {
  try {
    return parseAgentReferenceInput(body);
  } catch (error) {
    return fail(
      'agent_ingest_invalid_reference',
      error instanceof Error ? error.message : 'Referência inválida.',
    );
  }
}

function storageApi(client: any) {
  return client.storage.from(STORY_REFERENCE_BUCKET);
}

async function ensureStoryReferenceBucket(client: any) {
  const existing = await client.storage.getBucket(STORY_REFERENCE_BUCKET);
  if (!existing.error && existing.data) return;

  const created = await client.storage.createBucket(STORY_REFERENCE_BUCKET, {
    public: true,
    fileSizeLimit: STORY_REFERENCE_FILE_SIZE_LIMIT,
    allowedMimeTypes: STORY_REFERENCE_ALLOWED_MIME_TYPES,
  });
  if (!created.error) return;

  // Another request may have created the bucket between the read and write.
  const raced = await client.storage.getBucket(STORY_REFERENCE_BUCKET);
  if (raced.error || !raced.data) {
    return fail('agent_ingest_storage_unavailable', 'Story reference storage is unavailable.', 503);
  }
}

async function prepareAssets(client: any, payload: StoryAgentReferenceInput) {
  await ensureStoryReferenceBucket(client);
  const storage = storageApi(client);
  const assets = [];
  for (const asset of payload.assets) {
    const storagePath = expectedStoryAssetPath(payload.referenceKey, asset);
    const signed = await storage.createSignedUploadUrl(storagePath, { upsert: true });
    if (signed.error || !signed.data?.signedUrl) {
      return fail('agent_ingest_storage_unavailable', 'Não foi possível preparar o upload.', 503);
    }
    const publicResult = storage.getPublicUrl(storagePath);
    const publicUrl = publicResult.data?.publicUrl;
    if (!publicUrl) return fail('agent_ingest_storage_unavailable', 'Não foi possível preparar o asset.', 503);
    assets.push({
      narrativeOrder: asset.narrativeOrder,
      storagePath,
      publicUrl,
      uploadUrl: signed.data.signedUrl,
      expiresInSeconds: 120,
    });
  }
  return { referenceKey: payload.referenceKey, contentHash: payload.contentHash, assets };
}

async function confirmAssets(client: any, payload: StoryAgentReferenceInput): Promise<Map<number, string>> {
  const storage = storageApi(client);
  const confirmed = new Map<number, string>();
  for (const asset of payload.assets) {
    const expectedPath = expectedStoryAssetPath(payload.referenceKey, asset);
    const expectedPublicUrl = storage.getPublicUrl(expectedPath).data?.publicUrl;
    if (asset.storagePath !== expectedPath || !expectedPublicUrl || asset.publicUrl !== expectedPublicUrl) {
      return fail('agent_ingest_asset_path_mismatch', `Caminho do asset ${asset.narrativeOrder} inválido.`);
    }
    const downloaded = await storage.download(expectedPath);
    if (downloaded.error || !downloaded.data) {
      return fail('agent_ingest_asset_missing', `Asset ${asset.narrativeOrder} não encontrado.`, 409);
    }
    const blob = downloaded.data as Blob;
    if (blob.size !== asset.sizeBytes || (blob.type && blob.type !== asset.mimeType)) {
      return fail('agent_ingest_asset_metadata_mismatch', `Metadata do asset ${asset.narrativeOrder} divergente.`, 409);
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (await sha256Bytes(bytes) !== asset.sha256) {
      return fail('agent_ingest_asset_hash_mismatch', `Hash do asset ${asset.narrativeOrder} divergente.`, 409);
    }
    confirmed.set(asset.narrativeOrder, expectedPublicUrl);
  }
  return confirmed;
}

async function publishReference(
  client: any,
  payload: StoryAgentReferenceInput,
  appUrl: string,
) {
  const urls = await confirmAssets(client, payload);
  const items = payload.reference.items.map(item => ({
    ...item,
    assetUrl: item.mediaType === 'text' ? null : urls.get(item.narrativeOrder),
  }));
  const persistedReference = {
    ...payload.reference,
    analysis: {
      ...payload.reference.analysis,
      dossierContractVersion: payload.dossierContractVersion,
      sequenceConfirmed: payload.reference.sequenceConfirmed,
      sequenceConfirmationSource: payload.reference.sequenceConfirmationSource,
    },
  };
  const persisted = await client.rpc('story_upsert_agent_reference', {
    p_reference_key: payload.referenceKey,
    p_content_hash: payload.contentHash,
    p_template_canonical_key: payload.template.canonicalKey,
    p_template: payload.template,
    p_reference: persistedReference,
    p_items: items,
  });
  const result = relationRows(persisted.data)[0];
  if (persisted.error || !result?.sequence_id || !result?.template_id) {
    return fail('agent_ingest_persistence_failed', 'Não foi possível salvar a referência.', 503);
  }
  const reference = await loadSequence(client, result.sequence_id);
  const expectedOrders = payload.reference.items.map(item => item.narrativeOrder);
  const actualOrders = reference.items.map((item: any) => item.narrativeOrder);
  if (reference.referenceKey !== payload.referenceKey
    || reference.contentHash !== payload.contentHash
    || reference.analysis?.dossierContractVersion !== payload.dossierContractVersion
    || reference.analysis?.sequenceConfirmed !== true
    || reference.analysis?.sequenceConfirmationSource !== payload.reference.sequenceConfirmationSource
    || reference.template?.templateId !== result.template_id
    || reference.template?.canonicalKey !== payload.template.canonicalKey
    || reference.contentRevision !== result.content_revision
    || JSON.stringify(actualOrders) !== JSON.stringify(expectedOrders)
    || reference.items.some((item: any) => item.mediaType !== 'text'
      && item.assetUrl !== urls.get(item.narrativeOrder))
  ) {
    return fail('agent_ingest_readback_mismatch', 'A leitura de retorno divergiu da publicação.', 503);
  }

  const link = publicAppUrl(appUrl);
  link.searchParams.set('tab', 'content-templates');
  link.searchParams.set('template', result.template_id);
  link.searchParams.set('reference', result.sequence_id);
  return {
    referenceKey: payload.referenceKey,
    referenceId: result.sequence_id,
    templateId: result.template_id,
    contentHash: payload.contentHash,
    revision: result.content_revision,
    operation: result.operation,
    link: link.toString(),
    reference,
  };
}

export async function handleStoryAgentIngest(
  request: Request,
  client: any,
  keys: Record<string, string>,
  appUrl: string,
  nowMs = Date.now(),
) {
  if (request.method !== 'POST') {
    return fail('method_not_allowed', 'Método não permitido.', 405);
  }
  const { bytes, body } = await readBody(request);
  const claim = await verifyAgentIngestRequest(request, bytes, keys, nowMs);
  await claimAgentIngestNonce(client, claim);
  const payload = parsePayload(body);
  if (body.action === 'prepare_assets') return prepareAssets(client, payload);
  if (body.action === 'publish_reference') return publishReference(client, payload, appUrl);
  return fail('agent_ingest_invalid_action', 'Ação de publicação inválida.');
}

