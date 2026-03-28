import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CompetitorProfile {
  id: string;
  name: string;
  bio: string;
  updatedAt?: string;
  platforms: Record<string, {
    handle?: string | null;
    followers?: number | string | null;
    avgEngagement?: string;
    postingFrequency?: string;
    topFormats?: string[];
  }>;
  businessModel: {
    products: { name: string; price: string; platform: string; tier: string; description: string }[];
    revenueStreams: string[];
    estimatedMonthlyRevenue: { value: string; confidence: string; reasoning: string };
  };
  adActivity: {
    activeAds: string;
    formats: string[];
    themes: string[];
    longestRunningAd: string;
    landingPages: string[];
    dataSource?: string;
  };
  strengths: string[];
  weaknesses: string[];
  vsBruno: {
    audienceOverlap: string;
    brunoAdvantages: string[];
    brunoDisadvantages: string[];
    opportunityGaps: string[];
  };
}

interface ViralContent {
  id: string;
  platform: string;
  competitor: string;
  competitorName: string;
  url: string;
  title: string;
  publishedAt: string;
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number | null;
    engagementRate: number;
    source?: string;
  };
  viralityAnalysis: {
    zScore: number;
    isOutlier: boolean;
    outlierMultiplier: string;
    viralityScore: number;
    steppElements: string[];
    whyViral: string;
  };
  modelingPotential: {
    fitScore: number;
    suggestedAngle: string;
    suggestedFormat: string;
    urgency: string;
  };
}

interface ViralData {
  scanDate: string;
  viralContent: ViralContent[];
}

interface Trend {
  id: string;
  topic: string;
  lifecycle: string;
  confidence: string;
  signalCount: number;
  signals: { social: boolean; search: boolean; creator: boolean; news: boolean; community: boolean };
  fitScore: number;
  urgency: string;
  estimatedWindow: string;
  detectedAt?: string;
  sources?: string[];
}

interface Opportunity {
  id: string;
  rank: number;
  topic: string;
  priorityScore: number;
  fit: number;
  impact: number;
  urgency: number;
  effort: number;
  platform: string;
  format: string;
  angles: { type: string; hook: string }[];
  window: string;
  brunoAdvantage: string;
  detectedAt?: string;
}

type SubTab = 'concorrentes' | 'viral' | 'tendencias' | 'oportunidades';

// ─── Constants ───────────────────────────────────────────────────────────────

const COLORS = ['#F0BA3C', '#FF4444', '#1DA1F2', '#7C3AED', '#22A35B', '#FF6B35'];

const PLATFORM_COLORS: Record<string, string> = {
  YouTube: '#FF0000',
  youtube: '#FF0000',
  Instagram: '#E1306C',
  instagram: '#E1306C',
  TikTok: '#000000',
  tiktok: '#000000',
  X: '#1DA1F2',
  x: '#1DA1F2',
  facebook: '#1877F2',
  spotify: '#1DB954',
  telegram: '#0088cc',
  threads: '#000000',
};

const LIFECYCLE_COLORS: Record<string, string> = {
  emerging: '#1DA1F2',
  growth: '#22A35B',
  peak: '#FF8C00',
  stable: '#888888',
  declining: '#FF4444',
};

const URGENCY_COLORS: Record<string, string> = {
  high: '#FF4444',
  medium: '#FF8C00',
  low: '#888888',
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: '#22A35B',
  medium: '#FF8C00',
  low: '#FF4444',
};

const STEPPS_COLORS: Record<string, string> = {
  'Social Currency': '#7C3AED',
  'Practical Value': '#22A35B',
  'Emotion': '#FF4444',
  'Triggers': '#FF8C00',
  'Public': '#1DA1F2',
  'Stories': '#F0BA3C',
};

const MEDAL_COLORS = ['#F0BA3C', '#C0C0C0', '#CD7F32'];

