import { CommercialIntelligenceError } from './errors.ts';

export const TEMPLATE_FIELDS = 'template_id,canonical_key,name,description,objective,definition,tags,status,schema_version,created_at,updated_at,template_sequence_links(relationship,story_sequences(kind,publication_state))';
export const SEQUENCE_FIELDS = 'sequence_id,reference_key,content_hash,kind,title,description,analysis,platform,source_account,source_url,source_started_at,source_ended_at,sequence_state,publication_state,scheduled_for,published_at,content_revision,approved_revision,approved_at,review_note,created_at,updated_at,template_sequence_links(is_primary,relationship,story_templates(template_id,canonical_key,name)),sequence_item_links(narrative_order,narrative_role,story_items(item_id,media_type,asset_url,thumbnail_url,text_content,metadata,source_occurred_at))';

function databaseFailure(message = 'Não foi possível acessar o conteúdo.'): never {
  throw new CommercialIntelligenceError('database_error', message, 503);
}

export function relationRows(value: unknown): any[] {
  return Array.isArray(value) ? value : value ? [value] : [];
}

export function templateDto(row: any) {
  const links = relationRows(row.template_sequence_links);
  return {
    templateId: row.template_id,
    canonicalKey: row.canonical_key,
    name: row.name,
    description: row.description,
    objective: row.objective,
    definition: row.definition,
    steps: Array.isArray(row.definition?.steps) ? row.definition.steps : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
    status: row.status,
    schemaVersion: row.schema_version,
    referenceCount: links.filter(link => relationRows(link.story_sequences).some(sequence => sequence.kind === 'reference')).length,
    publicationCount: links.filter(link => relationRows(link.story_sequences).some(sequence => sequence.kind === 'publication')).length,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function sequenceDto(row: any) {
  const templateLink = relationRows(row.template_sequence_links).find(link => link.is_primary)
    || relationRows(row.template_sequence_links)[0];
  const template = relationRows(templateLink?.story_templates)[0];
  const items = relationRows(row.sequence_item_links).map(link => {
    const item = relationRows(link.story_items)[0] || {};
    return {
      itemId: item.item_id,
      mediaType: item.media_type,
      assetUrl: item.asset_url,
      thumbnailUrl: item.thumbnail_url,
      textContent: item.text_content,
      metadata: item.metadata,
      sourceOccurredAt: item.source_occurred_at,
      narrativeOrder: link.narrative_order,
      narrativeRole: link.narrative_role,
    };
  }).sort((left, right) => left.narrativeOrder - right.narrativeOrder);
  return {
    sequenceId: row.sequence_id,
    referenceKey: row.reference_key,
    contentHash: row.content_hash,
    kind: row.kind,
    title: row.title,
    description: row.description,
    analysis: row.analysis,
    platform: row.platform,
    sourceAccount: row.source_account,
    sourceUrl: row.source_url,
    sourceStartedAt: row.source_started_at,
    sourceEndedAt: row.source_ended_at,
    sequenceState: row.sequence_state,
    publicationState: row.publication_state,
    scheduledFor: row.scheduled_for,
    publishedAt: row.published_at,
    contentRevision: row.content_revision,
    approvedRevision: row.approved_revision,
    approvedAt: row.approved_at,
    reviewNote: row.review_note,
    template: template
      ? {
          templateId: template.template_id,
          canonicalKey: template.canonical_key,
          name: template.name,
        }
      : null,
    items,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadSequence(client: any, id: string) {
  const result = await client.from('story_sequences')
    .select(SEQUENCE_FIELDS)
    .eq('sequence_id', id)
    .single();
  if (result.error || !result.data) databaseFailure();
  return sequenceDto(result.data);
}

