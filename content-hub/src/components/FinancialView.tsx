import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useFinancialStore } from '../store/useFinancialStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Line, CartesianGrid, ReferenceLine } from 'recharts';
import { ContentRevenueView } from './ContentRevenueView';

const container: CSSProperties = {
  padding: '24px', paddingBottom: '60px', flex: 1, overflowY: 'auto', minHeight: 0,
  display: 'flex', flexDirection: 'column', gap: '20px',
};
const grid3: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', flexShrink: 0 };
const grid2: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flexShrink: 0 };
const kpiCard: CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)', padding: '20px 24px',
  display: 'flex', flexDirection: 'column', gap: '4px',
  boxShadow: 'var(--shadow-sm)', flexShrink: 0,
};
const kpiLabel: CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font)',
};
const kpiValue: CSSProperties = {
  fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)',
  lineHeight: 1.1, fontFamily: 'var(--font)', letterSpacing: '-0.02em',
};
const kpiSub: CSSProperties = { fontSize: '12px', color: 'var(--text-secondary)' };
const sectionCard: CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)',
  display: 'flex', flexDirection: 'column', overflow: 'hidden',
  flexShrink: 0,
};
const sectionHeader: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 20px', borderBottom: '1px solid var(--border)',
};
const sectionTitle: CSSProperties = {
  fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)',
};
const listBody: CSSProperties = { padding: '0', maxHeight: '400px', overflowY: 'auto' };
const itemRow: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '12px',
  padding: '10px 20px', borderBottom: '1px solid var(--border)',
};

const COLORS = ['#F0BA3C', '#C99A2E', '#22A35B', '#1DA1F2', '#7C3AED'];
const GOAL = 50000;

