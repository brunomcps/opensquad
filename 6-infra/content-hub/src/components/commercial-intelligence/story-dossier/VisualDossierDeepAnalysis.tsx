import type {
  StoryContextualDimensionStatus,
  StoryRegisteredTemplateInput,
} from '../../../../supabase/functions/_shared/storyContent';
import type { VisualDossierViewModel } from './visualDossierModel';

interface VisualDossierDeepAnalysisProps {
  id: string;
  model: VisualDossierViewModel;
  onBackToQuick: () => void;
}

const assessmentStatusLabels: Record<StoryContextualDimensionStatus, string> = {
  present: 'Presente',
  'not-applicable': 'Não se aplica',
  unknown: 'Não confirmado',
};

function TemplateList({
  title,
  values,
  emptyText,
}: {
  title: string;
  values: string[];
  emptyText?: string;
}) {
  return (
    <section>
      <h4>{title}</h4>
      {values.length > 0
        ? <ul>{values.map(value => <li key={value}>{value}</li>)}</ul>
        : <p>{emptyText}</p>}
    </section>
  );
}

function RegisteredTemplateDetails({
  template,
}: {
  template: StoryRegisteredTemplateInput;
}) {
  return (
    <>
      <div className="ci-dossier-template-meta">
        <div>
          <b>Fórmula</b>
          <p>{template.formula}</p>
        </div>
        <div>
          <b>Quando usar</b>
          <p>{template.useWhen}</p>
        </div>
        <div>
          <b>Função principal</b>
          <p>{template.primaryFunction}</p>
        </div>
      </div>

      <div className="ci-dossier-template-lists">
        <TemplateList title="Elementos obrigatórios" values={template.requiredElements || []} />
        <TemplateList
          title="Elementos opcionais"
          values={template.optionalElements || []}
          emptyText="Nenhum elemento opcional registrado."
        />
        <TemplateList title="Riscos de execução" values={template.executionRisks || []} />
        <TemplateList title="Capturas ou insumos" values={template.capturesOrInputs || []} />
      </div>

      <div className="ci-dossier-rule ci-dossier-bruno-adaptation">
        <b>Adaptação para o Bruno</b>
        <p>{template.brunoAdaptation}</p>
      </div>
    </>
  );
}

export function VisualDossierDeepAnalysis({
  id,
  model,
  onBackToQuick,
}: VisualDossierDeepAnalysisProps) {
  const isCanonical = model.dossierContractVersion === '1.0';

  return (
    <section className="ci-dossier-deep" id={id} tabIndex={-1}>
      <header className="ci-dossier-deep-head">
        <div>
          <span className="ci-dossier-kicker">Análise completa · Referência fundadora</span>
          <h2>Como esta sequência revela o posicionamento de {model.sourceAccount}</h2>
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

              {story.deep.dimensionAssessments && (
                <section className="ci-dossier-assessments">
                  <h4>Interação e leitura crítica</h4>
                  <dl>
                    <div>
                      <dt>
                        Interação · {assessmentStatusLabels[
                          story.deep.dimensionAssessments.interaction.status
                        ]}
                      </dt>
                      <dd>{story.deep.dimensionAssessments.interaction.rationale}</dd>
                    </div>
                    <div>
                      <dt>
                        Crítica · {assessmentStatusLabels[
                          story.deep.dimensionAssessments.critique.status
                        ]}
                      </dt>
                      <dd>{story.deep.dimensionAssessments.critique.rationale}</dd>
                    </div>
                  </dl>
                </section>
              )}

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
            <article key={entry.key || entry.title}>
              <h4>{entry.title}</h4>
              {entry.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
            </article>
          ))}
        </div>

        <div className={`ci-dossier-product${isCanonical ? ' is-canonical' : ''}`}>
          {model.apparentProduct && (
            <div>
              <b>Produto aparente</b>
              <p>{model.apparentProduct}</p>
            </div>
          )}
          <div>
            <b>O verdadeiro produto da sequência</b>
            <p>{model.productRevealed}</p>
          </div>
          {Object.prototype.hasOwnProperty.call(model, 'personaConstructed') && (
            <div>
              <b>Persona construída</b>
              <p>{model.personaConstructed || 'Não se aplica a esta sequência.'}</p>
            </div>
          )}
        </div>
      </section>

      <section className="ci-dossier-registered-template">
        <span className="ci-dossier-kicker">Template registrado</span>
        <h3>{model.registeredTemplate.name}</h3>

        {isCanonical && <RegisteredTemplateDetails template={model.registeredTemplate} />}

        <div className="ci-dossier-template-steps">
          {model.registeredTemplate.steps.map((step, index) => (
            <article className="ci-dossier-template-step" key={step.id || `${step.title}-${index}`}>
              <span>{index + 1}</span>
              <div>
                <h4>{step.title}</h4>
                <p>{step.description}</p>
                {isCanonical && (
                  <dl>
                    <div>
                      <dt>Mecanismo</dt>
                      <dd>{step.mechanism}</dd>
                    </div>
                    <div>
                      <dt>Condição</dt>
                      <dd>{step.condition}</dd>
                    </div>
                    <div>
                      <dt>Resultado esperado</dt>
                      <dd>{step.expectedResult}</dd>
                    </div>
                    <div>
                      <dt>Evidência</dt>
                      <dd>
                        {(step.evidenceStoryOrders || [])
                          .map(order => `Story ${order}`)
                          .join(', ')}
                      </dd>
                    </div>
                  </dl>
                )}
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
