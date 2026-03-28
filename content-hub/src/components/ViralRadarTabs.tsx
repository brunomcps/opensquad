import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// ─── Shared styles ──────────────────────────────────────────────────────────

const cardStyle: CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
  padding: 16, boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 8,
};

const emptyStyle: CSSProperties = {
  textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 14,
};

const tagBadge = (color: string): CSSProperties => ({
  padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
  fontFamily: 'var(--font)', background: color, color: '#fff',
});

function formatNum(n: number | null): string {
  if (n == null) return '-';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString('pt-BR');
}

// ─── Tendências Tab ─────────────────────────────────────────────────────────

interface Trend {
  id: number;
  topic: string;
  keywords: string[];
  competitorsInvolved: { competitorId: string; competitorName: string; itemCount: number }[];
  signalCount: number;
  lifecycle: string;
  sampleItems: { id: string; title: string; url: string; platform: string; competitorName: string; views: number | null; zScore: number | null }[];
}

export function TrendTab() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);

  const fetchTrends = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/competitors/trends');
      if (res.ok) {
        const json = await res.json();
        setTrends(json.data || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const runDetection = async () => {
    setDetecting(true);
    try {
      const res = await fetch('/api/competitors/trends/detect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (res.ok) await fetchTrends();
    } catch (e) { console.error(e); }
    finally { setDetecting(false); }
  };

  useEffect(() => { fetchTrends(); }, []);

  const lifecycleColors: Record<string, string> = {
    emerging: '#3B82F6',
    growing: '#F59E0B',
    established: '#10B981',
  };

  if (loading) return <div style={emptyStyle}>Carregando tendências...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
          {trends.length} tendência{trends.length !== 1 ? 's' : ''} detectada{trends.length !== 1 ? 's' : ''}
        </div>
        <button
          onClick={runDetection}
          disabled={detecting}
          style={{
            padding: '8px 16px', borderRadius: 'var(--radius)', background: 'var(--accent-gold)',
            color: '#fff', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, border: 'none',
            cursor: detecting ? 'wait' : 'pointer', opacity: detecting ? 0.6 : 1,
          }}
        >
          {detecting ? 'Detectando...' : 'Detectar Tendências'}
        </button>
      </div>

      {trends.length === 0 ? (
        <div style={emptyStyle}>Nenhuma tendência detectada. Sincronize os concorrentes e clique em "Detectar Tendências".</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {trends.map(t => (
            <div key={t.id || t.topic} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font)', flex: 1 }}>
                  {t.topic}
                </span>
                <span style={tagBadge(lifecycleColors[t.lifecycle] || '#666')}>
                  {t.lifecycle}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                {t.signalCount} sinais &bull; {t.competitorsInvolved.length} concorrentes
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {t.competitorsInvolved.map(c => (
                  <span key={c.competitorId} style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, fontFamily: 'var(--font)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                    {c.competitorName} ({c.itemCount})
                  </span>
                ))}
              </div>
              {t.sampleItems.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                  {t.sampleItems.slice(0, 3).map(item => (
                    <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', textDecoration: 'none', padding: '2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{item.competitorName}:</span> {item.title} <span style={{ color: 'var(--text-muted)' }}>({formatNum(item.views)} views)</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Bruno Comparison Tab ───────────────────────────────────────────────────

interface Insight {
  type: 'gap' | 'overlap' | 'opportunity';
  topic: string;
  description: string;
  competitorData: { competitorId: string; competitorName: string; videoTitle: string; views: number | null; zScore: number | null; url: string }[];
  brunoData?: { videoTitle: string; views: number | null; url: string };
  gapMultiplier?: number;
}

export function ComparisonTab() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/competitors/comparison');
        if (res.ok) {
          const json = await res.json();
          setInsights(json.data || []);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const typeConfig: Record<string, { label: string; color: string; bg: string }> = {
    gap: { label: 'GAP', color: '#EF4444', bg: '#FEF2F2' },
    opportunity: { label: 'OPORTUNIDADE', color: '#F59E0B', bg: '#FFFBEB' },
    overlap: { label: 'OVERLAP', color: '#3B82F6', bg: '#EFF6FF' },
  };

  if (loading) return <div style={emptyStyle}>Analisando comparações...</div>;
  if (insights.length === 0) return <div style={emptyStyle}>Nenhuma comparação disponível. Sincronize concorrentes e o YouTube do Bruno para gerar insights.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
        {insights.filter(i => i.type === 'gap').length} gaps &bull; {insights.filter(i => i.type === 'opportunity').length} oportunidades
      </div>
      {insights.map((insight, idx) => {
        const cfg = typeConfig[insight.type] || typeConfig.overlap;
        return (
          <div key={idx} style={{ ...cardStyle, borderLeft: `4px solid ${cfg.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ ...tagBadge(cfg.color), fontSize: 10 }}>{cfg.label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)' }}>
                {insight.topic}
              </span>
              {insight.gapMultiplier && (
                <span style={{ fontSize: 12, color: cfg.color, fontWeight: 700, fontFamily: 'var(--font)' }}>
                  {insight.gapMultiplier.toFixed(0)}x
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', lineHeight: 1.5 }}>
              {insight.description}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
              {insight.competitorData.slice(0, 3).map((c, i) => (
                <a key={i} href={c.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none', fontFamily: 'var(--font-body)' }}>
                  <strong>{c.competitorName}</strong>: {c.videoTitle} ({formatNum(c.views)} views, z={c.zScore})
                </a>
              ))}
              {insight.brunoData && (
                <a href={insight.brunoData.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--accent-gold-dark)', textDecoration: 'none', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                  Bruno: {insight.brunoData.videoTitle} ({formatNum(insight.brunoData.views)} views)
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Bookmarks Tab ──────────────────────────────────────────────────────────

interface Bookmark {
  id: number;
  competitorId: string;
  videoId: string;
  platform: string;
  title: string;
  url: string;
  thumbnail: string;
  tag: string;
  notes: string;
  savedAt: string;
}

export function BookmarksTab() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [tagFilter, setTagFilter] = useState<string>('');

  const fetchBookmarks = async () => {
    setLoading(true);
    try {
      const url = tagFilter ? `/api/competitors/bookmarks?tag=${tagFilter}` : '/api/competitors/bookmarks';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setBookmarks(json.data || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBookmarks(); }, [tagFilter]);

  const removeBookmark = async (b: Bookmark) => {
    try {
      await fetch(`/api/competitors/bookmarks/${b.competitorId}/${b.videoId}`, { method: 'DELETE' });
      setBookmarks(prev => prev.filter(x => !(x.competitorId === b.competitorId && x.videoId === b.videoId)));
    } catch (e) { console.error(e); }
  };

  const tags = ['', 'modelar', 'evitar', 'referência'];
  const tagColors: Record<string, string> = { modelar: '#10B981', evitar: '#EF4444', referência: '#3B82F6' };

  if (loading) return <div style={emptyStyle}>Carregando salvos...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {tags.map(t => (
          <button
            key={t || 'all'}
            onClick={() => setTagFilter(t)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border)',
              background: tagFilter === t ? 'var(--accent-gold)' : 'var(--bg-card)',
              color: tagFilter === t ? '#fff' : 'var(--text-secondary)',
              fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12, cursor: 'pointer',
            }}
          >
            {t || 'Todos'}
          </button>
        ))}
      </div>

      {bookmarks.length === 0 ? (
        <div style={emptyStyle}>Nenhum item salvo{tagFilter ? ` com tag "${tagFilter}"` : ''}. Salve conteúdos do Feed para revisitar depois.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {bookmarks.map(b => (
            <div key={b.id} style={{ ...cardStyle, position: 'relative' }}>
              {b.thumbnail && b.platform === 'youtube' && (
                <a href={b.url} target="_blank" rel="noopener noreferrer">
                  <img src={b.thumbnail} alt="" style={{ width: '100%', borderRadius: 'var(--radius)', aspectRatio: '16/9', objectFit: 'cover' }} loading="lazy" />
                </a>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={tagBadge(tagColors[b.tag] || '#666')}>{b.tag}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>{b.competitorId}</span>
              </div>
              <a href={b.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)', lineHeight: 1.35, textDecoration: 'none' }}>
                {b.title || '(sem título)'}
              </a>
              {b.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>{b.notes}</div>}
              <button
                onClick={() => removeBookmark(b)}
                style={{ position: 'absolute', top: 8, right: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '2px 8px', fontSize: 11, cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Comments Viewer Tab ────────────────────────────────────────────────────

interface CommentData {
  videoId: string;
  fetchedAt: string;
  totalComments: number;
  comments: { text: string; author: string; likeCount?: number; publishedAt?: string }[];
}

export function CommentsTab() {
  const [competitorId, setCompetitorId] = useState('');
  const [videoId, setVideoId] = useState('');
  const [comments, setComments] = useState<CommentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [competitors, setCompetitors] = useState<{ id: string; name: string }[]>([]);
  const [videos, setVideos] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/competitors/registry');
        if (res.ok) {
          const json = await res.json();
          const comps = json.data?.competitors || [];
          setCompetitors(comps.map((c: any) => ({ id: c.id, name: c.name })));
          if (comps.length > 0) setCompetitorId(comps[0].id);
        }
      } catch (e) { console.error(e); }
    })();
  }, []);

  useEffect(() => {
    if (!competitorId) return;
    (async () => {
      try {
        const res = await fetch(`/api/competitors/${competitorId}`);
        if (res.ok) {
          const json = await res.json();
          const platformData = json.data || {};
          const allVideos: { id: string; title: string }[] = [];
          for (const data of Object.values(platformData) as any[]) {
            for (const item of (data.items || [])) {
              if (item.id) allVideos.push({ id: item.id, title: item.title || item.id });
            }
          }
          setVideos(allVideos.slice(0, 50));
          setVideoId('');
          setComments(null);
        }
      } catch (e) { console.error(e); }
    })();
  }, [competitorId]);

  const fetchComments = async () => {
    if (!competitorId || !videoId) return;
    setLoading(true);
    try {
      // Try GET first (cached)
      let res = await fetch(`/api/competitors/${competitorId}/comments/${videoId}`);
      let json = res.ok ? await res.json() : null;
      if (json?.data) {
        setComments(json.data);
      } else {
        // Fetch fresh
        res = await fetch(`/api/competitors/${competitorId}/comments/${videoId}`, { method: 'POST' });
        json = res.ok ? await res.json() : null;
        if (json?.data) setComments(json.data);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const selectStyle: CSSProperties = {
    padding: '7px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
    background: 'var(--bg-card)', color: 'var(--text-primary)', fontFamily: 'var(--font)',
    fontSize: 13, cursor: 'pointer', minWidth: 200,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={competitorId} onChange={e => setCompetitorId(e.target.value)} style={selectStyle}>
          {competitors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={videoId} onChange={e => setVideoId(e.target.value)} style={{ ...selectStyle, minWidth: 300 }}>
          <option value="">Selecionar vídeo...</option>
          {videos.map(v => <option key={v.id} value={v.id}>{v.title.slice(0, 60)}</option>)}
        </select>
        <button
          onClick={fetchComments}
          disabled={!videoId || loading}
          style={{
            padding: '8px 16px', borderRadius: 'var(--radius)', background: 'var(--accent-gold)',
            color: '#fff', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, border: 'none',
            cursor: !videoId || loading ? 'not-allowed' : 'pointer', opacity: !videoId || loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Buscando...' : 'Ver Comentários'}
        </button>
      </div>

      {comments && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            {comments.totalComments} comentários (mostrando {comments.comments.length})
          </div>
          {comments.comments.map((c, i) => (
            <div key={i} style={{ ...cardStyle, padding: '10px 14px', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)' }}>{c.author}</span>
                {c.likeCount != null && c.likeCount > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>♡ {c.likeCount}</span>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', lineHeight: 1.5 }}>
                {c.text}
              </div>
            </div>
          ))}
        </div>
      )}

      {!comments && !loading && (
        <div style={emptyStyle}>Selecione um concorrente e vídeo para ver os comentários.</div>
      )}
    </div>
  );
}

// ─── Evolution Tab (Temporal Charts) ────────────────────────────────────────

const CHART_COLORS = ['#F0BA3C', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899'];

export function EvolutionTab() {
  const [competitors, setCompetitors] = useState<{ id: string; name: string; platforms: string[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState('youtube');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/competitors/registry');
        if (res.ok) {
          const json = await res.json();
          const comps = (json.data?.competitors || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            platforms: Object.keys(c.platforms || {}),
          }));
          setCompetitors(comps);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (competitors.length === 0) return;
    (async () => {
      // Fetch history for all competitors for selected platform
      const histories: Record<string, any[]> = {};
      for (const comp of competitors) {
        if (!comp.platforms.includes(selectedPlatform)) continue;
        try {
          const res = await fetch(`/api/competitors/${comp.id}/${selectedPlatform}/history`);
          if (res.ok) {
            const json = await res.json();
            histories[comp.id] = json.data || [];
          }
        } catch { /* skip */ }
      }

      // Merge into chart-friendly format
      const dateMap = new Map<string, Record<string, number>>();
      for (const [compId, entries] of Object.entries(histories)) {
        for (const entry of entries) {
          const date = (entry.syncedAt || '').slice(0, 10);
          if (!date) continue;
          if (!dateMap.has(date)) dateMap.set(date, {});
          dateMap.get(date)![compId] = entry.followers || 0;
        }
      }

      const sorted = Array.from(dateMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, values]) => ({ date, ...values }));

      setChartData(sorted);
    })();
  }, [competitors, selectedPlatform]);

  const platforms = ['youtube', 'instagram', 'tiktok', 'twitter'];
  const platformLabels: Record<string, string> = { youtube: 'YouTube', instagram: 'Instagram', tiktok: 'TikTok', twitter: 'X' };

  if (loading) return <div style={emptyStyle}>Carregando...</div>;

  const activeCompetitors = competitors.filter(c => c.platforms.includes(selectedPlatform));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {platforms.map(p => (
          <button
            key={p}
            onClick={() => setSelectedPlatform(p)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border)',
              background: selectedPlatform === p ? 'var(--accent-gold)' : 'var(--bg-card)',
              color: selectedPlatform === p ? '#fff' : 'var(--text-secondary)',
              fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12, cursor: 'pointer',
            }}
          >
            {platformLabels[p] || p}
          </button>
        ))}
      </div>

      {chartData.length === 0 ? (
        <div style={emptyStyle}>
          Nenhum histórico disponível para {platformLabels[selectedPlatform]}. Sincronize os concorrentes periodicamente para acumular dados de evolução.
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)', marginBottom: 16 }}>
            Evolução de Seguidores — {platformLabels[selectedPlatform]}
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" fontSize={11} stroke="var(--text-muted)" />
              <YAxis fontSize={11} stroke="var(--text-muted)" tickFormatter={(v: number) => formatNum(v)} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(value: number) => [formatNum(value), '']}
              />
              <Legend />
              {activeCompetitors.map((comp, i) => (
                <Line
                  key={comp.id}
                  type="monotone"
                  dataKey={comp.id}
                  name={comp.name}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
