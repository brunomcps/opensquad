import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useContentStore } from '../../store/useContentStore';

const wrapper: CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: '18px 22px',
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
  boxShadow: 'var(--shadow-sm)',
};

const title: CSSProperties = {
  fontSize: '15px',
  fontWeight: 700,
  color: 'var(--text-primary)',
  fontFamily: 'var(--font)',
};

const columns: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '12px',
};

const column: CSSProperties = {
  borderRadius: 'var(--radius-lg)',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const formatLabel: CSSProperties = {
  fontSize: '15px',
  fontWeight: 800,
  fontFamily: 'var(--font)',
};

const metricRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const metricLabel: CSSProperties = {
  fontSize: '13px',
  color: 'var(--text-secondary)',
};

const metricValue: CSSProperties = {
  fontSize: '15px',
  fontWeight: 700,
  color: 'var(--text-primary)',
  fontFamily: 'var(--font)',
};

const winner: CSSProperties = {
  fontSize: '10px',
  fontWeight: 800,
  padding: '2px 7px',
  borderRadius: '4px',
  textTransform: 'uppercase',
  fontFamily: 'var(--font)',
  letterSpacing: '0.03em',
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString('pt-BR');
}

export function FormatComparison() {
  const videos = useContentStore((s) => s.youtubeVideos);
  const tiktokVideos = useContentStore((s) => s.tiktokVideos);
  const instagramPosts = useContentStore((s) => s.instagramPosts);

  const stats = useMemo(() => {
    const publicVids = videos.filter((v) => v.privacyStatus === 'public');
    const longs = publicVids.filter((v) => !v.isShort);
    const shorts = publicVids.filter((v) => v.isShort);
    const ttPublished = tiktokVideos.filter((v) => v.viewCount > 0 || v.likeCount > 0);

    const calcYT = (vids: typeof publicVids) => {
      const totalViews = vids.reduce((s, v) => s + (v.viewCount || 0), 0);
      const totalLikes = vids.reduce((s, v) => s + (v.likeCount || 0), 0);
      const avgViews = vids.length > 0 ? Math.round(totalViews / vids.length) : 0;
      const eng = totalViews > 0 ? ((totalLikes / totalViews) * 100).toFixed(1) : '0';
      return { count: vids.length, totalViews, avgViews, engagement: eng };
    };

    const ttViews = ttPublished.reduce((s, v) => s + v.viewCount, 0);
    const ttLikes = ttPublished.reduce((s, v) => s + v.likeCount, 0);
    const ttShares = ttPublished.reduce((s, v) => s + v.shareCount, 0);

    return {
      long: calcYT(longs),
      short: calcYT(shorts),
      tiktok: {
        count: ttPublished.length,
        totalViews: ttViews,
        avgViews: ttPublished.length > 0 ? Math.round(ttViews / ttPublished.length) : 0,
        engagement: ttViews > 0 ? ((ttLikes / ttViews) * 100).toFixed(1) : '0',
        shares: ttShares,
      },
      instagram: {
        count: instagramPosts.length,
        totalViews: instagramPosts.reduce((s, p) => s + p.likeCount, 0),
        avgViews: instagramPosts.length > 0 ? Math.round(instagramPosts.reduce((s, p) => s + p.likeCount, 0) / instagramPosts.length) : 0,
        engagement: '—',
      },
    };
  }, [videos, tiktokVideos, instagramPosts]);

  const platforms = [
    { key: 'long', label: 'YT Longos', color: '#CC0000', bg: 'rgba(255,0,0,0.04)', border: 'rgba(255,0,0,0.12)', data: stats.long },
    { key: 'short', label: 'YT Shorts', color: '#FF4444', bg: 'rgba(255,102,102,0.04)', border: 'rgba(255,102,102,0.12)', data: stats.short },
    { key: 'tiktok', label: 'TikTok', color: '#00C4BD', bg: 'rgba(0,196,189,0.04)', border: 'rgba(0,196,189,0.12)', data: stats.tiktok },
    { key: 'instagram', label: 'Instagram', color: '#E1306C', bg: 'rgba(225,48,108,0.04)', border: 'rgba(225,48,108,0.12)', data: stats.instagram },
  ];

  const metrics = [
    { label: 'Quantidade', get: (d: any) => d.count, format: (n: number) => n.toString() },
    { label: 'Views Total', get: (d: any) => d.totalViews, format: formatNumber },
    { label: 'Views Media', get: (d: any) => d.avgViews, format: formatNumber },
    { label: 'Engagement', get: (d: any) => parseFloat(d.engagement), format: (n: number) => n.toFixed(1) + '%' },
  ];

  return (
    <div style={wrapper}>
      <div style={title}>Comparativo por plataforma</div>
      <div style={{ ...columns, gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {platforms.map((p) => {
          return (
            <div key={p.key} style={{ ...column, background: p.bg, border: `1px solid ${p.border}` }}>
              <span style={{ ...formatLabel, color: p.color }}>{p.label}</span>
              {metrics.map((m) => {
                const val = m.get(p.data);
                const allVals = platforms.map((pp) => m.get(pp.data));
                const isMax = val > 0 && val >= Math.max(...allVals);
                return (
                  <div key={m.label} style={metricRow}>
                    <span style={metricLabel}>{m.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={metricValue}>{m.format(val)}</span>
                      {isMax && allVals.filter((v) => v === val).length === 1 && (
                        <span style={{ ...winner, background: 'rgba(34,163,91,0.1)', color: 'var(--accent-green)' }}>melhor</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {p.key === 'tiktok' && (stats.tiktok as any).shares > 0 && (
                <div style={metricRow}>
                  <span style={metricLabel}>Shares</span>
                  <span style={metricValue}>{formatNumber((stats.tiktok as any).shares)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
