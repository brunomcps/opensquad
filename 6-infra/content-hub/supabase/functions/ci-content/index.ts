import { authorizeMember } from '../_shared/auth.ts';
import { serviceClient } from '../_shared/client.ts';
import { CommercialIntelligenceError } from '../_shared/errors.ts';
import { errorResponse, json, preflight, readJson } from '../_shared/http.ts';
import {
  parseCreatePublicationInput,
  parseCreateReferenceInput,
  parseCreateTemplateInput,
  parseReviewInput,
  parseUpdatePublicationInput,
} from '../_shared/storyContent.ts';
import {
  loadSequence,
  relationRows,
  sequenceDto,
  SEQUENCE_FIELDS,
  templateDto,
  TEMPLATE_FIELDS,
} from '../_shared/storyContentRepository.ts';

function databaseFailure(message = 'Não foi possível acessar o conteúdo.'): never {
  throw new CommercialIntelligenceError('database_error', message, 503);
}

async function listTemplates(client: any) {
  const result = await client.from('story_templates')
    .select(TEMPLATE_FIELDS)
    .neq('status', 'archived')
    .order('updated_at', { ascending: false });
  if (result.error) databaseFailure();
  return (result.data || []).map(templateDto);
}

async function listSequences(client: any, approvalsOnly: boolean) {
  let query = client.from('story_sequences')
    .select(SEQUENCE_FIELDS)
    .eq('kind', 'publication')
    .order(approvalsOnly ? 'created_at' : 'updated_at', { ascending: approvalsOnly });
  if (approvalsOnly) query = query.eq('publication_state', 'pending_approval');
  else query = query.neq('publication_state', 'cancelled');
  const result = await query.limit(100);
  if (result.error) databaseFailure();
  return (result.data || []).map(sequenceDto);
}

async function listReferences(client: any) {
  const result = await client.from('story_sequences')
    .select(SEQUENCE_FIELDS)
    .eq('kind', 'reference')
    .neq('sequence_state', 'archived')
    .order('source_started_at', { ascending: false, nullsFirst: false })
    .limit(100);
  if (result.error) databaseFailure('Não foi possível carregar as referências.');
  return (result.data || []).map(sequenceDto);
}

function action(body: Record<string, unknown>): string {
  return typeof body.action === 'string' ? body.action : '';
}

function sequenceId(body: Record<string, unknown>): string {
  const value = typeof body.sequenceId === 'string' ? body.sequenceId.trim() : '';
  if (!/^[0-9a-f-]{36}$/i.test(value)) throw new CommercialIntelligenceError('invalid_sequence', 'Publicação inválida.', 400);
  return value;
}

function revision(body: Record<string, unknown>): number {
  const value = Number(body.expectedRevision);
  if (!Number.isInteger(value) || value < 1) throw new CommercialIntelligenceError('invalid_revision', 'Revisão inválida.', 400);
  return value;
}

async function createTemplate(client: any, body: Record<string, unknown>, userId: string) {
  let input;
  try {
    input = parseCreateTemplateInput(body);
  } catch (error) {
    throw new CommercialIntelligenceError('invalid_template', error instanceof Error ? error.message : 'Template inválido.', 400);
  }
  const inserted = await client.from('story_templates').insert({
    name: input.name,
    description: input.description,
    objective: input.objective,
    definition: input.definition,
    tags: input.tags,
    status: 'active',
    created_by: userId,
  }).select(TEMPLATE_FIELDS).single();
  if (inserted.error || !inserted.data) databaseFailure('Não foi possível salvar o template.');
  return templateDto(inserted.data);
}

async function createReference(client: any, body: Record<string, unknown>, userId: string) {
  let input;
  try {
    input = parseCreateReferenceInput(body);
  } catch (error) {
    throw new CommercialIntelligenceError('invalid_reference', error instanceof Error ? error.message : 'Referência inválida.', 400);
  }
  const created = await client.rpc('story_create_reference', {
    p_title: input.title,
    p_description: input.description,
    p_analysis: input.analysis || {},
    p_platform: input.platform,
    p_source_account: input.sourceAccount,
    p_source_url: input.sourceUrl,
    p_source_started_at: input.sourceStartedAt,
    p_source_ended_at: input.sourceEndedAt,
    p_template_id: input.templateId,
    p_items: input.items,
    p_created_by: userId,
  });
  if (created.error || !created.data) databaseFailure('Não foi possível salvar a referência.');
  return loadSequence(client, created.data);
}