const ANGLE_EMOJIS: Record<string, string> = {
  'controversia': '🔥',
  'controvérsia': '🔥',
  'educacional': '🎓',
  'ponte': '🌉',
  'medo': '😱',
  'validação': '💛',
  'validacao': '💛',
  'contrário': '🔄',
  'contrario': '🔄',
  'prático': '🛠',
  'pratico': '🛠',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBig(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString('pt-BR');
}

function getFollowerCount(val: number | string | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  const match = String(val).match(/[\d,.]+/);
  if (match) return parseInt(match[0].replace(/[,.](?=\d{3})/g, ''), 10);
  return null;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const wrapper: CSSProperties = {
  flex: 1, overflowY: 'auto', padding: '20px',
  display: 'flex', flexDirection: 'column', gap: '16px',
};

const headerSection: CSSProperties = {
  display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
  gap: '16px', flexWrap: 'wrap',
};

const pageTitle: CSSProperties = {
  fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)',
  fontFamily: 'var(--font)', letterSpacing: '-0.02em',
};

const pageSubtitle: CSSProperties = {
  fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px',
};

const subTabsContainer: CSSProperties = {
  display: 'flex', gap: '2px', background: 'var(--bg-primary)',
  borderRadius: 'var(--radius)', padding: '3px',
};

const subTabBtn: CSSProperties = {
  background: 'transparent', border: 'none', borderRadius: '6px',
  color: 'var(--text-muted)', padding: '7px 18px', fontSize: '13px',
  fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font)',
  transition: 'all var(--transition)',
};

const subTabActive: CSSProperties = {
  ...subTabBtn, background: 'var(--bg-secondary)', color: 'var(--accent-gold-dark)',
  fontWeight: 700, boxShadow: 'var(--shadow-sm)',
};

const card: CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)', padding: '18px',
  display: 'flex', flexDirection: 'column', gap: '12px',
  boxShadow: 'var(--shadow-sm)', position: 'relative',
};

const cardsGrid: CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '14px',
};

const section: CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)', padding: '18px 22px',
  boxShadow: 'var(--shadow-sm)',
};

const sectionTitle: CSSProperties = {
  fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)',
  fontFamily: 'var(--font)', marginBottom: '14px',
};

const badge: CSSProperties = {
  display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
  fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font)',
};

const filterBar: CSSProperties = {
  display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap',
};

const filterBtn: CSSProperties = {
  background: 'var(--bg-primary)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: '12px',
  fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
  color: 'var(--text-secondary)', transition: 'all var(--transition)',
};

const filterBtnActive: CSSProperties = {
  ...filterBtn, background: 'var(--accent-gold)', color: '#fff',
  borderColor: 'var(--accent-gold)',
};

const expandBtn: CSSProperties = {
  background: 'transparent', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: '4px 10px', fontSize: '11px',
  fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
  color: 'var(--text-muted)', transition: 'all var(--transition)',
};

const pillTag: CSSProperties = {
  display: 'inline-block', padding: '2px 8px', borderRadius: '12px',
  fontSize: '10px', fontWeight: 700, marginRight: '4px', marginBottom: '4px',
};

const emptyState: CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', gap: '12px', padding: '60px 20px',
  color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center',
  border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)',
  background: 'var(--bg-card)',
};

const metricBox: CSSProperties = {
  background: 'var(--bg-primary)', borderRadius: 'var(--radius)',
  padding: '8px 6px', textAlign: 'center',
};

const metricVal: CSSProperties = {
  fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)',
  fontFamily: 'var(--font)',
};

const metricLbl: CSSProperties = {
  fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '1px',
};

