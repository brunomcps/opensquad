import type {
  StoryCoreDimension,
  StoryDeepAnalysisInput,
  StoryDossierContractVersion,
  StoryQuickAnalysisInput,
  StoryReferenceAnalysisInput,
  StoryRegisteredTemplateInput,
  StorySequenceMapItemInput,
  StorySourceLibraryInput,
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
  noSourceTextReason?: string;
  quick: StoryQuickAnalysisInput;
  visual: StoryVisualAnalysisInput;
  deep: StoryDeepAnalysisInput;
}

export interface VisualDossierViewModel {
  templateId: string;
  dossierContractVersion?: StoryDossierContractVersion;
  editorialName: string;
  editorialSummary: string;
  apparentSubject: string;
  sourceAccount: string;
  stories: VisualDossierStory[];
  sequenceMap: StorySequenceMapItemInput[];
  overview: string[];
  visualGrammar: string;
  synthesis: StorySynthesisInput[];
  apparentProduct?: string;
  productRevealed: string;
  personaConstructed?: string | null;
  registeredTemplate: StoryRegisteredTemplateInput;
  transferRules: string[];
  sourceNote: string;
  sourceLibrary?: StorySourceLibraryInput;
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

const canonicalSynthesisKeys = [
  'screen-roles',
  'stimulus-change',
  'aesthetics-production',
  'strengths-limitations',
] as const;

const canonicalCoreDimensions: StoryCoreDimension[] = [
  'evidence',
  'attention',
  'narrative',
  'continuity',
  'funnel',
  'subtext',
  'template-consequence',
];

function hasCanonicalReference(
  analysis: CompleteVisualDossierAnalysis,
  items: CompleteVisualDossierItem[],
): boolean {
  if (analysis.dossierContractVersion == null) return true;
  if (analysis.dossierContractVersion !== '1.0'
    || analysis.sequenceConfirmed !== true
    || !isText(analysis.sequenceConfirmationSource)
    || !isText(analysis.apparentProduct)
    || !Object.prototype.hasOwnProperty.call(analysis, 'personaConstructed')
  ) {
    return false;
  }

  const expectedOrders = items
    .map(item => item.narrativeOrder)
    .sort((left, right) => left - right);
  const storyMap = analysis.sequenceMap.filter(entry => entry.kind === 'story');
  const productMap = analysis.sequenceMap.filter(entry => entry.kind === 'product');
  if (storyMap.length !== expectedOrders.length
    || storyMap.some((entry, index) => entry.storyOrder !== expectedOrders[index])
    || productMap.length !== 1
    || productMap[0]?.storyOrder != null
  ) {
    return false;
  }

  const synthesisKeys = analysis.synthesis.map(entry => entry.key);
  if (synthesisKeys.length !== canonicalSynthesisKeys.length
    || new Set(synthesisKeys).size !== canonicalSynthesisKeys.length
    || canonicalSynthesisKeys.some(key => !synthesisKeys.includes(key))
  ) {
    return false;
  }

  const registered = analysis.registeredTemplate;
  if (!isText(registered.formula)
    || !isText(registered.useWhen)
    || !isText(registered.primaryFunction)
    || !isTextList(registered.requiredElements)
    || !Array.isArray(registered.optionalElements)
    || !isTextList(registered.executionRisks)
    || !isTextList(registered.capturesOrInputs)
    || !isText(registered.brunoAdaptation)
    || registered.steps.length < 3
    || registered.steps.length > 6
  ) {
    return false;
  }
  const registeredIds = registered.steps.map(step => step.id);
  if (registeredIds.some(id => !isText(id))
    || new Set(registeredIds).size !== registeredIds.length
    || registered.steps.some(step => (
      !isText(step.mechanism)
      || !isText(step.condition)
      || !isText(step.expectedResult)
      || !Array.isArray(step.evidenceStoryOrders)
      || step.evidenceStoryOrders.length === 0
      || step.evidenceStoryOrders.some(order => !expectedOrders.includes(order))
    ))
  ) {
    return false;
  }

  return items.every(item => {
    const { metadata } = item;
    const hasExcerpt = isText(metadata.sourceExcerpt);
    const hasNoSourceReason = isText(metadata.noSourceTextReason);
    if (hasExcerpt === hasNoSourceReason
      || !metadata.deep.dimensionAssessments?.interaction
      || !metadata.deep.dimensionAssessments.critique
      || !isText(metadata.deep.dimensionAssessments.interaction.rationale)
      || !isText(metadata.deep.dimensionAssessments.critique.rationale)
    ) {
      return false;
    }
    const covered = new Set<StoryCoreDimension>([
      'evidence',
      'funnel',
      'subtext',
      'template-consequence',
    ]);
    if (isText(metadata.visual.composition) || metadata.visual.markers?.length) {
      covered.add('attention');
    }
    const explicitDeep = new Set<StoryCoreDimension>();
    for (const section of metadata.deep.sections) {
      if (!Array.isArray(section.covers) || section.covers.length === 0) return false;
      section.covers.forEach(dimension => {
        covered.add(dimension);
        explicitDeep.add(dimension);
      });
    }
    return canonicalCoreDimensions.every(dimension => covered.has(dimension))
      && explicitDeep.has('narrative')
      && explicitDeep.has('continuity');
  });
}

function hasCanonicalTemplate(
  template: StoryTemplateDto,
  analysis: CompleteVisualDossierAnalysis,
): boolean {
  if (analysis.dossierContractVersion == null) return true;
  const registeredIds = new Set(
    analysis.registeredTemplate.steps
      .map(step => step.id)
      .filter((id): id is string => isText(id)),
  );
  const { definition } = template;
  if (!isText(definition.editorialName)
    || !isText(definition.editorialSummary)
    || !isText(definition.formula)
    || !isTextList(definition.preserveRules)
    || !isTextList(definition.adaptRules)
    || !isTextList(definition.avoidRules)
    || !Array.isArray(definition.moldSteps)
    || definition.moldSteps.length === 0
    || JSON.stringify(template.steps) !== JSON.stringify(definition.steps)
  ) {
    return false;
  }

  const linkedIds = new Set<string>();
  const moldIds = new Set<string>();
  for (const step of definition.moldSteps) {
    if (!isText(step.id)
      || moldIds.has(step.id)
      || !Array.isArray(step.templateStepIds)
      || step.templateStepIds.length === 0
      || step.templateStepIds.some(id => !registeredIds.has(id))
      || !isText(step.fixedFunction)
      || !Array.isArray(step.placeholders)
      || step.placeholders.length < 2
    ) {
      return false;
    }
    moldIds.add(step.id);
    const kinds = new Set(step.placeholders.map(placeholder => placeholder.kind));
    if ((!kinds.has('copy') && !kinds.has('principle'))
      || ![...kinds].some(kind => ['scene', 'person', 'proof', 'response'].includes(kind))
    ) {
      return false;
    }
    step.templateStepIds.forEach(id => linkedIds.add(id));
  }
  return [...registeredIds].every(id => linkedIds.has(id));
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
  return narrativeOrders.every((order, index) => order === index + 1)
    && hasCanonicalReference(reference.analysis, reference.items);
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
    || !hasCanonicalTemplate(template, reference.analysis)
  ) {
    throw new Error(incompleteDossierMessage);
  }

