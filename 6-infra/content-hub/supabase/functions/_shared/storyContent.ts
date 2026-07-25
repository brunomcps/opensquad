export type StoryNarrativeRole = 'hook' | 'context' | 'development' | 'proof' | 'cta' | 'closing' | 'other';
export type StoryDossierContractVersion = '1.0';
export type StoryCoreDimension =
  | 'evidence'
  | 'attention'
  | 'narrative'
  | 'continuity'
  | 'funnel'
  | 'subtext'
  | 'template-consequence';
export type StoryContextualDimensionStatus = 'present' | 'not-applicable' | 'unknown';
export type StorySynthesisKey =
  | 'screen-roles'
  | 'stimulus-change'
  | 'aesthetics-production'
  | 'strengths-limitations';
export type StorySequenceMapKind = 'story' | 'product';
export type StoryPublicationState =
  | 'draft'
  | 'pending_approval'
  | 'changes_requested'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'cancelled'
  | 'failed';

export interface StoryTemplateStepInput {
  role: StoryNarrativeRole;
  instruction: string;
  templateStepIds?: string[];
}

export type StoryTemplatePlaceholderKind =
  | 'scene'
  | 'copy'
  | 'person'
  | 'proof'
  | 'response'
  | 'principle'
  | 'reaction';

export interface StoryTemplatePlaceholderInput {
  kind: StoryTemplatePlaceholderKind;
  label: string;
  slot?: 'top' | 'upper' | 'middle' | 'lower' | 'bottom';
}

export interface StoryTemplateMoldStepInput {
  id?: string | null;
  templateStepIds?: string[];
  title: string;
  purpose: string;
  fixedFunction?: string | null;
  placeholders?: StoryTemplatePlaceholderInput[];
}

export interface StoryTemplateDefinitionInput {
  editorialName?: string | null;
  editorialSummary?: string | null;
  formula?: string | null;
  risks?: string[];
  preserveRules?: string[];
  adaptRules?: string[];
  avoidRules?: string[];
  moldSteps?: StoryTemplateMoldStepInput[];
  steps: StoryTemplateStepInput[];
}

export interface StoryTemplateInput {
  name: string;
  objective: string;
  description: string | null;
  tags: string[];
  /** Rich definition is optional at the form boundary; the parser always returns it. */
  definition?: StoryTemplateDefinitionInput;
  steps: StoryTemplateStepInput[];
}

export interface StoryPublicationItemInput {
  mediaType: 'image' | 'video' | 'text';
  assetUrl: string | null;
  textContent: string | null;
  narrativeOrder: number;
  narrativeRole: StoryNarrativeRole;
}

export interface StoryPublicationInput {
  title: string;
  templateId: string;
  scheduledFor: string | null;
  items: StoryPublicationItemInput[];
}

export interface StoryPublicationUpdateInput extends StoryPublicationInput {
  expectedRevision: number;
}

export interface StoryEvidenceMetadataInput {
  sourcePage?: number | null;
  canonicalPageUrl?: string | null;
  canonicalPageAssetUrl?: string | null;
  evidenceType?: string | null;
  sourceExcerpt?: string | null;
  noSourceTextReason?: string | null;
  analysis?: string | null;
  criticism?: string | null;
  brunoAdaptation?: string | null;
  editorialStatus?: string | null;
  moldConsequence?: string | null;
  audienceEffect?: string | null;
  subtext?: string | null;
  funnelFunction?: string | null;
  extractedRule?: string | null;
  analysisSections?: StoryEvidenceSectionInput[];
  quick?: StoryQuickAnalysisInput;
  visual?: StoryVisualAnalysisInput;
  deep?: StoryDeepAnalysisInput;
}

export interface StoryEvidenceSectionInput {
  title: string;
  covers?: StoryCoreDimension[];
  paragraphs?: string[];
  bullets?: string[];
}

export interface StoryDimensionAssessmentInput {
  status: StoryContextualDimensionStatus;
  rationale: string;
}

export interface StoryVisualMarkerInput {
  label: string;
  description: string;
}

export interface StoryVisualAnalysisInput {
  roleLabel?: string | null;
  title?: string | null;
  scene?: string | null;
  typography?: string | null;
  composition?: string | null;
  graphic?: string | null;
  palette?: string[];
  impression?: string | null;
  markers?: StoryVisualMarkerInput[];
}

export interface StoryQuickAnalysisInput {
  roleLabel: string;
  title: string;
  summary: string;
  evidence: string;
  audienceEffect: string;
  subtext: string;
  funnelFunction: string;
  extractedRule: string;
}

export interface StoryDeepAnalysisInput {
  roleLabel: string;
  title: string;
  lead: string;
  dimensionAssessments?: {
    interaction: StoryDimensionAssessmentInput;
    critique: StoryDimensionAssessmentInput;
  };
  sections: StoryEvidenceSectionInput[];
  extractedRule: string;
}

export interface StorySynthesisInput {
  key?: StorySynthesisKey;
  title: string;
  paragraphs: string[];
}

export interface StoryRegisteredTemplateStepInput {
  id?: string;
  title: string;
  description: string;
  mechanism?: string;
  condition?: string;
  expectedResult?: string;
  evidenceStoryOrders?: number[];
}

export interface StoryRegisteredTemplateInput {
  name: string;
  formula?: string;
  useWhen?: string;
  primaryFunction?: string;
  requiredElements?: string[];
  optionalElements?: string[];
  executionRisks?: string[];
  capturesOrInputs?: string[];
  brunoAdaptation?: string;
  steps: StoryRegisteredTemplateStepInput[];
}

export interface StorySequenceMapItemInput {
  kind?: StorySequenceMapKind;
  storyOrder?: number;
  label: string;
  value: string;
}

export interface StorySourceLibraryCategoryInput {
  key: string;
  label: string;
}

export interface StorySourceLibraryModuleQuickInput {
  summary: string;
  outcome: string;
  useWhen: string;
}

export interface StorySourceLibraryModuleMoldInput {
  name: string;
  formula: string;
  steps: string[];
}

export interface StorySourceLibraryModuleInput {
  key: string;
  order: number;
  category: string;
  lessonLabel: string;
  title: string;
  pageStart: number;
  pageEnd: number;
  quick: StorySourceLibraryModuleQuickInput;
  principles: string[];
  techniques: string[];
  cautions: string[];
  brunoApplications: string[];
  mold: StorySourceLibraryModuleMoldInput;
}

export interface StorySourceLibraryInput {
  title: string;
  description: string;
  sourceDocument: string;
  totalPages: number;
  coveredPageStart: number;
  coveredPageEnd: number;
  categories: StorySourceLibraryCategoryInput[];
  modules: StorySourceLibraryModuleInput[];
}

export interface StoryReferenceAnalysisInput {
  dossierContractVersion?: StoryDossierContractVersion;
  sequenceConfirmed?: boolean;
  sequenceConfirmationSource?: string | null;
  summary?: string | null;
  narrativeArc?: string[];
  whyItWorks?: string[];
  templateFit?: string | null;
  overview?: string[];
  sequenceMap?: StorySequenceMapItemInput[];
  visualGrammar?: string | null;
  apparentProduct?: string | null;
  productRevealed?: string | null;
  personaConstructed?: string | null;
  transferRules?: string[];
  synthesis?: StorySynthesisInput[];
  registeredTemplate?: StoryRegisteredTemplateInput;
  sourceNote?: string | null;
  sourceLibrary?: StorySourceLibraryInput;
}

export interface StoryReferenceItemInput extends StoryPublicationItemInput {
  sourceOccurredAt: string | null;
  metadata?: StoryEvidenceMetadataInput;
}

export interface StoryReferenceInput {
  title: string;
  description: string;
  sequenceConfirmed?: boolean;
  sequenceConfirmationSource?: string | null;
  analysis?: StoryReferenceAnalysisInput;
  platform: 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'other';
  sourceAccount: string;
  sourceUrl: string | null;
  sourceStartedAt: string | null;
  sourceEndedAt: string | null;
  templateId: string;
  items: StoryReferenceItemInput[];
}

export interface StoryAgentAssetInput {
  narrativeOrder: number;
  fileName: string;
  sha256: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'video/mp4' | 'video/webm';
  sizeBytes: number;
  storagePath?: string | null;
  publicUrl?: string | null;
}

export interface StoryAgentTemplateInput extends StoryTemplateInput {
  canonicalKey: string;
}

export type StoryAgentReferenceDetailsInput = Omit<StoryReferenceInput, 'templateId' | 'items'> & {
  items: Array<Omit<StoryReferenceItemInput, 'assetUrl'>>;
};

