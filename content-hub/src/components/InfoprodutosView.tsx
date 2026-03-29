import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useInfoprodutosStore } from '../store/useInfoprodutosStore';

/* ── Helpers ─────────────────────────────────────────────── */

function formatBRL(value?: number): string {
  if (value == null) return 'R$ —';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPct(value?: number): string {
  if (value == null) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

function healthLabel(score: number): { text: string; color: string; bg: string } {
  if (score >= 7) return { text: 'Saudável', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' };
  if (score >= 5) return { text: 'Atenção', color: '#eab308', bg: 'rgba(234,179,8,0.1)' };
  return { text: 'Crítico', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
}

function funnelLabel(pos: string): string {
  return pos === 'order-bump' ? 'Order Bump' : 'Produto Principal';
}

function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    launch: 'Lançamento', growth: 'Crescimento', maturity: 'Maturidade', decline: 'Declínio',
  };
  return map[stage] || stage;
}

/* ── Styles ──────────────────────────────────────────────── */

const page: CSSProperties = {
  padding: '32px',
  flex: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '32px',
  maxWidth: '960px',
  margin: '0 auto',
  width: '100%',
};

/* ── Sub-components ──────────────────────────────────────── */

function HeroSection({ summary }: { summary: any }) {
  if (!summary) return null;
  const earned = summary.monthlyTarget - summary.gapToTarget;
  const pct = Math.min(Math.max((earned / summary.monthlyTarget) * 100, 0), 100);

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: '32px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    }}>
      {/* Title row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{
            fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)',
            fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            Receita líquida total
          </div>
          <div style={{
            fontSize: '36px', fontWeight: 800, color: 'var(--text-primary)',
            fontFamily: 'var(--font)', letterSpacing: '-0.03em', marginTop: '4px',
          }}>
            {formatBRL(summary.totalRevenueNet)}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', marginTop: '2px' }}>
            {summary.totalSales} vendas · {formatPct(summary.avgRefundRate)} reembolso · 100% orgânico
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)',
            fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            Meta mensal
          </div>
          <div style={{
            fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)',
            fontFamily: 'var(--font)', marginTop: '4px',
          }}>
            {formatBRL(earned)} <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 400 }}>/ {formatBRL(summary.monthlyTarget)}</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div style={{
          width: '100%', height: '10px', borderRadius: '5px',
          background: 'var(--bg-secondary)', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: '5px', width: `${pct}%`,
            background: pct >= 100
              ? '#22c55e'
              : 'linear-gradient(90deg, var(--accent-gold), var(--accent-gold-dark))',
            transition: 'width 0.8s ease',
          }} />
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginTop: '6px',
          fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font)',
        }}>
          <span>{pct.toFixed(0)}% da meta</span>
          <span>Faltam {formatBRL(summary.gapToTarget)}</span>
        </div>
      </div>
    </div>
  );
}

function AlertsSection({ products }: { products: any[] }) {
  const alerts: Array<{ product: string; message: string; severity: 'critical' | 'warning' }> = [];

  for (const p of products) {
    if (p.metrics.refundRate > 0.15) {
      alerts.push({
        product: p.name,
        message: `Taxa de reembolso em ${formatPct(p.metrics.refundRate)} — muito acima do aceitável (<5%). Investigar motivos.`,
        severity: 'critical',
      });
    } else if (p.metrics.refundRate > 0.08) {
      alerts.push({
        product: p.name,
        message: `Taxa de reembolso em ${formatPct(p.metrics.refundRate)} — acima do ideal (<5%). Monitorar.`,
        severity: 'warning',
      });
    }
    if (p.funnelPosition === 'order-bump' && p.metrics.attachRate != null && p.metrics.attachRate < 0.20) {
      alerts.push({
        product: p.name,
        message: `Attach rate de ${formatPct(p.metrics.attachRate)} — abaixo do benchmark (20-40%). Revisar copy do checkout.`,
        severity: 'warning',
      });
    }
  }

  if (alerts.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{
        fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)',
        fontFamily: 'var(--font)',
      }}>
        Alertas
      </div>
      {alerts.map((a, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: '12px',
          padding: '14px 16px',
          background: a.severity === 'critical' ? 'rgba(239,68,68,0.06)' : 'rgba(234,179,8,0.06)',
          border: `1px solid ${a.severity === 'critical' ? 'rgba(239,68,68,0.2)' : 'rgba(234,179,8,0.2)'}`,
          borderRadius: '10px',
        }}>
          <span style={{ fontSize: '16px', flexShrink: 0 }}>
            {a.severity === 'critical' ? '🔴' : '🟡'}
          </span>
          <div>
            <div style={{
              fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)',
              fontFamily: 'var(--font)',
            }}>
              {a.product}
            </div>
            <div style={{
              fontSize: '13px', color: 'var(--text-secondary)',
              fontFamily: 'var(--font-body)', lineHeight: '1.5', marginTop: '2px',
            }}>
              {a.message}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductCard({ product, onClick }: { product: any; onClick: () => void }) {
  const health = healthLabel(product.healthScore);
  const trend = product.monthlyTrend || [];
  const lastTwo = trend.slice(-2);
  const trendDir = lastTwo.length === 2
    ? (lastTwo[1].revenueNet > lastTwo[0].revenueNet ? '↑' : lastTwo[1].revenueNet < lastTwo[0].revenueNet ? '↓' : '→')
    : '';
  const trendColor = trendDir === '↑' ? '#22c55e' : trendDir === '↓' ? '#ef4444' : 'var(--text-muted)';

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        padding: '24px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent-gold)';
        e.currentTarget.style.boxShadow = '0 0 0 1px var(--accent-gold), var(--shadow-sm)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Row 1: Name + Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)',
            fontFamily: 'var(--font)',
          }}>
            {product.name}
          </div>
          <span style={{
            fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px',
            background: health.bg, color: health.color, fontFamily: 'var(--font)',
          }}>
            {health.text}
          </span>
        </div>
        <span style={{
          fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font)',
        }}>
          {funnelLabel(product.funnelPosition)}
        </span>
      </div>

      {/* Row 2: Subtitle */}
      <div style={{
        fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)',
        lineHeight: '1.4',
      }}>
        {product.format} · {stageLabel(product.lifecycleStage)} · {formatBRL(product.price)}
        {product.priceOriginal && product.priceOriginal !== product.price && (
          <span style={{ textDecoration: 'line-through', marginLeft: '6px', opacity: 0.5 }}>
            {formatBRL(product.priceOriginal)}
          </span>
        )}
      </div>

      {/* Row 3: Key numbers */}
      <div style={{
        display: 'flex', gap: '24px', flexWrap: 'wrap',
      }}>
        <Stat label="Receita" value={formatBRL(product.metrics.revenueNet)} trend={trendDir} trendColor={trendColor} />
        <Stat label="Vendas" value={String(product.metrics.sales)} />
        <Stat label="Reembolso" value={formatPct(product.metrics.refundRate)}
          valueColor={product.metrics.refundRate > 0.10 ? '#ef4444' : product.metrics.refundRate > 0.05 ? '#eab308' : 'var(--text-primary)'} />
        {product.metrics.attachRate != null && (
          <Stat label="Attach" value={formatPct(product.metrics.attachRate)} />
        )}
      </div>

      {/* Row 4: Sparkline */}
      {trend.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '40px' }}>
          {trend.map((t: any, i: number) => {
            const max = Math.max(...trend.map((d: any) => d.revenueNet), 1);
            const h = Math.max((t.revenueNet / max) * 36, 3);
            const isLast = i === trend.length - 1;
            return (
              <div key={t.month} title={`${t.month}: ${formatBRL(t.revenueNet)}`} style={{
                flex: 1, maxWidth: '48px', height: `${h}px`, borderRadius: '4px',
                background: isLast ? 'var(--accent-gold)' : 'rgba(240,186,60,0.25)',
                transition: 'all 0.3s ease',
              }} />
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, trend, trendColor, valueColor }: {
  label: string; value: string; trend?: string; trendColor?: string; valueColor?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '80px' }}>
      <span style={{
        fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font)',
        fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font)',
        color: valueColor || 'var(--text-primary)',
      }}>
        {value}
        {trend && (
          <span style={{ fontSize: '14px', marginLeft: '4px', color: trendColor }}>
            {trend}
          </span>
        )}
      </span>
    </div>
  );
}

