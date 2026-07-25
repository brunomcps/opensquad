import type { VisualDossierViewModel } from './visualDossierModel';

interface VisualDossierDeepAnalysisProps {
  id: string;
  model: VisualDossierViewModel;
  onBackToQuick: () => void;
}

export function VisualDossierDeepAnalysis({
  id,
  model,
  onBackToQuick,
}: VisualDossierDeepAnalysisProps) {
  return (
    <section className="ci-dossier-deep" id={id} tabIndex={-1}>
      <header className="ci-dossier-deep-head">
        <div>
          <span className="ci-dossier-kicker">Análise completa · Referência fundadora</span>
          <h2>Como esta sequência vende a persona do Raul</h2>
          <p>
            A análise original fica preservada, com evidências, trechos e abstrações
            ligadas aos próprios prints.
          </p>
        </div>
        <button className="ci-dossier-button is-secondary" type="button" onClick={onBackToQuick}>
          Voltar ao modo rápido
        </button>
      </header>

      <div className="ci-dossier-overview">
        <h3>Leitura geral</h3>
        {model.overview.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        <div className="ci-dossier-structure">{model.registeredTemplate.name}</div>
      </div>

      <div className="ci-dossier-deep-stories">
        {model.stories.map((story, index) => (
          <article
            className={`ci-dossier-deep-story${index % 2 === 1 ? ' is-reverse' : ''}`}
            key={story.itemId}
          >
            <figure>
              <div className="ci-dossier-phone">
                <img
                  src={story.assetUrl}
                  alt={`Story ${story.narrativeOrder}: ${story.deep.title}`}
                  loading="lazy"
                />
              </div>
              <figcaption>{story.deep.lead}</figcaption>
            </figure>

            <div className="ci-dossier-deep-copy">
              <span className="ci-dossier-story-index">
                {String(story.narrativeOrder).padStart(2, '0')}
              </span>
              <h3>{story.deep.title}</h3>
              <span className="ci-dossier-deep-role">{story.deep.roleLabel}</span>
              <p className="ci-dossier-deep-lead">{story.deep.lead}</p>

              {story.deep.sections.map(section => (
                <section key={section.title}>
                  <h4>{section.title}</h4>
                  {(section.paragraphs || []).map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                  {(section.bullets || []).length > 0 && (
                    <ul>
                      {(section.bullets || []).map(bullet => <li key={bullet}>{bullet}</li>)}
                    </ul>
                  )}
                </section>
              ))}

              <div className="ci-dossier-rule">
                <b>Regra que nasce deste story</b>
                <p>{story.deep.extractedRule}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <section className="ci-dossier-synthesis">
        <h3>Leitura transversal da sequência</h3>
        <div className="ci-dossier-synthesis-grid">
          {model.synthesis.map(entry => (
            <article key={entry.title}>
              <h4>{entry.title}</h4>
              {entry.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
            </article>
          ))}
        </div>

        <div className="ci-dossier-product">
          <b>O verdadeiro produto da sequência</b>
          <p>{model.productRevealed}</p>
        </div>
      </section>

      <section className="ci-dossier-registered-template">
        <span className="ci-dossier-kicker">Template registrado</span>
        <h3>{model.registeredTemplate.name}</h3>
        <div>
          {model.registeredTemplate.steps.map((step, index) => (
            <article key={`${step.title}-${index}`}>
              <span>{index + 1}</span>
              <div>
                <h4>{step.title}</h4>
                <p>{step.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="ci-dossier-transfer">
        <h3>O que vale trazer para o Instagram do Bruno</h3>
        <ul>
          {model.transferRules.map(rule => <li key={rule}>{rule}</li>)}
        </ul>
        <p className="ci-dossier-source-note">{model.sourceNote}</p>
      </section>
    </section>
  );
}