export interface StoryAgentReferenceInput {
  dossierContractVersion: StoryDossierContractVersion;
  referenceKey: string;
  contentHash: string;
  template: StoryAgentTemplateInput;
  reference: StoryAgentReferenceDetailsInput;
  assets: StoryAgentAssetInput[];
}

export interface StoryReviewInput {
  decision: 'approved' | 'changes_requested';
  note: string | null;
}

const roles = new Set<StoryNarrativeRole>(['hook', 'context', 'development', 'proof', 'cta', 'closing', 'other']);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const htmlPattern = /<\/?[a-z][^>]*>/i;
const sha256Pattern = /^[0-9a-f]{64}$/i;
const canonicalKeyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const agentMimeTypes = new Set<StoryAgentAssetInput['mimeType']>([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
]);
const dossierContractVersion: StoryDossierContractVersion = '1.0';
const coreDimensions = new Set<StoryCoreDimension>([
  'evidence',
  'attention',
  'narrative',
  'continuity',
  'funnel',
  'subtext',
  'template-consequence',
]);
const contextualDimensionStatuses = new Set<StoryContextualDimensionStatus>([
  'present',
  'not-applicable',
  'unknown',
]);
const synthesisKeys = new Set<StorySynthesisKey>([
  'screen-roles',
  'stimulus-change',
  'aesthetics-production',
  'strengths-limitations',
]);
const sequenceMapKinds = new Set<StorySequenceMapKind>(['story', 'product']);

export const MAX_AGENT_BODY_BYTES = 1024 * 1024;
export const MAX_AGENT_ASSET_BYTES = 20 * 1024 * 1024;
export const MAX_AGENT_TOTAL_ASSET_BYTES = 200 * 1024 * 1024;

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} inválido.`);
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string, max: number, required = true): string | null {
  if (value == null && !required) return null;
  if (typeof value !== 'string') throw new Error(`${label} inválido.`);
  const normalized = value.trim();
  if (required && !normalized) throw new Error(`${label} é obrigatório.`);
  if (normalized.length > max) throw new Error(`${label} ultrapassa ${max} caracteres.`);
  if (htmlPattern.test(normalized)) throw new Error(`${label} não pode conter HTML.`);
  return normalized || null;
}

function optionalHttpsUrl(value: unknown, label: string): string | null {
  const normalized = text(value, label, 2048, false);
  if (!normalized) return null;
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(`${label} inválida.`);
  }
  if (parsed.protocol !== 'https:') throw new Error(`${label} precisa usar HTTPS.`);
  return parsed.toString();
}

function isoDate(value: unknown, label: string): string | null {
  const normalized = text(value, label, 80, false);
  if (!normalized) return null;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${label} inválida.`);
  return parsed.toISOString();
}

function parseSteps(rawSteps: unknown): StoryTemplateStepInput[] {
  if (!Array.isArray(rawSteps) || rawSteps.length < 1 || rawSteps.length > 12) {
    throw new Error('O template precisa de pelo menos um passo e aceita no máximo 12.');
  }
  return rawSteps.map((raw, index) => {
    const step = object(raw, `Passo ${index + 1}`);
    if (typeof step.role !== 'string' || !roles.has(step.role as StoryNarrativeRole)) {
      throw new Error(`Função narrativa do passo ${index + 1} inválida.`);
    }
    return {
      role: step.role as StoryNarrativeRole,
      instruction: text(step.instruction, `Instrução do passo ${index + 1}`, 500)!,
      ...(step.templateStepIds != null
        ? { templateStepIds: canonicalKeyArray(step.templateStepIds, `IDs conceituais do passo ${index + 1}`) }
        : {}),
    };
  });
}

function textArray(value: unknown, label: string, maxItems = 30, maxText = 1000): string[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > maxItems) throw new Error(`${label} tem tamanho inválido.`);
  return value.map((entry, index) => text(entry, `${label} ${index + 1}`, maxText)!);
}

function canonicalKeyArray(value: unknown, label: string, maxItems = 20): string[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > maxItems) {
    throw new Error(`${label} tem tamanho inválido.`);
  }
  const parsed = value.map((entry, index) => {
    const key = text(entry, `${label} ${index + 1}`, 160)!;
    if (!canonicalKeyPattern.test(key)) throw new Error(`${label} ${index + 1} inválido.`);
    return key;
  });
  if (new Set(parsed).size !== parsed.length) {
    throw new Error(`${label} não pode conter repetições.`);
  }
  return parsed;
}

function parseCovers(value: unknown, label: string): StoryCoreDimension[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > coreDimensions.size) {
    throw new Error(`${label} tem tamanho inválido.`);
  }
  const covers = value.map((entry, index) => {
    if (typeof entry !== 'string' || !coreDimensions.has(entry as StoryCoreDimension)) {
      throw new Error(`${label} ${index + 1} inválida.`);
    }
    return entry as StoryCoreDimension;
  });
  if (new Set(covers).size !== covers.length) {
    throw new Error(`${label} não pode conter repetições.`);
  }
  return covers;
}

function parseDimensionAssessment(value: unknown, label: string): StoryDimensionAssessmentInput {
  const assessment = object(value, label);
  if (
    typeof assessment.status !== 'string'
    || !contextualDimensionStatuses.has(assessment.status as StoryContextualDimensionStatus)
  ) {
    throw new Error(`${label} tem status inválido.`);
  }
  return {
    status: assessment.status as StoryContextualDimensionStatus,
    rationale: text(assessment.rationale, `Justificativa de ${label}`, 2000)!,
  };
}

function parseTemplateDefinition(value: unknown, legacySteps: unknown): StoryTemplateDefinitionInput {
  const definition = value == null ? {} : object(value, 'Definição');
  const steps = parseSteps(legacySteps ?? definition.steps);
  const rawMoldSteps = definition.moldSteps ?? [];
  if (!Array.isArray(rawMoldSteps) || rawMoldSteps.length > 20) throw new Error('Etapas do molde têm tamanho inválido.');
  const moldSteps = rawMoldSteps.map((raw, index) => {
    const step = object(raw, `Etapa do molde ${index + 1}`);
    const rawPlaceholders = step.placeholders ?? [];
    if (!Array.isArray(rawPlaceholders) || rawPlaceholders.length > 12) {
      throw new Error(`Placeholders da etapa do molde ${index + 1} têm tamanho inválido.`);
    }
    const placeholderKinds = new Set<StoryTemplatePlaceholderKind>([
      'scene', 'copy', 'person', 'proof', 'response', 'principle', 'reaction',
    ]);
    const placeholderSlots = new Set<NonNullable<StoryTemplatePlaceholderInput['slot']>>([
      'top', 'upper', 'middle', 'lower', 'bottom',
    ]);
    const placeholders = rawPlaceholders.map((rawPlaceholder, placeholderIndex) => {
      const placeholder = object(rawPlaceholder, `Placeholder ${placeholderIndex + 1} da etapa ${index + 1}`);
      if (typeof placeholder.kind !== 'string' || !placeholderKinds.has(placeholder.kind as StoryTemplatePlaceholderKind)) {
        throw new Error(`Tipo do placeholder ${placeholderIndex + 1} da etapa ${index + 1} inválido.`);
      }
      if (
        placeholder.slot != null
        && (
          typeof placeholder.slot !== 'string'
          || !placeholderSlots.has(placeholder.slot as NonNullable<StoryTemplatePlaceholderInput['slot']>)
        )
      ) {
        throw new Error(`Posição do placeholder ${placeholderIndex + 1} da etapa ${index + 1} inválida.`);
      }
      return {
        kind: placeholder.kind as StoryTemplatePlaceholderKind,
        label: text(placeholder.label, `Rótulo do placeholder ${placeholderIndex + 1} da etapa ${index + 1}`, 300)!,
        ...(placeholder.slot != null
          ? { slot: placeholder.slot as NonNullable<StoryTemplatePlaceholderInput['slot']> }
          : {}),
      };
    });
    const id = step.id == null ? null : text(step.id, `ID da etapa do molde ${index + 1}`, 160, false);
    if (id && !canonicalKeyPattern.test(id)) {
      throw new Error(`ID da etapa do molde ${index + 1} inválido.`);
    }
    const templateStepIds = step.templateStepIds == null
      ? []
      : canonicalKeyArray(
          step.templateStepIds,
          `IDs conceituais da etapa do molde ${index + 1}`,
        );
    return {
      ...(step.id != null ? { id } : {}),
      ...(step.templateStepIds != null ? { templateStepIds } : {}),
      title: text(step.title, `Título da etapa do molde ${index + 1}`, 160)!,
      purpose: text(step.purpose, `Propósito da etapa do molde ${index + 1}`, 1000)!,
      ...(step.fixedFunction != null
        ? { fixedFunction: text(step.fixedFunction, `Função fixa da etapa ${index + 1}`, 1000, false) }
        : {}),
      ...(step.placeholders != null ? { placeholders } : {}),
    };
  });
  return {
    ...(definition.formula != null ? { formula: text(definition.formula, 'Fórmula', 2000, false) } : {}),
    ...(definition.editorialName != null ? { editorialName: text(definition.editorialName, 'Nome editorial', 300, false) } : {}),
    ...(definition.editorialSummary != null ? { editorialSummary: text(definition.editorialSummary, 'Resumo editorial', 2000, false) } : {}),
    ...(definition.risks != null ? { risks: textArray(definition.risks, 'Risco') } : {}),
    ...(definition.preserveRules != null ? { preserveRules: textArray(definition.preserveRules, 'Regra de preservação') } : {}),
    ...(definition.adaptRules != null ? { adaptRules: textArray(definition.adaptRules, 'Regra de adaptação') } : {}),
    ...(definition.avoidRules != null ? { avoidRules: textArray(definition.avoidRules, 'Regra a evitar') } : {}),
    ...(definition.moldSteps != null ? { moldSteps } : {}),
    steps,
  };
}

