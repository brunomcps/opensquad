import type { VisualDossierViewModel } from './visualDossierModel';

interface VisualDossierXrayProps {
  id: string;
  model: VisualDossierViewModel;
}

export function VisualDossierXray({ id, model }: VisualDossierXrayProps) {
  return (
    <section className="ci-dossier-xray" id={id} tabIndex={-1}>
      <header className="ci-dossier-section-head">
        <span className="ci-dossier-kicker">Raio-X visual da referência</span>
        <h2>O que aparece, onde aparece e o que isso transmite</h2>
        <p>
          Esta camada separa conteúdo, composição e acabamento visual para modelar a lógica
          da referência sem depender de copiar o assunto ou a estética do criador.
        </p>
      </header>

      <div className="ci-dossier-xray-grid">
        {model.stories.map(story => (
          <article key={story.itemId}>
            <figure>
              <img
                src={story.assetUrl}
                alt={`Raio-X visual do story ${story.narrativeOrder}`}
                loading="lazy"
              />
            </figure>

            <div className="ci-dossier-xray-copy">
              <span className="ci-dossier-kicker">{story.visual.roleLabel}</span>
              <h3>{story.visual.title}</h3>

              <dl>
                {story.visual.scene && (
                  <div>
                    <dt>Cena e pessoa</dt>
                    <dd>{story.visual.scene}</dd>
                  </div>
                )}
                {story.visual.typography && (
                  <div>
                    <dt>Texto e tipografia</dt>
                    <dd>{story.visual.typography}</dd>
                  </div>
                )}
                {story.visual.composition && (
                  <div>
                    <dt>Distribuição</dt>
                    <dd>{story.visual.composition}</dd>
                  </div>
                )}
                {story.visual.graphic && (
                  <div>
                    <dt>Elemento gráfico</dt>
                    <dd>{story.visual.graphic}</dd>
                  </div>
                )}
                {(story.visual.palette || []).length > 0 && (
                  <div>
                    <dt>Paleta dominante</dt>
                    <dd className="ci-dossier-swatches">
                      {(story.visual.palette || []).map(color => (
                        <span key={color} style={{ backgroundColor: color }} title={color} />
                      ))}
                    </dd>
                  </div>
                )}
              </dl>

              {story.visual.impression && (
                <div className="ci-dossier-impression">
                  <b>O que transmite</b>
                  <p>{story.visual.impression}</p>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="ci-dossier-visual-grammar">
        <h3>Gramática visual da sequência</h3>
        <p>{model.visualGrammar}</p>
      </div>
    </section>
  );
}
