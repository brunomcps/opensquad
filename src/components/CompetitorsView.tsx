import { useState, useCallback, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useContentStore } from '../store/useContentStore';
import { YouTubeIcon } from './icons/PlatformIcons';

// --- Types ---

interface Competitor {
  channelId: string;
  title: string;
  thumbnail: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  customUrl?: string;
}

interface DerivedMetrics extends Competitor {
  viewsPerVideo: number;
  viewsPerSub: number;
  subsPerVideo: number;
}

// --- Helpers ---

function formatBig(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString('pt-BR');
}

function derive(c: Competitor): DerivedMetrics {
  return {
    ...c,
    viewsPerVideo: c.videoCount > 0 ? Math.round(c.viewCount / c.videoCount) : 0,
    viewsPerSub: c.subscriberCount > 0 ? parseFloat((c.viewCount / c.subscriberCount).toFixed(1)) : 0,
    subsPerVideo: c.videoCount > 0 ? Math.round(c.subscriberCount / c.videoCount) : 0,
  };
}

const COLORS = ['#F0BA3C', '#FF4444', '#1DA1F2', '#7C3AED', '#22A35B', '#FF6B35'];

// --- Styles ---

const wrapper: CSSProperties = { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' };

const headerSection: CSSProperties = { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' };
const pageTitle: CSSProperties = { fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font)', letterSpacing: '-0.02em' };
const pageSubtitle: CSSProperties = { fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' };

const addRow: CSSProperties = { display: 'flex', gap: '8px', alignItems: 'center' };
const input: CSSProperties = {
  width: '300px', background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: '14px',
  fontFamily: 'var(--font-body)', color: 'var(--text-primary)', outline: 'none',
};
const addBtn: CSSProperties = {
  background: 'var(--accent-gold)', border: 'none', borderRadius: 'var(--radius)',
  color: '#fff', padding: '10px 20px', fontSize: '14px', fontWeight: 700,
  cursor: 'pointer', fontFamily: 'var(--font)',
};
const errorText: CSSProperties = { fontSize: '13px', color: 'var(--accent-red)' };

const cardsGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' };

const card: CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
  padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px',
  boxShadow: 'var(--shadow-sm)', position: 'relative',
};

const cardHeader: CSSProperties = { display: 'flex', alignItems: 'center', gap: '12px' };
const avatar: CSSProperties = { width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)', flexShrink: 0 };
const channelName: CSSProperties = { fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font)' };
const channelUrl: CSSProperties = { fontSize: '11px', color: 'var(--text-muted)' };

const rankBadge: CSSProperties = {
  position: 'absolute', top: '10px', right: '10px', fontSize: '11px', fontWeight: 800,
  padding: '2px 8px', borderRadius: '4px', fontFamily: 'var(--font)',
};

const metricsGrid: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' };
const metricBox: CSSProperties = { background: 'var(--bg-primary)', borderRadius: 'var(--radius)', padding: '8px 6px', textAlign: 'center' };
const metricVal: CSSProperties = { fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font)' };
const metricLbl: CSSProperties = { fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '1px' };

const derivedRow: CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px', borderTop: '1px solid var(--border)' };
const derivedLabel: CSSProperties = { color: 'var(--text-muted)' };
const derivedValue: CSSProperties = { fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)' };

const removeBtn: CSSProperties = {
  position: 'absolute', top: '10px', right: '10px', background: 'transparent',
  border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px',
  padding: '2px 6px', borderRadius: '4px',
};

const section: CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
  padding: '18px 22px', boxShadow: 'var(--shadow-sm)',
};
const sectionTitle: CSSProperties = { fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)', marginBottom: '14px' };

const emptyState: CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: '12px', padding: '60px 20px', color: 'var(--text-muted)', fontSize: '14px',
  textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)',
  background: 'var(--bg-card)',
};

// Table
const table: CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const th: CSSProperties = {
  textAlign: 'left', padding: '8px 10px', fontSize: '10px', fontWeight: 700,
  color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
  fontFamily: 'var(--font)', borderBottom: '2px solid var(--border)',
};
const td: CSSProperties = { padding: '10px', fontSize: '13px', borderBottom: '1px solid var(--border)', fontVariantNumeric: 'tabular-nums' };

const rowBg: CSSProperties[] = [
  { background: 'rgba(240, 186, 60, 0.06)' },
  { background: 'rgba(192, 192, 192, 0.04)' },
  { background: 'rgba(205, 127, 50, 0.04)' },
];

// --- Component ---