export function parseCreateTemplateInput(value: unknown): StoryTemplateInput {
  const input = object(value, 'Template');
  const definition = parseTemplateDefinition(input.definition, input.steps);
  const rawTags = input.tags == null ? [] : input.tags;
  if (!Array.isArray(rawTags) || rawTags.length > 20) throw new Error('Tags inválidas.');
  const tags = [...new Set(rawTags.map((tag, index) => text(tag, `Tag ${index + 1}`, 40)!.toLocaleLowerCase('pt-BR')))];
  return {
    name: text(input.name, 'Nome', 160)!,
    objective: text(input.objective, 'Objetivo', 1000)!,
    description: text(input.description, 'Descrição', 4000, false),
    tags,
    definition,
    steps: definition.steps,
  };
}

export function parseCreatePublicationInput(value: unknown): StoryPublicationInput {
  const input = object(value, 'Publicação');
  const templateId = text(input.templateId, 'Template', 80)!;
  if (!uuidPattern.test(templateId)) throw new Error('Template inválido.');
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 50) {
    throw new Error('A publicação precisa de pelo menos um story e aceita no máximo 50.');
  }
  const orders = new Set<number>();
  const items = input.items.map((raw, index) => {
    const item = object(raw, `Story ${index + 1}`);
    if (!['image', 'video', 'text'].includes(String(item.mediaType))) throw new Error(`Mídia do story ${index + 1} inválida.`);
    const narrativeOrder = Number(item.narrativeOrder);
    if (!Number.isInteger(narrativeOrder) || narrativeOrder < 1 || orders.has(narrativeOrder)) {
      throw new Error('A ordem narrativa precisa ser inteira, positiva e sem repetição.');
    }
    orders.add(narrativeOrder);
    if (typeof item.narrativeRole !== 'string' || !roles.has(item.narrativeRole as StoryNarrativeRole)) {
      throw new Error(`Função narrativa do story ${index + 1} inválida.`);
    }
    const mediaType = item.mediaType as StoryPublicationItemInput['mediaType'];
    const assetUrl = optionalHttpsUrl(item.assetUrl, `URL do story ${index + 1}`);
    const textContent = text(item.textContent, `Texto do story ${index + 1}`, 10_000, false);
    if ((mediaType === 'image' || mediaType === 'video') && !assetUrl) throw new Error(`O story ${index + 1} precisa de uma mídia HTTPS.`);
    if (!assetUrl && !textContent) throw new Error(`O story ${index + 1} está vazio.`);
    return { mediaType, assetUrl, textContent, narrativeOrder, narrativeRole: item.narrativeRole as StoryNarrativeRole };
  });
  return {
    title: text(input.title, 'Título', 200)!,
    templateId,
    scheduledFor: isoDate(input.scheduledFor, 'Agendamento'),
    items: items.sort((a, b) => a.narrativeOrder - b.narrativeOrder),
  };
}

function dossierUrl(value: unknown, label: string, allowPublicPath = false): string | null {
  if (allowPublicPath && typeof value === 'string' && /^\/[a-z0-9/_\-.]+$/i.test(value.trim())) return value.trim();
  return optionalHttpsUrl(value, label);
}

