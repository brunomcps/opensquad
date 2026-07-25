import type { VisualDossierViewModel } from './visualDossierModel';

interface VisualDossierQuickModeProps {
  id: string;
  model: VisualDossierViewModel;
  activeIndex: number;
  showSequence: boolean;
  onSelectStory: (index: number) => void;
  onShowSequence: () => void;
  onOpenVisual: () => void;
  onOpenDeep: () => void;
}

const storyRailLabels = ['Cena e gancho', 'Virada pro nicho', 'Status e valores'];

function SequenceOverview({ model }: { model: VisualDossierViewModel }) {
  return (
    <div className="ci-dossier-sequence-overview">
      <div className="ci-dossier-sequence-copy">
        <span className="ci-dossier-kicker">Sequência completa · {model.stories.length} stories</span>
        <h3>A história vende uma forma de pensar</h3>
        {model.overview.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
      </div>

      <div className="ci-dossier-sequence-strip" aria-label="Sequência visual completa">
        {model.stories.map(story => (
          <figure key={story.itemId}>
            <img
              src={story.assetUrl}
              alt={`Story ${story.narrativeOrder}: ${story.quick.title}`}
              loading="lazy"
            />
            <figcaption>{story.quick.roleLabel}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function FocusedStory({
  model,
  activeIndex,
  onOpenVisual,
  onOpenDeep,
}: Pick<VisualDossierQuickModeProps, 'model' | 'activeIndex' | 'onOpenVisual' | 'onOpenDeep'>) {
  const story = model.stories[activeIndex] || model.stories[0];

  return (
    <div className="ci-dossier-focus">
      <figure className="ci-dossier-annotated">
        <div className="ci-dossier-phone">
          <img
            src={story.assetUrl}
            alt={`Story ${story.narrativeOrder}: ${story.quick.title}`}
          />
          {(story.visual.markers || []).map((marker, index) => (
            <span
              className={`ci-dossier-marker is-${index + 1}`}
              key={`${marker.label}-${marker.description}`}
              aria-hidden="true"
            >
              {marker.label}
            </span>
          ))}
        </div>

        {(story.visual.markers || []).length > 0 && (
          <figcaption className="ci-dossier-marker-legend">
            {(story.visual.markers || []).map(marker => (
              <span key={`${marker.label}-${marker.description}`}>
                <b>{marker.label}</b>
                {marker.description}
              </span>
            ))}
          </figcaption>
        )}
      </figure>

      <div className="ci-dossier-focus-copy">
        <span className="ci-dossier-kicker">{story.quick.roleLabel}</span>
        <h3>{story.quick.title}</h3>
        <p className="ci-dossier-focus-lead">{story.quick.summary}</p>

        {story.sourceExcerpt && (
          <blockquote className="ci-dossier-quote">
            <b>Trecho original</b>
            <p>{story.sourceExcerpt}</p>
          </blockquote>
        )}

        <div className="ci-dossier-quick-grid">
          <div>
            <b>Evidência concreta</b>
            <p>{story.quick.evidence}</p>
          </div>
          <div>
            <b>Efeito no público</b>
            <p>{story.quick.audienceEffect}</p>
          </div>
          <div>
            <b>Subtexto</b>
            <p>{story.quick.subtext}</p>
          </div>
          <div>
            <b>Função no funil</b>
            <p>{story.quick.funnelFunction}</p>
          </div>
        </div>

        <div className="ci-dossier-rule">
          <b>Regra extraída desta tela</b>
          <p>{story.quick.extractedRule}</p>
        </div>

        <div className="ci-dossier-quick-actions">
          <span>Resumo rico para consulta. As camadas completas continuam abaixo.</span>
          <div>
            <button className="ci-dossier-button is-secondary" type="button" onClick={onOpenVisual}>
              Ver raio-X visual
            </button>
            <button className="ci-dossier-button is-primary" type="button" onClick={onOpenDeep}>
              Abrir análise completa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SequenceMap({ model }: { model: VisualDossierViewModel }) {
  return (
    <section className="ci-dossier-sequence-map" aria-label="Mapa da sequência">
      {model.sequenceMap.map(entry => (
        <div key={`${entry.label}-${entry.value}`}>
          <b>{entry.label}</b>
          <span>{entry.value}</span>
        </div>
      ))}
    </section>
  );
}

export function VisualDossierQuickMode({
  id,
  model,
  activeIndex,
  showSequence,
  onSelectStory,
  onShowSequence,
  onOpenVisual,
  onOpenDeep,
}: VisualDossierQuickModeProps) {
  return (
    <>
      <section className="ci-dossier-quick" id={id} tabIndex={-1}>
        <header className="ci-dossier-quick-head">
          <span className="ci-dossier-kicker">Modo rápido · Referência e template juntos</span>
          <h2>{model.editorialName}</h2>
          <p>{model.apparentSubject}</p>
        </header>

        <nav className="ci-dossier-story-rail" aria-label="Stories da referência">
          {model.stories.map((story, index) => (
            <button
              className={!showSequence && activeIndex === index ? 'is-active' : ''}
              key={story.itemId}
              onClick={() => onSelectStory(index)}
              type="button"
              aria-current={!showSequence && activeIndex === index ? 'true' : undefined}
            >
              <img src={story.assetUrl} alt="" />
              <span>
                <b>Story {story.narrativeOrder}</b>
                <small>{storyRailLabels[index] || story.quick.roleLabel}</small>
              </span>
            </button>
          ))}

          <button
            className={`ci-dossier-sequence-button${showSequence ? ' is-active' : ''}`}
            onClick={onShowSequence}
            type="button"
            aria-current={showSequence ? 'true' : undefined}
          >
            <span aria-hidden="true">▦</span>
            Sequência completa
          </button>
        </nav>

        {showSequence
          ? <SequenceOverview model={model} />
          : (
            <FocusedStory
              model={model}
              activeIndex={activeIndex}
              onOpenVisual={onOpenVisual}
              onOpenDeep={onOpenDeep}
            />
          )}
      </section>

      <SequenceMap model={model} />
    </>
  );
}
