import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CommercialOverview as CommercialOverviewData } from '../../../supabase/functions/_shared/overview';
import { getOverview } from '../../../ci-app/src/api';

type PeriodKey = 'month' | 'previous' | '90d' | 'all';

const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: 'month', label: 'Este mês' },
  { key: 'previous', label: 'Mês passado' },
  { key: '90d', label: '90 dias' },
  { key: 'all', label: 'Tudo' },
];

const GOALS = [30_000, 40_000, 50_000];
const STATUS_LABELS: Record<string, string> = {
  approved: 'Aprovadas',
  refunded: 'Reembolsadas',
  chargeback: 'Chargebacks',
  canceled: 'Canceladas',
  expired: 'Expiradas',
  blocked: 'Bloqueadas',
  disputed: 'Em disputa',
  unknown: 'Desconhecidas',
};

function dateInSaoPaulo(value: Date): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(value).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function periodDates(period: PeriodKey, now = new Date()): { start: string; end: string } {
  const today = dateInSaoPaulo(now);
  const [year, month] = today.split('-').map(Number);
  if (period === 'month') return { start: `${today.slice(0, 8)}01`, end: today };
  if (period === 'previous') {
    const start = new Date(Date.UTC(year, month - 2, 1, 12));
    const end = new Date(Date.UTC(year, month - 1, 0, 12));
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  }
  if (period === '90d') {
    const start = new Date(`${today}T12:00:00.000Z`);
    start.setUTCDate(start.getUTCDate() - 89);
    return { start: start.toISOString().slice(0, 10), end: today };
  }
  return { start: '2020-01-01', end: today };
}

function money(value: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
}

function compactMoney(value: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1,
  }).format(value);
}

function periodLabel(data: CommercialOverviewData): string {
  const format = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  return `${format(data.period.start)} a ${format(data.period.end)}`;
}

function warningLabel(code: string): string {
  const [name, rawCount] = code.split(':');
  const count = rawCount || 'algumas';
  const labels: Record<string, string> = {
    approved_date_fallback: `${count} venda(s) usaram a data do pedido porque a data de aprovação estava ausente.`,
    buyer_key_missing: `${count} venda(s) não entraram na contagem de compradores únicos.`,
    currency_mismatch: `${count} linha(s) não tiveram líquido calculado porque bruto e taxa estavam em moedas diferentes.`,
    monetary_value_missing: `${count} linha(s) não tiveram valor monetário completo para o cálculo.`,
    missing_transaction_date: `${count} linha(s) ficaram fora do período por ausência de data válida.`,
  };
  return labels[name] || code;
}

