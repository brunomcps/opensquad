import { useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import planoCrescimento from '../../../ci-app/src/rota2027/PLANO-CRESCIMENTO-2027.md?raw';
import planoRota from '../../../ci-app/src/rota2027/PLANO-ROTA-DEZ2027.md?raw';
import relatorio from '../../../ci-app/src/rota2027/RELATORIO.md?raw';
import dossiePodcast from '../../../ci-app/src/rota2027/dossie-podcast-leo-xavier.md?raw';

// Documentos da rota R$ 5 mi até dez/2027. Fonte da verdade: os .md em
// docs/commercial-intelligence/projecoes/ (repo principal). A recalibração
// mensal copia os arquivos atualizados pra ci-app/src/rota2027/ e redeploya.
const DOCUMENTOS = [
  {
    id: 'playbook',
    titulo: 'Playbook 2027',
    resumo: 'O plano operacional completo: filões, backlog de 12 pacotes, cronograma de funil, semana-padrão e painel de comando.',
    corpo: planoCrescimento,
  },
  {
    id: 'rota',
    titulo: 'Rota e marcos',
    resumo: 'A meta de R$ 5 mi, as 2 alavancas, os marcos trimestrais em inscritos e os benchmarks do nicho.',
    corpo: planoRota,
  },
  {
    id: 'relatorio',
    titulo: 'Relatório técnico',
    resumo: 'As taxas validadas (views→vendas→receita), correlações, cenários e limites do modelo.',
    corpo: relatorio,
  },
  {
    id: 'dossie',
    titulo: 'Dossiê Leo Xavier',
    resumo: 'O podcast destrinchado: trajetória, números abertos, o plano do Faggion e o comparativo real com o canal.',
    corpo: dossiePodcast,
  },
] as const;

type DocumentoId = (typeof DOCUMENTOS)[number]['id'];

interface Secao {
  id: string;
  texto: string;
  nivel: number;
}

function extraiSecoes(markdown: string): Secao[] {
  const secoes: Secao[] = [];
  for (const linha of markdown.split('\n')) {
    const combinacao = linha.match(/^(#{2,3})\s+(.+)$/);
    if (!combinacao) continue;
    const texto = combinacao[2].replace(/\*\*/g, '').trim();
    secoes.push({ id: idDeSecao(texto), texto, nivel: combinacao[1].length });
  }
  return secoes;
}

function idDeSecao(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function Rota2027View() {
  const [documentoId, setDocumentoId] = useState<DocumentoId>('playbook');
  const conteudoRef = useRef<HTMLDivElement>(null);

  const documento = DOCUMENTOS.find(doc => doc.id === documentoId) ?? DOCUMENTOS[0];
  const secoes = useMemo(() => extraiSecoes(documento.corpo), [documento]);
  const html = useMemo(() => {
    const renderer = new marked.Renderer();
    renderer.heading = (texto: string, nivel: number) => {
      const textoLimpo = texto.replace(/<[^>]+>/g, '');
      return `<h${nivel} id="${idDeSecao(textoLimpo)}">${texto}</h${nivel}>`;
    };
    return marked.parse(documento.corpo, { renderer, async: false }) as string;
  }, [documento]);

  useEffect(() => {
    conteudoRef.current?.scrollTo({ top: 0 });
  }, [documentoId]);

  function pulaPara(secaoId: string) {
    const alvo = conteudoRef.current?.querySelector(`#${CSS.escape(secaoId)}`);
    alvo?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <section className="ci-rota">
      <div className="ci-rota-cartoes">
        {DOCUMENTOS.map(doc => (
          <button
            key={doc.id}
            type="button"
            className={`ci-rota-cartao${doc.id === documentoId ? ' active' : ''}`}
            onClick={() => setDocumentoId(doc.id)}
          >
            <strong>{doc.titulo}</strong>
            <span>{doc.resumo}</span>
          </button>
        ))}
      </div>
      <div className="ci-rota-leitor">
        <nav className="ci-rota-indice" aria-label="Seções do documento">
          <span>Neste documento</span>
          {secoes.map(secao => (
            <button
              key={secao.id + secao.texto}
              type="button"
              className={secao.nivel === 3 ? 'sub' : ''}
              onClick={() => pulaPara(secao.id)}
            >
              {secao.texto}
            </button>
          ))}
        </nav>
        <article ref={conteudoRef} className="ci-rota-conteudo" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </section>
  );
}