function Collapsible({ title, defaultOpen = false, children, count, icon }: {
  title: string; defaultOpen?: boolean; children: React.ReactNode; count?: number; icon?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '14px', overflow: 'hidden',
      marginBottom: '12px',
    }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 20px', background: open ? 'rgba(240,186,60,0.04)' : 'transparent',
        border: 'none', cursor: 'pointer',
        fontFamily: 'var(--font)', fontSize: '14px', fontWeight: 700,
        color: 'var(--text-primary)', textAlign: 'left',
        transition: 'background 0.2s ease',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon && <span style={{ fontSize: '16px' }}>{icon}</span>}
          {title}
          {count != null && (
            <span style={{
              fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px',
              background: 'rgba(240,186,60,0.15)', color: 'var(--accent-gold)',
            }}>{count}</span>
          )}
        </span>
        <span style={{
          color: 'var(--text-muted)', fontSize: '12px',
          transition: 'transform 0.2s ease',
          transform: open ? 'rotate(180deg)' : 'rotate(0)',
        }}>&#9662;</span>
      </button>
      {open && <div style={{ padding: '0 20px 20px' }}>{children}</div>}
    </div>
  );
}

function ItemList({ items, label }: { items: string[]; label?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-gold)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>{label}</span>}
      {items.map((item, i) => (
        <div key={i} style={{
          display: 'flex', gap: '10px', padding: '8px 12px',
          background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
          borderRadius: '8px', fontSize: '13px', color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)', lineHeight: '1.5',
        }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'var(--font)', minWidth: '20px' }}>{i + 1}</span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function DomainItem({ domain, blockColor }: { domain: any; blockColor?: string }) {
  const [expanded, setExpanded] = useState(false);
  const hasItems = domain.itemTexts?.length > 0;
  return (
    <div style={{
      background: 'var(--bg-secondary)', borderRadius: '10px',
      borderLeft: `3px solid ${blockColor || 'var(--accent-gold)'}`,
      overflow: 'hidden',
    }}>
      <div
        onClick={() => hasItems && setExpanded(!expanded)}
        style={{
          padding: '12px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          cursor: hasItems ? 'pointer' : 'default',
          transition: 'background 0.15s ease',
        }}
      >
        <div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)' }}>
            {domain.id} — {domain.name}
          </span>
          {domain.description && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', marginLeft: '8px' }}>
              {domain.description}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font)', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {domain.items} itens
          </span>
          {hasItems && (
            <span style={{
              fontSize: '11px', color: 'var(--text-muted)',
              transition: 'transform 0.2s ease',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
            }}>&#9662;</span>
          )}
        </div>
      </div>
      {expanded && hasItems && (
        <div style={{ padding: '0 16px 14px' }}>
          <ItemList items={domain.itemTexts} />
        </div>
      )}
    </div>
  );
}

