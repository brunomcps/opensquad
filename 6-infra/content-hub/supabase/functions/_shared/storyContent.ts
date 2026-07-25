export type StoryNarrativeRole = 'hook' | 'context' | 'development' | 'proof' | 'cta' | 'closing' | 'other';
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
}

export interface StoryTemplateMoldStepInput {
  title: string;
  purpose: string;
  fixedFunction?: string | null;
  placeholders?: StoryTemplatePlaceholderInput[];
}

export interface StoryTemplateDefinitionInput {
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
  visual?: StoryVisualAnalysisInput;
}

export interface StoryEvidenceSectionInput {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
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

export interface StorySequenceMapItemInput {
  label: string;
  value: string;
}

export interface StoryReferenceAnalysisInput {
  summary?: string | null;
  narrativeArc?: string[];
  whyItWorks?: string[];
  templateFit?: string | null;
  overview?: string[];
  sequenceMap?: StorySequenceMapItemInput[];
  visualGrammar?: string | null;
  productRevealed?: string | null;
  transferRules?: string[];
}

export interface StoryReferenceItemInput extends StoryPublicationItemInput {
  sourceOccurredAt: string | null;
  metadata?: StoryEvidenceMetadataInput;
}

export interface StoryReferenceInput {
  title: string;
  description: string;
  analysis?: StoryReferenceAnalysisInput;
  platform: 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'other';
  sourceAccount: string;
  sourceUrl: string | null;
  sourceStartedAt: string | null;
  sourceEndedAt: string | null;
  templateId: string;
  items: StoryReferenceItemInput[];
}

export interface StoryReviewInput {
  decision: 'approved' | 'changes_requested';
  note: string | null;
}

const roles = new Set<StoryNarrativeRole>(['hook', 'context', 'development', 'proof', 'cta', 'closing', 'other']);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const htmlPattern = /<\/?[a-z][^>]*>/i;

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
    return { role: step.role as StoryNarrativeRole, instruction: text(step.instruction, `Instrução do passo ${index + 1}`, 500)! };
  });
}

function textArray(value: unknown, label: string, maxItems = 30, maxText = 1000): string[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > maxItems) throw new Error(`${label} tem tamanho inválido.`);
  return value.map((entry, index) => text(entry, `${label} ${index + 1}`, maxText)!);
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
    const placeholders = rawPlaceholders.map((rawPlaceholder, placeholderIndex) => {
      const placeholder = object(rawPlaceholder, `Placeholder ${placeholderIndex + 1} da etapa ${index + 1}`);
      if (typeof placeholder.kind !== 'string' || !placeholderKinds.has(placeholder.kind as StoryTemplatePlaceholderKind)) {
        throw new Error(`Tipo do placeholder ${placeholderIndex + 1} da etapa ${index + 1} inválido.`);
      }
      return {
        kind: placeholder.kind as StoryTemplatePlaceholderKind,
        label: text(placeholder.label, `Rótulo do placeholder ${placeholderIndex + 1} da etapa ${index + 1}`, 300)!,
      };
    });
    return {
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
      ...(section.paragraphs != null
        ? { paragraphs: textArray(section.paragraphs, `Parágrafo da seção ${sectionIndex + 1}`, 20, 4000) }
        : {}),
      ...(section.bullets != null
        ? { bullets: textArray(section.bullets, `Item da seção ${sectionIndex + 1}`, 30, 2000) }
        : {}),
    };
  });
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
  return {
    ...(metadata.sourcePage != null ? { sourcePage: page } : {}),
    ...(metadata.canonicalPageUrl != null ? { canonicalPageUrl: dossierUrl(metadata.canonicalPageUrl, `URL canônica ${index}`) } : {}),
    ...(metadata.canonicalPageAssetUrl != null ? { canonicalPageAssetUrl: dossierUrl(metadata.canonicalPageAssetUrl, `Asset canônico ${index}`, true) } : {}),
    ...optionalField('evidenceType', 'Tipo de evidência', 100),
    ...optionalField('sourceExcerpt', 'Trecho original', 10_000),
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
    ...(parsedVisual ? { visual: parsedVisual } : {}),
  };
}

function parseReferenceAnalysis(value: unknown): StoryReferenceAnalysisInput {
  if (value == null) return {};
  const analysis = object(value, 'Análise estruturada');
  const rawSequenceMap = analysis.sequenceMap ?? [];
  if (!Array.isArray(rawSequenceMap) || rawSequenceMap.length > 12) {
    throw new Error('Mapa da sequência tem tamanho inválido.');
  }
  const sequenceMap = rawSequenceMap.map((raw, index) => {
    const item = object(raw, `Item ${index + 1} do mapa da sequência`);
    return {
      label: text(item.label, `Rótulo ${index + 1} do mapa da sequência`, 160)!,
      value: text(item.value, `Valor ${index + 1} do mapa da sequência`, 500)!,
    };
  });
  return {
    ...(analysis.summary != null ? { summary: text(analysis.summary, 'Resumo da análise', 10_000, false) } : {}),
    ...(analysis.narrativeArc != null ? { narrativeArc: textArray(analysis.narrativeArc, 'Arco narrativo', 30, 500) } : {}),
    ...(analysis.whyItWorks != null ? { whyItWorks: textArray(analysis.whyItWorks, 'Por que funciona', 30, 2000) } : {}),
    ...(analysis.templateFit != null ? { templateFit: text(analysis.templateFit, 'Aderência ao template', 4000, false) } : {}),
    ...(analysis.overview != null ? { overview: textArray(analysis.overview, 'Leitura geral', 20, 4000) } : {}),
    ...(analysis.sequenceMap != null ? { sequenceMap } : {}),
    ...(analysis.visualGrammar != null ? { visualGrammar: text(analysis.visualGrammar, 'Gramática visual', 10_000, false) } : {}),
    ...(analysis.productRevealed != null ? { productRevealed: text(analysis.productRevealed, 'Produto revelado', 10_000, false) } : {}),
    ...(analysis.transferRules != null ? { transferRules: textArray(analysis.transferRules, 'Regra de transferência', 30, 2000) } : {}),
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