function fmt(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtK(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toFixed(0);
}

type SubView = 'revenue' | 'content-revenue';

export function FinancialView() {
  const [subView, setSubView] = useState<SubView>('revenue');
  const [period, setPeriod] = useState<'month' | 'last' | '3m' | 'all'>('month');
  const { summary, sales, hotmartLoading, hotmartError, fetchSummary, fetchSales, monthlyData, fetchMonthly } = useFinancialStore();

  useEffect(() => {
    // Fetch based on period
    const now = new Date();
    let start: string | undefined;
    let end: string | undefined;
    if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    } else if (period === 'last') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
    } else if (period === '3m') {
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString();
    }
    // 'all' = no start/end
    fetchSummary(start, end);
    fetchSales(start, end);
    fetchMonthly(6);
  }, [fetchSummary, fetchSales, fetchMonthly, period]);

  const dailyData = useMemo(() => {
    if (!sales.length) return [];
    const map = new Map<string, number>();
    for (const s of sales) {
      const day = s.purchaseDate.slice(0, 10);
      map.set(day, (map.get(day) || 0) + (s.netPrice || s.price));
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, total]) => ({
        day: new Date(day).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        total,
      }));
  }, [sales]);

  const goalPercent = summary ? Math.min((summary.netRevenue / GOAL) * 100, 100) : 0;
  const avgTicket = summary && summary.totalSales > 0 ? summary.netRevenue / summary.totalSales : 0;

  // Projeção de receita mensal
  const projection = useMemo(() => {
    if (!summary || !dailyData.length) return null;
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dailyAvg = summary.netRevenue / dayOfMonth;
    const projected = dailyAvg * daysInMonth;
    return { dailyAvg, projected, daysLeft: daysInMonth - dayOfMonth, daysInMonth };
  }, [summary, dailyData]);

  // Receita por dia da semana
  const weekdayData = useMemo(() => {
    if (!sales.length) return [];
    const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const map = new Map<number, { total: number; count: number }>();
    for (let i = 0; i < 7; i++) map.set(i, { total: 0, count: 0 });
    for (const s of sales) {
      const dow = new Date(s.purchaseDate).getDay();
      const entry = map.get(dow)!;
      entry.total += (s.netPrice || s.price);
      entry.count++;
    }
    return DIAS.map((name, i) => {
      const entry = map.get(i)!;
      return { day: name, total: entry.total, count: entry.count, avg: entry.count > 0 ? entry.total / entry.count : 0 };
    });
  }, [sales]);

  // Ticket médio por produto
  const ticketByProduct = useMemo(() => {
    if (!summary) return [];
    return summary.products.map(p => ({
      name: p.name.replace(/·.*/, '').replace(/\+.*/, '').trim().slice(0, 20),
      fullName: p.name,
      ticket: p.sales > 0 ? p.revenue / p.sales : 0,
      sales: p.sales,
      revenue: p.revenue,
    })).filter(p => p.sales > 0);
  }, [summary]);

  if (subView === 'content-revenue') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ display: 'flex', gap: '2px', padding: '8px 24px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <button onClick={() => setSubView('revenue')} style={{ background: 'transparent', border: 'none', padding: '6px 16px', fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font)', borderBottom: '2px solid transparent' }}>Receita</button>
          <button onClick={() => setSubView('content-revenue')} style={{ background: 'transparent', border: 'none', padding: '6px 16px', fontSize: '13px', fontWeight: 700, color: 'var(--accent-gold-dark)', cursor: 'pointer', fontFamily: 'var(--font)', borderBottom: '2px solid var(--accent-gold)' }}>Conteúdo x Receita</button>
        </div>
        <ContentRevenueView />
      </div>
    );
  }

  if (hotmartError) {
    return (
      <div style={container}>
        <div style={{ ...sectionCard, padding: '40px', textAlign: 'center' }}>
          <p style={{ fontSize: '15px', color: 'var(--accent-red)', fontWeight: 600 }}>Erro ao carregar dados do Hotmart</p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>{hotmartError}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={container}>
      {/* Sub-nav */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '-8px' }}>
        <button onClick={() => setSubView('revenue')} style={{ background: 'transparent', border: 'none', padding: '6px 16px', fontSize: '13px', fontWeight: 700, color: 'var(--accent-gold-dark)', cursor: 'pointer', fontFamily: 'var(--font)', borderBottom: '2px solid var(--accent-gold)' }}>Receita</button>
        <button onClick={() => setSubView('content-revenue')} style={{ background: 'transparent', border: 'none', padding: '6px 16px', fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font)', borderBottom: '2px solid transparent' }}>Conteúdo x Receita</button>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font)', letterSpacing: '-0.02em' }}>
            Financeiro
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {summary ? `${new Date(summary.periodStart).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} — ${new Date(summary.periodEnd).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}` : 'Carregando...'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {hotmartLoading && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Atualizando...</span>}
          <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-primary)', borderRadius: 'var(--radius)', padding: '3px' }}>
            {([['month', 'Este mês'], ['last', 'Mês passado'], ['3m', '3 meses'], ['all', 'Tudo']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setPeriod(key)} style={{
                background: period === key ? 'var(--bg-card)' : 'transparent',
                border: 'none', borderRadius: '6px', padding: '4px 10px',
                fontSize: '11px', fontWeight: period === key ? 700 : 500,
                color: period === key ? 'var(--accent-gold-dark)' : 'var(--text-muted)',
                cursor: 'pointer', fontFamily: 'var(--font)',
                boxShadow: period === key ? 'var(--shadow-sm)' : 'none',
              }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={grid3}>
        <div style={kpiCard}>
          <span style={kpiLabel}>Receita Bruta</span>
          <span style={{ ...kpiValue, color: 'var(--accent-gold-dark)' }}>
            R$ {summary ? fmt(summary.totalRevenue) : '...'}
          </span>
          <span style={kpiSub}>{summary?.totalSales || 0} vendas no mês</span>
        </div>
        <div style={kpiCard}>
          <span style={kpiLabel}>Receita Líquida</span>
          <span style={kpiValue}>R$ {summary ? fmt(summary.netRevenue) : '...'}</span>
          <span style={kpiSub}>após reembolsos</span>
        </div>
        <div style={kpiCard}>
          <span style={kpiLabel}>Ticket Médio</span>
          <span style={kpiValue}>R$ {fmt(avgTicket)}</span>
          <span style={kpiSub}>por venda</span>
        </div>
      </div>

      {/* Progress to R$50k goal */}
      <div style={sectionCard}>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)' }}>
              Meta: R$ 50.000/mês
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: goalPercent >= 100 ? 'var(--accent-green)' : 'var(--accent-gold-dark)', fontFamily: 'var(--font)' }}>
              {goalPercent.toFixed(1)}%
            </span>
          </div>
          <div style={{ width: '100%', height: '12px', background: 'var(--bg-primary)', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{
              width: `${goalPercent}%`, height: '100%',
              background: goalPercent >= 100 ? 'var(--accent-green)' : 'linear-gradient(90deg, var(--accent-gold), var(--accent-gold-dark))',
              borderRadius: '6px', transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>R$ {summary ? fmtK(summary.netRevenue) : '0'}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>R$ 50K</span>
          </div>
        </div>
      </div>

      {/* Projeção de receita */}
      {projection && period === 'month' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={kpiCard}>
            <span style={kpiLabel}>Projeção para o mês</span>
            <span style={{ ...kpiValue, color: projection.projected >= GOAL ? 'var(--accent-green)' : 'var(--accent-gold-dark)' }}>
              R$ {(projection.projected).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span style={kpiSub}>Média R$ {projection.dailyAvg.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/dia · Faltam {projection.daysLeft} dias</span>
          </div>
          <div style={kpiCard}>
            <span style={kpiLabel}>Para bater R$50K falta</span>
            <span style={kpiValue}>
              R$ {Math.max(0, GOAL - (summary?.netRevenue || 0)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </span>
            <span style={kpiSub}>~R$ {Math.max(0, Math.ceil((GOAL - (summary?.netRevenue || 0)) / Math.max(1, projection.daysLeft))).toLocaleString('pt-BR')}/dia necessário</span>
          </div>
        </div>
      )}

      {/* Receita por dia da semana + Ticket por produto */}
      {weekdayData.length > 0 && (
        <div style={grid2}>
          {/* Dia da semana */}
          <div style={sectionCard}>
            <div style={sectionHeader}>
              <span style={sectionTitle}>Receita por Dia da Semana</span>
            </div>
            <div style={{ padding: '16px 12px', height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekdayData}>
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${v >= 1000 ? (v/1000).toFixed(1)+'K' : v.toFixed(0)}`} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      name === 'total' ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : `${value} vendas`,
                      name === 'total' ? 'Receita total' : 'Vendas'
                    ]}
                    contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                  />
                  <Bar dataKey="total" fill="var(--accent-gold)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ticket médio por produto */}
          <div style={sectionCard}>
            <div style={sectionHeader}>
              <span style={sectionTitle}>Ticket Médio por Produto</span>
            </div>
            <div style={{ padding: '16px 12px', height: '220px' }}>
              {ticketByProduct.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ticketByProduct} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${v.toFixed(0)}`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                    <Tooltip
                      content={({ active, payload }: any) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', boxShadow: 'var(--shadow-md)' }}>
                            <div style={{ fontWeight: 700, marginBottom: '4px' }}>{d.fullName.replace(/·.*/, '').trim()}</div>
                            <div>Ticket: R$ {d.ticket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            <div style={{ color: 'var(--text-muted)' }}>{d.sales} vendas · R$ {d.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} total</div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="ticket" fill="var(--accent-green)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '13px' }}>Sem dados</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Monthly comparison */}
      {monthlyData.length > 1 && (
        <div style={sectionCard}>
          <div style={sectionHeader}>
            <span style={sectionTitle}>Comparação Mensal</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Receita líquida (comissão) por mês</span>
          </div>
          <div style={{ padding: '16px 12px', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...monthlyData].reverse()} margin={{ left: 10, right: 10, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${v >= 1000 ? (v/1000).toFixed(1)+'K' : v}`} domain={[0, 'auto']} />
                <Tooltip
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Receita Líquida']}
                  contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                />
                <Bar dataKey="netRevenue" fill="var(--accent-gold)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Charts row */}
      <div style={grid2}>
        {/* Daily revenue bar chart */}
        <div style={sectionCard}>
          <div style={sectionHeader}>
            <span style={sectionTitle}>Receita Diária</span>
          </div>
          <div style={{ padding: '16px 12px', height: '280px' }}>
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${fmtK(v)}`} domain={[0, 'auto']} />
                  <Tooltip
                    formatter={(value: number) => [`R$ ${fmt(value)}`, 'Receita']}
                    contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                  />
                  <Bar dataKey="total" fill="var(--accent-gold)" radius={[4, 4, 0, 0]} />
                  {projection && (
                    <ReferenceLine y={projection.dailyAvg} stroke="var(--accent-green)" strokeDasharray="6 4" strokeWidth={2} label={{ value: `Média R$${Math.round(projection.dailyAvg)}/dia`, position: 'right', fontSize: 10, fill: 'var(--accent-green)' }} />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '13px' }}>
                Carregando dados...
              </div>
            )}
          </div>
        </div>

        {/* Product breakdown pie chart */}
        <div style={sectionCard}>
          <div style={sectionHeader}>
            <span style={sectionTitle}>Receita por Produto</span>
          </div>
          <div style={{ padding: '16px', height: '280px', display: 'flex', alignItems: 'center' }}>
            {summary && summary.products.length > 0 ? (
              <div style={{ display: 'flex', width: '100%', gap: '16px', alignItems: 'center' }}>
                <ResponsiveContainer width="50%" height={220}>
                  <PieChart>
                    <Pie data={summary.products} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50}>
                      {summary.products.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`R$ ${fmt(value)}`, '']} contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {summary.products.map((p, i) => (
                    <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name.replace(/·.*/, '').trim()}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {p.sales} vendas · R$ {fmt(p.revenue)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', color: 'var(--text-muted)', fontSize: '13px' }}>
                Carregando dados...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent sales list */}
      <div style={sectionCard}>
        <div style={sectionHeader}>
          <span style={sectionTitle}>Vendas Recentes</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{sales.length} vendas no período</span>
        </div>
        <div style={listBody}>
          {[...sales].sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()).slice(0, 25).map((s) => (
            <div key={s.transactionId} style={itemRow}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'var(--accent-gold-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', flexShrink: 0,
              }}>
                {s.currency !== 'BRL' ? '🌎' : '💰'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.buyerName}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {s.productName.replace(/·.*/, '').trim()} · {s.paymentMethod}{s.currency !== 'BRL' ? ` · ${s.currency}` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-green)', fontFamily: 'var(--font)' }}>
                  R$ {fmt(s.netPrice)}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {new Date(s.purchaseDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
