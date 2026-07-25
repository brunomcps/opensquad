import { useEffect, useMemo, useState } from 'react';
import type {
  StoryPublicationDto,
  StoryReferenceDto,
  StoryTemplateDto,
} from '../../../../ci-app/src/api';
import { VisualDossierDeepAnalysis } from './VisualDossierDeepAnalysis';
import { VisualDossierMold } from './VisualDossierMold';
import { VisualDossierQuickMode } from './VisualDossierQuickMode';
import { VisualDossierXray } from './VisualDossierXray';
import { buildVisualDossierViewModel } from './visualDossierModel';
import './storyDossier.css';

interface VisualReferenceDossierProps {
  template: StoryTemplateDto;
  reference: StoryReferenceDto;
  linkedPublications: StoryPublicationDto[];
  onUseTemplate: (templateId: string) => void;
}

function focusSection(id: string) {
  const target = document.getElementById(id);
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  target?.focus({ preventScroll: true });
}

function publicationStateLabel(state: StoryPublicationDto['publicationState']) {
  const labels: Record<StoryPublicationDto['publicationState'], string> = {
    draft: 'Rascunho',
    pending_approval: 'Aguardando aprovação',
    changes_requested: 'Ajustes solicitados',
    approved: 'Aprovada',
    scheduled: 'Agendada',
    published: 'Publicada',
    cancelled: 'Cancelada',
    failed: 'Falhou',
  };
  return labels[state];
}

export function VisualReferenceDossier({
  template,
  reference,
  linkedPublications,
  onUseTemplate,
}: VisualReferenceDossierProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showSequence, setShowSequence] = useState(false);
  const model = useMemo(
    () => buildVisualDossierViewModel(template, reference),
    [reference, template],
  );

  useEffect(() => {
    setActiveIndex(0);
    setShowSequence(false);
  }, [reference.sequenceId]);

  const ids = {
    top: `dossier-${model.templateId}`,
    visual: `dossier-${model.templateId}-visual`,
    deep: `dossier-${model.templateId}-deep`,
  };

  return (
    <div className="ci-dossier-stage">
      <VisualDossierQuickMode
        id={ids.top}
        model={model}
        activeIndex={activeIndex}
        showSequence={showSequence}
        onSelectStory={index => {
          setActiveIndex(index);
          setShowSequence(false);
        }}
        onShowSequence={() => setShowSequence(true)}
        onOpenVisual={() => focusSection(ids.visual)}
        onOpenDeep={() => focusSection(ids.deep)}
      />

      <VisualDossierXray id={ids.visual} model={model} />
      <VisualDossierMold
        model={model}
        definition={template.definition}
        onUseTemplate={onUseTemplate}
      />
      <VisualDossierDeepAnalysis
        id={ids.deep}
        model={model}
        onBackToQuick={() => focusSection(ids.top)}
      />

      <section className="ci-dossier-applications">
        <header>
          <span className="ci-dossier-kicker">Aplicações e aprendizados</span>
          <h2>Do princípio analisado para uma sequência do Bruno</h2>
          <p>
            O molde preserva a função narrativa e troca cenário, linguagem, prova e princípio
            pela realidade editorial do Bruno.
          </p>
        </header>

        {linkedPublications.length > 0 ? (
          <div className="ci-dossier-publication-list">
            {linkedPublications.map(publication => (
              <article key={publication.sequenceId}>
                <div>
                  <b>{publication.title}</b>
                  <span>{publicationStateLabel(publication.publicationState)}</span>
                </div>
                <p>{publication.description || 'Aplicação criada a partir deste template.'}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="ci-dossier-empty-application">
            Ainda não há uma aplicação registrada para este molde.
          </p>
        )}

        <button
          className="ci-dossier-button is-primary"
          type="button"
          onClick={() => onUseTemplate(model.templateId)}
        >
          Criar aplicação com este molde
        </button>
      </section>
    </div>
  );
}
