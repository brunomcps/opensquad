import type { StoryTemplateDto } from '../../../../ci-app/src/api';
import type { VisualDossierViewModel } from './visualDossierModel';

interface VisualDossierMoldProps {
  model: VisualDossierViewModel;
  definition: StoryTemplateDto['definition'];
  onUseTemplate: (templateId: string) => void;
}

export function VisualDossierMold({
  model,
  definition,
  onUseTemplate,
}: VisualDossierMoldProps) {
  const moldSteps = definition.moldSteps || [];

  return (
    <section className="ci-dossier-mold">
      <header className="ci-dossier-mold-head">
        <div>
          <span className="ci-dossier-kicker">Molde visual com placeholders</span>
          <h2>Um storyboard funcional para modelar a estrutura</h2>
          <p>
            Os espaços indicam função e posição aproximada. Cenário, texto, prova e resposta
            entram pela realidade do Bruno.
          </p>
        </div>
        <button
          className="ci-dossier-button is-gold"
          type="button"
          onClick={() => onUseTemplate(model.templateId)}
        >
          Usar este molde
        </button>
      </header>

      <div className="ci-dossier-mold-grid">
        {moldSteps.map((step, index) => (
          <article key={`${step.title}-${index}`}>
            <h3>{index + 1}. {step.title}</h3>
            <div className="ci-dossier-mold-phone">
              {(step.placeholders || []).map((placeholder, placeholderIndex) => (
                <div
                  className={`ci-dossier-placeholder is-${placeholder.kind}`}
                  key={`${placeholder.kind}-${placeholderIndex}`}
                >
                  [{placeholder.label}]
                </div>
              ))}
            </div>
            <p className="ci-dossier-fixed-function">
              <b>Função fixa:</b> {step.fixedFunction || step.purpose}
            </p>
          </article>
        ))}
      </div>

      <div className="ci-dossier-model-rules">
        <div>
          <b>Preservar</b>
          <p>{(definition.preserveRules || []).join(' ')}</p>
        </div>
        <div>
          <b>Adaptar</b>
          <p>{(definition.adaptRules || []).join(' ')}</p>
        </div>
        <div>
          <b>Evitar</b>
          <p>{(definition.avoidRules || []).join(' ')}</p>
        </div>
      </div>
    </section>
  );
}