export function CompetitorsView() {
  const channelStats = useContentStore((s) => s.channelStats);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load saved competitors on mount
  useEffect(() => {
    fetch('/api/youtube/competitors')
      .then((r) => r.json())
      .then((d) => { if (d.ok) setCompetitors(d.competitors); })
      .catch(() => {});
  }, []);

  const addCompetitor = useCallback(async () => {
    const val = inputVal.trim();
    if (!val) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/youtube/competitor/${encodeURIComponent(val)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Canal nao encontrado');

      if (competitors.some((c) => c.channelId === data.competitor.channelId)) {
        setError('Canal ja adicionado');
        return;
      }

      // Save to server
      await fetch('/api/youtube/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.competitor),
      });

      setCompetitors((prev) => [...prev, data.competitor]);
      setInputVal('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [inputVal, competitors]);

  const removeCompetitor = async (channelId: string) => {
    await fetch(`/api/youtube/competitors/${channelId}`, { method: 'DELETE' });
    setCompetitors((prev) => prev.filter((c) => c.channelId !== channelId));
  };

  // Build data
  const myChannel: Competitor = {
    channelId: channelStats?.channelId || 'me',
    title: channelStats?.title || 'Meu Canal',
    thumbnail: channelStats?.thumbnail || '',
    subscriberCount: channelStats?.subscriberCount || 0,
    viewCount: channelStats?.viewCount || 0,
    videoCount: channelStats?.videoCount || 0,
    customUrl: channelStats?.customUrl || '',
  };

  const allDerived = [derive(myChannel), ...competitors.map(derive)];

  // Ranking by subscribers
  const ranked = [...allDerived].sort((a, b) => b.subscriberCount - a.subscriberCount);

  // Radar chart data (normalized 0-100)
  const maxSubs = Math.max(...allDerived.map((c) => c.subscriberCount), 1);
  const maxViews = Math.max(...allDerived.map((c) => c.viewCount), 1);
  const maxVids = Math.max(...allDerived.map((c) => c.videoCount), 1);
  const maxVPV = Math.max(...allDerived.map((c) => c.viewsPerVideo), 1);
  const maxVPS = Math.max(...allDerived.map((c) => c.viewsPerSub), 1);
  const maxSPV = Math.max(...allDerived.map((c) => c.subsPerVideo), 1);

  const radarData = [
    { metric: 'Inscritos', ...Object.fromEntries(allDerived.map((c) => [c.title, Math.round((c.subscriberCount / maxSubs) * 100)])) },
    { metric: 'Views', ...Object.fromEntries(allDerived.map((c) => [c.title, Math.round((c.viewCount / maxViews) * 100)])) },
    { metric: 'Videos', ...Object.fromEntries(allDerived.map((c) => [c.title, Math.round((c.videoCount / maxVids) * 100)])) },
    { metric: 'Views/Video', ...Object.fromEntries(allDerived.map((c) => [c.title, Math.round((c.viewsPerVideo / maxVPV) * 100)])) },
    { metric: 'Views/Inscrito', ...Object.fromEntries(allDerived.map((c) => [c.title, Math.round((c.viewsPerSub / maxVPS) * 100)])) },
    { metric: 'Inscritos/Video', ...Object.fromEntries(allDerived.map((c) => [c.title, Math.round((c.subsPerVideo / maxSPV) * 100)])) },
  ];

  return (
    <div style={wrapper}>
      {/* Header */}
      <div style={headerSection}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <YouTubeIcon size={24} />
            <div style={pageTitle}>Concorrentes — YouTube</div>
          </div>
          <div style={pageSubtitle}>Compare metricas absolutas e de eficiencia com outros canais.</div>
        </div>
        <div style={addRow}>
          <input
            type="text" value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCompetitor()}
            placeholder="@handle, URL ou Channel ID"
            style={input}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          />
          <button style={{ ...addBtn, opacity: loading ? 0.5 : 1 }} onClick={addCompetitor} disabled={loading}>
            {loading ? 'Buscando...' : 'Adicionar'}
          </button>
        </div>
      </div>

      {error && <div style={errorText}>{error}</div>}

      {/* Cards */}
      <div style={cardsGrid}>
        {/* My channel */}
        <div style={{ ...card, borderColor: 'var(--accent-gold)', borderWidth: '2px' }}>
          <span style={{ ...rankBadge, background: 'var(--accent-gold)', color: '#fff' }}>Voce</span>
          <div style={cardHeader}>
            {myChannel.thumbnail ? (
              <img src={myChannel.thumbnail} alt="" style={{ ...avatar, borderColor: 'var(--accent-gold)' }} />
            ) : (
              <div style={{ ...avatar, background: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font)', borderColor: 'var(--accent-gold)' }}>
                {myChannel.title[0] || 'B'}
              </div>
            )}
            <div>
              <div style={channelName}>{myChannel.title}</div>
              {myChannel.customUrl && <div style={channelUrl}>{myChannel.customUrl}</div>}
            </div>
          </div>
          <div style={metricsGrid}>
            <div style={metricBox}><div style={metricVal}>{formatBig(myChannel.subscriberCount)}</div><div style={metricLbl}>Inscritos</div></div>
            <div style={metricBox}><div style={metricVal}>{formatBig(myChannel.viewCount)}</div><div style={metricLbl}>Views</div></div>
            <div style={metricBox}><div style={metricVal}>{formatBig(myChannel.videoCount)}</div><div style={metricLbl}>Videos</div></div>
          </div>
          <div>
            <div style={derivedRow}><span style={derivedLabel}>Views / video</span><span style={derivedValue}>{formatBig(allDerived[0].viewsPerVideo)}</span></div>
            <div style={derivedRow}><span style={derivedLabel}>Views / inscrito</span><span style={derivedValue}>{allDerived[0].viewsPerSub.toFixed(1)}x</span></div>
            <div style={derivedRow}><span style={derivedLabel}>Inscritos / video</span><span style={derivedValue}>{formatBig(allDerived[0].subsPerVideo)}</span></div>
          </div>
        </div>

        {/* Competitors */}
        {competitors.map((c, i) => {
          const d = derive(c);
          return (
            <div key={c.channelId} style={card}>
              <button style={removeBtn} onClick={() => removeCompetitor(c.channelId)}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-red)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
              >✕</button>
              <div style={cardHeader}>
                {c.thumbnail ? <img src={c.thumbnail} alt="" style={avatar} /> : (
                  <div style={{ ...avatar, background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: 'var(--text-muted)' }}>?</div>
                )}
                <div>
                  <div style={channelName}>{c.title}</div>
                  {c.customUrl && <div style={channelUrl}>{c.customUrl}</div>}
                </div>
              </div>
              <div style={metricsGrid}>
                <div style={metricBox}><div style={metricVal}>{formatBig(c.subscriberCount)}</div><div style={metricLbl}>Inscritos</div></div>
                <div style={metricBox}><div style={metricVal}>{formatBig(c.viewCount)}</div><div style={metricLbl}>Views</div></div>
                <div style={metricBox}><div style={metricVal}>{formatBig(c.videoCount)}</div><div style={metricLbl}>Videos</div></div>
              </div>
              <div>
                <div style={derivedRow}><span style={derivedLabel}>Views / video</span><span style={derivedValue}>{formatBig(d.viewsPerVideo)}</span></div>
                <div style={derivedRow}><span style={derivedLabel}>Views / inscrito</span><span style={derivedValue}>{d.viewsPerSub.toFixed(1)}x</span></div>
                <div style={derivedRow}><span style={derivedLabel}>Inscritos / video</span><span style={derivedValue}>{formatBig(d.subsPerVideo)}</span></div>
              </div>
            </div>
          );
        })}

        {competitors.length === 0 && (
          <div style={emptyState}>
            <div style={{ fontSize: '28px', opacity: 0.3 }}>+</div>
            <div>Adicione concorrentes para comparar</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Exemplos: <strong>@canaldonicho</strong>, <strong>youtube.com/@handle</strong>
            </div>
          </div>
        )}
      </div>

      {/* Radar chart */}
      {competitors.length > 0 && (
        <div style={section}>
          <div style={sectionTitle}>Perfil comparativo (normalizado)</div>
          <ResponsiveContainer width="100%" height={380}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: '#666660', fontWeight: 600 }} />
              <PolarRadiusAxis tick={false} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #E8E5DD', borderRadius: 8, fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                formatter={(value: number) => `${value}%`}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {allDerived.map((c, i) => (
                <Radar
                  key={c.channelId}
                  name={c.title}
                  dataKey={c.title}
                  stroke={COLORS[i % COLORS.length]}
                  fill={COLORS[i % COLORS.length]}
                  fillOpacity={i === 0 ? 0.2 : 0.1}
                  strokeWidth={i === 0 ? 2.5 : 1.5}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Ranking table */}
      {competitors.length > 0 && (
        <div style={section}>
          <div style={sectionTitle}>Ranking geral</div>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>#</th>
                <th style={th}>Canal</th>
                <th style={{ ...th, textAlign: 'right' }}>Inscritos</th>
                <th style={{ ...th, textAlign: 'right' }}>Views</th>
                <th style={{ ...th, textAlign: 'right' }}>Videos</th>
                <th style={{ ...th, textAlign: 'right' }}>Views/Video</th>
                <th style={{ ...th, textAlign: 'right' }}>Views/Inscrito</th>
                <th style={{ ...th, textAlign: 'right' }}>Inscritos/Video</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((c, i) => {
                const isMe = c.channelId === myChannel.channelId;
                return (
                  <tr key={c.channelId} style={i < 3 ? rowBg[i] : {}}>
                    <td style={{ ...td, fontWeight: 800, fontFamily: 'var(--font)', color: i === 0 ? 'var(--accent-gold-dark)' : 'var(--text-muted)' }}>
                      {i + 1}
                    </td>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {c.thumbnail && <img src={c.thumbnail} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} />}
                        <span style={{ fontWeight: 700, fontFamily: 'var(--font)' }}>
                          {c.title}
                          {isMe && <span style={{ background: 'var(--accent-gold)', color: '#fff', fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '3px', marginLeft: '6px' }}>Voce</span>}
                        </span>
                      </div>
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{formatBig(c.subscriberCount)}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{formatBig(c.viewCount)}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{formatBig(c.videoCount)}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: 'var(--accent-gold-dark)' }}>{formatBig(c.viewsPerVideo)}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{c.viewsPerSub.toFixed(1)}x</td>
                    <td style={{ ...td, textAlign: 'right' }}>{formatBig(c.subsPerVideo)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
