import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, ZAxis, CartesianGrid,
} from 'recharts';

const container: CSSProperties = {
  padding: '24px', paddingBottom: '80px', flex: 1, overflowY: 'auto', minHeight: 0,
  display: 'flex', flexDirection: 'column', gap: '20px',
};
const card: CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)',
  overflow: 'hidden', flexShrink: 0,
};
const cardHeader: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 20px', borderBottom: '1px solid var(--border)',
};
const cardTitle: CSSProperties = {
  fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)',
};
const kpiRow: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', flexShrink: 0 };
const kpiCard: CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)', padding: '16px 20px',
  display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0,
};
const kpiLabel: CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font)',
};
const kpiValue: CSSProperties = {
  fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)',
  lineHeight: 1.1, fontFamily: 'var(--font)', letterSpacing: '-0.02em',
};
const row: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '12px',
  padding: '10px 20px', borderBottom: '1px solid var(--border)',
  cursor: 'default', transition: 'background var(--transition)',
};
const thumb: CSSProperties = {
  width: '64px', height: '36px', borderRadius: '4px',
  objectFit: 'cover', background: 'var(--bg-primary)', flexShrink: 0,
};

interface VideoRevenue {
  videoId: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  isShort: boolean;
  views: number;
  likes: number;
  salesCount: number;
  revenue: number;
  revenuePerView: number;
  topProduct: string;
}

interface TimelineDay {
  date: string;
  revenue: number;
  publications: string[];
}

interface ContentRevenueData {
  windowDays: number;
  totalVideos: number;
  videosWithSales: number;
  totalRevenue: number;
  topByRevenue: VideoRevenue[];
  topByConversion: VideoRevenue[];
  timeline: TimelineDay[];
}