function parseEvidenceMetadata(value: unknown, index: number): StoryEvidenceMetadataInput {
  if (value == null) return {};
  const metadata = object(value, `Metadata do story ${index}`);
  const page = metadata.sourcePage == null ? null : Number(metadata.sourcePage);
  if (page != null && (!Number.isInteger(page) || page < 1 || page > 100_000)) throw new Error(`Página da evidência ${index} inválida.`);
  const optionalField = (key: keyof StoryEvidenceMetadataInput, label: string, max = 4000) =>
    metadata[key] != null ? { [key]: text(metadata[key], `${label} ${index}`, max, false) } : {};
  const rawSections = metadata.analysisSections ?? [];
  if (!Array.isArray(rawSections) || rawSections.length > 20) {
    throw new Error(`Seções da análise ${index} têm tamanho inválido.`);
  }
  const analysisSections = rawSections.map((raw, sectionIndex) => {
    const section = object(raw, `Seção ${sectionIndex + 1} da análise ${index}`);
    return {
      title: text(section.title, `Título da seção ${sectionIndex + 1} da análise ${index}`, 300)!,
      ...(section.covers != null
        ? { covers: parseCovers(section.covers, `Cobertura da seção ${sectionIndex + 1} da análise ${index}`) }
        : {}),
      ...(section.paragraphs != null
        ? { paragraphs: textArray(section.paragraphs, `Parágrafo da seção ${sectionIndex + 1}`, 20, 4000) }
        : {}),
      ...(section.bullets != null
        ? { bullets: textArray(section.bullets, `Item da seção ${sectionIndex + 1}`, 30, 2000) }
        : {}),
    };
  });
  const quick = metadata.quick == null ? null : object(metadata.quick, `Leitura rápida ${index}`);
  const parsedQuick = quick
    ? {
        roleLabel: text(quick.roleLabel, `Papel da leitura rápida ${index}`, 2000)!,
        title: text(quick.title, `Título da leitura rápida ${index}`, 2000)!,
        summary: text(quick.summary, `Resumo da leitura rápida ${index}`, 2000)!,
        evidence: text(quick.evidence, `Evidência da leitura rápida ${index}`, 2000)!,
        audienceEffect: text(quick.audienceEffect, `Efeito da leitura rápida ${index}`, 2000)!,
        subtext: text(quick.subtext, `Subtexto da leitura rápida ${index}`, 2000)!,
        funnelFunction: text(quick.funnelFunction, `Função da leitura rápida ${index}`, 2000)!,
        extractedRule: text(quick.extractedRule, `Regra da leitura rápida ${index}`, 2000)!,
      }
    : undefined;
  const visual = metadata.visual == null ? null : object(metadata.visual, `Raio-X visual ${index}`);
  let parsedVisual: StoryVisualAnalysisInput | undefined;
  if (visual) {
    const rawPalette = visual.palette ?? [];
    if (!Array.isArray(rawPalette) || rawPalette.length > 10) throw new Error(`Paleta visual ${index} inválida.`);
    const palette = rawPalette.map((color, colorIndex) => {
      const parsedColor = text(color, `Cor ${colorIndex + 1} da paleta ${index}`, 20)!;
      if (!/^#[0-9a-f]{6}$/i.test(parsedColor)) throw new Error(`Cor ${colorIndex + 1} da paleta ${index} inválida.`);
      return parsedColor.toLowerCase();
    });
    const rawMarkers = visual.markers ?? [];
    if (!Array.isArray(rawMarkers) || rawMarkers.length > 8) throw new Error(`Marcadores visuais ${index} inválidos.`);
    const markers = rawMarkers.map((raw, markerIndex) => {
      const marker = object(raw, `Marcador visual ${markerIndex + 1} do story ${index}`);
      return {
        label: text(marker.label, `Rótulo do marcador ${markerIndex + 1}`, 20)!,
        description: text(marker.description, `Descrição do marcador ${markerIndex + 1}`, 500)!,
      };
    });
    const visualField = (key: keyof StoryVisualAnalysisInput, label: string, max = 4000) =>
      visual[key] != null ? { [key]: text(visual[key], `${label} ${index}`, max, false) } : {};
    parsedVisual = {
      ...visualField('roleLabel', 'Papel visual', 200),
      ...visualField('title', 'Título visual', 300),
      ...visualField('scene', 'Cena visual'),
      ...visualField('typography', 'Tipografia visual'),
      ...visualField('composition', 'Composição visual'),
      ...visualField('graphic', 'Elemento gráfico visual'),
      ...(visual.palette != null ? { palette } : {}),
      ...visualField('impression', 'Sensação visual'),
      ...(visual.markers != null ? { markers } : {}),
    };
  }
  const deep = metadata.deep == null ? null : object(metadata.deep, `Análise profunda ${index}`);
  let parsedDeep: StoryDeepAnalysisInput | undefined;
  if (deep) {
    const rawDeepSections = deep.sections ?? [];
    if (!Array.isArray(rawDeepSections) || rawDeepSections.length > 12) {
      throw new Error(`Seções da análise profunda ${index} têm tamanho inválido.`);
    }
    const sections = rawDeepSections.map((raw, sectionIndex) => {
      const section = object(raw, `Seção profunda ${sectionIndex + 1} do story ${index}`);
      return {
        title: text(section.title, `Título da seção profunda ${sectionIndex + 1}`, 300)!,
        ...(section.covers != null
          ? { covers: parseCovers(section.covers, `Cobertura da seção profunda ${sectionIndex + 1}`) }
          : {}),
        ...(section.paragraphs != null
          ? { paragraphs: textArray(section.paragraphs, `Parágrafo da seção profunda ${sectionIndex + 1}`, 20, 4000) }
          : {}),
        ...(section.bullets != null
          ? { bullets: textArray(section.bullets, `Item da seção profunda ${sectionIndex + 1}`, 30, 2000) }
          : {}),
      };
    });
    const rawAssessments = deep.dimensionAssessments == null
      ? null
      : object(deep.dimensionAssessments, `Avaliações dimensionais do story ${index}`);
    parsedDeep = {
      roleLabel: text(deep.roleLabel, `Papel da análise profunda ${index}`, 2000)!,
      title: text(deep.title, `Título da análise profunda ${index}`, 2000)!,
      lead: text(deep.lead, `Abertura da análise profunda ${index}`, 4000)!,
      ...(rawAssessments
        ? {
            dimensionAssessments: {
              interaction: parseDimensionAssessment(
                rawAssessments.interaction,
                `Interação do story ${index}`,
              ),
              critique: parseDimensionAssessment(
                rawAssessments.critique,
                `Crítica do story ${index}`,
              ),
            },
          }
        : {}),
      sections,
      extractedRule: text(deep.extractedRule, `Regra da análise profunda ${index}`, 4000)!,
    };
  }
  return {
    ...(metadata.sourcePage != null ? { sourcePage: page } : {}),
    ...(metadata.canonicalPageUrl != null ? { canonicalPageUrl: dossierUrl(metadata.canonicalPageUrl, `URL canônica ${index}`) } : {}),
    ...(metadata.canonicalPageAssetUrl != null ? { canonicalPageAssetUrl: dossierUrl(metadata.canonicalPageAssetUrl, `Asset canônico ${index}`, true) } : {}),
    ...optionalField('evidenceType', 'Tipo de evidência', 100),
    ...(Object.prototype.hasOwnProperty.call(metadata, 'sourceExcerpt')
      ? { sourceExcerpt: text(metadata.sourceExcerpt, `Trecho original ${index}`, 10_000, false) }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(metadata, 'noSourceTextReason')
      ? {
          noSourceTextReason: text(
            metadata.noSourceTextReason,
            `Justificativa de ausência do trecho original ${index}`,
            2000,
            false,
          ),
        }
      : {}),
    ...optionalField('analysis', 'Análise da evidência', 10_000),
    ...optionalField('criticism', 'Crítica da evidência', 10_000),
    ...optionalField('brunoAdaptation', 'Adaptação Bruno', 10_000),
    ...optionalField('editorialStatus', 'Status editorial', 100),
    ...optionalField('moldConsequence', 'Consequência no molde', 10_000),
    ...optionalField('audienceEffect', 'Efeito no público', 10_000),
    ...optionalField('subtext', 'Subtexto', 10_000),
    ...optionalField('funnelFunction', 'Função no funil', 10_000),
    ...optionalField('extractedRule', 'Regra extraída', 10_000),
    ...(metadata.analysisSections != null ? { analysisSections } : {}),
    ...(parsedQuick ? { quick: parsedQuick } : {}),
    ...(parsedVisual ? { visual: parsedVisual } : {}),
    ...(parsedDeep ? { deep: parsedDeep } : {}),
  };
}

function positiveInteger(value: unknown, label: string, max = 100_000): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
    throw new Error(`${label} inválido.`);
  }
  return parsed;
}

function parseSourceLibrary(value: unknown): StorySourceLibraryInput {
  const library = object(value, 'Biblioteca da fonte');
  const totalPages = positiveInteger(library.totalPages, 'Total de páginas da biblioteca', 10_000);
  const coveredPageStart = positiveInteger(
    library.coveredPageStart,
    'Página inicial coberta pela biblioteca',
    totalPages,
  );
  const coveredPageEnd = positiveInteger(
    library.coveredPageEnd,
    'Página final coberta pela biblioteca',
    totalPages,
  );
  if (coveredPageEnd < coveredPageStart) {
    throw new Error('A página final coberta precisa ser posterior à página inicial.');
  }

  const rawCategories = library.categories;
  if (!Array.isArray(rawCategories) || rawCategories.length < 1 || rawCategories.length > 20) {
    throw new Error('A biblioteca precisa de 1 a 20 categorias.');
  }
  const categoryKeys = new Set<string>();
  const categories = rawCategories.map((raw, index) => {
    const category = object(raw, `Categoria ${index + 1} da biblioteca`);
    const key = text(category.key, `Chave da categoria ${index + 1}`, 80)!;
    if (!canonicalKeyPattern.test(key) || categoryKeys.has(key)) {
      throw new Error(`Chave da categoria ${index + 1} inválida ou repetida.`);
    }
    categoryKeys.add(key);
    return {
      key,
      label: text(category.label, `Nome da categoria ${index + 1}`, 120)!,
    };
  });

  const rawModules = library.modules;
  if (!Array.isArray(rawModules) || rawModules.length < 1 || rawModules.length > 40) {
    throw new Error('A biblioteca precisa de 1 a 40 módulos.');
  }
  const moduleKeys = new Set<string>();
  const moduleOrders = new Set<number>();
  const modules = rawModules.map((raw, index): StorySourceLibraryModuleInput => {
    const module = object(raw, `Módulo ${index + 1} da biblioteca`);
    const key = text(module.key, `Chave do módulo ${index + 1}`, 120)!;
    if (!canonicalKeyPattern.test(key) || moduleKeys.has(key)) {
      throw new Error(`Chave do módulo ${index + 1} inválida ou repetida.`);
    }
    moduleKeys.add(key);
    const order = positiveInteger(module.order, `Ordem do módulo ${index + 1}`, 40);
    if (moduleOrders.has(order)) throw new Error(`Ordem do módulo ${index + 1} repetida.`);
    moduleOrders.add(order);
    const category = text(module.category, `Categoria do módulo ${index + 1}`, 80)!;
    if (!categoryKeys.has(category)) {
      throw new Error(`Categoria do módulo ${index + 1} não existe na biblioteca.`);
    }
    const pageStart = positiveInteger(
      module.pageStart,
      `Página inicial do módulo ${index + 1}`,
      totalPages,
    );
    const pageEnd = positiveInteger(
      module.pageEnd,
      `Página final do módulo ${index + 1}`,
      totalPages,
    );
    if (pageEnd < pageStart
      || pageStart < coveredPageStart
      || pageEnd > coveredPageEnd
    ) {
      throw new Error(`Intervalo de páginas do módulo ${index + 1} inválido.`);
    }

    const quick = object(module.quick, `Leitura rápida do módulo ${index + 1}`);
    const mold = object(module.mold, `Molde do módulo ${index + 1}`);
    return {
      key,
      order,
      category,
      lessonLabel: text(module.lessonLabel, `Rótulo do módulo ${index + 1}`, 120)!,
      title: text(module.title, `Título do módulo ${index + 1}`, 240)!,
      pageStart,
      pageEnd,
      quick: {
        summary: text(quick.summary, `Resumo rápido do módulo ${index + 1}`, 2000)!,
        outcome: text(quick.outcome, `Resultado do módulo ${index + 1}`, 1000)!,
        useWhen: text(quick.useWhen, `Momento de uso do módulo ${index + 1}`, 1000)!,
      },
      principles: textArray(module.principles, `Princípio do módulo ${index + 1}`, 12, 2000),
      techniques: textArray(module.techniques, `Técnica do módulo ${index + 1}`, 20, 2000),
      cautions: textArray(module.cautions, `Cuidado do módulo ${index + 1}`, 12, 2000),
      brunoApplications: textArray(
        module.brunoApplications,
        `Aplicação do Bruno no módulo ${index + 1}`,
        12,
        2000,
      ),
      mold: {
        name: text(mold.name, `Nome do molde do módulo ${index + 1}`, 240)!,
        formula: text(mold.formula, `Fórmula do molde do módulo ${index + 1}`, 1000)!,
        steps: textArray(mold.steps, `Etapa do molde do módulo ${index + 1}`, 12, 1000),
      },
    };
  }).sort((left, right) => left.order - right.order);

  if (modules.some((module, index) => module.order !== index + 1)) {
    throw new Error('A ordem dos módulos precisa ser contínua e começar em 1.');
  }
  if (modules.some(module => (
    module.principles.length < 1
    || module.techniques.length < 1
    || module.cautions.length < 1
    || module.brunoApplications.length < 1
    || module.mold.steps.length < 1
  ))) {
    throw new Error('Cada módulo precisa de análise detalhada e molde completo.');
  }

  return {
    title: text(library.title, 'Título da biblioteca', 240)!,
    description: text(library.description, 'Descrição da biblioteca', 4000)!,
    sourceDocument: text(library.sourceDocument, 'Documento-fonte da biblioteca', 300)!,
    totalPages,
    coveredPageStart,
    coveredPageEnd,
    categories,
    modules,
  };
}

