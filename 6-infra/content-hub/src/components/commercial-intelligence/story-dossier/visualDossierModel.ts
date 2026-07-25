import type {
  StoryDeepAnalysisInput,
  StoryQuickAnalysisInput,
  StoryReferenceAnalysisInput,
  StoryRegisteredTemplateInput,
  StorySequenceMapItemInput,
  StorySynthesisInput,
  StoryVisualAnalysisInput,
} from '../../../../supabase/functions/_shared/storyContent';
import type {
  StoryItemDto,
  StoryReferenceDto,
  StoryTemplateDto,
} from '../../../../ci-app/src/api';

const incompleteDossierMessage = 'Dossiê visual incompleto.';

export interface VisualDossierStory {
  itemId: string;
  narrativeOrder: number;
  assetUrl: string;
  sourceExcerpt?: string;
  quick: StoryQuickAnalysisInput;
  visual: StoryVisualAnalysisInput;
  deep: StoryDeepAnalysisInput;
}

export interface VisualDossierViewModel {
  templateId: string;
  editorialName: string;
  editorialSummary: string;
  apparentSubject: string;
  sourceAccount: string;
  stories: VisualDossierStory[];
  sequenceMap: StorySequenceMapItemInput[];
  overview: string[];
  visualGrammar: string;
  synthesis: StorySynthesisInput[];
  productRevealed: string;
  registeredTemplate: StoryRegisteredTemplateInput;
  transferRules: string[];
  sourceNote: string;
}

interface CompleteVisualDossierAnalysis extends StoryReferenceAnalysisInput {
  summary: string;
  overview: string[];
  sequenceMap: StorySequenceMapItemInput[];
  visualGrammar: string;
  synthesis: StorySynthesisInput[];
  productRevealed: string;
  registeredTemplate: StoryRegisteredTemplateInput;
  transferRules: string[];
  sourceNote: string;
}

interface CompleteVisualDossierItem extends StoryItemDto {
  assetUrl: string;
  metadata: StoryItemDto['metadata'] & {
    quick: StoryQuickAnalysisInput;
    visual: StoryVisualAnalysisInput;
    deep: StoryDeepAnalysisInput;
  };
}

interface CompleteVisualDossierReference extends StoryReferenceDto {
  sourceAccount: string;
  template: NonNullable<StoryReferenceDto['template']>;
  analysis: CompleteVisualDossierAnalysis;
  items: CompleteVisualDossierItem[];
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isTextList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every(isText);
}

function hasQuickAnalysis(value: unknown): value is StoryQuickAnalysisInput {
  if (!value || typeof value !== 'object') return false;
  const quick = value as Partial<StoryQuickAnalysisInput>;
  return [
    quick.roleLabel,
    quick.title,
    quick.summary,
    quick.evidence,
    quick.audienceEffect,
    quick.subtext,
    quick.funnelFunction,
    quick.extractedRule,
  ].every(isText);
}

function hasVisualAnalysis(value: unknown): value is StoryVisualAnalysisInput {
  if (!value || typeof value !== 'object') return false;
  const visual = value as StoryVisualAnalysisInput;
  return isText(visual.roleLabel)
    && isText(visual.title)
    && isText(visual.scene)
    && isText(visual.typography)
    && isText(visual.composition)
    && isText(visual.impression)
    && Array.isArray(visual.palette)
    && visual.palette.length > 0
    && visual.palette.every(isText);
}

function hasDeepAnalysis(value: unknown): value is StoryDeepAnalysisInput {
  if (!value || typeof value !== 'object') return false;
  const deep = value as Partial<StoryDeepAnalysisInput>;
  return isText(deep.roleLabel)
    && isText(deep.title)
    && isText(deep.lead)
    && isText(deep.extractedRule)
    && Array.isArray(deep.sections)
    && deep.sections.length > 0
    && deep.sections.every(section => (
      isText(section.title)
      && (isTextList(section.paragraphs) || isTextList(section.bullets))
    ));
}

function hasDistinctLayerTitles(
  quick: StoryQuickAnalysisInput,
  visual: StoryVisualAnalysisInput,
  deep: StoryDeepAnalysisInput,
): boolean {
  return new Set([
    quick.title.trim().toLocaleLowerCase('pt-BR'),
    visual.title?.trim().toLocaleLowerCase('pt-BR'),
    deep.title.trim().toLocaleLowerCase('pt-BR'),
  ]).size === 3;
}

