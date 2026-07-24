import { useMemo, useState } from 'react';
import { PROJECOES_CALIBRACAO as CAL, PROJECOES_LIMITES as LIM } from './projecoesCalibracao';

type Modo = 'simples' | 'avancado';
type Cartao = 'chao' | 'historico' | 'forte';

const brl = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const milhoes = (valor: number) => (valor >= 1_000_000
  ? `${(valor / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  : `${Math.round(valor / 1000)} mil`);

function formataTempo(meses: number | null): string {
  if (meses == null || meses > LIM.horizonteMeses) return 'mais de 10 anos';
  if (meses < 1.5) return '~1 mês';
  if (meses < 12) return `~${Math.round(meses)} meses`;
  return `~${(meses / 12).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} anos`;
}

function mesesConstante(meta: number, viewsMes: number, rpk: number): number | null {
  const porMes = viewsMes * rpk / 1000;
  return porMes > 0 ? meta / porMes : null;
}

function mesesComposto(meta: number, viewsMes: number, g: number, rpk: number): number | null {
  const base = viewsMes * rpk / 1000;
  if (base <= 0) return null;
  if (Math.abs(g - 1) < 1e-9) return meta / base;
  const argumento = 1 + meta * (g - 1) / base;
  return argumento > 0 ? Math.log(argumento) / Math.log(g) : null;
}

function mesesComTeto(meta: number, viewsMes: number, g: number, teto: number, rpk: number): number | null {
  if (viewsMes >= teto || g <= 1) return mesesConstante(meta, Math.min(viewsMes, teto), rpk);
  const mesesAteTeto = Math.log(teto / viewsMes) / Math.log(g);
  const acumuladoAteTeto = viewsMes * rpk / 1000 * (Math.pow(g, mesesAteTeto) - 1) / (g - 1);
  if (acumuladoAteTeto >= meta) return mesesComposto(meta, viewsMes, g, rpk);
  return mesesAteTeto + (meta - acumuladoAteTeto) / (teto * rpk / 1000);
}

// gerador pseudoaleatório com semente fixa: o resultado não "pisca" entre renders
function mulberry32(semente: number) {
  let a = semente | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface ResultadoMonteCarlo {
  p20: number | null;
  p50: number | null;
  p80: number | null;
  pctAtinge: number;
}

function monteCarlo(meta: number, viewsMes: number, rpk: number, semTendencia: boolean): ResultadoMonteCarlo {
  const pool = semTendencia
    ? (() => {
      const mediaGeometrica = Math.exp(CAL.razoesSemanais.reduce((soma, razao) => soma + Math.log(razao), 0) / CAL.razoesSemanais.length);
      return CAL.razoesSemanais.map(razao => razao / mediaGeometrica);
    })()
    : [...CAL.razoesSemanais];
  const sorteio = mulberry32(42);
  const n = pool.length;
  const tempos: number[] = [];
  let atingiram = 0;
  const fatorRpk = rpk / CAL.rpk.realista;
  for (let simulacao = 0; simulacao < LIM.simulacoesMonteCarlo; simulacao += 1) {
    let views = viewsMes;
    let acumulado = 0;
    let quando: number | null = null;
    for (let mes = 0; mes < LIM.horizonteMeses; mes += 1) {
      const fator = pool[(sorteio() * n) | 0] * pool[(sorteio() * n) | 0] * pool[(sorteio() * n) | 0] * pool[(sorteio() * n) | 0];
      views = Math.min(views * fator, LIM.tetoViewsMesSimulacao);
      const rpkDoMes = (CAL.rpk.conservador + sorteio() * (CAL.rpk.otimista - CAL.rpk.conservador)) * fatorRpk;
      acumulado += views * rpkDoMes / 1000;
      if (acumulado >= meta) { quando = mes + 1; break; }
    }
    if (quando != null) atingiram += 1;
    tempos.push(quando ?? LIM.horizonteMeses + 1);
  }
  tempos.sort((a, b) => a - b);
  const percentil = (p: number) => {
    const valor = tempos[Math.floor(LIM.simulacoesMonteCarlo * p / 100)];
    return valor > LIM.horizonteMeses ? null : valor;
  };
  return { p20: percentil(20), p50: percentil(50), p80: percentil(80), pctAtinge: Math.round(atingiram / LIM.simulacoesMonteCarlo * 100) };
}

const CARTOES: Array<{ id: Cartao; titulo: string; descricao: string }> = [
  {
    id: 'chao',
    titulo: 'Pé no chão',
    descricao: 'O canal para de crescer e mantém o ritmo atual pra sempre. É o piso da estimativa.',
  },
  {
    id: 'historico',
    titulo: 'Ritmo da vida do canal',
    descricao: `Cresce ${CAL.crescimentoMensal.vidaMadura.toLocaleString('pt-BR')}% ao mês, a média de tudo que o canal já viveu (incluindo a queda de abril).`,
  },
  {
    id: 'forte',
    titulo: 'Ritmo dos últimos 6 meses',
    descricao: `Cresce ${CAL.crescimentoMensal.ultimos6Meses.toLocaleString('pt-BR')}% ao mês, sustentando a fase forte atual por anos. Ambicioso.`,
  },
];

const METAS_PRESET = [500_000, 1_000_000, 5_000_000, 10_000_000];

function BarraMotor({ nome, explicacao, meses, faixa, detalhe }: {
  nome: string;
  explicacao: string;
  meses: number | null;
  faixa?: [number | null, number | null];
  detalhe?: string;
}) {
  const escalaMeses = 15 * 12;
  const largura = meses == null ? 100 : Math.min(100, meses / escalaMeses * 100);
  const faixaInicio = faixa?.[0] != null ? Math.min(100, faixa[0] / escalaMeses * 100) : null;
  const faixaFim = faixa ? (faixa[1] == null ? 100 : Math.min(100, faixa[1] / escalaMeses * 100)) : null;
  return (
    <div className="ci-proj-motor">
      <div className="ci-proj-motor-topo">
        <span>{nome}</span>
        <strong>{formataTempo(meses)}{detalhe ? <small> · {detalhe}</small> : null}</strong>
      </div>
      <div className="ci-proj-barra">
        {faixaInicio != null && faixaFim != null && (
          <span className="ci-proj-barra-faixa" style={{ left: `${faixaInicio}%`, width: `${Math.max(1, faixaFim - faixaInicio)}%` }} />
        )}
        <span className={`ci-proj-barra-valor${meses == null ? ' estourou' : ''}`} style={{ width: `${Math.max(1.5, largura)}%` }} />
      </div>
      <p className="ci-proj-ajuda">{explicacao}</p>
    </div>
  );
}

export function ProjecoesSimulador() {
  const [modo, setModo] = useState<Modo>('simples');
  const [meta, setMeta] = useState(5_000_000);
  const [cartao, setCartao] = useState<Cartao>('historico');
  const [viewsMes, setViewsMes] = useState<number>(CAL.ritmoAtualViewsMes);
  const [rpk, setRpk] = useState<number>(Math.round(CAL.rpk.realista));
  const [crescimentoPct, setCrescimentoPct] = useState<number>(CAL.crescimentoMensal.vidaMadura);
  const [tetoViews, setTetoViews] = useState(3_000_000);
  const [semTendencia, setSemTendencia] = useState(false);

  const g = 1 + crescimentoPct / 100;

  const resultadoSimples = useMemo(() => {
    const taxa = CAL.rpk.realista;
    const base = CAL.ritmoAtualViewsMes;
    const calcula = (valor: number) => {
      if (cartao === 'chao') return mesesConstante(valor, base, taxa);
      const crescimento = cartao === 'historico' ? CAL.crescimentoMensal.vidaMadura : CAL.crescimentoMensal.ultimos6Meses;
      return mesesComposto(valor, base, 1 + crescimento / 100, taxa);
    };
    const marcos: Array<{ rotulo: string; meses: number | null }> = [];
    if (meta > 1_500_000) marcos.push({ rotulo: 'primeiro R$ 1 mi', meses: calcula(1_000_000) });
    if (meta >= 4_000_000) marcos.push({ rotulo: `metade (${brl(meta / 2)})`, meses: calcula(meta / 2) });
    return { total: calcula(meta), marcos };
  }, [meta, cartao]);

  const avancado = useMemo(() => ({
    constante: mesesConstante(meta, viewsMes, rpk),
    composto: mesesComposto(meta, viewsMes, g, rpk),
    comTeto: mesesComTeto(meta, viewsMes, g, tetoViews, rpk),
    monteCarlo: monteCarlo(meta, viewsMes, rpk, semTendencia),
  }), [meta, viewsMes, rpk, g, tetoViews, semTendencia]);

  return (
    <section className="ci-proj">
      <header className="ci-proj-cabecalho">
        <div>
          <h2>Simulador: quanto tempo até a meta</h2>
          <p>
            Projeta o tempo até um total acumulado de receita <strong>líquida</strong> (o repasse da Hotmart, antes dos seus
            impostos), usando as taxas reais do canal. Calibrado em {CAL.calibradoEm.split('-').reverse().join('/')} com{' '}
            {CAL.semanasDeHistorico} semanas de histórico: hoje cada 1.000 views viram ~{brl(CAL.rpk.realista)} líquidos e o
            canal roda a {milhoes(CAL.ritmoAtualViewsMes)} views/mês.
          </p>
        </div>
        <div className="ci-segmented ci-proj-modo" role="tablist" aria-label="Nível de detalhe do simulador">
          <button type="button" className={modo === 'simples' ? 'active' : ''} onClick={() => setModo('simples')}>Simples</button>
          <button type="button" className={modo === 'avancado' ? 'active' : ''} onClick={() => setModo('avancado')}>Avançado</button>
        </div>
      </header>

      <div className="ci-proj-bloco">
        <label className="ci-proj-rotulo" htmlFor="ci-proj-meta">1 · Qual é a meta acumulada?</label>
        <div className="ci-proj-meta-linha">
          <input
            id="ci-proj-meta"
            type="number"
            min={100_000}
            step={100_000}
            value={meta}
            onChange={event => setMeta(Math.max(100_000, Number(event.target.value) || 0))}
          />
          <div className="ci-proj-presets">
            {METAS_PRESET.map(valor => (
              <button key={valor} type="button" className={meta === valor ? 'active' : ''} onClick={() => setMeta(valor)}>
                {brl(valor)}
              </button>
            ))}
          </div>
        </div>
        <p className="ci-proj-ajuda">Total que você quer ver acumulado na conta, somando todos os meses daqui pra frente.</p>
      </div>

      {modo === 'simples' && (
        <>
          <div className="ci-proj-bloco">
            <span className="ci-proj-rotulo">2 · Como você imagina o futuro do canal?</span>
            <div className="ci-proj-cartoes">
              {CARTOES.map(opcao => (
                <button
                  key={opcao.id}
                  type="button"
                  className={`ci-proj-cartao${cartao === opcao.id ? ' active' : ''}`}
                  onClick={() => setCartao(opcao.id)}
                >
                  <strong>{opcao.titulo}</strong>
                  <span>{opcao.descricao}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="ci-proj-resposta">
            <span>Nesse caminho, {brl(meta)} líquidos chegam em</span>
            <strong>{formataTempo(resultadoSimples.total)}</strong>
            {resultadoSimples.marcos.length > 0 && (
              <p>
                Marcos no caminho: {resultadoSimples.marcos.map(marco => `${marco.rotulo} em ${formataTempo(marco.meses)}`).join(' · ')}.
              </p>
            )}
            <p className="ci-proj-ajuda">
              Conta feita com o ritmo atual ({milhoes(CAL.ritmoAtualViewsMes)} views/mês) e a taxa típica de {brl(CAL.rpk.realista)} líquidos
              por 1.000 views. Pra mexer nessas peças (e ver a simulação de 2.000 futuros), abra o modo Avançado.
            </p>
          </div>
        </>
      )}

      {modo === 'avancado' && (
        <>
          <div className="ci-proj-bloco">
            <span className="ci-proj-rotulo">2 · As quatro peças da conta</span>
            <div className="ci-proj-controles">
              <div className="ci-proj-controle">
                <div className="ci-proj-controle-topo">
                  <label htmlFor="ci-proj-views">Ritmo atual de views</label>
                  <output>{milhoes(viewsMes)}/mês</output>
                </div>
                <input id="ci-proj-views" type="range" min={100_000} max={2_000_000} step={20_000} value={viewsMes} onChange={event => setViewsMes(Number(event.target.value))} />
                <p className="ci-proj-ajuda">Quantas views o canal faz por mês hoje. Medido nos últimos 60 dias: {milhoes(CAL.ritmoAtualViewsMes)}/mês.</p>
              </div>
              <div className="ci-proj-controle">
                <div className="ci-proj-controle-topo">
                  <label htmlFor="ci-proj-rpk">Dinheiro por 1.000 views</label>
                  <output>{brl(rpk)}</output>
                </div>
                <input id="ci-proj-rpk" type="range" min={30} max={150} step={1} value={rpk} onChange={event => setRpk(Number(event.target.value))} />
                <p className="ci-proj-ajuda">
                  Quanto cada 1.000 views viram de líquido, combinando conversão e ticket. Seu histórico: {brl(CAL.rpk.conservador)} nos
                  meses fracos, {brl(CAL.rpk.realista)} no típico, {brl(CAL.rpk.otimista)} nos bons. Produto de ticket maior sobe esse número.
                </p>
              </div>
              <div className="ci-proj-controle">
                <div className="ci-proj-controle-topo">
                  <label htmlFor="ci-proj-g">Crescimento das views</label>
                  <output>{crescimentoPct.toLocaleString('pt-BR')}%/mês</output>
                </div>
                <input id="ci-proj-g" type="range" min={0} max={15} step={0.1} value={crescimentoPct} onChange={event => setCrescimentoPct(Number(event.target.value))} />
                <div className="ci-proj-presets">
                  <button type="button" onClick={() => setCrescimentoPct(0)}>0%</button>
                  <button type="button" onClick={() => setCrescimentoPct(CAL.crescimentoMensal.vidaMadura)}>{CAL.crescimentoMensal.vidaMadura.toLocaleString('pt-BR')}% · média do canal</button>
                  <button type="button" onClick={() => setCrescimentoPct(CAL.crescimentoMensal.ultimos6Meses)}>{CAL.crescimentoMensal.ultimos6Meses.toLocaleString('pt-BR')}% · últimos 6 meses</button>
                </div>
                <p className="ci-proj-ajuda">Quanto as views crescem por mês, em juros compostos. Vale pros motores 2 e 3; o Monte Carlo ignora este controle porque sorteia o crescimento do próprio histórico.</p>
              </div>
              <div className="ci-proj-controle">
                <div className="ci-proj-controle-topo">
                  <label htmlFor="ci-proj-teto">Teto do canal</label>
                  <output>{milhoes(tetoViews)}/mês</output>
                </div>
                <input id="ci-proj-teto" type="range" min={1_000_000} max={10_000_000} step={500_000} value={tetoViews} onChange={event => setTetoViews(Number(event.target.value))} />
                <p className="ci-proj-ajuda">Tamanho máximo que você acredita que o canal alcança. Só o motor 3 usa: ele cresce até aqui e depois anda no ritmo do teto.</p>
              </div>
            </div>
          </div>

          <div className="ci-proj-bloco">
            <span className="ci-proj-rotulo">3 · O mesmo futuro por quatro lentes</span>
            <BarraMotor
              nome="1 · Canal congelado"
              explicacao="Se o canal parar de crescer hoje e só repetir o ritmo atual, mês após mês."
              meses={avancado.constante}
            />
            <BarraMotor
              nome="2 · Crescimento composto"
              explicacao="As views crescem todo mês na taxa escolhida ali em cima, sem limite. Otimista no longo prazo: nenhum canal cresce pra sempre."
              meses={avancado.composto}
            />
            <BarraMotor
              nome="3 · Cresce até o teto"
              explicacao="Cresce na taxa escolhida até bater no teto e depois se mantém lá. Costuma ser a lente mais realista."
              meses={avancado.comTeto}
            />
            <BarraMotor
              nome="4 · Monte Carlo (2.000 futuros)"
              explicacao="Sorteia 2.000 futuros usando as semanas reais do seu histórico, com crash e boom inclusos. A barra clara mostra onde caem 80% dos futuros; o número é a mediana."
              meses={avancado.monteCarlo.p50}
              faixa={[avancado.monteCarlo.p20, avancado.monteCarlo.p80]}
              detalhe={`${avancado.monteCarlo.pctAtinge}% chegam em até 10 anos`}
            />
            <label className="ci-proj-check">
              <input type="checkbox" checked={semTendencia} onChange={event => setSemTendencia(event.target.checked)} />
              Tirar o vento a favor do Monte Carlo (sorteia só a instabilidade do histórico, sem o crescimento médio de ~19%/mês do período fev–jul)
            </label>
          </div>

          <details className="ci-proj-glossario">
            <summary>O que significa cada coisa (glossário rápido)</summary>
            <dl>
              <dt>Líquido</dt>
              <dd>O que a Hotmart repassa pra você depois das taxas dela. Seus impostos e custos ainda saem daí.</dd>
              <dt>Dinheiro por 1.000 views</dt>
              <dd>Resumo de duas coisas ao mesmo tempo: quantas views custam 1 venda (~{CAL.viewsPorVendaMediana.toLocaleString('pt-BR')} na mediana) e quanto entra por venda (~{brl(CAL.ticketLiquidoMediano)} líquidos).</dd>
              <dt>Crescimento composto</dt>
              <dd>Juros sobre juros: 5% ao mês parece pouco, mas dobra o canal em ~14 meses.</dd>
              <dt>Mediana e faixa de 80%</dt>
              <dd>Mediana: metade dos futuros simulados chega antes, metade depois. Faixa de 80%: só 1 futuro em cada 10 foi mais rápido que o começo dela, e 1 em cada 10 foi mais lento que o fim.</dd>
              <dt>Por que os motores discordam?</dt>
              <dd>Cada um assume uma curva de crescimento diferente. A verdade provável mora entre o motor 3 e o 4; o motor 1 é o piso.</dd>
            </dl>
          </details>
        </>
      )}
    </section>
  );
}