  const stories = reference.items
    .map(item => ({
      itemId: item.itemId,
      narrativeOrder: item.narrativeOrder,
      assetUrl: item.assetUrl,
      sourceExcerpt: item.metadata.sourceExcerpt || undefined,
      noSourceTextReason: item.metadata.noSourceTextReason || undefined,
      quick: item.metadata.quick,
      visual: item.metadata.visual,
      deep: item.metadata.deep,
    }))
    .sort((left, right) => left.narrativeOrder - right.narrativeOrder);

  return {
    templateId: template.templateId,
    ...(reference.analysis.dossierContractVersion
      ? { dossierContractVersion: reference.analysis.dossierContractVersion }
      : {}),
    editorialName,
    editorialSummary,
    apparentSubject: reference.analysis.summary,
    sourceAccount: reference.sourceAccount,
    stories,
    sequenceMap: reference.analysis.sequenceMap,
    overview: reference.analysis.overview,
    visualGrammar: reference.analysis.visualGrammar,
    synthesis: reference.analysis.synthesis,
    ...(reference.analysis.apparentProduct
      ? { apparentProduct: reference.analysis.apparentProduct }
      : {}),
    productRevealed: reference.analysis.productRevealed,
    ...(Object.prototype.hasOwnProperty.call(reference.analysis, 'personaConstructed')
      ? { personaConstructed: reference.analysis.personaConstructed }
      : {}),
    registeredTemplate: reference.analysis.registeredTemplate,
    transferRules: reference.analysis.transferRules,
    sourceNote: reference.analysis.sourceNote,
    ...(reference.analysis.sourceLibrary
      ? { sourceLibrary: reference.analysis.sourceLibrary }
      : {}),
  };
}