export function CommercialOverview() {
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [currency, setCurrency] = useState('BRL');
  const [goal, setGoal] = useState(50_000);
  const [data, setData] = useState<CommercialOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dates = useMemo(() => periodDates(period), [period]);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getOverview({ ...dates, currency, goal });
      setData(result.overview);
    } catch {
      setError('Não foi possível carregar a visão comercial agora.');
    } finally {
      setLoading(false);
    }
  }, [currency, dates, goal]);

  useEffect(() => { void load(); }, [load]);

  if (loading && !data) return <section className="ci-overview-state">Carregando os números comerciais...</section>;
  if (error && !data) {
    return (
      <section className="ci-overview-state ci-overview-error">
        <strong>{error}</strong>
        <button type="button" onClick={load}>Tentar novamente</button>
      </section>
    );
  }
  if (!data) return null;

  const progress = data.goal ? Math.min(100, data.goal.progress * 100) : 0;
  return (
    <div className="ci-overview">
      <section className="ci-overview-toolbar">
        <div>
          <span className="ci-toolbar-label">Período analisado</span>
          <strong>{periodLabel(data)}</strong>
          <span>Atualizado em {data.updatedAt ? new Date(data.updatedAt).toLocaleString('pt-BR') : 'data não disponível'}</span>
        </div>
        <div className="ci-filter-groups">
          <div className="ci-segmented" aria-label="Período">
            {PERIODS.map(item => (
              <button type="button" key={item.key} className={period === item.key ? 'active' : ''} onClick={() => setPeriod(item.key)}>
                {item.label}
              </button>
            ))}
          </div>
          <label className="ci-select-label">
            Moeda
            <select value={currency} onChange={event => setCurrency(event.target.value)}>
              {[...new Set([currency, ...data.availableCurrencies])].map(item => <option key={item}>{item}</option>)}
            </select>
          </label>
          {currency === 'BRL' && period === 'month' && (
            <label className="ci-select-label">
              Meta
              <select value={goal} onChange={event => setGoal(Number(event.target.value))}>
                {GOALS.map(item => <option key={item} value={item}>{money(item, 'BRL')}</option>)}
              </select>
            </label>
          )}
          <button type="button" className="ci-refresh" onClick={load} disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </section>

      <section className="ci-kpi-grid">
        <article className="ci-kpi-card ci-kpi-primary">
          <span>Líquido após taxas</span>
          <strong>{money(data.totals.netAfterFees, currency)}</strong>
          <small>Bruto menos taxas informadas pela Hotmart</small>
        </article>
        <article className="ci-kpi-card">
          <span>Receita bruta</span>
          <strong>{money(data.totals.gross, currency)}</strong>
          <small>{money(data.totals.fees, currency)} em taxas</small>
        </article>
        <article className="ci-kpi-card">
          <span>Vendas aprovadas</span>
          <strong>{data.totals.sales.toLocaleString('pt-BR')}</strong>
          <small>{data.totals.refunds} reembolso(s) · {data.totals.cancellations} cancelamento(s)</small>
        </article>
        <article className="ci-kpi-card">
          <span>Compradores</span>
          <strong>{data.totals.buyers.toLocaleString('pt-BR')}</strong>
          <small>Identidades anonimizadas e únicas</small>
        </article>
        <article className="ci-kpi-card">
          <span>Ticket médio</span>
          <strong>{money(data.totals.averageTicket, currency)}</strong>
          <small>Líquido após taxas por venda</small>
        </article>
      </section>

      {data.goal && (
        <section className="ci-goal-card">
          <div className="ci-goal-heading">
            <div>
              <span>Meta mensal</span>
              <strong>{money(data.goal.value, currency)}</strong>
            </div>
            <div className="ci-goal-pace">
              <span>Ritmo necessário</span>
              <strong>{money(data.goal.requiredDailyPace, currency)}/dia</strong>
              <small>{data.goal.daysRemaining} dia(s) restantes</small>
            </div>
          </div>
          <div className="ci-progress-track"><div style={{ width: `${progress}%` }} /></div>
          <div className="ci-goal-footer">
            <span>{(data.goal.progress * 100).toFixed(1)}% alcançado</span>
            <span>Faltam {money(data.goal.remaining, currency)}</span>
          </div>
        </section>
      )}

      <section className="ci-overview-grid">
        <article className="ci-panel ci-chart-panel">
          <header>
            <div><span>Evolução diária</span><small>Líquido após taxas e vendas aprovadas</small></div>
          </header>
          {data.daily.length ? (
            <div className="ci-chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.daily} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={value => value.slice(5).split('-').reverse().join('/')} tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="money" tickFormatter={value => compactMoney(Number(value), currency)} tick={{ fontSize: 10 }} width={72} />
                  <YAxis yAxisId="sales" orientation="right" allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
                  <Tooltip
                    labelFormatter={value => new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR')}
                    formatter={(value, name) => name === 'Líquido após taxas'
                      ? [money(Number(value), currency), name]
                      : [Number(value).toLocaleString('pt-BR'), name]}
                  />
                  <Bar yAxisId="sales" dataKey="sales" name="Vendas" fill="rgba(34, 163, 91, 0.28)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Line yAxisId="money" dataKey="netAfterFees" name="Líquido após taxas" stroke="var(--accent-gold-dark)" strokeWidth={3} dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="ci-empty">Nenhuma venda aprovada nessa moeda e período.</div>}
        </article>

        <article className="ci-panel ci-products-panel">
          <header><div><span>Produtos</span><small>Participação no líquido após taxas</small></div></header>
          <div className="ci-product-list">
            {data.products.map(product => (
              <div className="ci-product-row" key={product.key}>
                <div className="ci-product-head">
                  <div><strong>{product.name}</strong><small>{product.sales} venda(s) · {product.buyers} comprador(es)</small></div>
                  <div><strong>{money(product.netAfterFees, currency)}</strong><small>{(product.netShare * 100).toFixed(1)}%</small></div>
                </div>
                <div className="ci-product-track"><div style={{ width: `${Math.min(100, product.netShare * 100)}%` }} /></div>
              </div>
            ))}
            {!data.products.length && <div className="ci-empty">Nenhum produto com venda aprovada.</div>}
          </div>
        </article>
      </section>

      <section className="ci-bottom-grid">
        <article className="ci-panel">
          <header><div><span>Leituras do período</span><small>Fatos derivados diretamente dos dados observados</small></div></header>
          <div className="ci-insight-list">
            {data.insights.map(insight => (
              <div className={`ci-insight ci-insight-${insight.tone}`} key={insight.code}>
                <strong>{insight.title}</strong><span>{insight.body}</span>
              </div>
            ))}
            {!data.insights.length && <div className="ci-empty">Ainda não há fatos suficientes para gerar leituras.</div>}
          </div>
        </article>
        <article className="ci-panel">
          <header><div><span>Estados da Hotmart</span><small>Retrato atual das transações no período</small></div></header>
          <div className="ci-status-list">
            {data.statusBreakdown.map(item => (
              <div key={item.status}><span>{STATUS_LABELS[item.status] || item.status}</span><strong>{item.count}</strong></div>
            ))}
          </div>
        </article>
      </section>

      {(data.warnings.length > 0 || error) && (
        <section className="ci-warning-box">
          <strong>Avisos dos dados</strong>
          {error && <span>{error}</span>}
          {data.warnings.map(warning => <span key={warning}>{warningLabel(warning)}</span>)}
        </section>
      )}
    </div>
  );
}
