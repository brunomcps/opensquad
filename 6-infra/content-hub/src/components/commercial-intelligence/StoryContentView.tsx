import { useCallback, useEffect, useMemo, useState } from 'react';
import type { StoryNarrativeRole } from '../../../supabase/functions/_shared/storyContent';
import {
  CommercialIntelligenceApiError,
  createStoryPublication,
  createStoryReference,
  createStoryTemplate,
  getStoryPublications,
  getStoryReferences,
  getStoryTemplates,
  requestStoryApproval,
  reviewStoryPublication,
  updateStoryPublication,
  type MemberRole,
  type StoryItemDto,
  type StoryPublicationDto,
  type StoryReferenceDto,
  type StoryTemplateDto,
} from '../../../ci-app/src/api';

type StoryContentSection = 'templates' | 'references' | 'publications' | 'approvals';

interface StoryContentViewProps {
  section: StoryContentSection;
  role: MemberRole;
  initialTemplateId?: string | null;
  onUseTemplate?: (templateId: string) => void;
  onInitialTemplateConsumed?: () => void;
}

const stateLabels: Record<StoryPublicationDto['publicationState'], string> = {
  draft: 'Rascunho',
  pending_approval: 'Para aprovar',
  changes_requested: 'Ajustes pedidos',
  approved: 'Aprovada',
  scheduled: 'Agendada',
  published: 'Publicada',
  cancelled: 'Cancelada',
  failed: 'Falhou',
};

const roleLabels: Record<string, string> = {
  hook: 'Gancho',
  context: 'Contexto',
  development: 'Desenvolvimento',
  proof: 'Prova',
  cta: 'Chamada',
  closing: 'Fechamento',
  other: 'Outro',
};

function dateLabel(value: string | null): string {
  if (!value) return 'Sem data definida';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Não foi possível concluir a ação.';
}

function isRevisionConflict(cause: unknown): cause is CommercialIntelligenceApiError {
  return cause instanceof CommercialIntelligenceApiError && cause.status === 409;
}

const revisionConflictMessage = 'A publicação mudou em outra aba. Recarreguei a revisão mais recente.';

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="ci-content-empty">
      <strong>{title}</strong>
      <span>{copy}</span>
    </div>
  );
}

function StoryPreview({ publication }: { publication: StoryPublicationDto | StoryReferenceDto }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showSafeArea, setShowSafeArea] = useState(publication.kind === 'publication');
  useEffect(() => { setActiveIndex(0); setShowSafeArea(publication.kind === 'publication'); }, [publication.kind, publication.sequenceId]);
  const item = publication.items[activeIndex] || publication.items[0];

  return (
    <div className="ci-content-preview-wrap">
      <div className="ci-content-preview-toolbar">
        <strong>{publication.kind === 'reference' ? 'Print original' : 'Preview do story'}</strong>
        {publication.kind === 'publication' && (
          <label>
            <input type="checkbox" checked={showSafeArea} onChange={event => setShowSafeArea(event.target.checked)} />
            Área segura
          </label>
        )}
      </div>
      <div className={`ci-content-preview${publication.kind === 'reference' ? ' ci-content-preview-reference' : ''}`} aria-label="Preview vertical 9 por 16">
        {item?.assetUrl && item.mediaType === 'image' ? (
          <img className="ci-content-preview-media" src={item.assetUrl} alt="" />
        ) : item?.assetUrl && item.mediaType === 'video' ? (
          <video className="ci-content-preview-media" src={item.assetUrl} controls muted playsInline />
        ) : null}
        {publication.kind === 'publication' && (
          <>
            <div className="ci-content-preview-shade" />
            <div className="ci-content-preview-top">
              <span className="ci-content-preview-avatar">BS</span>
              <span>brunosallesphd</span>
              <span>agora</span>
            </div>
            <div className="ci-content-preview-copy">
              <small>{roleLabels[item?.narrativeRole || 'other']}</small>
              <p>{item?.textContent || 'Mídia sem texto sobreposto'}</p>
            </div>
            <div className="ci-content-preview-actions" aria-hidden="true"><span>♡</span><span>↗</span><span>•••</span></div>
            <div className="ci-content-preview-reply" aria-hidden="true">Enviar mensagem</div>
            {showSafeArea && <div className="ci-content-safe-area"><span>área segura</span></div>}
          </>
        )}
      </div>
      <div className="ci-content-story-tabs" aria-label="Stories da sequência">
        {publication.items.map((story, index) => (
          <button
            className={index === activeIndex ? 'active' : ''}
            key={story.itemId}
            onClick={() => setActiveIndex(index)}
            type="button"
          >
            {story.narrativeOrder}
          </button>
        ))}
      </div>
    </div>
  );
}

function TemplateForm({ onSaved, onCancel }: { onSaved: (template: StoryTemplateDto) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [steps, setSteps] = useState('Gancho: mostrar a cena real\nDesenvolvimento: explicar o mecanismo sem jargão\nFechamento: dar uma ação ou convite específico');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const parsedSteps = steps.split('\n').map(line => line.trim()).filter(Boolean).map((line, index) => {
        const [rawRole, ...rest] = line.split(':');
        const aliases: Record<string, StoryNarrativeRole> = {
          gancho: 'hook', contexto: 'context', desenvolvimento: 'development', prova: 'proof', chamada: 'cta', fechamento: 'closing',
        };
        const role = aliases[rawRole.trim().toLocaleLowerCase('pt-BR')] || (index === 0 ? 'hook' : 'development');
        return { role, instruction: rest.join(':').trim() || line };
      });
      const template = await createStoryTemplate({
        name,
        objective,
        description: description || null,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        steps: parsedSteps,
      });
      onSaved(template);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="ci-content-form" onSubmit={submit}>
      <div className="ci-content-form-head"><h3>Novo template</h3><button type="button" onClick={onCancel}>Fechar</button></div>
      <label>Nome<input value={name} onChange={event => setName(event.target.value)} maxLength={160} required /></label>
      <label>Objetivo<textarea value={objective} onChange={event => setObjective(event.target.value)} rows={2} maxLength={1000} required /></label>
      <label>Como funciona<textarea value={description} onChange={event => setDescription(event.target.value)} rows={3} maxLength={4000} /></label>
      <label>Passos, um por linha<textarea value={steps} onChange={event => setSteps(event.target.value)} rows={5} required /></label>
      <label>Tags, separadas por vírgula<input value={tags} onChange={event => setTags(event.target.value)} /></label>
      {error && <p className="ci-content-error">{error}</p>}
      <button className="ci-content-primary" disabled={saving} type="submit">{saving ? 'Salvando...' : 'Salvar template'}</button>
    </form>
  );
}