function hasCompleteItem(value: StoryItemDto): value is CompleteVisualDossierItem {
  const { quick, visual, deep } = value.metadata;
  return isText(value.itemId)
    && isText(value.assetUrl)
    && hasQuickAnalysis(quick)
    && hasVisualAnalysis(visual)
    && hasDeepAnalysis(deep)
    && hasDistinctLayerTitles(quick, visual, deep);
}

function hasSequenceMap(value: unknown): value is StorySequenceMapItemInput[] {
  return Array.isArray(value)
    && value.length > 0
    && value.every(entry => (
      Boolean(entry)
      && typeof entry === 'object'
      && isText((entry as StorySequenceMapItemInput).label)
      && isText((entry as StorySequenceMapItemInput).value)
    ));
}

function hasSynthesis(value: unknown): value is StorySynthesisInput[] {
  return Array.isArray(value)
    && value.length > 0
    && value.every(entry => (
      Boolean(entry)
      && typeof entry === 'object'
      && isText((entry as StorySynthesisInput).title)
      && isTextList((entry as StorySynthesisInput).paragraphs)
    ));
}

function hasRegisteredTemplate(value: unknown): value is StoryRegisteredTemplateInput {
  if (!value || typeof value !== 'object') return false;
  const registeredTemplate = value as Partial<StoryRegisteredTemplateInput>;
  return isText(registeredTemplate.name)
    && Array.isArray(registeredTemplate.steps)
    && registeredTemplate.steps.length > 0
    && registeredTemplate.steps.every(step => isText(step.title) && isText(step.description));
}

function hasCompleteAnalysis(
  analysis: StoryReferenceAnalysisInput,
): analysis is CompleteVisualDossierAnalysis {
  return isText(analysis.summary)
    && isTextList(analysis.overview)
    && hasSequenceMap(analysis.sequenceMap)
    && isText(analysis.visualGrammar)
    && hasSynthesis(analysis.synthesis)
    && isText(analysis.productRevealed)
    && hasRegisteredTemplate(analysis.registeredTemplate)
    && isTextList(analysis.transferRules)
    && isText(analysis.sourceNote);
}

function isCompleteVisualDossier(
  reference: StoryReferenceDto | null | undefined,
): reference is CompleteVisualDossierReference {
  if (!reference
    || !reference.template
    || !isText(reference.sourceAccount)
    || !hasCompleteAnalysis(reference.analysis)
    || reference.items.length < 1
    || reference.items.length > 20
    || !reference.items.every(hasCompleteItem)
  ) {
    return false;
  }

  const narrativeOrders = reference.items
    .map(item => item.narrativeOrder)
    .sort((left, right) => left - right);
  return narrativeOrders.every((order, index) => order === index + 1);
}

export function hasCompleteVisualDossier(
  reference: StoryReferenceDto | null | undefined,
): boolean {
  return isCompleteVisualDossier(reference);
}

export function buildVisualDossierViewModel(
  template: StoryTemplateDto,
  reference: StoryReferenceDto,
): VisualDossierViewModel {
  const { editorialName, editorialSummary } = template.definition;
  if (!isCompleteVisualDossier(reference)
    || reference.template.templateId !== template.templateId
    || !isText(editorialName)
    || !isText(editorialSummary)
  ) {
    throw new Error(incompleteDossierMessage);
  }

  const stories = reference.items
    .map(item => ({
      itemId: item.itemId,
      narrativeOrder: item.narrativeOrder,
      assetUrl: item.assetUrl,
      sourceExcerpt: item.metadata.sourceExcerpt || undefined,
      quick: item.metadata.quick,
      visual: item.metadata.visual,
      deep: item.metadata.deep,
    }))
    .sort((left, right) => left.narrativeOrder - right.narrativeOrder);

  return {
    templateId: template.templateId,
    editorialName,
    editorialSummary,
    apparentSubject: reference.analysis.summary,
    sourceAccount: reference.sourceAccount,
    stories,
    sequenceMap: reference.analysis.sequenceMap,
    overview: reference.analysis.overview,
    visualGrammar: reference.analysis.visualGrammar,
    synthesis: reference.analysis.synthesis,
    productRevealed: reference.analysis.productRevealed,
    registeredTemplate: reference.analysis.registeredTemplate,
    transferRules: reference.analysis.transferRules,
    sourceNote: reference.analysis.sourceNote,
  };
}