function parseReferenceAnalysis(value: unknown): StoryReferenceAnalysisInput {
  if (value == null) return {};
  const analysis = object(value, 'Análise estruturada');
  const rawSequenceMap = analysis.sequenceMap ?? [];
  if (!Array.isArray(rawSequenceMap) || rawSequenceMap.length > 21) {
    throw new Error('Mapa da sequência tem tamanho inválido.');
  }
  const sequenceMap = rawSequenceMap.map((raw, index) => {
    const item = object(raw, `Item ${index + 1} do mapa da sequência`);
    let kind: StorySequenceMapKind | undefined;
    if (item.kind != null) {
      if (typeof item.kind !== 'string' || !sequenceMapKinds.has(item.kind as StorySequenceMapKind)) {
        throw new Error(`Tipo do item ${index + 1} do mapa da sequência inválido.`);
      }
      kind = item.kind as StorySequenceMapKind;
    }
    let storyOrder: number | undefined;
    if (item.storyOrder != null) {
      storyOrder = positiveInteger(item.storyOrder, `Ordem do item ${index + 1} do mapa da sequência`, 20);
    }
    return {
      ...(kind ? { kind } : {}),
      ...(storyOrder ? { storyOrder } : {}),
      label: text(item.label, `Rótulo ${index + 1} do mapa da sequência`, 160)!,
      value: text(item.value, `Valor ${index + 1} do mapa da sequência`, 500)!,
    };
  });
  const rawSynthesis = analysis.synthesis ?? [];
  if (!Array.isArray(rawSynthesis) || rawSynthesis.length > 20) {
    throw new Error('Síntese da referência tem tamanho inválido.');
  }
  const synthesis = rawSynthesis.map((raw, index) => {
    const block = object(raw, `Bloco ${index + 1} da síntese`);
    let key: StorySynthesisKey | undefined;
    if (block.key != null) {
      if (typeof block.key !== 'string' || !synthesisKeys.has(block.key as StorySynthesisKey)) {
        throw new Error(`Chave do bloco ${index + 1} da síntese inválida.`);
      }
      key = block.key as StorySynthesisKey;
    }
    return {
      ...(key ? { key } : {}),
      title: text(block.title, `Título do bloco ${index + 1} da síntese`, 300)!,
      paragraphs: textArray(block.paragraphs, `Parágrafo do bloco ${index + 1} da síntese`, 12, 4000),
    };
  });
  const registeredTemplate = analysis.registeredTemplate == null
    ? null
    : object(analysis.registeredTemplate, 'Template registrado');
  let parsedRegisteredTemplate: StoryRegisteredTemplateInput | undefined;
  if (registeredTemplate) {
    const rawSteps = registeredTemplate.steps ?? [];
    if (!Array.isArray(rawSteps) || rawSteps.length > 8) {
      throw new Error('Passos do template registrado têm tamanho inválido.');
    }
    const parseRegisteredList = (key: keyof StoryRegisteredTemplateInput, label: string) => (
      registeredTemplate[key] != null
        ? { [key]: textArray(registeredTemplate[key], label, 30, 2000) }
        : {}
    );
    parsedRegisteredTemplate = {
      name: text(registeredTemplate.name, 'Nome do template registrado', 300)!,
      ...(registeredTemplate.formula != null
        ? { formula: text(registeredTemplate.formula, 'Fórmula do template registrado', 2000)! }
        : {}),
      ...(registeredTemplate.useWhen != null
        ? { useWhen: text(registeredTemplate.useWhen, 'Quando usar o template registrado', 4000)! }
        : {}),
      ...(registeredTemplate.primaryFunction != null
        ? { primaryFunction: text(registeredTemplate.primaryFunction, 'Função principal do template registrado', 4000)! }
        : {}),
      ...parseRegisteredList('requiredElements', 'Elemento obrigatório do template registrado'),
      ...parseRegisteredList('optionalElements', 'Elemento opcional do template registrado'),
      ...parseRegisteredList('executionRisks', 'Risco de execução do template registrado'),
      ...parseRegisteredList('capturesOrInputs', 'Captura ou insumo do template registrado'),
      ...(registeredTemplate.brunoAdaptation != null
        ? { brunoAdaptation: text(registeredTemplate.brunoAdaptation, 'Adaptação do template para Bruno', 10_000)! }
        : {}),
      steps: rawSteps.map((raw, index) => {
        const step = object(raw, `Passo ${index + 1} do template registrado`);
        const id = step.id == null
          ? null
          : text(step.id, `ID do passo ${index + 1} do template registrado`, 160, false);
        if (id && !canonicalKeyPattern.test(id)) {
          throw new Error(`ID do passo ${index + 1} do template registrado inválido.`);
        }
        let evidenceStoryOrders: number[] | undefined;
        if (step.evidenceStoryOrders != null) {
          if (!Array.isArray(step.evidenceStoryOrders) || step.evidenceStoryOrders.length > 20) {
            throw new Error(`Evidências do passo ${index + 1} do template registrado têm tamanho inválido.`);
          }
          evidenceStoryOrders = step.evidenceStoryOrders.map((order, orderIndex) => (
            positiveInteger(order, `Story ${orderIndex + 1} das evidências do passo ${index + 1}`, 20)
          ));
          if (new Set(evidenceStoryOrders).size !== evidenceStoryOrders.length) {
            throw new Error(`Evidências do passo ${index + 1} do template registrado não podem se repetir.`);
          }
        }
        return {
          ...(id ? { id } : {}),
          title: text(step.title, `Título do passo ${index + 1} do template registrado`, 300)!,
          description: text(step.description, `Descrição do passo ${index + 1} do template registrado`, 2000)!,
          ...(step.mechanism != null
            ? { mechanism: text(step.mechanism, `Mecanismo do passo ${index + 1}`, 4000)! }
            : {}),
          ...(step.condition != null
            ? { condition: text(step.condition, `Condição do passo ${index + 1}`, 4000)! }
            : {}),
          ...(step.expectedResult != null
            ? { expectedResult: text(step.expectedResult, `Resultado do passo ${index + 1}`, 4000)! }
            : {}),
          ...(evidenceStoryOrders ? { evidenceStoryOrders } : {}),
        };
      }),
    };
  }
  if (
    analysis.dossierContractVersion != null
    && analysis.dossierContractVersion !== dossierContractVersion
  ) {
    throw new Error(`Versão do contrato do dossiê inválida. Use ${dossierContractVersion}.`);
  }
  return {
    ...(analysis.dossierContractVersion != null
      ? { dossierContractVersion }
      : {}),
    ...(analysis.sequenceConfirmed != null
      ? {
          sequenceConfirmed: analysis.sequenceConfirmed === true
            ? true
            : (() => { throw new Error('A confirmação persistida da sequência precisa ser verdadeira.'); })(),
        }
      : {}),
    ...(analysis.sequenceConfirmationSource != null
      ? { sequenceConfirmationSource: text(analysis.sequenceConfirmationSource, 'Fonte persistida da confirmação', 2000, false) }
      : {}),
    ...(analysis.summary != null ? { summary: text(analysis.summary, 'Resumo da análise', 10_000, false) } : {}),
    ...(analysis.narrativeArc != null ? { narrativeArc: textArray(analysis.narrativeArc, 'Arco narrativo', 30, 500) } : {}),
    ...(analysis.whyItWorks != null ? { whyItWorks: textArray(analysis.whyItWorks, 'Por que funciona', 30, 2000) } : {}),
    ...(analysis.templateFit != null ? { templateFit: text(analysis.templateFit, 'Aderência ao template', 4000, false) } : {}),
    ...(analysis.overview != null ? { overview: textArray(analysis.overview, 'Leitura geral', 20, 4000) } : {}),
    ...(analysis.sequenceMap != null ? { sequenceMap } : {}),
    ...(analysis.visualGrammar != null ? { visualGrammar: text(analysis.visualGrammar, 'Gramática visual', 10_000, false) } : {}),
    ...(analysis.apparentProduct != null
      ? { apparentProduct: text(analysis.apparentProduct, 'Produto aparente', 10_000, false) }
      : {}),
    ...(analysis.productRevealed != null ? { productRevealed: text(analysis.productRevealed, 'Produto revelado', 10_000, false) } : {}),
    ...(Object.prototype.hasOwnProperty.call(analysis, 'personaConstructed')
      ? { personaConstructed: text(analysis.personaConstructed, 'Persona construída', 10_000, false) }
      : {}),
    ...(analysis.transferRules != null ? { transferRules: textArray(analysis.transferRules, 'Regra de transferência', 30, 2000) } : {}),
    ...(analysis.synthesis != null ? { synthesis } : {}),
    ...(parsedRegisteredTemplate ? { registeredTemplate: parsedRegisteredTemplate } : {}),
    ...(analysis.sourceNote != null ? { sourceNote: text(analysis.sourceNote, 'Nota de fonte', 2000, false) } : {}),
    ...(analysis.sourceLibrary != null ? { sourceLibrary: parseSourceLibrary(analysis.sourceLibrary) } : {}),
  };
}