function ProductDetailPage({ product, onBack }: { product: any; onBack: () => void }) {
  const health = healthLabel(product.healthScore);
  const trend = product.monthlyTrend || [];
  const { productContent, loadingContent, fetchContent } = useInfoprodutosStore();

  useEffect(() => {
    fetchContent(product.id);
  }, [product.id, fetchContent]);

  const c = productContent;

  const sectionCard: CSSProperties = {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: '16px', padding: '24px',
    display: 'flex', flexDirection: 'column', gap: '16px',
  };

  const sectionTitle: CSSProperties = {
    fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)',
    fontFamily: 'var(--font)',
  };

  const pill: CSSProperties = {
    fontSize: '12px', fontWeight: 600, padding: '4px 12px', borderRadius: '20px',
    background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
    fontFamily: 'var(--font)', display: 'inline-block',
  };

  const goldPill: CSSProperties = {
    ...pill,
    background: 'rgba(240,186,60,0.12)', color: 'var(--accent-gold-dark)',
  };

  return (
    <div style={page}>
      {/* Back button */}
      <button onClick={onBack} style={{
        background: 'none', border: 'none', color: 'var(--text-muted)',
        fontFamily: 'var(--font)', fontSize: '13px', fontWeight: 600,
        cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        ← Voltar para Infoprodutos
      </button>

      {/* Hero */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '32px',
        display: 'flex', flexDirection: 'column', gap: '16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)',
                fontFamily: 'var(--font)', letterSpacing: '-0.02em',
              }}>
                {product.fullName}
              </span>
              <span style={{
                fontSize: '12px', fontWeight: 600, padding: '4px 12px', borderRadius: '20px',
                background: health.bg, color: health.color, fontFamily: 'var(--font)',
              }}>
                {health.text} · {product.healthScore.toFixed(1)}/10
              </span>
            </div>
            <div style={{
              fontSize: '14px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)',
              marginTop: '6px',
            }}>
              {funnelLabel(product.funnelPosition)} · {product.format} · {stageLabel(product.lifecycleStage)}
              {product.launchDate && ` · Lançado em ${new Date(product.launchDate).toLocaleDateString('pt-BR')}`}
            </div>
          </div>
          <div style={{
            fontSize: '28px', fontWeight: 800, color: 'var(--accent-gold-dark)',
            fontFamily: 'var(--font)',
          }}>
            {formatBRL(product.price)}
          </div>
        </div>

        {product.description && (
          <p style={{
            fontSize: '14px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)',
            lineHeight: '1.6', margin: 0, borderTop: '1px solid var(--border)', paddingTop: '16px',
          }}>
            {product.description}
          </p>
        )}
      </div>

      {/* Metrics grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px',
      }}>
        {[
          { label: 'Vendas', value: String(product.metrics.sales) },
          { label: 'Receita Bruta', value: formatBRL(product.metrics.revenueGross) },
          { label: 'Receita Líquida', value: formatBRL(product.metrics.revenueNet) },
          { label: 'Reembolsos', value: String(product.metrics.refunds) },
          { label: 'Taxa de Reembolso', value: formatPct(product.metrics.refundRate), color: product.metrics.refundRate > 0.10 ? '#ef4444' : undefined },
          ...(product.metrics.attachRate != null ? [{ label: 'Attach Rate', value: formatPct(product.metrics.attachRate) }] : []),
          ...(product.metrics.avgTicket != null ? [{ label: 'Ticket Médio', value: formatBRL(product.metrics.avgTicket) }] : []),
        ].map((m, i) => (
          <div key={i} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '16px',
            display: 'flex', flexDirection: 'column', gap: '4px',
          }}>
            <span style={{
              fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
              fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>{m.label}</span>
            <span style={{
              fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font)',
              color: (m as any).color || 'var(--text-primary)',
            }}>{m.value}</span>
          </div>
        ))}
      </div>

      {/* Monthly trend */}
      {trend.length > 0 && (
        <div style={sectionCard}>
          <span style={sectionTitle}>Evolução Mensal</span>

          {/* Visual bars */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '120px' }}>
            {trend.map((t: any, i: number) => {
              const max = Math.max(...trend.map((d: any) => d.revenueNet), 1);
              const h = Math.max((t.revenueNet / max) * 100, 4);
              const isLast = i === trend.length - 1;
              return (
                <div key={t.month} style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>
                    {formatBRL(t.revenueNet)}
                  </span>
                  <div style={{
                    width: '100%', maxWidth: '80px', height: `${h}px`, borderRadius: '6px',
                    background: isLast ? 'var(--accent-gold)' : 'rgba(240,186,60,0.3)',
                    transition: 'all 0.3s ease',
                  }} />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>
                    {t.month}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'var(--font-body)' }}>
            <thead>
              <tr>
                {['Mês', 'Vendas', 'Receita Líquida'].map(h => (
                  <th key={h} style={{
                    textAlign: h === 'Mês' ? 'left' : 'right', padding: '10px 12px',
                    borderBottom: '1px solid var(--border)', color: 'var(--text-muted)',
                    fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trend.map((t: any) => (
                <tr key={t.month}>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>{t.month}</td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)', textAlign: 'right', fontWeight: 600 }}>{t.sales}</td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)', textAlign: 'right', fontWeight: 600 }}>{formatBRL(t.revenueNet)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recommendations */}
      {product.recommendations?.length > 0 && (
        <div style={sectionCard}>
          <span style={sectionTitle}>Próximos Passos</span>
          {product.recommendations.map((rec: string, i: number) => (
            <div key={i} style={{
              padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: '10px',
              fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)',
              lineHeight: '1.5', borderLeft: '3px solid var(--accent-gold)',
            }}>
              {rec}
            </div>
          ))}
        </div>
      )}

      {/* ── Rich Content Sections ────────────────────────────── */}

      {loadingContent && (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontFamily: 'var(--font)', fontSize: '13px' }}>
          Carregando conteúdo...
        </div>
      )}

      {c && (
        <div style={sectionCard}>

          {/* ── Assessment ── */}
          {c.assessment && (
            <Collapsible title="Assessment" defaultOpen count={c.assessment.totalItems} icon="📝">
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', marginBottom: '12px' }}>
                {c.assessment.totalItems} itens · {c.assessment.duration} · {c.assessment.modules.length} módulos
              </div>

              {/* Modules */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                {c.assessment.modules.map((mod: any) => (
                  <div key={mod.name} style={{
                    background: 'var(--bg-secondary)', borderRadius: '10px', padding: '12px 16px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)' }}>
                        {mod.name}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font)', fontWeight: 600 }}>
                        {mod.items} itens
                      </span>
                    </div>
                    {mod.description && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', marginTop: '4px' }}>
                        {mod.description}
                      </div>
                    )}
                    {mod.subModules?.map((sub: any) => (
                      <div key={sub.name} style={{ marginTop: '10px', paddingLeft: '12px', borderLeft: '2px solid var(--border)' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font)', marginBottom: '6px' }}>
                          {sub.name} ({sub.items})
                        </div>
                        {sub.sampleItems?.length > 0 && (
                          <ItemList items={sub.sampleItems} />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Sample Questions */}
              {c.assessment.sampleQuestions?.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Exemplos de Perguntas
                  </span>
                  {c.assessment.sampleQuestions.map((sq: any, i: number) => (
                    <div key={i} style={{ borderLeft: '3px solid var(--accent-gold)', paddingLeft: '14px', paddingTop: '4px', paddingBottom: '4px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-gold-dark)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                        {sq.context}
                      </div>
                      <div style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', lineHeight: '1.5' }}>
                        "{sq.question}"
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Collapsible>
          )}

          {/* ── 7 Padrões Funcionais (MAPA) ── */}
          {c.assessment?.patterns && c.assessment.patterns.length > 0 && (
            <Collapsible title="7 Padrões Funcionais" count={7} icon="🧩">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {c.assessment.patterns.map((p: any) => (
                  <div key={p.id} style={{
                    background: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px',
                    display: 'flex', flexDirection: 'column', gap: '10px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {p.emoji && <span style={{ fontSize: '18px' }}>{p.emoji}</span>}
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)' }}>
                        P{p.id}. {p.name}
                      </span>
                      <span style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                        "{p.subtitle}"
                      </span>
                    </div>
                    {p.brainRegion && (
                      <span style={{ ...goldPill, fontSize: '11px', alignSelf: 'flex-start' }}>{p.brainRegion}</span>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {p.complaints.map((comp: string) => (
                        <span key={comp} style={pill}>{comp}</span>
                      ))}
                    </div>
                    {p.sampleItems?.length > 0 && (
                      <ItemList items={p.sampleItems} label="Itens do questionário" />
                    )}
                  </div>
                ))}
              </div>
            </Collapsible>
          )}

          {/* ── Domain Blocks (2AS) ── */}
          {c.assessment?.domainBlocks && c.assessment.domainBlocks.length > 0 && (
            <Collapsible title="Domínios por Bloco" count={c.assessment.domainBlocks.reduce((acc: number, b: any) => acc + b.domains.length, 0)} icon="🧩">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {c.assessment.domainBlocks.map((block: any) => (
                  <div key={block.blockName} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <span style={{
                      fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font)',
                      color: block.color || 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      {block.blockName}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {block.domains.map((d: any) => (
                        <DomainItem key={d.id} domain={d} blockColor={block.color} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Collapsible>
          )}

          {/* ── Scoring ── */}
          {c.scoring && (
            <Collapsible title="Scoring" icon="📐">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Formula */}
                <div style={{
                  background: 'var(--bg-secondary)', borderRadius: '10px', padding: '14px 16px',
                  fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)',
                }}>
                  {c.scoring.formula}
                </div>

                {/* Modifiers */}
                {c.scoring.modifiers?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                      Modificadores
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {c.scoring.modifiers.map((mod: string, i: number) => (
                        <div key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', paddingLeft: '8px', borderLeft: '2px solid var(--border)' }}>
                          {mod}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ranges */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                    Faixas de Classificação
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {c.scoring.ranges.map((r: any) => (
                      <div key={r.label} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: 'var(--bg-secondary)', borderRadius: '8px', padding: '8px 14px',
                        borderLeft: `3px solid ${r.color}`,
                      }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: r.color, fontFamily: 'var(--font)' }}>{r.label}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>{r.range}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subtypes */}
                {c.scoring.subtypes?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                      Subtipos
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {c.scoring.subtypes.map((s: string) => (
                        <span key={s} style={goldPill}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Domain ranges */}
                {c.scoring.domainRanges?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                      Faixas por Domínio
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {c.scoring.domainRanges.map((r: any) => (
                        <span key={r.label} style={pill}>{r.label}: {r.range}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reference instruments */}
                {c.scoring.referenceInstruments?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                      Instrumentos de Referência
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {c.scoring.referenceInstruments.map((inst: string) => (
                        <span key={inst} style={goldPill}>{inst}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pre-summarization */}
                {c.scoring.preSummarization && (
                  <div style={{
                    background: 'rgba(240,186,60,0.08)', borderRadius: '10px', padding: '12px 16px',
                    fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', lineHeight: '1.5',
                  }}>
                    {c.scoring.preSummarization}
                  </div>
                )}
              </div>
            </Collapsible>
          )}

          {/* ── Reports (MAPA) ── */}
          {c.reports && (
            <Collapsible title="Relatórios" count={2} icon="📄">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {[
                  { key: 'personal', title: 'Relatório Pessoal', data: c.reports.personal },
                  { key: 'clinical', title: 'Relatório Clínico', data: c.reports.clinical },
                ].map((r) => (
                  <div key={r.key} style={{
                    background: 'var(--bg-secondary)', borderRadius: '12px', padding: '20px',
                    display: 'flex', flexDirection: 'column', gap: '10px',
                  }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)' }}>
                      {r.title}
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={goldPill}>{r.data.pages}</span>
                      <span style={pill}>{r.data.audience}</span>
                      <span style={pill}>{r.data.tone}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', lineHeight: '1.5', margin: 0 }}>
                      {r.data.description}
                    </p>
                  </div>
                ))}
              </div>
            </Collapsible>
          )}

          {/* ── Reports (2AS) ── */}
          {c.reportList && c.reportList.length > 0 && (
            <Collapsible title="Relatórios Independentes" count={c.reportList.length} icon="📄">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {c.reportList.map((r: any) => (
                  <div key={r.name} style={{
                    background: 'var(--bg-secondary)', borderRadius: '14px', padding: '20px',
                    display: 'flex', flexDirection: 'column', gap: '12px',
                    borderLeft: `4px solid ${r.color}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)' }}>
                        {r.name}
                      </span>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ ...goldPill, background: `${r.color}18`, color: r.color }}>{r.pages}</span>
                        {r.status && (
                          <span style={{
                            ...pill, fontSize: '11px',
                            background: r.status === 'Pendente' ? 'rgba(234,179,8,0.1)' : 'rgba(99,102,241,0.1)',
                            color: r.status === 'Pendente' ? '#eab308' : '#6366f1',
                          }}>
                            {r.status}
                          </span>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', lineHeight: '1.5', margin: 0 }}>
                      {r.description}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {r.sections.map((s: string) => (
                        <span key={s} style={pill}>{s}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Collapsible>
          )}

          {/* ── Landing Page ── */}
          {c.landingPage && c.landingPage.headline && (
            <Collapsible title="Landing Page" icon="🌐">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Headline */}
                <div style={{ borderLeft: '4px solid var(--accent-gold)', paddingLeft: '20px', paddingTop: '8px', paddingBottom: '8px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, fontStyle: 'italic', color: 'var(--text-primary)', fontFamily: 'var(--font)', lineHeight: '1.4' }}>
                    {c.landingPage.headline}
                  </div>
                  {c.landingPage.subtitle && (
                    <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', marginTop: '6px', lineHeight: '1.5' }}>
                      {c.landingPage.subtitle}
                    </div>
                  )}
                </div>

                {/* Badges */}
                {c.landingPage.badges?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {c.landingPage.badges.map((b: string) => (
                      <span key={b} style={goldPill}>{b}</span>
                    ))}
                  </div>
                )}

                {/* Anchor */}
                {c.landingPage.anchor && (
                  <div style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    {c.landingPage.anchor}
                  </div>
                )}

                {/* Sections list */}
                {c.landingPage.sections?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                      Seções da LP
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {c.landingPage.sections.map((s: string, i: number) => (
                        <div key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', paddingLeft: '8px', borderLeft: '2px solid var(--border)' }}>
                          {i + 1}. {s}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pain Points */}
                {c.landingPage.painPoints?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                      Dores do público
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {c.landingPage.painPoints.map((p: string) => (
                        <span key={p} style={{ ...pill, background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>{p}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cost Comparison */}
                {c.landingPage.costComparison?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                      Alternativa tradicional
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'var(--font-body)' }}>
                      <tbody>
                        {c.landingPage.costComparison.map((row: any) => (
                          <tr key={row.item}>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{row.item}</td>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: 600, textAlign: 'right' }}>{row.cost}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Order Bumps */}
                {c.landingPage.orderBumps?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                      Order Bumps
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {c.landingPage.orderBumps.map((bump: any) => (
                        <div key={bump.name} style={{
                          background: 'var(--bg-secondary)', borderRadius: '10px', padding: '12px 16px',
                          display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 200px',
                        }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)' }}>{bump.name}</span>
                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font)' }}>
                            <span style={{ textDecoration: 'line-through', opacity: 0.5, marginRight: '6px' }}>{bump.originalPrice}</span>
                            <span style={{ fontWeight: 700, color: 'var(--accent-gold-dark)' }}>{bump.price}</span>
                          </span>
                          {bump.rating && <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>{bump.rating}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Offer + Guarantee */}
                {(c.landingPage.offerPrice || c.landingPage.guarantee) && (
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', padding: '16px', background: 'rgba(240,186,60,0.08)', borderRadius: '12px' }}>
                    {c.landingPage.offerPrice && (
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Oferta</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent-gold-dark)', fontFamily: 'var(--font)', marginTop: '2px' }}>{c.landingPage.offerPrice}</div>
                      </div>
                    )}
                    {c.landingPage.guarantee && (
                      <div style={{ marginLeft: 'auto' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Garantia</div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font)', marginTop: '2px' }}>{c.landingPage.guarantee}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* FAQ */}
                {c.landingPage.faq?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>FAQ</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {c.landingPage.faq.map((q: string, i: number) => (
                        <div key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', paddingLeft: '8px', borderLeft: '2px solid var(--border)' }}>
                          {q}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* LP Link */}
                {c.landingPage.url && (
                  <a href={c.landingPage.url} target="_blank" rel="noopener noreferrer" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '10px 20px', borderRadius: '10px',
                    background: 'var(--accent-gold)', color: '#000',
                    fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font)',
                    textDecoration: 'none', alignSelf: 'flex-start', transition: 'opacity 0.2s',
                  }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                  >
                    Abrir Landing Page &#8594;
                  </a>
                )}
              </div>
            </Collapsible>
          )}

          {/* ── Content Structure (Guia/Rotina) ── */}
          {c.contentStructure && c.contentStructure.length > 0 && (
            <Collapsible title="Estrutura de Conteúdo" defaultOpen count={c.contentStructure.length} icon="📚">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {c.contentStructure.map((part: any, pi: number) => (
                  <div key={pi} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-gold-dark)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {part.part}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '12px' }}>
                      {part.topics.map((topic: any, ti: number) => (
                        <div key={ti} style={{
                          background: 'var(--bg-secondary)', borderRadius: '10px', padding: '10px 14px',
                        }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font)' }}>
                            {topic.name}
                          </span>
                          {topic.strategies?.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                              {topic.strategies.map((s: string) => (
                                <span key={s} style={{ ...pill, fontSize: '11px', padding: '2px 8px' }}>{s}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Collapsible>
          )}

          {/* ── Concepts (Rotina) ── */}
          {c.concepts && c.concepts.length > 0 && (
            <Collapsible title="Conceitos-chave" count={c.concepts.length} icon="💡">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {c.concepts.map((concept: string) => (
                  <span key={concept} style={goldPill}>{concept}</span>
                ))}
              </div>
            </Collapsible>
          )}

          {/* ── Bonus Kit ── */}
          {c.bonusKit && c.bonusKit.length > 0 && (
            <Collapsible title="Kit Bônus" count={c.bonusKit.length} icon="🎁">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {c.bonusKit.map((item: string) => (
                  <span key={item} style={pill}>{item}</span>
                ))}
              </div>
            </Collapsible>
          )}

          {/* ── Visual ── */}
          {c.visual && c.visual.length > 0 && (
            <Collapsible title="Identidade Visual" icon="🎨">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {c.visual.map((v: string) => (
                  <span key={v} style={goldPill}>{v}</span>
                ))}
              </div>
            </Collapsible>
          )}

          {/* ── Pipeline ── */}
          {c.pipeline && c.pipeline.length > 0 && (
            <Collapsible title="Pipeline Técnico" count={c.pipeline.length} icon="⚙️">
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                {c.pipeline.map((step: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{
                      background: 'var(--bg-secondary)', borderRadius: '10px', padding: '10px 16px',
                      display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'center',
                    }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {step.step}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)' }}>
                        {step.tool}
                      </span>
                    </div>
                    {i < c.pipeline!.length - 1 && (
                      <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 700 }}>&#8594;</span>
                    )}
                  </div>
                ))}
              </div>
            </Collapsible>
          )}

          {/* ── Ecosystem ── */}
          {c.ecosystem && c.ecosystem.length > 0 && (
            <Collapsible title="Ecossistema" count={c.ecosystem.length} icon="🔗">
              <div style={{ display: 'flex', gap: '12px', overflowX: 'auto' }}>
                {c.ecosystem.map((item: any, i: number) => {
                  const isCurrent = item.name.toLowerCase().includes(product.name?.toLowerCase?.() || '___');
                  return (
                    <div key={i} style={{
                      flex: '0 0 auto', minWidth: '160px',
                      background: isCurrent ? 'rgba(240,186,60,0.1)' : 'var(--bg-secondary)',
                      border: isCurrent ? '2px solid var(--accent-gold)' : '1px solid var(--border)',
                      borderRadius: '12px', padding: '16px',
                      display: 'flex', flexDirection: 'column', gap: '8px',
                      position: 'relative' as const,
                    }}>
                      {isCurrent && (
                        <span style={{
                          position: 'absolute' as const, top: '-8px', right: '12px',
                          fontSize: '10px', fontWeight: 700, padding: '2px 8px',
                          borderRadius: '10px', background: 'var(--accent-gold)', color: '#000',
                          fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>Atual</span>
                      )}
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)' }}>{item.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>{item.role}</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-gold-dark)', fontFamily: 'var(--font)' }}>{item.price}</div>
                      <span style={{ ...pill, fontSize: '10px', padding: '2px 8px', alignSelf: 'flex-start' }}>{item.funnelPosition}</span>
                    </div>
                  );
                })}
              </div>
            </Collapsible>
          )}
        </div>
      )}

      {/* ── Links (always visible, outside collapsibles) ── */}
      {c?.links && c.links.length > 0 && (
        <div style={sectionCard}>
          <span style={sectionTitle}>Links</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {c.links.map((link: any, i: number) => {
              const isExternal = link.url.startsWith('http');
              return (
                <a
                  key={i}
                  href={isExternal ? link.url : undefined}
                  target={isExternal ? '_blank' : undefined}
                  rel={isExternal ? 'noopener noreferrer' : undefined}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '8px 16px', borderRadius: '10px',
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                    color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600,
                    fontFamily: 'var(--font)', textDecoration: 'none',
                    cursor: isExternal ? 'pointer' : 'default',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-gold)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
                >
                  {link.label}
                  {isExternal && <span style={{ fontSize: '11px', opacity: 0.5 }}>&#8599;</span>}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main View ───────────────────────────────────────────── */

export function InfoprodutosView() {
  const { products, summary, selectedProduct, loading, error, fetch: fetchData, selectProduct } = useInfoprodutosStore();

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div style={{ ...page, alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>Carregando infoprodutos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...page, alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <p style={{ color: '#ef4444', fontFamily: 'var(--font)', margin: 0 }}>Erro ao carregar: {error}</p>
        <button onClick={() => fetchData()} style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px',
          padding: '8px 20px', color: 'var(--text-primary)', fontFamily: 'var(--font)',
          fontWeight: 600, cursor: 'pointer',
        }}>
          Tentar novamente
        </button>
      </div>
    );
  }

  // Detail page
  const selected = products.find(p => p.id === selectedProduct);
  if (selected) {
    return <ProductDetailPage product={selected} onBack={() => selectProduct(null)} />;
  }

  // List view
  return (
    <div style={page}>
      <HeroSection summary={summary} />
      <AlertsSection products={products} />

      {/* Products */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{
          fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)',
          fontFamily: 'var(--font)',
        }}>
          Produtos ({products.length})
        </div>
        {products.map(p => (
          <ProductCard key={p.id} product={p} onClick={() => selectProduct(p.id)} />
        ))}
      </div>
    </div>
  );
}
