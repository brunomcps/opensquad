import { useEffect, useMemo, useState } from 'react';
import type {
  StorySourceLibraryInput,
  StorySourceLibraryModuleInput,
} from '../../../../supabase/functions/_shared/storyContent';

interface SourceLibraryExplorerProps {
  library: StorySourceLibraryInput;
}

function pageLabel(module: StorySourceLibraryModuleInput) {
  return module.pageStart === module.pageEnd
    ? `p. ${module.pageStart}`
    : `pp. ${module.pageStart}-${module.pageEnd}`;
}

export function SourceLibraryExplorer({ library }: SourceLibraryExplorerProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedKey, setSelectedKey] = useState(library.modules[0]?.key || '');

  const filteredModules = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
    return library.modules.filter(module => {
      if (category !== 'all' && module.category !== category) return false;
      if (!normalizedQuery) return true;
      return [
        module.lessonLabel,
        module.title,
        module.quick.summary,
        module.mold.name,
        ...module.principles,
        ...module.techniques,
      ].join(' ').toLocaleLowerCase('pt-BR').includes(normalizedQuery);
    });
  }, [category, library.modules, query]);

  useEffect(() => {
    if (!filteredModules.some(module => module.key === selectedKey)) {
      setSelectedKey(filteredModules[0]?.key || '');
    }
  }, [filteredModules, selectedKey]);

  const selected = filteredModules.find(module => module.key === selectedKey)
    || filteredModules[0];

  return (
    <section className="ci-source-library">
      <header className="ci-source-library-head">
        <div>
          <span className="ci-dossier-kicker">Dossiê-fonte completo</span>
          <h2>{library.title}</h2>
          <p>{library.description}</p>
        </div>
        <dl>
          <div><dt>Módulos</dt><dd>{library.modules.length}</dd></div>
          <div><dt>Páginas</dt><dd>{library.coveredPageStart}-{library.coveredPageEnd}</dd></div>
          <div><dt>Categorias</dt><dd>{library.categories.length}</dd></div>
        </dl>
      </header>

      <div className="ci-source-library-controls">
        <input
          aria-label="Buscar na biblioteca do PDF"
          placeholder="Buscar técnica, formato ou objetivo"
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        <div className="ci-source-library-categories" role="tablist" aria-label="Categorias">
          <button
            aria-selected={category === 'all'}
            className={category === 'all' ? 'active' : ''}
            role="tab"
            type="button"
            onClick={() => setCategory('all')}
          >
            Todos
          </button>
          {library.categories.map(option => (
            <button
              aria-selected={category === option.key}
              className={category === option.key ? 'active' : ''}
              key={option.key}
              role="tab"
              type="button"
              onClick={() => setCategory(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {selected ? (
        <div className="ci-source-library-workspace">
          <nav aria-label="Módulos do documento" className="ci-source-library-index">
            {filteredModules.map(module => (
              <button
                className={module.key === selected.key ? 'active' : ''}
                key={module.key}
                type="button"
                onClick={() => setSelectedKey(module.key)}
              >
                <span>{String(module.order).padStart(2, '0')} · {module.lessonLabel}</span>
                <strong>{module.title}</strong>
                <small>{pageLabel(module)}</small>
              </button>
            ))}
          </nav>

          <article className="ci-source-library-detail">
            <header>
              <div>
                <span className="ci-dossier-kicker">
                  {String(selected.order).padStart(2, '0')} · {selected.lessonLabel}
                </span>
                <h3>{selected.title}</h3>
              </div>
              <span className="ci-source-library-page-range">{pageLabel(selected)}</span>
            </header>

            <section className="ci-source-library-quick">
              <div>
                <b>Leitura rápida</b>
                <p>{selected.quick.summary}</p>
              </div>
              <div>
                <b>Resultado</b>
                <p>{selected.quick.outcome}</p>
              </div>
              <div>
                <b>Quando usar</b>
                <p>{selected.quick.useWhen}</p>
              </div>
            </section>

            <div className="ci-source-library-analysis">
              <section>
                <h4>Princípios extraídos</h4>
                <ul>{selected.principles.map(item => <li key={item}>{item}</li>)}</ul>
              </section>
              <section>
                <h4>Técnicas operacionais</h4>
                <ul>{selected.techniques.map(item => <li key={item}>{item}</li>)}</ul>
              </section>
              <section>
                <h4>Limites e riscos</h4>
                <ul>{selected.cautions.map(item => <li key={item}>{item}</li>)}</ul>
              </section>
              <section>
                <h4>Aplicação no Bruno</h4>
                <ul>{selected.brunoApplications.map(item => <li key={item}>{item}</li>)}</ul>
              </section>
            </div>

            <section className="ci-source-library-mold">
              <span className="ci-dossier-kicker">Molde extraído</span>
              <h4>{selected.mold.name}</h4>
              <p>{selected.mold.formula}</p>
              <ol>
                {selected.mold.steps.map(step => <li key={step}>{step}</li>)}
              </ol>
            </section>

            <footer>
              Fonte: {library.sourceDocument}, {pageLabel(selected)}. Conteúdo sintetizado e
              adaptado; o documento integral não é republicado.
            </footer>
          </article>
        </div>
      ) : (
        <p className="ci-source-library-empty">Nenhum módulo corresponde à busca atual.</p>
      )}
    </section>
  );
}