export function parseCreateReferenceInput(value: unknown): StoryReferenceInput {
  const input = object(value, 'Referência');
  const templateId = text(input.templateId, 'Template', 80)!;
  if (!uuidPattern.test(templateId)) throw new Error('Template inválido.');
  const platforms = ['instagram', 'facebook', 'tiktok', 'youtube', 'other'] as const;
  if (!platforms.includes(input.platform as typeof platforms[number])) throw new Error('Plataforma inválida.');
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 50) {
    throw new Error('A referência precisa de pelo menos um story e aceita no máximo 50.');
  }
  const orders = new Set<number>();
  const items = input.items.map((raw, index) => {
    const item = object(raw, `Story ${index + 1}`);
    if (!['image', 'video', 'text'].includes(String(item.mediaType))) throw new Error(`Mídia do story ${index + 1} inválida.`);
    const narrativeOrder = Number(item.narrativeOrder);
    if (!Number.isInteger(narrativeOrder) || narrativeOrder < 1 || orders.has(narrativeOrder)) {
      throw new Error('A ordem narrativa precisa ser inteira, positiva e sem repetição.');
    }
    orders.add(narrativeOrder);
    if (typeof item.narrativeRole !== 'string' || !roles.has(item.narrativeRole as StoryNarrativeRole)) {
      throw new Error(`Função narrativa do story ${index + 1} inválida.`);
    }
    const mediaType = item.mediaType as StoryReferenceItemInput['mediaType'];
    const assetUrl = optionalHttpsUrl(item.assetUrl, `URL do story ${index + 1}`);
    const textContent = text(item.textContent, `Análise do story ${index + 1}`, 10_000, false);
    if ((mediaType === 'image' || mediaType === 'video') && !assetUrl) throw new Error(`O story ${index + 1} precisa de uma mídia HTTPS.`);
    if (!assetUrl && !textContent) throw new Error(`O story ${index + 1} está vazio.`);
    return {
      mediaType,
      assetUrl,
      textContent,
      sourceOccurredAt: isoDate(item.sourceOccurredAt, `Data real do story ${index + 1}`),
      narrativeOrder,
      narrativeRole: item.narrativeRole as StoryNarrativeRole,
      ...(item.metadata != null ? { metadata: parseEvidenceMetadata(item.metadata, index + 1) } : {}),
    };
  });
  const sourceStartedAt = isoDate(input.sourceStartedAt, 'Início da sequência');
  const sourceEndedAt = isoDate(input.sourceEndedAt, 'Término da sequência');
  if (sourceStartedAt && sourceEndedAt && sourceEndedAt < sourceStartedAt) {
    throw new Error('O término da sequência precisa ser posterior ao início.');
  }
  return {
    title: text(input.title, 'Título', 200)!,
    description: text(input.description, 'Análise', 4000)!,
    ...(input.sequenceConfirmed != null
      ? {
          sequenceConfirmed: input.sequenceConfirmed === true
            ? true
            : (() => { throw new Error('A confirmação da sequência precisa ser verdadeira.'); })(),
        }
      : {}),
    ...(input.sequenceConfirmationSource != null
      ? { sequenceConfirmationSource: text(input.sequenceConfirmationSource, 'Fonte da confirmação da sequência', 2000, false) }
      : {}),
    ...(input.analysis != null ? { analysis: parseReferenceAnalysis(input.analysis) } : {}),
    platform: input.platform as StoryReferenceInput['platform'],
    sourceAccount: text(input.sourceAccount, 'Conta de origem', 160)!,
    sourceUrl: optionalHttpsUrl(input.sourceUrl, 'URL da origem'),
    sourceStartedAt,
    sourceEndedAt,
    templateId,
    items: items.sort((a, b) => a.narrativeOrder - b.narrativeOrder),
  };
}