async function createPublication(client: any, body: Record<string, unknown>, userId: string) {
  let input;
  try {
    input = parseCreatePublicationInput(body);
  } catch (error) {
    throw new CommercialIntelligenceError('invalid_publication', error instanceof Error ? error.message : 'Publicação inválida.', 400);
  }
  const created = await client.rpc('story_create_publication', {
    p_title: input.title,
    p_template_id: input.templateId,
    p_scheduled_for: input.scheduledFor,
    p_items: input.items,
    p_created_by: userId,
  });
  if (created.error || !created.data) databaseFailure('Não foi possível criar a publicação.');
  return loadSequence(client, created.data);
}

async function updatePublication(client: any, body: Record<string, unknown>, userId: string) {
  let input;
  try {
    input = parseUpdatePublicationInput(body);
  } catch (error) {
    throw new CommercialIntelligenceError('invalid_publication', error instanceof Error ? error.message : 'Publicação inválida.', 400);
  }
  const id = sequenceId(body);
  const updated = await client.rpc('story_update_publication', {
    p_sequence_id: id,
    p_expected_revision: input.expectedRevision,
    p_title: input.title,
    p_template_id: input.templateId,
    p_scheduled_for: input.scheduledFor,
    p_items: input.items,
    p_updated_by: userId,
  });
  if (updated.error || !updated.data) {
    throw new CommercialIntelligenceError('revision_conflict', 'A publicação mudou ou não pode ser editada agora.', 409);
  }
  return loadSequence(client, id);
}

async function requestApproval(client: any, body: Record<string, unknown>) {
  const id = sequenceId(body);
  const result = await client.rpc('story_request_publication_approval', {
    p_sequence_id: id,
    p_expected_revision: revision(body),
  });
  if (result.error || !result.data) throw new CommercialIntelligenceError('revision_conflict', 'A publicação mudou ou não pode ser enviada agora.', 409);
  return loadSequence(client, id);
}

async function reviewPublication(client: any, body: Record<string, unknown>, userId: string) {
  let review;
  try {
    review = parseReviewInput(body);
  } catch (error) {
    throw new CommercialIntelligenceError('invalid_review', error instanceof Error ? error.message : 'Revisão inválida.', 400);
  }
  const id = sequenceId(body);
  const result = await client.rpc('story_review_publication', {
    p_sequence_id: id,
    p_expected_revision: revision(body),
    p_decision: review.decision,
    p_note: review.note,
    p_reviewer: userId,
  });
  if (result.error || !result.data) throw new CommercialIntelligenceError('revision_conflict', 'A publicação mudou ou já foi revisada.', 409);
  return loadSequence(client, id);
}

Deno.serve(async request => {
  const options = preflight(request);
  if (options) return options;
  try {
    const client = serviceClient();
    if (request.method === 'GET') {
      const member = await authorizeMember(request, client, 'viewer');
      const section = new URL(request.url).searchParams.get('section') || 'templates';
      if (section === 'templates') return json(request, { ok: true, templates: await listTemplates(client), member: { role: member.role } });
      if (section === 'references') return json(request, { ok: true, references: await listReferences(client), member: { role: member.role } });
      if (section === 'publications') return json(request, { ok: true, publications: await listSequences(client, false), member: { role: member.role } });
      if (section === 'approvals') return json(request, { ok: true, publications: await listSequences(client, true), member: { role: member.role } });
      throw new CommercialIntelligenceError('invalid_section', 'Seção de conteúdo inválida.', 400);
    }
    if (request.method === 'POST') {
      const member = await authorizeMember(request, client, 'admin');
      const body = await readJson(request);
      if (action(body) === 'create_template') return json(request, { ok: true, template: await createTemplate(client, body, member.userId) }, 201);
      if (action(body) === 'create_reference') return json(request, { ok: true, reference: await createReference(client, body, member.userId) }, 201);
      if (action(body) === 'create_publication') return json(request, { ok: true, publication: await createPublication(client, body, member.userId) }, 201);
      throw new CommercialIntelligenceError('invalid_action', 'Ação de conteúdo inválida.', 400);
    }
    if (request.method === 'PATCH') {
      const member = await authorizeMember(request, client, 'admin');
      const body = await readJson(request);
      if (action(body) === 'update_publication') return json(request, { ok: true, publication: await updatePublication(client, body, member.userId) });
      if (action(body) === 'request_approval') return json(request, { ok: true, publication: await requestApproval(client, body) });
      if (action(body) === 'review_publication') return json(request, { ok: true, publication: await reviewPublication(client, body, member.userId) });
      throw new CommercialIntelligenceError('invalid_action', 'Ação de conteúdo inválida.', 400);
    }
    return json(request, { ok: false, error: { code: 'method_not_allowed', message: 'Método não permitido.' } }, 405);
  } catch (error) {
    return errorResponse(request, error);
  }
});