function hasVisualDossier(reference: StoryReferenceDto): boolean {
  return reference.items.some(item => Boolean(item.metadata?.visual));
}

function VisualReferenceDossier({ template, reference }: {
  template: StoryTemplateDto;
  reference: StoryReferenceDto;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showSequence, setShowSequence] = useState(false);
  useEffect(() => {
    setActiveIndex(0);
    setShowSequence(false);
  }, [reference.sequenceId]);

  const definition = template.definition;
  const item = reference.items[activeIndex] || reference.items[0];
  const metadata = item?.metadata || {};
  const visual = metadata.visual;
  const map = reference.analysis?.sequenceMap || [];
  const moldSteps = definition.moldSteps || [];

  return (
    <>
      <section className="ci-visual-dossier-quick">
        <header className="ci-visual-dossier-intro">
          <div className="ci-content-kicker">Modo rápido · Referência e template juntos</div>
          <h4>{template.name}</h4>
          <p>{reference.analysis?.summary || reference.description}</p>
        </header>

        <div className="ci-visual-story-rail" aria-label="Stories da referência">
          {reference.items.map((story, index) => (
            <button
              className={!showSequence && index === activeIndex ? 'active' : ''}
              key={story.itemId}
              onClick={() => { setActiveIndex(index); setShowSequence(false); }}
              type="button"
            >
              {story.assetUrl && <img src={story.assetUrl} alt="" />}
              <span><b>Story {story.narrativeOrder}</b><small>{roleLabels[story.narrativeRole]}</small></span>
            </button>
          ))}
          <button
            className={`ci-visual-sequence-button${showSequence ? ' active' : ''}`}
            onClick={() => setShowSequence(true)}
            type="button"
          >
            <span aria-hidden="true">▦</span>
            Sequência completa
          </button>
        </div>

        {showSequence ? (
          <div className="ci-visual-sequence-summary">
            <div>
              <div className="ci-content-kicker">Sequência completa · {reference.items.length} stories</div>
              <h5>A história vende uma forma de pensar</h5>
              {(reference.analysis?.overview || []).map(paragraph => <p key={paragraph}>{paragraph}</p>)}
            </div>
            <div className="ci-visual-sequence-strip">
              {reference.items.map(story => (
                <figure key={story.itemId}>
                  {story.assetUrl && <img src={story.assetUrl} alt={`Story ${story.narrativeOrder}`} />}
                  <figcaption>{roleLabels[story.narrativeRole]}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        ) : item ? (
          <div className="ci-visual-focus">
            <figure className="ci-visual-annotated">
              <div className="ci-visual-phone">
                {item.assetUrl && <img src={item.assetUrl} alt={`Story ${item.narrativeOrder} da referência`} />}
                {(visual?.markers || []).map((marker, index) => (
                  <span className={`ci-visual-marker marker-${index + 1}`} key={`${marker.label}-${marker.description}`}>
                    {marker.label}
                  </span>
                ))}
              </div>
              <figcaption>
                {(visual?.markers || []).map(marker => (
                  <span key={`${marker.label}-${marker.description}`}><b>{marker.label}</b>{marker.description}</span>
                ))}
              </figcaption>
            </figure>
            <div className="ci-visual-focus-copy">
              <div className="ci-content-kicker">{visual?.roleLabel || `Story ${item.narrativeOrder}`}</div>
              <h5>{visual?.title || roleLabels[item.narrativeRole]}</h5>
              {metadata.sourceExcerpt && <blockquote><b>Trecho original</b>{metadata.sourceExcerpt}</blockquote>}
              <div className="ci-visual-quick-grid">
                <div><b>Evidência concreta</b><p>{metadata.analysis || item.textContent}</p></div>
                <div><b>Efeito no público</b><p>{metadata.audienceEffect}</p></div>
                <div><b>Subtexto</b><p>{metadata.subtext}</p></div>
                <div><b>Função no funil</b><p>{metadata.funnelFunction}</p></div>
              </div>
              {metadata.extractedRule && <div className="ci-visual-rule"><b>Regra extraída desta tela</b><p>{metadata.extractedRule}</p></div>}
            </div>
          </div>
        ) : null}
      </section>

      {map.length > 0 && (
        <section className="ci-visual-sequence-map" aria-label="Mapa da sequência">
          {map.map(entry => <div key={`${entry.label}-${entry.value}`}><b>{entry.label}</b><span>{entry.value}</span></div>)}
        </section>
      )}

      <section className="ci-visual-xray">
        <header>
          <div className="ci-content-kicker">Raio-X visual da referência</div>
          <h4>O que aparece, onde aparece e o que isso transmite</h4>
          <p>Conteúdo, composição e acabamento separados para modelar a lógica sem copiar a superfície.</p>
        </header>
        <div className="ci-visual-xray-grid">
          {reference.items.map(story => {
            const storyVisual = story.metadata?.visual;
            if (!storyVisual) return null;
            return (
              <article key={story.itemId}>
                <figure>{story.assetUrl && <img src={story.assetUrl} alt={`Raio-X do story ${story.narrativeOrder}`} loading="lazy" />}</figure>
                <div className="ci-visual-xray-copy">
                  <div className="ci-content-kicker">{storyVisual.roleLabel}</div>
                  <h5>{storyVisual.title}</h5>
                  <dl>
                    {storyVisual.scene && <div><dt>Cena e pessoa</dt><dd>{storyVisual.scene}</dd></div>}
                    {storyVisual.typography && <div><dt>Texto e tipografia</dt><dd>{storyVisual.typography}</dd></div>}
                    {storyVisual.composition && <div><dt>Distribuição</dt><dd>{storyVisual.composition}</dd></div>}
                    {storyVisual.graphic && <div><dt>Elemento gráfico</dt><dd>{storyVisual.graphic}</dd></div>}
                    {storyVisual.palette?.length && <div><dt>Paleta dominante</dt><dd className="ci-visual-swatches">{storyVisual.palette.map(color => <span key={color} style={{ background: color }} title={color} />)}</dd></div>}
                  </dl>
                  {storyVisual.impression && <div className="ci-visual-impression"><b>O que transmite</b><p>{storyVisual.impression}</p></div>}
                </div>
              </article>
            );
          })}
        </div>
        {reference.analysis?.visualGrammar && <div className="ci-visual-grammar"><h5>Gramática visual da sequência</h5><p>{reference.analysis.visualGrammar}</p></div>}
      </section>

      {moldSteps.length > 0 && (
        <section className="ci-visual-mold">
          <header>
            <div className="ci-content-kicker">Molde visual com placeholders</div>
            <h4>Um storyboard funcional para modelar a estrutura</h4>
            <p>Os espaços indicam função e posição aproximada. Cenário, texto, prova e resposta entram pela realidade do Bruno.</p>
          </header>
          <div className="ci-visual-mold-grid">
            {moldSteps.map((step, index) => (
              <article key={`${step.title}-${index}`}>
                <h5>{index + 1}. {step.title}</h5>
                <div className="ci-visual-mold-phone">
                  {(step.placeholders || []).map((placeholder, placeholderIndex) => (
                    <div
                      className={`ci-visual-placeholder placeholder-${placeholder.kind}`}
                      key={`${placeholder.kind}-${placeholderIndex}`}
                    >
                      [{placeholder.label}]
                    </div>
                  ))}
                </div>
                <p><b>Função fixa:</b> {step.fixedFunction || step.purpose}</p>
              </article>
            ))}
          </div>
          <div className="ci-visual-model-rules">
            <div><b>Preservar</b><p>{definition.preserveRules?.join(' ')}</p></div>
            <div><b>Adaptar</b><p>{definition.adaptRules?.join(' ')}</p></div>
            <div><b>Evitar</b><p>{definition.avoidRules?.join(' ')}</p></div>
          </div>
        </section>
      )}

      <section className="ci-visual-full-analysis">
        <header>
          <div className="ci-content-kicker">Análise completa · Referência fundadora</div>
          <h4>Como esta sequência vende a persona do Raul</h4>
          <p>A análise original permanece ligada aos próprios prints.</p>
        </header>
        {reference.items.map(story => (
          <article className="ci-visual-analysis-story" key={story.itemId}>
            <figure>
              {story.assetUrl && <img src={story.assetUrl} alt={`Story ${story.narrativeOrder}`} loading="lazy" />}
              <figcaption>{story.metadata?.visual?.title || roleLabels[story.narrativeRole]}</figcaption>
            </figure>
            <div>
              <span className="ci-visual-analysis-index">{String(story.narrativeOrder).padStart(2, '0')}</span>
              <h5>{story.metadata?.visual?.title || roleLabels[story.narrativeRole]}</h5>
              <small>{story.metadata?.visual?.roleLabel}</small>
              {story.metadata?.sourceExcerpt && <blockquote>{story.metadata.sourceExcerpt}</blockquote>}
              {(story.metadata?.analysisSections || []).map(section => (
                <section key={section.title}>
                  <h6>{section.title}</h6>
                  {(section.paragraphs || []).map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                  {section.bullets?.length && <ul>{section.bullets.map(bullet => <li key={bullet}>{bullet}</li>)}</ul>}
                </section>
              ))}
              {story.metadata?.extractedRule && <div className="ci-visual-rule"><b>Regra que nasce deste story</b><p>{story.metadata.extractedRule}</p></div>}
            </div>
          </article>
        ))}
        {reference.analysis?.productRevealed && <div className="ci-visual-persona"><b>O verdadeiro produto da sequência</b><p>{reference.analysis.productRevealed}</p></div>}
        {reference.analysis?.transferRules?.length && <div className="ci-visual-transfer"><h5>O que vale trazer para o Instagram do Bruno</h5><ul>{reference.analysis.transferRules.map(rule => <li key={rule}>{rule}</li>)}</ul></div>}
      </section>
    </>
  );
}

function TemplatesSection({ role, onUseTemplate }: { role: MemberRole; onUseTemplate?: (templateId: string) => void }) {
  const [templates, setTemplates] = useState<StoryTemplateDto[]>([]);
  const [references, setReferences] = useState<StoryReferenceDto[]>([]);
  const [publications, setPublications] = useState<StoryPublicationDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [templateResult, referenceResult, publicationResult] = await Promise.all([
        getStoryTemplates(), getStoryReferences(), getStoryPublications()
      ]);
      setTemplates(templateResult.templates);
      setReferences(referenceResult.references);
      setPublications(publicationResult.publications);
      setSelectedId(current => current || templateResult.templates[0]?.templateId || null);
    } catch (cause) { setError(errorMessage(cause)); } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => templates.filter(template => `${template.name} ${template.objective} ${template.tags.join(' ')}`.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR'))), [query, templates]);
  const selected = filtered.find(template => template.templateId === selectedId) || filtered[0];
  const linkedReferences = selected ? references.filter(reference => reference.template?.templateId === selected.templateId) : [];
  const linkedPublications = selected ? publications.filter(publication => publication.template?.templateId === selected.templateId) : [];
  const definition = selected?.definition || ({ steps: selected?.steps || [] } as StoryTemplateDto['definition']);
  const visualReference = linkedReferences.find(hasVisualDossier);

  if (loading) return <div className="ci-loading">Carregando biblioteca de templates...</div>;
  if (error) return <div className="ci-content-error-panel"><p>{error}</p><button onClick={() => void load()}>Tentar de novo</button></div>;

  return <div className="ci-content-area">
    <div className="ci-content-section-head">
      <div><h2>Templates de stories</h2><p>Template, método, evidências e aplicações em um único dossiê editorial.</p></div>
      {role === 'admin' && <button className="ci-content-primary" onClick={() => setCreating(true)}>Novo template</button>}
    </div>
    {creating && <TemplateForm onCancel={() => setCreating(false)} onSaved={template => { setTemplates(current => [template, ...current]); setSelectedId(template.templateId); setCreating(false); }} />}
    {!templates.length ? <EmptyState title="A biblioteca começa aqui" copy="Crie o primeiro template estrutural para ligar referências e publicações." /> : <div className="ci-content-library-grid">
      <aside className="ci-content-list-panel">
        <input className="ci-content-search" placeholder="Buscar template" value={query} onChange={event => setQuery(event.target.value)} />
        <div className="ci-content-template-list">{filtered.map(template => <button className={template.templateId === selected?.templateId ? 'active' : ''} key={template.templateId} onClick={() => setSelectedId(template.templateId)}><strong>{template.name}</strong><span>{template.tags.slice(0, 3).join(' · ') || 'Sem tags'}</span></button>)}</div>
      </aside>
      {selected && <article className="ci-story-dossier">
        <header className="ci-story-dossier-head">
          <div className="ci-content-kicker">Dossiê vivo · versão {selected.schemaVersion}</div>
          <h3>{selected.name}</h3><p className="ci-content-objective">{selected.objective}</p>
          {definition.formula && <div className="ci-story-formula"><small>Fórmula rápida</small><strong>{definition.formula}</strong></div>}
          <div className="ci-content-metrics"><span><strong>{linkedReferences.length}</strong> referências</span><span><strong>{linkedPublications.length}</strong> aplicações</span></div>
        </header>

        {visualReference ? <VisualReferenceDossier template={selected} reference={visualReference} /> : <>
          <section className="ci-story-method"><h4>Regras do método</h4><div className="ci-story-rule-grid">
            <div><b>Preservar</b>{(definition.preserveRules || []).map(rule => <p key={rule}>✓ {rule}</p>)}</div>
            <div><b>Adaptar</b>{(definition.adaptRules || []).map(rule => <p key={rule}>↗ {rule}</p>)}</div>
            <div><b>Evitar / riscos</b>{[...(definition.avoidRules || []), ...(definition.risks || [])].map(rule => <p key={rule}>! {rule}</p>)}</div>
          </div></section>

          <section><h4>Referências metodológicas ligadas</h4>{!linkedReferences.length ? <EmptyState title="Sem referência ligada" copy="Vincule uma referência para documentar de onde o molde aprendeu." /> : linkedReferences.map(reference => <div className="ci-story-reference" key={reference.sequenceId}>
            <div className="ci-story-reference-head"><div><strong>{reference.title}</strong><p>{reference.analysis?.summary || reference.description}</p></div>{reference.sourceUrl && <a href={reference.sourceUrl} target="_blank" rel="noreferrer">Abrir fonte</a>}</div>
            {reference.items.map(item => { const metadata = item.metadata || {}; const media = metadata.canonicalPageAssetUrl || item.assetUrl; return <article className="ci-story-evidence" key={item.itemId}>
              <div className="ci-story-evidence-media">{media && <img src={media} alt={`Evidência da página ${metadata.sourcePage || item.narrativeOrder}`} loading="lazy" />}<small>Página {metadata.sourcePage || '—'} · {metadata.evidenceType || reference.platform}</small></div>
              <div className="ci-story-evidence-copy">
                <span className="ci-story-editorial-status">{metadata.editorialStatus || 'em análise'}</span>
                <div className="ci-story-source-excerpt"><b>Ensinamento original</b><p>{metadata.sourceExcerpt || item.textContent}</p></div>
                <div className="ci-story-analysis"><b>Análise</b><p>{metadata.analysis || item.textContent}</p></div>
                {metadata.criticism && <div className="ci-story-criticism"><b>Crítica editorial</b><p>{metadata.criticism}</p></div>}
                {metadata.brunoAdaptation && <div className="ci-story-adaptation"><b>Adaptação Bruno / TDAH</b><p>{metadata.brunoAdaptation}</p></div>}
                {metadata.moldConsequence && <div className="ci-story-consequence"><b>Consequência no molde</b><p>{metadata.moldConsequence}</p></div>}
              </div>
            </article>; })}
          </div>)}</section>

          <section className="ci-story-mold"><h4>Molde aprovado · 9:16</h4><div className="ci-story-mold-grid">{(definition.moldSteps?.length ? definition.moldSteps : selected.steps.map(step => ({ title: roleLabels[step.role], purpose: step.instruction }))).map((step, index) => <div key={`${step.title}-${index}`}><span>{index + 1}</span><b>{step.title}</b><p>{step.purpose}</p></div>)}</div></section>
        </>}
        <section className="ci-story-publications"><h4>Publicações vinculadas</h4>{linkedPublications.length ? linkedPublications.map(publication => <div className="ci-story-publication" key={publication.sequenceId}><span className={`ci-content-status s-${publication.publicationState}`}>{stateLabels[publication.publicationState]}</span><strong>{publication.title}</strong><small>{publication.items.length} stories · {dateLabel(publication.scheduledFor || publication.updatedAt)}</small></div>) : <EmptyState title="Molde ainda não aplicado" copy="A primeira publicação vinculada aparecerá aqui junto de seu estado editorial." />}</section>
        <section className="ci-story-learnings"><h4>Aprendizados</h4>{linkedPublications.some(item => item.reviewNote) ? linkedPublications.filter(item => item.reviewNote).map(item => <p key={item.sequenceId}>{item.reviewNote}</p>) : <p>Sem aprendizados de revisão registrados ainda. O dossiê será atualizado conforme o molde for aplicado.</p>}</section>
      </article>}
    </div>}
  </div>;
}

const RAUL_SENA_ASSET_BASE = 'https://opensquad-commercial-intelligence.pages.dev/story-references/raul-sena';

type EditableReferenceStory = {
  mediaType: 'image' | 'video' | 'text';
  assetUrl: string;
  textContent: string;
  sourceOccurredAt: string;
  narrativeRole: StoryNarrativeRole;
};

const RAUL_SENA_STORIES: EditableReferenceStory[] = [
  {
    mediaType: 'image',
    assetUrl: `${RAUL_SENA_ASSET_BASE}/01-conflito-no-aviao.jpg`,
    textContent: 'Abre com uma cena cotidiana e reconhecível: a família quer trocar de assento. O conflito é pequeno, concreto e segura a curiosidade.',
    sourceOccurredAt: '',
    narrativeRole: 'hook',
  },
  {
    mediaType: 'image',
    assetUrl: `${RAUL_SENA_ASSET_BASE}/02-humor-e-inss.jpg`,
    textContent: 'Paga a curiosidade com humor de nicho. A troca de assento vira uma piada financeira sobre uma criança a mais colaborando com o INSS.',
    sourceOccurredAt: '',
    narrativeRole: 'development',
  },
  {
    mediaType: 'image',
    assetUrl: `${RAUL_SENA_ASSET_BASE}/03-principio-do-jato.jpg`,
    textContent: 'Fecha com uma lente de mundo: mesmo voando toda semana, ele prefere usar o dinheiro de outras formas. A cena termina em princípio e posicionamento.',
    sourceOccurredAt: '',
    narrativeRole: 'closing',
  },
];

function ReferenceForm({ templates, onSaved, onCancel }: {
  templates: StoryTemplateDto[];
  onSaved: (reference: StoryReferenceDto) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('Raul Sena, cena → humor → princípio');
  const [description, setDescription] = useState('A sequência parte de uma situação banal no avião, usa humor financeiro para pagar o gancho e fecha com uma declaração de princípio sobre dinheiro. A referência ensina a transformar rotina em posicionamento sem abrir com uma aula.');
  const [sourceAccount, setSourceAccount] = useState('@_raulsena');
  const [sourceUrl, setSourceUrl] = useState('https://www.instagram.com/_raulsena/');
  const [sourceStartedAt, setSourceStartedAt] = useState('');
  const [sourceEndedAt, setSourceEndedAt] = useState('');
  const [templateId, setTemplateId] = useState(templates.find(template => template.name.toLocaleLowerCase('pt-BR') === 'cena → lente → princípio')?.templateId || templates[0]?.templateId || '');
  const [stories, setStories] = useState<EditableReferenceStory[]>(RAUL_SENA_STORIES);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changeStory = (index: number, change: Partial<EditableReferenceStory>) => {
    setStories(current => current.map((story, storyIndex) => storyIndex === index ? { ...story, ...change } : story));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const reference = await createStoryReference({
        title,
        description,
        platform: 'instagram',
        sourceAccount,
        sourceUrl: sourceUrl || null,
        sourceStartedAt: sourceStartedAt ? new Date(sourceStartedAt).toISOString() : null,
        sourceEndedAt: sourceEndedAt ? new Date(sourceEndedAt).toISOString() : null,
        templateId,
        items: stories.map((story, index) => ({
          mediaType: story.mediaType,
          assetUrl: story.assetUrl || null,
          textContent: story.textContent || null,
          sourceOccurredAt: story.sourceOccurredAt ? new Date(story.sourceOccurredAt).toISOString() : null,
          narrativeOrder: index + 1,
          narrativeRole: story.narrativeRole,
        })),
      });
      onSaved(reference);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="ci-content-form" onSubmit={submit}>
      <div className="ci-content-form-head"><h3>Nova referência</h3><button type="button" onClick={onCancel}>Fechar</button></div>
      <label>Título<input value={title} onChange={event => setTitle(event.target.value)} maxLength={200} required /></label>
      <label>Template<select value={templateId} onChange={event => setTemplateId(event.target.value)} required>{templates.map(template => <option key={template.templateId} value={template.templateId}>{template.name}</option>)}</select></label>
      <label>Conta de origem<input value={sourceAccount} onChange={event => setSourceAccount(event.target.value)} maxLength={160} required /></label>
      <label>Link da origem<input type="url" value={sourceUrl} onChange={event => setSourceUrl(event.target.value)} placeholder="https://..." /></label>
      <label>Início real<input type="datetime-local" value={sourceStartedAt} onChange={event => setSourceStartedAt(event.target.value)} /></label>
      <label>Fim real<input type="datetime-local" value={sourceEndedAt} onChange={event => setSourceEndedAt(event.target.value)} /></label>
      <label className="ci-content-form-wide">Análise da sequência<textarea value={description} onChange={event => setDescription(event.target.value)} rows={4} maxLength={4000} required /></label>
      <div className="ci-content-story-editor">
        <b>Prints na ordem narrativa</b>
        {stories.map((story, index) => (
          <div className="ci-content-story-editor-row ci-content-reference-editor-row" key={index}>
            <span>{index + 1}</span>
            <select aria-label={`Tipo da referência ${index + 1}`} value={story.mediaType} onChange={event => changeStory(index, { mediaType: event.target.value as EditableReferenceStory['mediaType'] })}>
              <option value="image">Imagem</option><option value="video">Vídeo</option><option value="text">Texto</option>
            </select>
            <select aria-label={`Função narrativa da referência ${index + 1}`} value={story.narrativeRole} onChange={event => changeStory(index, { narrativeRole: event.target.value as StoryNarrativeRole })}>
              {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            {story.mediaType !== 'text' && <input aria-label={`URL da referência ${index + 1}`} type="url" value={story.assetUrl} onChange={event => changeStory(index, { assetUrl: event.target.value })} required />}
            <textarea aria-label={`Análise da referência ${index + 1}`} value={story.textContent} onChange={event => changeStory(index, { textContent: event.target.value })} rows={3} required />
            <input aria-label={`Data real da referência ${index + 1}`} type="datetime-local" value={story.sourceOccurredAt} onChange={event => changeStory(index, { sourceOccurredAt: event.target.value })} />
            <button type="button" disabled={stories.length === 1} onClick={() => setStories(current => current.filter((_, storyIndex) => storyIndex !== index))}>Remover</button>
          </div>
        ))}
        <button type="button" onClick={() => setStories(current => [...current, { mediaType: 'image', assetUrl: '', textContent: '', sourceOccurredAt: '', narrativeRole: 'development' }])}>Adicionar print</button>
      </div>
      {error && <p className="ci-content-error">{error}</p>}
      <button className="ci-content-primary" disabled={saving || !templates.length} type="submit">{saving ? 'Salvando...' : 'Salvar referência'}</button>
    </form>
  );
}

function ReferencesSection({ role }: { role: MemberRole }) {
  const [references, setReferences] = useState<StoryReferenceDto[]>([]);
  const [templates, setTemplates] = useState<StoryTemplateDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [referenceResult, templateResult] = await Promise.all([getStoryReferences(), getStoryTemplates()]);
      setReferences(referenceResult.references);
      setTemplates(templateResult.templates);
      setSelectedId(current => current || referenceResult.references[0]?.sequenceId || null);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const selected = references.find(reference => reference.sequenceId === selectedId) || references[0];

  if (loading) return <div className="ci-loading">Carregando referências...</div>;
  if (error) return <div className="ci-content-error-panel"><p>{error}</p><button onClick={() => void load()}>Tentar de novo</button></div>;

  return (
    <div className="ci-content-area">
      <div className="ci-content-section-head">
        <div><h2>Referências de stories</h2><p>Fonte, prints, cronologia e leitura estrutural preservados no mesmo lugar.</p></div>
        {role === 'admin' && <button className="ci-content-primary" disabled={!templates.length} onClick={() => setCreating(true)}>Nova referência</button>}
      </div>
      {creating && <ReferenceForm templates={templates} onCancel={() => setCreating(false)} onSaved={reference => { setReferences(current => [reference, ...current]); setSelectedId(reference.sequenceId); setCreating(false); }} />}
      {!templates.length && <div className="ci-content-notice">Crie um template antes da primeira referência.</div>}
      {!references.length ? <EmptyState title="Nenhuma referência cadastrada" copy="O piloto do Raul Sena já está preparado no formulário de nova referência." /> : (
        <div className="ci-content-publications-grid">
          <div className="ci-content-publication-list">
            {references.map(reference => (
              <button className={reference.sequenceId === selected?.sequenceId ? 'active' : ''} key={reference.sequenceId} onClick={() => setSelectedId(reference.sequenceId)}>
                <strong>{reference.title}</strong>
                <small>{reference.sourceAccount} · {reference.items.length} stories</small>
                <time>{dateLabel(reference.sourceStartedAt || reference.createdAt)}</time>
              </button>
            ))}
          </div>
          {selected && (
            <article className="ci-content-publication-detail ci-content-reference-detail">
              <div className="ci-content-detail-copy">
                <div className="ci-content-kicker">Referência · {selected.platform}</div>
                <h3>{selected.title}</h3>
                <p><strong>Fonte:</strong> {selected.sourceUrl ? <a href={selected.sourceUrl} target="_blank" rel="noreferrer">{selected.sourceAccount}</a> : selected.sourceAccount}</p>
                <p><strong>Template:</strong> {selected.template?.name || 'Sem template'}</p>
                <p><strong>Período:</strong> {dateLabel(selected.sourceStartedAt)} até {dateLabel(selected.sourceEndedAt)}</p>
                <h4>Leitura da sequência</h4>
                <p className="ci-content-reference-analysis">{selected.description}</p>
                <h4>Contribuição de cada story</h4>
                <ol className="ci-content-narrative">
                  {selected.items.map(item => (
                    <li key={item.itemId}>
                      <b>{item.narrativeOrder}. {roleLabels[item.narrativeRole]}</b>
                      <span>{item.textContent}</span>
                      <small>{dateLabel(item.sourceOccurredAt)}</small>
                    </li>
                  ))}
                </ol>
              </div>
              <StoryPreview publication={selected} />
            </article>
          )}
        </div>
      )}
    </div>
  );
}

type EditableStory = {
  mediaType: 'image' | 'video' | 'text';
  assetUrl: string;
  textContent: string;
  narrativeRole: StoryNarrativeRole;
};

function localDateTimeValue(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function PublicationForm({ templates, publication, initialTemplateId, onSaved, onCancel, onConflict }: {
  templates: StoryTemplateDto[];
  publication?: StoryPublicationDto;
  initialTemplateId?: string | null;
  onSaved: (publication: StoryPublicationDto) => void;
  onCancel: () => void;
  onConflict?: () => Promise<void>;
}) {
  const [title, setTitle] = useState(publication?.title || '');
  const [templateId, setTemplateId] = useState(publication?.template?.templateId || initialTemplateId || templates[0]?.templateId || '');
  const [scheduledFor, setScheduledFor] = useState(localDateTimeValue(publication?.scheduledFor || null));
  const [stories, setStories] = useState<EditableStory[]>(publication?.items.map(item => ({
    mediaType: item.mediaType,
    assetUrl: item.assetUrl || '',
    textContent: item.textContent || '',
    narrativeRole: item.narrativeRole,
  })) || [
    { mediaType: 'text', assetUrl: '', textContent: 'Story 1, o gancho real do dia', narrativeRole: 'hook' },
    { mediaType: 'text', assetUrl: '', textContent: 'Story 2, a explicação ou virada', narrativeRole: 'development' },
    { mediaType: 'text', assetUrl: '', textContent: 'Story 3, o fechamento com convite', narrativeRole: 'closing' },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changeStory = (index: number, change: Partial<EditableStory>) => {
    setStories(current => current.map((story, storyIndex) => storyIndex === index ? { ...story, ...change } : story));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const input = {
        title,
        templateId,
        scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        items: stories.map((story, index) => ({
          mediaType: story.mediaType,
          assetUrl: story.assetUrl || null,
          textContent: story.textContent || null,
          narrativeOrder: index + 1,
          narrativeRole: story.narrativeRole,
        })),
      };
      const saved = publication
        ? await updateStoryPublication(publication.sequenceId, { ...input, expectedRevision: publication.contentRevision })
        : await createStoryPublication(input);
      onSaved(saved);
    } catch (cause) {
      if (isRevisionConflict(cause) && onConflict) {
        await onConflict();
        return;
      }
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="ci-content-form" onSubmit={submit}>
      <div className="ci-content-form-head"><h3>{publication ? `Editar revisão ${publication.contentRevision}` : 'Nova publicação'}</h3><button type="button" onClick={onCancel}>Fechar</button></div>
      <label>Título<input value={title} onChange={event => setTitle(event.target.value)} maxLength={200} required /></label>
      <label>Template<select value={templateId} onChange={event => setTemplateId(event.target.value)} required>{templates.map(template => <option key={template.templateId} value={template.templateId}>{template.name}</option>)}</select></label>
      <label>Data planejada<input type="datetime-local" value={scheduledFor} onChange={event => setScheduledFor(event.target.value)} /></label>
      <div className="ci-content-story-editor">
        <b>Stories na ordem narrativa</b>
        {stories.map((story, index) => (
          <div className="ci-content-story-editor-row" key={index}>
            <span>{index + 1}</span>
            <select aria-label={`Tipo do story ${index + 1}`} value={story.mediaType} onChange={event => changeStory(index, { mediaType: event.target.value as EditableStory['mediaType'] })}>
              <option value="text">Texto</option><option value="image">Imagem</option><option value="video">Vídeo</option>
            </select>
            <select aria-label={`Função do story ${index + 1}`} value={story.narrativeRole} onChange={event => changeStory(index, { narrativeRole: event.target.value as StoryNarrativeRole })}>
              {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            {story.mediaType !== 'text' && <input aria-label={`URL do story ${index + 1}`} type="url" placeholder="https://..." value={story.assetUrl} onChange={event => changeStory(index, { assetUrl: event.target.value })} required />}
            <textarea aria-label={`Texto do story ${index + 1}`} value={story.textContent} onChange={event => changeStory(index, { textContent: event.target.value })} rows={3} placeholder="Texto ou legenda sobreposta" required={story.mediaType === 'text'} />
            <button type="button" disabled={stories.length === 1} onClick={() => setStories(current => current.filter((_, storyIndex) => storyIndex !== index))}>Remover</button>
          </div>
        ))}
        <button type="button" onClick={() => setStories(current => [...current, { mediaType: 'text', assetUrl: '', textContent: '', narrativeRole: 'development' }])}>Adicionar story</button>
      </div>
      {error && <p className="ci-content-error">{error}</p>}
      <button className="ci-content-primary" disabled={saving || !templates.length} type="submit">{saving ? 'Salvando...' : publication ? 'Salvar nova revisão' : 'Criar rascunho'}</button>
    </form>
  );
}

function PublicationList({ publications, selectedId, onSelect }: { publications: StoryPublicationDto[]; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="ci-content-publication-list">
      {publications.map(publication => (
        <button className={publication.sequenceId === selectedId ? 'active' : ''} key={publication.sequenceId} onClick={() => onSelect(publication.sequenceId)}>
          <span className={`ci-content-status s-${publication.publicationState}`}>{stateLabels[publication.publicationState]}</span>
          <strong>{publication.title}</strong>
          <small>{publication.template?.name || 'Template não vinculado'}</small>
          <time>{dateLabel(publication.scheduledFor || publication.publishedAt || publication.updatedAt)}</time>
        </button>
      ))}
    </div>
  );
}

function PublicationDetail({ publication, role, onChanged, onEdit, onConflict }: { publication: StoryPublicationDto; role: MemberRole; onChanged: (value: StoryPublicationDto) => void; onEdit?: () => void; onConflict?: () => Promise<void> }) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canRequest = role === 'admin' && ['draft', 'changes_requested'].includes(publication.publicationState);
  const canEdit = role === 'admin' && ['draft', 'changes_requested', 'approved', 'failed'].includes(publication.publicationState);

  const requestApproval = async () => {
    setSending(true);
    setError(null);
    try {
      onChanged(await requestStoryApproval(publication.sequenceId, publication.contentRevision));
    } catch (cause) {
      if (isRevisionConflict(cause) && onConflict) {
        await onConflict();
        return;
      }
      setError(errorMessage(cause));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="ci-content-publication-detail">
      <div className="ci-content-detail-copy">
        <span className={`ci-content-status s-${publication.publicationState}`}>{stateLabels[publication.publicationState]}</span>
        <h3>{publication.title}</h3>
        <p><b>Template:</b> {publication.template?.name || 'Sem vínculo'}</p>
        <p><b>Revisão:</b> {publication.contentRevision}{publication.approvedRevision ? `, aprovada na ${publication.approvedRevision}` : ''}</p>
        <p><b>Data planejada:</b> {dateLabel(publication.scheduledFor)}</p>
        {publication.reviewNote && <div className="ci-content-review-note"><b>{publication.publicationState === 'changes_requested' ? 'Ajustes pedidos' : 'Comentário da revisão'}</b><span>{publication.reviewNote}</span></div>}
        <h4>Ordem narrativa</h4>
        <ol className="ci-content-narrative">
          {publication.items.map(item => <li key={item.itemId}><b>{item.narrativeOrder}. {roleLabels[item.narrativeRole]}</b><span>{item.textContent || item.mediaType}</span>{item.sourceOccurredAt && <small>Horário real: {dateLabel(item.sourceOccurredAt)}</small>}</li>)}
        </ol>
        {error && <p className="ci-content-error">{error}</p>}
        {(canEdit || canRequest) && <div className="ci-content-detail-actions">
          {canEdit && onEdit && <button disabled={sending} onClick={onEdit}>Editar publicação</button>}
          {canRequest && <button className="ci-content-primary" disabled={sending} onClick={() => void requestApproval()}>{sending ? 'Enviando...' : 'Enviar para aprovação'}</button>}
        </div>}
      </div>
      <StoryPreview publication={publication} />
    </div>
  );
}

function PublicationsSection({ role, initialTemplateId, onInitialTemplateConsumed }: {
  role: MemberRole;
  initialTemplateId?: string | null;
  onInitialTemplateConsumed?: () => void;
}) {
  const [publications, setPublications] = useState<StoryPublicationDto[]>([]);
  const [templates, setTemplates] = useState<StoryTemplateDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [creationTemplateId, setCreationTemplateId] = useState<string | null>(initialTemplateId || null);
  const [editingId, setEditingId] = useState<string | null>(null);
  useEffect(() => {
    if (!initialTemplateId) return;
    setCreationTemplateId(initialTemplateId);
    setCreating(true);
    setEditingId(null);
    onInitialTemplateConsumed?.();
  }, [initialTemplateId, onInitialTemplateConsumed]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [publicationResult, templateResult] = await Promise.all([getStoryPublications(), getStoryTemplates()]);
      setPublications(publicationResult.publications);
      setTemplates(templateResult.templates);
      setSelectedId(current => publicationResult.publications.some(publication => publication.sequenceId === current)
        ? current
        : publicationResult.publications[0]?.sequenceId || null);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const refreshAfterConflict = useCallback(async () => {
    setCreating(false);
    setEditingId(null);
    setNotice(revisionConflictMessage);
    await load();
  }, [load]);
  const selected = publications.find(publication => publication.sequenceId === selectedId) || publications[0];
  const replace = (value: StoryPublicationDto) => setPublications(current => current.map(item => item.sequenceId === value.sequenceId ? value : item));

  if (loading) return <div className="ci-loading">Carregando publicações...</div>;
  if (error) return <div className="ci-content-error-panel"><p>{error}</p><button onClick={() => void load()}>Tentar de novo</button></div>;

  return (
    <div className="ci-content-area">
      <div className="ci-content-section-head">
        <div><h2>Publicações de stories</h2><p>A data organiza a cronologia. A ordem narrativa continua definida story por story.</p></div>
        {role === 'admin' && <button className="ci-content-primary" disabled={!templates.length} onClick={() => { setCreating(true); setEditingId(null); }}>Nova publicação</button>}
      </div>
      {notice && <div className="ci-content-notice" role="status">{notice}</div>}
      {creating && <PublicationForm templates={templates} initialTemplateId={creationTemplateId} onCancel={() => { setCreating(false); setCreationTemplateId(null); }} onSaved={publication => { setPublications(current => [publication, ...current]); setSelectedId(publication.sequenceId); setCreating(false); setCreationTemplateId(null); setNotice(null); }} />}
      {selected && editingId === selected.sequenceId && <PublicationForm key={`${selected.sequenceId}-${selected.contentRevision}`} templates={templates} publication={selected} onCancel={() => setEditingId(null)} onConflict={refreshAfterConflict} onSaved={publication => { replace(publication); setEditingId(null); setNotice(null); }} />}
      {!templates.length && <div className="ci-content-notice">Crie um template antes da primeira publicação.</div>}
      {!publications.length ? <EmptyState title="Nenhuma publicação preparada" copy="O primeiro rascunho aparecerá aqui com sequência narrativa e preview." /> : (
        <div className="ci-content-publications-grid">
          <PublicationList publications={publications} selectedId={selected?.sequenceId || null} onSelect={id => { setSelectedId(id); setEditingId(null); }} />
          {selected && <PublicationDetail publication={selected} role={role} onChanged={replace} onConflict={refreshAfterConflict} onEdit={() => { setCreating(false); setEditingId(selected.sequenceId); setNotice(null); }} />}
        </div>
      )}
    </div>
  );
}

function ApprovalsSection({ role }: { role: MemberRole }) {
  const [publications, setPublications] = useState<StoryPublicationDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState<'approved' | 'changes_requested' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getStoryPublications('approvals');
      setPublications(result.publications);
      setSelectedId(result.publications[0]?.sequenceId || null);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const selected = publications.find(publication => publication.sequenceId === selectedId) || publications[0];

  const decide = async (decision: 'approved' | 'changes_requested') => {
    if (!selected) return;
    setDeciding(decision);
    setError(null);
    try {
      await reviewStoryPublication(selected.sequenceId, selected.contentRevision, { decision, note });
      const next = publications.filter(publication => publication.sequenceId !== selected.sequenceId);
      setPublications(next);
      setSelectedId(next[0]?.sequenceId || null);
      setNote('');
      setNotice(null);
    } catch (cause) {
      if (isRevisionConflict(cause)) {
        setNote('');
        setNotice(revisionConflictMessage);
        await load();
        return;
      }
      setError(errorMessage(cause));
    } finally {
      setDeciding(null);
    }
  };

  if (loading) return <div className="ci-loading">Carregando fila de aprovação...</div>;
  if (error && !publications.length) return <div className="ci-content-error-panel"><p>{error}</p><button onClick={() => void load()}>Tentar de novo</button></div>;

  return (
    <div className="ci-content-area">
      <div className="ci-content-section-head"><div><h2>Para aprovar</h2><p>Cada OK vale somente para a revisão exibida. Depois do OK, a peça fica pronta para a etapa manual de publicação.</p></div><span className="ci-content-queue-count">{publications.length} na fila</span></div>
      {notice && <div className="ci-content-notice" role="status">{notice}</div>}
      {!publications.length ? <EmptyState title="Fila limpa" copy="Quando uma publicação for enviada para revisão, ela aparece aqui." /> : (
        <div className="ci-content-publications-grid">
          <PublicationList publications={publications} selectedId={selected?.sequenceId || null} onSelect={id => { setSelectedId(id); setNote(''); setError(null); }} />
          {selected && (
            <div>
              <PublicationDetail publication={selected} role="viewer" onChanged={() => undefined} />
              {role === 'admin' && (
                <div className="ci-content-review-box">
                  <label>Comentário da revisão<textarea value={note} onChange={event => setNote(event.target.value)} rows={3} placeholder="Obrigatório quando pedir ajustes" /></label>
                  {error && <p className="ci-content-error">{error}</p>}
                  <div><button disabled={Boolean(deciding)} onClick={() => void decide('changes_requested')}>Pedir ajustes</button><button className="ci-content-primary" disabled={Boolean(deciding)} onClick={() => void decide('approved')}>Aprovar revisão {selected.contentRevision}</button></div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function StoryContentView({ section, role, initialTemplateId, onUseTemplate, onInitialTemplateConsumed }: StoryContentViewProps) {
  if (section === 'templates') return <TemplatesSection role={role} onUseTemplate={onUseTemplate} />;
  if (section === 'references') return <ReferencesSection role={role} />;
  if (section === 'publications') return <PublicationsSection role={role} initialTemplateId={initialTemplateId} onInitialTemplateConsumed={onInitialTemplateConsumed} />;
  return <ApprovalsSection role={role} />;
}