function requiredAgentList(value: unknown[] | undefined, label: string): void {
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${label} é obrigatório no dossiê do Hermes.`);
}

function requiredAgentText(value: unknown, label: string, max = 10_000): string {
  return text(value, label, max)!;
}

export function parseAgentReferenceInput(value: unknown): StoryAgentReferenceInput {
  const input = object(value, 'Referência do Hermes');
  if (input.dossierContractVersion !== dossierContractVersion) {
    throw new Error(`dossierContractVersion precisa ser ${dossierContractVersion}.`);
  }

  const referenceKey = text(input.referenceKey, 'referenceKey', 160)!;
  if (!canonicalKeyPattern.test(referenceKey)) {
    throw new Error('referenceKey precisa usar apenas letras minúsculas, números e hífens.');
  }
  const contentHash = text(input.contentHash, 'contentHash', 64)!;
  if (!sha256Pattern.test(contentHash)) throw new Error('contentHash precisa ser um SHA-256 hexadecimal.');

  const rawTemplate = object(input.template, 'Template do Hermes');
  const canonicalKey = text(rawTemplate.canonicalKey, 'canonicalKey do template', 160)!;
  if (!canonicalKeyPattern.test(canonicalKey)) {
    throw new Error('canonicalKey do template precisa usar apenas letras minúsculas, números e hífens.');
  }
  const template = parseCreateTemplateInput(rawTemplate) as StoryAgentTemplateInput;
  template.canonicalKey = canonicalKey;
  const definition = template.definition!;
  const rawDefinition = object(rawTemplate.definition, 'Definição canônica do template');
  requiredAgentText(definition.editorialName, 'O nome editorial');
  requiredAgentText(definition.editorialSummary, 'O resumo editorial');
  requiredAgentText(definition.formula, 'A fórmula do template');
  requiredAgentList(definition.moldSteps, 'O molde 9:16');
  requiredAgentList(definition.preserveRules, 'A lista preservar');
  requiredAgentList(definition.adaptRules, 'A lista adaptar');
  requiredAgentList(definition.avoidRules, 'A lista evitar');
  const rootLegacySteps = parseSteps(rawTemplate.steps);
  const definitionLegacySteps = parseSteps(rawDefinition.steps);
  if (JSON.stringify(rootLegacySteps) !== JSON.stringify(definitionLegacySteps)) {
    throw new Error('template.steps e template.definition.steps precisam ser projeções idênticas.');
  }

  const rawReference = object(input.reference, 'Dossiê da referência');
  const rawReferenceItems = rawReference.items;
  if (!Array.isArray(rawReferenceItems) || rawReferenceItems.length < 1 || rawReferenceItems.length > 20) {
    throw new Error('O dossiê do Hermes precisa de 1 a 20 stories.');
  }
  const expectedOrders = Array.from({ length: rawReferenceItems.length }, (_, index) => index + 1);
  const receivedOrders = rawReferenceItems.map((raw, index) => (
    Number(object(raw, `Story ${index + 1} do Hermes`).narrativeOrder)
  ));
  if (JSON.stringify(receivedOrders) !== JSON.stringify(expectedOrders)) {
    throw new Error('A ordem narrativa precisa ser contínua, começar em 1 e chegar já ordenada.');
  }
  const provisionalItems = rawReferenceItems.map((raw, index) => {
    const item = object(raw, `Story ${index + 1} do Hermes`);
    const narrativeOrder = Number(item.narrativeOrder);
    return {
      ...item,
      assetUrl: item.mediaType === 'text' ? null : `https://agent.invalid/story-${narrativeOrder}`,
    };
  });
  const parsedReference = parseCreateReferenceInput({
    ...rawReference,
    templateId: '00000000-0000-4000-8000-000000000001',
    items: provisionalItems,
  });
  parsedReference.items.forEach((item, index) => {
    const rawItem = object(rawReferenceItems[index], `Story ${index + 1} do Hermes`);
    const rawMetadata = object(rawItem.metadata, `Metadata do story ${item.narrativeOrder}`);
    if (
      !Object.prototype.hasOwnProperty.call(rawMetadata, 'sourceExcerpt')
      || !Object.prototype.hasOwnProperty.call(rawMetadata, 'noSourceTextReason')
    ) {
      throw new Error(`O story ${item.narrativeOrder} precisa declarar sourceExcerpt e noSourceTextReason.`);
    }
    if (item.narrativeOrder !== index + 1) throw new Error('A ordem narrativa precisa ser contínua e começar em 1.');
    const metadata = item.metadata;
    if (!metadata?.quick) throw new Error(`A camada quick é obrigatória no story ${item.narrativeOrder}.`);
    if (!metadata.visual) throw new Error(`A camada visual é obrigatória no story ${item.narrativeOrder}.`);
    if (!metadata.deep) throw new Error(`A camada deep é obrigatória no story ${item.narrativeOrder}.`);
    const sourceExcerpt = metadata.sourceExcerpt?.trim() || '';
    const noSourceTextReason = metadata.noSourceTextReason?.trim() || '';
    if (!sourceExcerpt && !noSourceTextReason) {
      throw new Error(`O story ${item.narrativeOrder} precisa de sourceExcerpt ou noSourceTextReason.`);
    }
    if (sourceExcerpt && noSourceTextReason) {
      throw new Error(`O story ${item.narrativeOrder} não pode usar sourceExcerpt e noSourceTextReason ao mesmo tempo.`);
    }
    const visualRequired = [
      metadata.visual.roleLabel,
      metadata.visual.title,
      metadata.visual.scene,
      metadata.visual.typography,
      metadata.visual.composition,
      metadata.visual.impression,
    ];
    if (visualRequired.some(field => typeof field !== 'string' || !field.trim())) {
      throw new Error(`O raio-X visual do story ${item.narrativeOrder} está incompleto.`);
    }
    requiredAgentList(metadata.visual.palette, `A paleta visual do story ${item.narrativeOrder}`);
    requiredAgentList(metadata.deep.sections, `As seções aprofundadas do story ${item.narrativeOrder}`);
    if (!metadata.deep.dimensionAssessments?.interaction || !metadata.deep.dimensionAssessments.critique) {
      throw new Error(`As avaliações contextuais do story ${item.narrativeOrder} estão incompletas.`);
    }
    const covered = new Set<StoryCoreDimension>([
      'evidence',
      'funnel',
      'subtext',
      'template-consequence',
    ]);
    if (metadata.visual.composition?.trim() || metadata.visual.markers?.length) covered.add('attention');
    const explicitDeep = new Set<StoryCoreDimension>();
    metadata.deep.sections.forEach((section, sectionIndex) => {
      requiredAgentList(section.covers, `A cobertura da seção ${sectionIndex + 1} do story ${item.narrativeOrder}`);
      if (!(section.paragraphs?.length || section.bullets?.length)) {
        throw new Error(`A seção ${sectionIndex + 1} do story ${item.narrativeOrder} precisa de conteúdo analítico.`);
      }
      section.covers!.forEach(dimension => {
        covered.add(dimension);
        explicitDeep.add(dimension);
      });
    });
    const missingDimensions = [...coreDimensions].filter(dimension => !covered.has(dimension));
    if (missingDimensions.length) {
      throw new Error(`O story ${item.narrativeOrder} não cobre: ${missingDimensions.join(', ')}.`);
    }
    if (!explicitDeep.has('narrative') || !explicitDeep.has('continuity')) {
      throw new Error(`O story ${item.narrativeOrder} precisa cobrir narrative e continuity explicitamente.`);
    }
    const titles = [metadata.quick.title, metadata.visual.title!, metadata.deep.title]
      .map(title => title.trim().toLocaleLowerCase('pt-BR'));
    if (new Set(titles).size !== titles.length) {
      throw new Error(`Os títulos quick, visual e deep precisam ser distintos no story ${item.narrativeOrder}.`);
    }
  });

  const analysis = parsedReference.analysis;
  const rawAnalysis = object(rawReference.analysis, 'Análise transversal canônica');
  if (parsedReference.sequenceConfirmed !== true) {
    throw new Error('A sequência precisa estar confirmada antes da publicação.');
  }
  requiredAgentText(parsedReference.sequenceConfirmationSource, 'A fonte da confirmação da sequência', 2000);
  if (!analysis?.summary) throw new Error('O summary transversal é obrigatório.');
  requiredAgentList(analysis.overview, 'O overview transversal');
  requiredAgentList(analysis.narrativeArc, 'O arco narrativo transversal');
  requiredAgentList(analysis.whyItWorks, 'A explicação de por que a sequência funciona');
  requiredAgentText(analysis.templateFit, 'A aderência ao template', 4000);
  requiredAgentList(analysis.sequenceMap, 'O mapa da sequência');
  if (!analysis.visualGrammar) throw new Error('A gramática visual é obrigatória.');
  if (!analysis.apparentProduct) throw new Error('O produto aparente é obrigatório.');
  if (!analysis.productRevealed) throw new Error('O produto revelado é obrigatório.');
  if (!Object.prototype.hasOwnProperty.call(rawAnalysis, 'personaConstructed')) {
    throw new Error('personaConstructed precisa ser declarado, mesmo quando for nulo.');
  }
  requiredAgentList(analysis.transferRules, 'As regras de transferência');
  requiredAgentList(analysis.synthesis, 'A síntese transversal');
  if (!analysis.registeredTemplate?.name) throw new Error('O template registrado é obrigatório.');
  requiredAgentList(analysis.registeredTemplate.steps, 'Os passos do template registrado');
  requiredAgentText(analysis.sourceNote, 'A nota de fonte', 2000);

  const storyMap = analysis.sequenceMap!.filter(entry => entry.kind === 'story');
  const productMap = analysis.sequenceMap!.filter(entry => entry.kind === 'product');
  if (
    JSON.stringify(storyMap.map(entry => entry.storyOrder)) !== JSON.stringify(expectedOrders)
    || storyMap.length !== expectedOrders.length
  ) {
    throw new Error('O mapa da sequência precisa representar cada story uma vez e em ordem.');
  }
  if (productMap.length !== 1 || productMap[0]!.storyOrder != null) {
    throw new Error('O mapa da sequência precisa de exatamente uma entrada product sem storyOrder.');
  }

  const actualSynthesisKeys = analysis.synthesis!.map(block => block.key);
  if (
    actualSynthesisKeys.length !== synthesisKeys.size
    || new Set(actualSynthesisKeys).size !== synthesisKeys.size
    || [...synthesisKeys].some(key => !actualSynthesisKeys.includes(key))
  ) {
    throw new Error('A síntese transversal precisa conter exatamente as quatro chaves canônicas.');
  }
  analysis.synthesis!.forEach((block, index) => {
    requiredAgentList(block.paragraphs, `Os parágrafos da síntese ${index + 1}`);
  });

  const registeredTemplate = analysis.registeredTemplate!;
  requiredAgentText(registeredTemplate.formula, 'A fórmula do template registrado', 2000);
  requiredAgentText(registeredTemplate.useWhen, 'Quando usar o template registrado', 4000);
  requiredAgentText(registeredTemplate.primaryFunction, 'A função principal do template registrado', 4000);
  requiredAgentList(registeredTemplate.requiredElements, 'Os elementos obrigatórios do template registrado');
  if (!Array.isArray(registeredTemplate.optionalElements)) {
    throw new Error('Os elementos opcionais precisam ser declarados no template registrado.');
  }
  requiredAgentList(registeredTemplate.executionRisks, 'Os riscos do template registrado');
  requiredAgentList(registeredTemplate.capturesOrInputs, 'As capturas ou insumos do template registrado');
  requiredAgentText(registeredTemplate.brunoAdaptation, 'A adaptação do template para Bruno', 10_000);
  if (registeredTemplate.steps.length < 3 || registeredTemplate.steps.length > 6) {
    throw new Error('O template registrado precisa de 3 a 6 movimentos conceituais.');
  }
  const registeredIds = registeredTemplate.steps.map((step, index) => {
    const id = requiredAgentText(step.id, `O ID do movimento ${index + 1}`, 160);
    requiredAgentText(step.mechanism, `O mecanismo do movimento ${id}`, 4000);
    requiredAgentText(step.condition, `A condição do movimento ${id}`, 4000);
    requiredAgentText(step.expectedResult, `O resultado esperado do movimento ${id}`, 4000);
    requiredAgentList(step.evidenceStoryOrders, `As evidências do movimento ${id}`);
    if (step.evidenceStoryOrders!.some(order => !expectedOrders.includes(order))) {
      throw new Error(`O movimento ${id} aponta para um story inexistente.`);
    }
    return id;
  });
  if (new Set(registeredIds).size !== registeredIds.length) {
    throw new Error('Os IDs dos movimentos conceituais precisam ser únicos.');
  }

  const linkedIds = new Set<string>();
  const moldIds = new Set<string>();
  definition.moldSteps!.forEach((step, index) => {
    const id = requiredAgentText(step.id, `O ID da tela ${index + 1} do molde`, 160);
    if (moldIds.has(id)) throw new Error(`O ID ${id} está repetido no molde.`);
    moldIds.add(id);
    requiredAgentList(step.templateStepIds, `Os movimentos ligados à tela ${id}`);
    requiredAgentText(step.fixedFunction, `A função fixa da tela ${id}`, 2000);
    if (!Array.isArray(step.placeholders) || step.placeholders.length < 2) {
      throw new Error(`A tela ${id} precisa de pelo menos dois placeholders funcionais.`);
    }
    const placeholderKinds = new Set(step.placeholders.map(placeholder => placeholder.kind));
    if (!placeholderKinds.has('copy') && !placeholderKinds.has('principle')) {
      throw new Error(`A tela ${id} precisa de um placeholder de mensagem.`);
    }
    if (![...placeholderKinds].some(kind => ['scene', 'person', 'proof', 'response'].includes(kind))) {
      throw new Error(`A tela ${id} precisa de um placeholder de cena ou evidência.`);
    }
    step.templateStepIds!.forEach(templateStepId => {
      if (!registeredIds.includes(templateStepId)) {
        throw new Error(`A tela ${id} aponta para o movimento inexistente ${templateStepId}.`);
      }
      linkedIds.add(templateStepId);
    });
  });
  const unlinkedIds = registeredIds.filter(id => !linkedIds.has(id));
  if (unlinkedIds.length) {
    throw new Error(`Movimentos sem tela no molde: ${unlinkedIds.join(', ')}.`);
  }

  if (!Array.isArray(input.assets)) throw new Error('O manifesto de assets é obrigatório.');
  const assetOrders = new Set<number>();
  let totalSize = 0;
  const assets = input.assets.map((raw, index): StoryAgentAssetInput => {
    const asset = object(raw, `Asset ${index + 1}`);
    const narrativeOrder = Number(asset.narrativeOrder);
    if (!Number.isInteger(narrativeOrder) || narrativeOrder < 1 || assetOrders.has(narrativeOrder)) {
      throw new Error('A ordem dos assets precisa ser inteira, positiva e sem repetição.');
    }
    assetOrders.add(narrativeOrder);
    const fileName = text(asset.fileName, `Nome do asset ${index + 1}`, 255)!;
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(fileName)) throw new Error(`Nome do asset ${index + 1} inválido.`);
    const sha256 = text(asset.sha256, `SHA-256 do asset ${index + 1}`, 64)!;
    if (!sha256Pattern.test(sha256)) throw new Error(`SHA-256 do asset ${index + 1} inválido.`);
    if (typeof asset.mimeType !== 'string' || !agentMimeTypes.has(asset.mimeType as StoryAgentAssetInput['mimeType'])) {
      throw new Error(`MIME do asset ${index + 1} inválido.`);
    }
    const sizeBytes = Number(asset.sizeBytes);
    if (!Number.isInteger(sizeBytes) || sizeBytes < 1) throw new Error(`Tamanho do asset ${index + 1} inválido.`);
    if (sizeBytes > MAX_AGENT_ASSET_BYTES) throw new Error(`Cada asset aceita no máximo 20 MiB.`);
    totalSize += sizeBytes;
    return {
      narrativeOrder,
      fileName,
      sha256: sha256.toLowerCase(),
      mimeType: asset.mimeType as StoryAgentAssetInput['mimeType'],
      sizeBytes,
      ...(asset.storagePath != null
        ? { storagePath: text(asset.storagePath, `Caminho do asset ${index + 1}`, 500, false) }
        : {}),
      ...(asset.publicUrl != null
        ? { publicUrl: optionalHttpsUrl(asset.publicUrl, `URL pública do asset ${index + 1}`) }
        : {}),
    };
  }).sort((left, right) => left.narrativeOrder - right.narrativeOrder);
  if (totalSize > MAX_AGENT_TOTAL_ASSET_BYTES) throw new Error('Os assets aceitam no máximo 200 MiB no total.');

  const mediaOrders = parsedReference.items
    .filter(item => item.mediaType !== 'text')
    .map(item => item.narrativeOrder);
  if (assets.length !== mediaOrders.length || mediaOrders.some(order => !assetOrders.has(order))) {
    throw new Error('Cada story visual precisa de exatamente um asset no manifesto.');
  }

  const referenceItems = parsedReference.items.map(item => {
    const { assetUrl: _assetUrl, ...rest } = item;
    return rest;
  });
  const { templateId: _templateId, items: _items, ...reference } = parsedReference;
  return {
    dossierContractVersion,
    referenceKey,
    contentHash: contentHash.toLowerCase(),
    template,
    reference: { ...reference, items: referenceItems },
    assets,
  };
}

