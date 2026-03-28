import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import type { VideoAnalytics, CommentsData } from '../types/content';

interface VideoPerformance {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnail: string;
  analytics: VideoAnalytics['metrics'] | null;
  commentsSummary: CommentsData['categorySummary'] | null;
  totalComments: number;
}

const container: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '20px' };

const syncBar: CSSProperties = {
  display: 'flex', gap: '8px', alignItems: 'center',
};

const syncBtn: CSSProperties = {
  padding: '8px 16px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  background: 'var(--bg-secondary)',
  color: 'var(--text-secondary)',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'var(--font)',
  transition: 'all var(--transition)',
};

const overviewGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
  gap: '12px',
};

const metricCard: CSSProperties = {
  padding: '14px 16px',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  display: 'flex', flexDirection: 'column', gap: '4px',
};

const metricLabel: CSSProperties = {
  fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)',
};

const metricValue: CSSProperties = {
  fontSize: '20px', fontWeight: 800, color: 'var(--accent-gold-dark)',
  fontFamily: 'var(--font)', fontVariantNumeric: 'tabular-nums',
};

const tableWrapper: CSSProperties = {
  overflowX: 'auto',
};

const table: CSSProperties = {
  width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'var(--font-body)',
};

const th: CSSProperties = {
  padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid var(--border)',
  fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase',
  letterSpacing: '0.5px', fontFamily: 'var(--font)',
};

const td: CSSProperties = {
  padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)',
};

const thumbCell: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '10px',
};

const thumbImg: CSSProperties = {
  width: '80px', height: '45px', borderRadius: '4px', objectFit: 'cover',
};

const categoryColors: Record<string, string> = {
  identification: '#8B5CF6',
  testimony: '#3B82F6',
  question: '#F59E0B',
  gratitude: '#10B981',
  objection: '#EF4444',
  sharing: '#EC4899',
  uncategorized: '#6B7280',
};

const categoryLabels: Record<string, string> = {
  identification: 'Identificacao',
  testimony: 'Testemunho',
  question: 'Pergunta',
  gratitude: 'Gratidao',
  objection: 'Objecao',
  sharing: 'Compartilhamento',
  uncategorized: 'Sem categoria',
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('pt-BR');
}

function formatMinutes(min: number): string {
  if (min >= 60) return `${(min / 60).toFixed(0)}h ${Math.round(min % 60)}m`;
  return `${Math.round(min)}m`;
}

type SortKey = 'title' | 'views' | 'watchTime' | 'avgView' | 'likes' | 'comments' | 'shares' | 'subs';