function fmt(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtK(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toFixed(0);
}

const COLORS = ['#F0BA3C', '#C99A2E', '#22A35B', '#1DA1F2', '#7C3AED', '#DC3545', '#FF6B35', '#00C4BD'];

export function ContentRevenueView() {
  const [data, setData] = useState<ContentRevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [window, setWindow] = useState(7);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/content-revenue?window=${window}`)
      .then(r => r.json())
      .then(d => {
        if (!d.ok) throw new Error(d.error);
        setData(d);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [window]);

  if (loading) return <div style={container}><div style={{ ...card, padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Cruzando dados de conteúdo com vendas Hotmart...</div></div>;
  if (error) return <div style={container}><div style={{ ...card, padding: '40px', textAlign: 'center', color: 'var(--accent-red)' }}>Erro: {error}</div></div>;
  if (!data) return null;

  // Timeline chart data
  const timelineData = data.timeline.map(d => ({
    date: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    revenue: d.revenue,
    published: d.publications.length,
    hasPublication: d.publications.length > 0,
  }));

  // Scatter data
  const scatterData = data.topByRevenue
    .filter(v => v.views > 0 && v.revenue > 0)
    .map(v => ({
      x: v.views,
      y: v.revenue,
      title: v.title.slice(0, 40),
      isShort: v.isShort,
    }));

  return (
    <div style={container}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font)', letterSpacing: '-0.02em' }}>
            Conteúdo x Receita
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Qual conteúdo gera mais vendas? Análise dos últimos 90 dias.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-primary)', borderRadius: 'var(--radius)', padding: '3px' }}>
          {[3, 7, 14, 30].map(w => (
            <button key={w} onClick={() => setWindow(w)} style={{
              background: window === w ? 'var(--bg-card)' : 'transparent',
              border: 'none', borderRadius: '6px', padding: '5px 12px',
              fontSize: '12px', fontWeight: window === w ? 700 : 500,
              color: window === w ? 'var(--accent-gold-dark)' : 'var(--text-muted)',
              cursor: 'pointer', fontFamily: 'var(--font)',
              boxShadow: window === w ? 'var(--shadow-sm)' : 'none',
            }}>{w}d</button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={kpiRow}>
        <div style={kpiCard}>
          <span style={kpiLabel}>Vídeos Analisados</span>
          <span style={kpiValue}>{data.totalVideos}</span>
        </div>
        <div style={kpiCard}>
          <span style={kpiLabel}>Geraram Vendas</span>
          <span style={{ ...kpiValue, color: 'var(--accent-green)' }}>{data.videosWithSales}</span>
        </div>
        <div style={kpiCard}>
          <span style={kpiLabel}>Receita Total ({window}d window)</span>
          <span style={{ ...kpiValue, color: 'var(--accent-gold-dark)' }}>R$ {fmtK(data.totalRevenue)}</span>
        </div>
        <div style={kpiCard}>
          <span style={kpiLabel}>Taxa de Conversão</span>
          <span style={kpiValue}>{data.totalVideos > 0 ? ((data.videosWithSales / data.totalVideos) * 100).toFixed(0) : 0}%</span>
        </div>
      </div>

      {/* Timeline: Revenue + Publications overlay */}
      <div style={card}>
        <div style={cardHeader}>
          <span style={cardTitle}>Timeline: Receita x Publicações</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Barras = receita/dia · Pontos = dias com publicação</span>
        </div>
        <div style={{ padding: '16px', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={timelineData} margin={{ left: 10, right: 10, top: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={6} />
              <YAxis yAxisId="rev" tick={{ fontSize: 10 }} tickFormatter={v => `R$${fmtK(v)}`} domain={[0, (max: number) => Math.ceil(max * 1.1)]} />
              <YAxis yAxisId="pub" orientation="right" tick={{ fontSize: 10 }} domain={[0, 5]} hide />
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === 'revenue' ? `R$ ${fmt(value)}` : `${value} vídeo(s)`,
                  name === 'revenue' ? 'Receita' : 'Publicações'
                ]}
                contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
              />
              <Bar yAxisId="rev" dataKey="revenue" fill="var(--accent-gold)" radius={[3, 3, 0, 0]} opacity={0.7} />
              <Line yAxisId="pub" dataKey="published" stroke="var(--accent-red)" strokeWidth={0} dot={(props: any) => {
                if (!props.payload.hasPublication) return <g key={props.key} />;
                return <circle key={props.key} cx={props.cx} cy={props.cy} r={5} fill="var(--accent-red)" stroke="#fff" strokeWidth={2} />;
              }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flexShrink: 0 }}>
        {/* Ranking by Revenue */}
        <div style={card}>
          <div style={cardHeader}>
            <span style={cardTitle}>Top Vídeos por Receita Gerada</span>
          </div>
          <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
            {data.topByRevenue.filter(v => v.revenue > 0).length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                Nenhum vídeo com vendas no window de {window} dias
              </div>
            ) : data.topByRevenue.filter(v => v.revenue > 0).map((v, i) => (
              <div key={v.videoId} style={row}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{
                  fontSize: '14px', fontWeight: 800, fontFamily: 'var(--font)',
                  color: i === 0 ? 'var(--accent-gold-dark)' : i < 3 ? 'var(--text-secondary)' : 'var(--text-muted)',
                  width: '20px', textAlign: 'center',
                }}>{i + 1}</span>
                <img src={v.thumbnail} alt="" style={thumb} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)',
                    fontFamily: 'var(--font)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{v.isShort ? '⚡ ' : ''}{v.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {fmtK(v.views)} views · {v.salesCount} vendas · {v.topProduct}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-green)', fontFamily: 'var(--font)' }}>
                    R$ {fmt(v.revenue)}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    R$ {(v.revenuePerView * 1000).toFixed(2)}/1K views
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scatter: Views x Revenue */}
        <div style={card}>
          <div style={cardHeader}>
            <span style={cardTitle}>Views x Receita (conversão)</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Top direito = mais views E mais receita</span>
          </div>
          <div style={{ padding: '16px', height: '340px' }}>
            {scatterData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" dataKey="x" name="Views" tick={{ fontSize: 10 }} tickFormatter={v => fmtK(v)} domain={[0, 'auto']} />
                  <YAxis type="number" dataKey="y" name="Receita" tick={{ fontSize: 10 }} tickFormatter={v => `R$${fmtK(v)}`} domain={[0, 'auto']} />
                  <ZAxis range={[80, 200]} />
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', maxWidth: '250px', boxShadow: 'var(--shadow-md)' }}>
                          <div style={{ fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)' }}>{d.title}</div>
                          <div style={{ color: 'var(--text-secondary)' }}>{fmtK(d.x)} views</div>
                          <div style={{ color: 'var(--accent-green)', fontWeight: 700 }}>R$ {fmt(d.y)}</div>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={scatterData}>
                    {scatterData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '13px' }}>
                Sem dados suficientes para scatter
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Best converters (revenue per view) */}
      {data.topByConversion.length > 0 && (
        <div style={card}>
          <div style={cardHeader}>
            <span style={cardTitle}>Melhor Conversão (R$/1K views)</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Vídeos que geram mais receita por view — esses temas VENDEM</span>
          </div>
          <div style={{ display: 'flex', gap: '0', overflowX: 'auto' }}>
            {data.topByConversion.map((v, i) => (
              <div key={v.videoId} style={{
                padding: '16px 20px', borderRight: '1px solid var(--border)',
                minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '8px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: i === 0 ? 'var(--accent-gold-dark)' : 'var(--text-muted)', fontFamily: 'var(--font)' }}>#{i + 1}</span>
                  <img src={v.thumbnail} alt="" style={{ width: '48px', height: '27px', borderRadius: '3px', objectFit: 'cover' }} />
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font)' }}>
                  {v.title.slice(0, 50)}{v.title.length > 50 ? '...' : ''}
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-green)', fontFamily: 'var(--font)' }}>
                  R$ {(v.revenuePerView * 1000).toFixed(2)}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  por 1K views · {fmtK(v.views)} views · R$ {fmt(v.revenue)} total
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