export function parseUpdatePublicationInput(value: unknown): StoryPublicationUpdateInput {
  const input = object(value, 'Publicação');
  const publication = parseCreatePublicationInput(input);
  const expectedRevision = Number(input.expectedRevision);
  if (!Number.isInteger(expectedRevision) || expectedRevision < 1) {
    throw new Error('Revisão esperada inválida.');
  }
  return { ...publication, expectedRevision };
}

export function parseReviewInput(value: unknown): StoryReviewInput {
  const input = object(value, 'Revisão');
  if (input.decision !== 'approved' && input.decision !== 'changes_requested') throw new Error('Decisão inválida.');
  const note = text(input.note, 'Comentário', 4000, false);
  if (input.decision === 'changes_requested' && !note) throw new Error('O comentário é obrigatório ao pedir ajustes.');
  return { decision: input.decision, note };
}

const transitions: Record<StoryPublicationState, StoryPublicationState[]> = {
  draft: ['pending_approval', 'cancelled'],
  pending_approval: ['approved', 'changes_requested', 'cancelled'],
  changes_requested: ['draft', 'pending_approval', 'cancelled'],
  approved: ['scheduled', 'published', 'draft', 'cancelled'],
  scheduled: ['published', 'draft', 'cancelled', 'failed'],
  published: [],
  cancelled: ['draft'],
  failed: ['scheduled', 'draft', 'cancelled'],
};

export function assertPublicationTransition(from: StoryPublicationState, to: StoryPublicationState): void {
  if (!transitions[from]?.includes(to)) throw new Error(`Transição editorial inválida: ${from} -> ${to}.`);
}

export function sortByNarrativeOrder<T extends { narrativeOrder: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.narrativeOrder - b.narrativeOrder);
}

export function sortByRealChronology<T extends { sourceOccurredAt: string | null }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (!a.sourceOccurredAt) return b.sourceOccurredAt ? 1 : 0;
    if (!b.sourceOccurredAt) return -1;
    return a.sourceOccurredAt.localeCompare(b.sourceOccurredAt);
  });
}
