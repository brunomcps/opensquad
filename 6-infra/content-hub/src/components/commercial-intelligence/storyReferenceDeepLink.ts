export interface StoryDeepLinkSelection {
  templateId: string | null;
  referenceId: string | null;
}

interface TemplateIdentity {
  templateId: string;
}

interface ReferenceIdentity {
  sequenceId: string;
  template?: { templateId: string } | null;
}

export function readStoryDeepLink(search: string): StoryDeepLinkSelection {
  const params = new URLSearchParams(search);
  return {
    templateId: params.get('template'),
    referenceId: params.get('reference'),
  };
}

export function resolveStoryDeepLinkSelection(
  templates: TemplateIdentity[],
  references: ReferenceIdentity[],
  initial: StoryDeepLinkSelection,
  current: StoryDeepLinkSelection,
): StoryDeepLinkSelection {
  const hasTemplate = (templateId: string | null) => (
    Boolean(templateId) && templates.some(template => template.templateId === templateId)
  );
  const requestedReference = references.find(reference => reference.sequenceId === initial.referenceId);
  const requestedReferenceTemplateId = requestedReference?.template?.templateId || null;

  const templateId = hasTemplate(current.templateId)
    ? current.templateId
    : hasTemplate(requestedReferenceTemplateId)
      ? requestedReferenceTemplateId
      : hasTemplate(initial.templateId)
        ? initial.templateId
        : templates[0]?.templateId || null;

  const currentReference = references.find(reference => reference.sequenceId === current.referenceId);
  const currentReferenceIsLinked = currentReference?.template?.templateId === templateId;
  const requestedReferenceIsLinked = requestedReference?.template?.templateId === templateId;

  return {
    templateId,
    referenceId: currentReferenceIsLinked
      ? currentReference?.sequenceId || null
      : requestedReferenceIsLinked
        ? requestedReference?.sequenceId || null
        : null,
  };
}

export function storyDeepLinkUrl(
  href: string,
  tab: string,
  selection: StoryDeepLinkSelection = { templateId: null, referenceId: null },
): URL {
  const url = new URL(href);
  url.searchParams.set('tab', tab);
  if (tab === 'content-templates' && selection.templateId) {
    url.searchParams.set('template', selection.templateId);
    if (selection.referenceId) url.searchParams.set('reference', selection.referenceId);
    else url.searchParams.delete('reference');
  } else {
    url.searchParams.delete('template');
    url.searchParams.delete('reference');
  }
  return url;
}
