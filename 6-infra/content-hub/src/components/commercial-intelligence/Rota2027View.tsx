import { useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import { supabase } from '../../../ci-app/src/supabase';
import planoCrescimento from '../../../ci-app/src/rota2027/PLANO-CRESCIMENTO-2027.md?raw';
import planoRota from '../../../ci-app/src/rota2027/PLANO-ROTA-DEZ2027.md?raw';
import relatorio from '../../../ci-app/src/rota2027/RELATORIO.md?raw';
import dossiePodcast from '../../../ci-app/src/rota2027/dossie-podcast-leo-xavier.md?raw';

// COCKPIT da rota R$ 5 mi/dez-2027: uma tela que responde "tô no caminho?" e
// "o que fazer agora?". O placar vem da tabela rota_placar (atualizada pela
// tarefa semanal); os documentos completos ficam atrás do expansor no rodapé.

interface Farol {
  chave: string;
  titulo: string;
  valor: string;
  alvo: string;
  cor: 'verde' | 'amarelo' | 'vermelho';
  detalhe: string;
}

interface AcaoSemana {
  quando: string;
  acao: string;
}

interface Placar {
  origem: string;
  farois: Farol[];
  esta_semana: AcaoSemana[];
  esperando_voce: string[];
  proxima_sessao: string;
}

const PLACAR_RESERVA: Placar = {
  origem: 'calibracao-2026-07-18 (reserva local)',
  farois: [
    { chave: 'inscritos', titulo: 'Inscritos novos/mês', valor: '~18 mil', alvo: '18 mil (marco out/26 antecipado)', cor: 'verde', detalhe: 'ritmo dos últimos 30 dias: +18,2 mil' },
    { chave: 'rpk', titulo: 'R$ líq. por 1.000 views', valor: 'R$ 58', alvo: 'R$ 83 até mar/27', cor: 'amarelo', detalhe: 'sobe com QI-4D (set/26) e nota-9 (dez/26)' },
    { chave: 'receita', titulo: 'Receita acumulada', valor: 'R$ 0', alvo: 'R$ 3,5 mi até dez/27', cor: 'verde', detalhe: 'rota começa agora; 1º marco: ~R$ 140 mil em out/26' },
  ],
  esta_semana: [
    { quando: 'seg 21/07', acao: 'Passar a chave do Supabase do portal + escolher provedor de e-mail transacional + acesso Cloudflare' },
    { quando: 'qua 23/07', acao: 'Aprovar orçamento do editor freelancer da rampa da gaveta' },
    { quando: 'até 15/08', acao: 'Contratar advogado do parecer CRP (QI-4D + nota-9)' },
  ],
  esperando_voce: ['Leitura do Playbook 2027 (19 itens [CONFIRMAR COM BRUNO])'],
  proxima_sessao: '01/08/2026 · sessão mensal de estratégia (a recalibração deixa tudo pronto)',
};

const DOCUMENTOS = [
  { id: 'playbook', titulo: 'Playbook 2027', resumo: 'O plano operacional completo: filões, backlog de 12 pacotes, cronograma de funil, semana-padrão e painel de comando.', corpo: planoCrescimento },
  { id: 'rota', titulo: 'Rota e marcos', resumo: 'A meta de R$ 5 mi, as 2 alavancas, os marcos trimestrais em inscritos e os benchmarks do nicho.', corpo: planoRota },
  { id: 'relatorio', titulo: 'Relatório técnico', resumo: 'As taxas validadas (views→vendas→receita), correlações, cenários e limites do modelo.', corpo: relatorio },
  { id: 'dossie', titulo: 'Dossiê Leo Xavier', resumo: 'O podcast destrinchado: trajetória, números abertos, o plano do Faggion e o comparativo real com o canal.', corpo: dossiePodcast },
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

function CorFarol({ cor }: { cor: Farol['cor'] }) {
  return <span className={`ci-cockpit-luz ${cor}`} aria-label={`farol ${cor}`} />;
}

function LeitorDocumentos() {
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
    <div className="ci-rota">
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
    </div>
  );
}

export function Rota2027View() {
  const [placar, setPlacar] = useState<Placar>(PLACAR_RESERVA);
  const [atualizadoEm, setAtualizadoEm] = useState<string | null>(null);
  const [mostraDocumentos, setMostraDocumentos] = useState(false);

  useEffect(() => {
    let ativo = true;
    supabase
      .from('rota_placar')
      .select('atualizado_em,payload')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (!ativo || !data?.payload) return;
        setPlacar(data.payload as Placar);
        setAtualizadoEm(data.atualizado_em as string);
      });
    return () => {
      ativo = false;
    };
  }, []);

  return (
    <section className="ci-cockpit">
      <header className="ci-cockpit-cabecalho">
        <div>
          <h2>Rota R$ 5 mi · dez/2027</h2>
          <p>
            {atualizadoEm
              ? `Placar atualizado em ${new Date(atualizadoEm).toLocaleDateString('pt-BR')} (a tarefa semanal renova toda segunda).`
              : 'Placar da calibração de 18/07/2026 (a tarefa semanal renova toda segunda).'}
          </p>
        </div>
      </header>

      <div className="ci-cockpit-farois">
        {placar.farois.map(farol => (
          <article key={farol.chave} className={`ci-cockpit-farol ${farol.cor}`}>
            <div className="ci-cockpit-farol-topo">
              <CorFarol cor={farol.cor} />
              <span>{farol.titulo}</span>
            </div>
            <strong>{farol.valor}</strong>
            <small>alvo: {farol.alvo}</small>
            <p>{farol.detalhe}</p>
          </article>
        ))}
      </div>

      <div className="ci-cockpit-colunas">
        <section className="ci-cockpit-bloco">
          <h3>Esta semana</h3>
          <ul>
            {placar.esta_semana.map(item => (
              <li key={item.quando + item.acao}>
                <strong>{item.quando}</strong>
                <span>{item.acao}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="ci-cockpit-bloco">
          <h3>Esperando você</h3>
          <ul className="ci-cockpit-pendencias">
            {placar.esperando_voce.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="ci-cockpit-sessao">{placar.proxima_sessao}</p>
        </section>
      </div>

      <button
        type="button"
        className="ci-cockpit-expansor"
        onClick={() => setMostraDocumentos(valor => !valor)}
      >
        {mostraDocumentos ? 'Esconder documentos de referência' : 'Documentos de referência (playbook, rota, relatório, dossiê)'}
      </button>
      {mostraDocumentos && <LeitorDocumentos />}
    </section>
  );
}