// ─── Sub-tab definitions ─────────────────────────────────────────────────────

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'concorrentes', label: 'Concorrentes' },
  { key: 'viral', label: 'Viral' },
  { key: 'tendencias', label: 'Tendencias' },
  { key: 'oportunidades', label: 'Oportunidades' },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export function ViralRadarView() {
  const [activeTab, setActiveTab] = useState<SubTab>('concorrentes');
  const [profiles, setProfiles] = useState<CompetitorProfile[]>([]);
  const [viralData, setViralData] = useState<ViralData | null>(null);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/viral-radar/profiles').then(r => r.json()),
      fetch('/api/viral-radar/viral').then(r => r.json()),
      fetch('/api/viral-radar/trends').then(r => r.json()),
      fetch('/api/viral-radar/opportunities').then(r => r.json()),
    ]).then(([p, v, t, o]) => {
      if (p.ok) setProfiles(Array.isArray(p.data) ? p.data : []);
      if (v.ok) setViralData(v.data);
      if (t.ok) setTrends(Array.isArray(t.data) ? t.data : []);
      if (o.ok) setOpportunities(Array.isArray(o.data) ? o.data : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div style={wrapper}>
      <div style={headerSection}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>📡</span>
            <div style={pageTitle}>Viral Radar</div>
          </div>
          <div style={pageSubtitle}>
            Inteligencia competitiva, conteudo viral, tendencias e oportunidades.
          </div>
        </div>
      </div>

      <div style={subTabsContainer}>
        {SUB_TABS.map(({ key, label }) => (
          <button
            key={key}
            style={activeTab === key ? subTabActive : subTabBtn}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={emptyState}>Carregando dados...</div>
      ) : (
        <>
          {activeTab === 'concorrentes' && <ConcorrentesTab profiles={profiles} />}
          {activeTab === 'viral' && <ViralTab data={viralData} />}
          {activeTab === 'tendencias' && <TendenciasTab trends={trends} />}
          {activeTab === 'oportunidades' && <OportunidadesTab opportunities={opportunities} />}
        </>
      )}
    </div>
  );
}

// ─── Concorrentes Sub-tab ────────────────────────────────────────────────────

function ConcorrentesTab({ profiles }: { profiles: CompetitorProfile[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (profiles.length === 0) {
    return <div style={emptyState}>Nenhum perfil de concorrente encontrado. Execute o scan primeiro.</div>;
  }

  // Build radar chart data
  const radarMetrics = profiles.map(p => {
    const yt = getFollowerCount(p.platforms.youtube?.followers) || 0;
    const ig = getFollowerCount(p.platforms.instagram?.followers) || 0;
    const tt = getFollowerCount(p.platforms.tiktok?.followers) || 0;
    return { name: p.name, youtube: yt, instagram: ig, tiktok: tt, total: yt + ig + tt };
  });

  const maxYT = Math.max(...radarMetrics.map(r => r.youtube), 1);
  const maxIG = Math.max(...radarMetrics.map(r => r.instagram), 1);
  const maxTT = Math.max(...radarMetrics.map(r => r.tiktok), 1);
  const maxTotal = Math.max(...radarMetrics.map(r => r.total), 1);

  const radarData = [
    { metric: 'YouTube', ...Object.fromEntries(radarMetrics.map(r => [r.name, Math.round((r.youtube / maxYT) * 100)])) },
    { metric: 'Instagram', ...Object.fromEntries(radarMetrics.map(r => [r.name, Math.round((r.instagram / maxIG) * 100)])) },
    { metric: 'TikTok', ...Object.fromEntries(radarMetrics.map(r => [r.name, Math.round((r.tiktok / maxTT) * 100)])) },
    { metric: 'Total', ...Object.fromEntries(radarMetrics.map(r => [r.name, Math.round((r.total / maxTotal) * 100)])) },
  ];

  return (
    <>
      <div style={cardsGrid}>
        {profiles.map((p, i) => {
          const isExpanded = expandedId === p.id;
          const platformEntries = Object.entries(p.platforms).filter(([, v]) => v && v.handle);

          return (
            <div key={p.id} style={{ ...card, borderColor: i === 0 ? 'var(--accent-gold)' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  background: COLORS[i % COLORS.length] + '22',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', fontWeight: 800, color: COLORS[i % COLORS.length],
                  fontFamily: 'var(--font)', flexShrink: 0,
                  border: `2px solid ${COLORS[i % COLORS.length]}40`,
                }}>
                  {p.name[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font)' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {p.bio}
                  </div>
                </div>
              </div>

              {/* Platform badges */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {platformEntries.map(([platform, data]) => {
                  const count = getFollowerCount(data.followers);
                  return (
                    <span key={platform} style={{
                      ...badge,
                      background: (PLATFORM_COLORS[platform] || '#666') + '18',
                      color: PLATFORM_COLORS[platform] || '#666',
                    }}>
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      {count !== null ? ` ${formatBig(count)}` : ''}
                    </span>
                  );
                })}
              </div>

              {/* Revenue estimate */}
              {p.businessModel?.estimatedMonthlyRevenue && (
                <div style={{ ...metricBox, textAlign: 'left', padding: '8px 12px' }}>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Receita estimada</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-gold-dark)', fontFamily: 'var(--font)', marginTop: '2px' }}>
                    {p.businessModel.estimatedMonthlyRevenue.value}
                  </div>
                </div>
              )}

              <button style={expandBtn} onClick={() => setExpandedId(isExpanded ? null : p.id)}>
                {isExpanded ? 'Recolher' : 'Ver detalhes'}
              </button>

              {/* Expanded section */}
              {isExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                  {/* Products */}
                  {p.businessModel?.products?.length > 0 && (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)', marginBottom: '6px' }}>Produtos</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {p.businessModel.products.map((prod, pi) => (
                          <div key={pi} style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius)', padding: '8px 10px', fontSize: '12px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{prod.name}</div>
                            <div style={{ color: 'var(--accent-gold-dark)', fontWeight: 600, marginTop: '2px' }}>{prod.price}</div>
                            <div style={{ color: 'var(--text-muted)', marginTop: '2px', fontSize: '11px' }}>{prod.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ad Activity */}
                  {p.adActivity && (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)', marginBottom: '6px' }}>Atividade de Ads</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        <div><strong>Status:</strong> {p.adActivity.activeAds}</div>
                        <div><strong>Formatos:</strong> {p.adActivity.formats.join(', ')}</div>
                        <div><strong>Temas:</strong> {p.adActivity.themes.join(', ')}</div>
                      </div>
                    </div>
                  )}

                  {/* Strengths / Weaknesses */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#22A35B', fontFamily: 'var(--font)', marginBottom: '4px' }}>Forcas</div>
                      {p.strengths.map((s, si) => (
                        <div key={si} style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px', lineHeight: 1.4 }}>
                          + {s}
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#FF4444', fontFamily: 'var(--font)', marginBottom: '4px' }}>Fraquezas</div>
                      {p.weaknesses.map((w, wi) => (
                        <div key={wi} style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px', lineHeight: 1.4 }}>
                          - {w}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Vs Bruno */}
                  {p.vsBruno && (
                    <div style={{ background: 'rgba(240, 186, 60, 0.06)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-gold-dark)', fontFamily: 'var(--font)', marginBottom: '6px' }}>
                        Bruno vs {p.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        <strong>Overlap:</strong> {p.vsBruno.audienceOverlap}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#22A35B', marginBottom: '3px' }}>Vantagens Bruno</div>
                          {p.vsBruno.brunoAdvantages.map((a, ai) => (
                            <div key={ai} style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '2px', lineHeight: 1.4 }}>+ {a}</div>
                          ))}
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#FF4444', marginBottom: '3px' }}>Desvantagens Bruno</div>
                          {p.vsBruno.brunoDisadvantages.map((d, di) => (
                            <div key={di} style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '2px', lineHeight: 1.4 }}>- {d}</div>
                          ))}
                        </div>
                      </div>
                      {p.vsBruno.opportunityGaps.length > 0 && (
                        <div style={{ marginTop: '6px' }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent-gold-dark)', marginBottom: '3px' }}>Oportunidades</div>
                          {p.vsBruno.opportunityGaps.map((g, gi) => (
                            <div key={gi} style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '2px', lineHeight: 1.4 }}>→ {g}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Radar chart */}
      {profiles.length > 1 && (
        <div style={section}>
          <div style={sectionTitle}>Comparativo de alcance por plataforma (normalizado)</div>
          <ResponsiveContainer width="100%" height={380}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: '#666660', fontWeight: 600 }} />
              <PolarRadiusAxis tick={false} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #E8E5DD', borderRadius: 8, fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                formatter={(value: any) => `${value}%`}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {profiles.map((p, i) => (
                <Radar
                  key={p.id}
                  name={p.name}
                  dataKey={p.name}
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
    </>
  );
}

// ─── Viral Sub-tab ───────────────────────────────────────────────────────────

function ViralTab({ data }: { data: ViralData | null }) {
  const [platformFilter, setPlatformFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'viralityScore' | 'zScore' | 'date'>('viralityScore');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  if (!data || !data.viralContent?.length) {
    return <div style={emptyState}>Nenhum conteudo viral encontrado. Execute o scan primeiro.</div>;
  }

  const platforms = ['All', ...Array.from(new Set(data.viralContent.map(v => v.platform)))];

  let items = [...data.viralContent];
  if (platformFilter !== 'All') {
    items = items.filter(v => v.platform === platformFilter);
  }

  items.sort((a, b) => {
    if (sortBy === 'viralityScore') return b.viralityAnalysis.viralityScore - a.viralityAnalysis.viralityScore;
    if (sortBy === 'zScore') return b.viralityAnalysis.zScore - a.viralityAnalysis.zScore;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <>
      <div style={{ ...section, padding: '12px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={filterBar}>
            {platforms.map(p => (
              <button key={p} style={platformFilter === p ? filterBtnActive : filterBtn} onClick={() => setPlatformFilter(p)}>
                {p}
              </button>
            ))}
          </div>
          <div style={filterBar}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Ordenar:</span>
            {([['viralityScore', 'Score'], ['zScore', 'Z-Score'], ['date', 'Data']] as const).map(([key, label]) => (
              <button key={key} style={sortBy === key ? filterBtnActive : filterBtn} onClick={() => setSortBy(key)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {items.map(v => {
          const isExpanded = expandedIds.has(v.id);
          const zColor = v.viralityAnalysis.zScore >= 3 ? '#22A35B' : v.viralityAnalysis.zScore >= 2 ? '#FF8C00' : '#888';

          return (
            <div key={v.id} style={card}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                {/* Platform badge */}
                <span style={{
                  ...badge,
                  background: (PLATFORM_COLORS[v.platform] || '#666') + '18',
                  color: PLATFORM_COLORS[v.platform] || '#666',
                }}>
                  {v.platform}
                </span>

                <span style={{ ...badge, background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                  {v.competitorName}
                </span>

                {/* Z-Score badge */}
                <span style={{ ...badge, background: zColor + '18', color: zColor }}>
                  Z: {v.viralityAnalysis.zScore.toFixed(1)}
                </span>

                {/* Virality Score */}
                <span style={{ ...badge, background: 'rgba(240, 186, 60, 0.1)', color: 'var(--accent-gold-dark)' }}>
                  Score: {v.viralityAnalysis.viralityScore}
                </span>
              </div>

              {/* Title */}
              <a
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)', textDecoration: 'none', lineHeight: 1.4 }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-gold-dark)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
              >
                {v.title}
              </a>

              {/* Metrics row */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {[
                  ['Views', v.metrics.views],
                  ['Likes', v.metrics.likes],
                  ['Comments', v.metrics.comments],
                  ...(v.metrics.shares ? [['Shares', v.metrics.shares] as [string, number]] : []),
                  ['ER', null],
                ].map(([label, val]) => (
                  <div key={label as string} style={metricBox}>
                    <div style={metricVal}>
                      {label === 'ER' ? `${v.metrics.engagementRate}%` : formatBig(val as number)}
                    </div>
                    <div style={metricLbl}>{label as string}</div>
                  </div>
                ))}
              </div>

              {/* STEPPS tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                {v.viralityAnalysis.steppElements.map(el => (
                  <span key={el} style={{
                    ...pillTag,
                    background: (STEPPS_COLORS[el] || '#666') + '18',
                    color: STEPPS_COLORS[el] || '#666',
                  }}>
                    {el}
                  </span>
                ))}
              </div>

              <button style={expandBtn} onClick={() => toggleExpand(v.id)}>
                {isExpanded ? 'Recolher' : 'Ver analise + potencial'}
              </button>

              {isExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                  {/* Why viral */}
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)', marginBottom: '4px' }}>Por que viralizou</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{v.viralityAnalysis.whyViral}</div>
                  </div>

                  {/* Modeling potential */}
                  <div style={{ background: 'rgba(240, 186, 60, 0.06)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-gold-dark)', fontFamily: 'var(--font)' }}>
                        Potencial de Modelagem
                      </span>
                      <span style={{
                        ...badge,
                        background: v.modelingPotential.fitScore >= 8 ? '#22A35B18' : '#FF8C0018',
                        color: v.modelingPotential.fitScore >= 8 ? '#22A35B' : '#FF8C00',
                      }}>
                        Fit: {v.modelingPotential.fitScore}/10
                      </span>
                      <span style={{
                        ...badge,
                        background: (URGENCY_COLORS[v.modelingPotential.urgency] || '#888') + '18',
                        color: URGENCY_COLORS[v.modelingPotential.urgency] || '#888',
                      }}>
                        {v.modelingPotential.urgency}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '4px' }}>{v.modelingPotential.suggestedAngle}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Formato: {v.modelingPotential.suggestedFormat}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Tendencias Sub-tab ──────────────────────────────────────────────────────

function TendenciasTab({ trends }: { trends: Trend[] }) {
  if (trends.length === 0) {
    return <div style={emptyState}>Nenhuma tendencia encontrada. Execute o scan primeiro.</div>;
  }

  const urgencyNum: Record<string, number> = { high: 3, medium: 2, low: 1 };
  const sorted = [...trends].sort((a, b) => {
    const sa = a.fitScore * (urgencyNum[a.urgency] || 1);
    const sb = b.fitScore * (urgencyNum[b.urgency] || 1);
    return sb - sa;
  });

  const signalKeys: (keyof Trend['signals'])[] = ['social', 'search', 'creator', 'news', 'community'];
  const signalLabels: Record<string, string> = {
    social: 'Social', search: 'Search', creator: 'Creator', news: 'News', community: 'Community',
  };

  return (
    <div style={cardsGrid}>
      {sorted.map(t => (
        <div key={t.id} style={card}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font)', lineHeight: 1.3 }}>
            {t.topic}
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{
              ...badge,
              background: (LIFECYCLE_COLORS[t.lifecycle] || '#888') + '18',
              color: LIFECYCLE_COLORS[t.lifecycle] || '#888',
            }}>
              {t.lifecycle}
            </span>
            <span style={{
              ...badge,
              background: (CONFIDENCE_COLORS[t.confidence] || '#888') + '18',
              color: CONFIDENCE_COLORS[t.confidence] || '#888',
            }}>
              Conf: {t.confidence}
            </span>
            <span style={{
              ...badge,
              background: (URGENCY_COLORS[t.urgency] || '#888') + '18',
              color: URGENCY_COLORS[t.urgency] || '#888',
            }}>
              Urgencia: {t.urgency}
            </span>
          </div>

          {/* Signal dots */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {signalKeys.map(key => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <div style={{
                  width: '12px', height: '12px', borderRadius: '50%',
                  background: t.signals[key] ? 'var(--accent-gold)' : 'var(--bg-primary)',
                  border: t.signals[key] ? '2px solid var(--accent-gold-dark)' : '2px solid var(--border)',
                }} />
                <span style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: 600 }}>{signalLabels[key]}</span>
              </div>
            ))}
          </div>

          {/* Fit Score bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fit Score</span>
              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-gold-dark)', fontFamily: 'var(--font)' }}>{t.fitScore}/10</span>
            </div>
            <div style={{ height: '6px', background: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${t.fitScore * 10}%`, background: 'var(--accent-gold)', borderRadius: '3px', transition: 'width 0.3s ease' }} />
            </div>
          </div>

          {/* Window */}
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            <strong>Janela:</strong> {t.estimatedWindow}
          </div>

          {/* Sources */}
          {t.sources && t.sources.length > 0 && (
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Fontes: {t.sources.join(', ')}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Oportunidades Sub-tab ───────────────────────────────────────────────────

function OportunidadesTab({ opportunities }: { opportunities: Opportunity[] }) {
  if (opportunities.length === 0) {
    return <div style={emptyState}>Nenhuma oportunidade encontrada. Execute o scan primeiro.</div>;
  }

  const sorted = [...opportunities].sort((a, b) => a.rank - b.rank);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {sorted.map((opp, idx) => {
        const medalColor = idx < 3 ? MEDAL_COLORS[idx] : undefined;
        const borderStyle = idx === 0
          ? { borderColor: 'var(--accent-gold)', borderWidth: '2px', boxShadow: 'var(--shadow-gold)' }
          : idx === 1
            ? { borderColor: '#C0C0C0', borderWidth: '2px' }
            : idx === 2
              ? { borderColor: '#CD7F32', borderWidth: '2px' }
              : {};

        return (
          <div key={opp.id} style={{ ...card, ...borderStyle, flexDirection: 'row', gap: '16px', alignItems: 'flex-start' }}>
            {/* Rank number */}
            <div style={{
              fontSize: '28px', fontWeight: 900, fontFamily: 'var(--font)',
              color: medalColor || 'var(--text-muted)',
              minWidth: '44px', textAlign: 'center', lineHeight: 1,
              textShadow: idx === 0 ? '0 1px 4px rgba(240,186,60,0.3)' : undefined,
            }}>
              #{opp.rank}
            </div>

            {/* Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Topic + Score */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font)', lineHeight: 1.3, flex: 1, minWidth: '200px' }}>
                  {opp.topic}
                </div>
                <span style={{
                  ...badge, fontSize: '13px', fontWeight: 800,
                  background: idx === 0 ? 'var(--accent-gold)' : 'var(--bg-primary)',
                  color: idx === 0 ? '#fff' : 'var(--text-primary)',
                }}>
                  {opp.priorityScore.toFixed(1)} pts
                </span>
              </div>

              {/* Score breakdown */}
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font)', fontVariantNumeric: 'tabular-nums' }}>
                Fit({opp.fit}) x Impact({opp.impact}) x Urgency({opp.urgency}) / Effort({opp.effort}) = {opp.priorityScore.toFixed(1)}
              </div>

              {/* Platform + Format tags */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ ...badge, background: '#1DA1F218', color: '#1DA1F2' }}>{opp.platform}</span>
                <span style={{ ...badge, background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>{opp.format}</span>
              </div>

              {/* Angles */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)', marginBottom: '4px' }}>Angulos</div>
                {opp.angles.map((angle, ai) => (
                  <div key={ai} style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', lineHeight: 1.5, paddingLeft: '4px' }}>
                    {ANGLE_EMOJIS[angle.type] || '💡'} <strong style={{ color: 'var(--text-primary)' }}>{angle.type}:</strong> {angle.hook}
                  </div>
                ))}
              </div>

              {/* Window */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{
                  ...badge,
                  background: (opp.window.includes('semana') ? URGENCY_COLORS.high : opp.window.includes('Cont') ? URGENCY_COLORS.medium : URGENCY_COLORS.low) + '18',
                  color: opp.window.includes('semana') ? URGENCY_COLORS.high : opp.window.includes('Cont') ? URGENCY_COLORS.medium : URGENCY_COLORS.low,
                }}>
                  {opp.window}
                </span>
              </div>

              {/* Bruno Advantage */}
              <div style={{ background: 'rgba(240, 186, 60, 0.08)', borderRadius: 'var(--radius)', padding: '8px 12px', borderLeft: '3px solid var(--accent-gold)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent-gold-dark)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>
                  Vantagem do Bruno
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {opp.brunoAdvantage}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