export function PerformanceAnalysis() {
  const [videos, setVideos] = useState<VideoPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('views');
  const [sortAsc, setSortAsc] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ytRes, analyticsRes, commentsListRes] = await Promise.all([
        fetch('/api/youtube/videos'),
        fetch('/api/yt-analytics'),
        fetch('/api/fichas'), // just to get video list
      ]);
      const ytData = await ytRes.json();
      const analyticsData = await analyticsRes.json();

      const ytVideos = (ytData.videos || []).filter((v: any) => !v.isShort);
      const analyticsMap = new Map<string, any>();
      if (analyticsData.ok) {
        for (const a of analyticsData.analytics || []) {
          analyticsMap.set(a.videoId, a);
        }
      }

      // Fetch comments summary for each video that has one
      const commentsMap = new Map<string, any>();
      for (const v of ytVideos) {
        try {
          const cRes = await fetch(`/api/comments/${v.id}`);
          const cData = await cRes.json();
          if (cData.ok) commentsMap.set(v.id, cData);
        } catch { /* skip */ }
      }

      const merged: VideoPerformance[] = ytVideos.map((v: any) => {
        const a = analyticsMap.get(v.id);
        const c = commentsMap.get(v.id);
        return {
          videoId: v.id,
          title: v.title,
          publishedAt: v.publishedAt,
          thumbnail: v.thumbnail,
          analytics: a?.metrics || null,
          commentsSummary: c?.categorySummary || null,
          totalComments: c?.totalComments || 0,
        };
      });

      setVideos(merged);
    } catch (e) {
      console.error('Failed to fetch performance data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSync = async (type: 'analytics' | 'comments') => {
    setSyncing(type);
    try {
      const endpoint = type === 'analytics' ? '/api/yt-analytics/sync' : '/api/comments/sync';
      await fetch(endpoint, { method: 'POST' });
      // Wait a bit then refresh
      setTimeout(() => { fetchAll(); setSyncing(null); }, 3000);
    } catch { setSyncing(null); }
  };

  // Aggregated metrics
  const totals = videos.reduce((acc, v) => {
    if (v.analytics) {
      acc.views += v.analytics.views;
      acc.watchTime += v.analytics.estimatedMinutesWatched;
      acc.likes += v.analytics.likes;
      acc.comments += v.analytics.comments;
      acc.shares += v.analytics.shares;
      acc.subs += v.analytics.subscribersGained;
      acc.count++;
      acc.avgViewPctSum += v.analytics.averageViewPercentage;
    }
    return acc;
  }, { views: 0, watchTime: 0, likes: 0, comments: 0, shares: 0, subs: 0, count: 0, avgViewPctSum: 0 });

  // Comment category totals
  const categoryTotals: Record<string, number> = {};
  for (const v of videos) {
    if (v.commentsSummary) {
      for (const [cat, count] of Object.entries(v.commentsSummary)) {
        categoryTotals[cat] = (categoryTotals[cat] || 0) + count;
      }
    }
  }
  const totalCategorized = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

  // Sorting
  const sorted = [...videos].sort((a, b) => {
    const getVal = (v: VideoPerformance): number => {
      switch (sortKey) {
        case 'title': return 0;
        case 'views': return v.analytics?.views || 0;
        case 'watchTime': return v.analytics?.estimatedMinutesWatched || 0;
        case 'avgView': return v.analytics?.averageViewPercentage || 0;
        case 'likes': return v.analytics?.likes || 0;
        case 'comments': return v.totalComments;
        case 'shares': return v.analytics?.shares || 0;
        case 'subs': return v.analytics?.subscribersGained || 0;
      }
    };
    if (sortKey === 'title') {
      return sortAsc ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
    }
    const diff = getVal(a) - getVal(b);
    return sortAsc ? diff : -diff;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sortArrow = (key: SortKey) => sortKey === key ? (sortAsc ? ' ↑' : ' ↓') : '';

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando dados de performance...</div>;

  return (
    <div style={container}>
      {/* Sync buttons */}
      <div style={syncBar}>
        <button style={syncBtn} onClick={() => handleSync('analytics')} disabled={!!syncing}>
          {syncing === 'analytics' ? 'Sincronizando...' : 'Sync Analytics'}
        </button>
        <button style={syncBtn} onClick={() => handleSync('comments')} disabled={!!syncing}>
          {syncing === 'comments' ? 'Sincronizando...' : 'Sync Comentarios'}
        </button>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {videos.filter(v => v.analytics).length}/{videos.length} com analytics
          {' | '}
          {videos.filter(v => v.commentsSummary).length}/{videos.length} com comentarios
        </span>
      </div>

      {/* Overview metrics */}
      {totals.count > 0 && (
        <div style={overviewGrid}>
          <div style={metricCard}>
            <span style={metricLabel}>Views totais</span>
            <span style={metricValue}>{formatNumber(totals.views)}</span>
          </div>
          <div style={metricCard}>
            <span style={metricLabel}>Watch time</span>
            <span style={metricValue}>{formatMinutes(totals.watchTime)}</span>
          </div>
          <div style={metricCard}>
            <span style={metricLabel}>Retencao media</span>
            <span style={metricValue}>{totals.count ? (totals.avgViewPctSum / totals.count).toFixed(1) : 0}%</span>
          </div>
          <div style={metricCard}>
            <span style={metricLabel}>Likes</span>
            <span style={metricValue}>{formatNumber(totals.likes)}</span>
          </div>
          <div style={metricCard}>
            <span style={metricLabel}>Comentarios</span>
            <span style={metricValue}>{formatNumber(totals.comments)}</span>
          </div>
          <div style={metricCard}>
            <span style={metricLabel}>Shares</span>
            <span style={metricValue}>{formatNumber(totals.shares)}</span>
          </div>
          <div style={metricCard}>
            <span style={metricLabel}>Inscritos ganhos</span>
            <span style={metricValue}>{formatNumber(totals.subs)}</span>
          </div>
        </div>
      )}

      {/* Comment categories breakdown */}
      {totalCategorized > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'var(--font)' }}>
            Comentarios ({totalCategorized}):
          </span>
          {Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
            <span key={cat} style={{
              padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
              background: `${categoryColors[cat] || '#6B7280'}20`,
              color: categoryColors[cat] || '#6B7280',
              fontFamily: 'var(--font)',
            }}>
              {categoryLabels[cat] || cat} {count} ({(count / totalCategorized * 100).toFixed(0)}%)
            </span>
          ))}
        </div>
      )}

      {/* Video performance table */}
      <div style={tableWrapper}>
        <table style={table}>
          <thead>
            <tr>
              <th style={{ ...th, cursor: 'pointer' }} onClick={() => handleSort('title')}>Video{sortArrow('title')}</th>
              <th style={{ ...th, cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('views')}>Views{sortArrow('views')}</th>
              <th style={{ ...th, cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('watchTime')}>Watch Time{sortArrow('watchTime')}</th>
              <th style={{ ...th, cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('avgView')}>Retencao{sortArrow('avgView')}</th>
              <th style={{ ...th, cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('likes')}>Likes{sortArrow('likes')}</th>
              <th style={{ ...th, cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('comments')}>Coments{sortArrow('comments')}</th>
              <th style={{ ...th, cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('shares')}>Shares{sortArrow('shares')}</th>
              <th style={{ ...th, cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('subs')}>+Subs{sortArrow('subs')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((v) => (
              <tr key={v.videoId} style={{ transition: 'background 0.15s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <td style={td}>
                  <div style={thumbCell}>
                    <img src={v.thumbnail} alt="" style={thumbImg} />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {v.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {new Date(v.publishedAt).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {v.analytics ? formatNumber(v.analytics.views) : '-'}
                </td>
                <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {v.analytics ? formatMinutes(v.analytics.estimatedMinutesWatched) : '-'}
                </td>
                <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {v.analytics ? `${v.analytics.averageViewPercentage.toFixed(1)}%` : '-'}
                </td>
                <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {v.analytics ? formatNumber(v.analytics.likes) : '-'}
                </td>
                <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {v.totalComments > 0 ? formatNumber(v.totalComments) : '-'}
                </td>
                <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {v.analytics ? formatNumber(v.analytics.shares) : '-'}
                </td>
                <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {v.analytics ? `+${v.analytics.subscribersGained}` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
