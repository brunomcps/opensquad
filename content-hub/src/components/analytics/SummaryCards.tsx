import type { CSSProperties } from 'react';
import { useContentStore } from '../../store/useContentStore';

const container: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, 1fr)',
  gap: '14px',
};

const card: CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: '18px 22px',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  boxShadow: 'var(--shadow-sm)',
  transition: 'all var(--transition)',
};

const labelStyle: CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  fontFamily: 'var(--font)',
};

const valueStyle: CSSProperties = {
  fontSize: '32px',
  fontWeight: 800,
  color: 'var(--text-primary)',
  lineHeight: 1.1,
  fontFamily: 'var(--font)',
  letterSpacing: '-0.02em',
};

const subStyle: CSSProperties = {
  fontSize: '13px',
  color: 'var(--text-secondary)',
  marginTop: '2px',
};

function formatBigNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString('pt-BR');
}

export function SummaryCards() {
  const channelStats = useContentStore((s) => s.channelStats);
  const videos = useContentStore((s) => s.youtubeVideos);
  const tiktokVideos = useContentStore((s) => s.tiktokVideos);
  const instagramPosts = useContentStore((s) => s.instagramPosts);

  const publicYT = videos.filter((v) => v.privacyStatus === 'public');
  const publishedTT = tiktokVideos.filter((v) => v.viewCount > 0 || v.likeCount > 0);

  const ytViews = publicYT.reduce((s, v) => s + (v.viewCount || 0), 0);
  const ytLikes = publicYT.reduce((s, v) => s + (v.likeCount || 0), 0);
  const ttViews = publishedTT.reduce((s, v) => s + v.viewCount, 0);
  const ttLikes = publishedTT.reduce((s, v) => s + v.likeCount, 0);
  const igLikes = instagramPosts.reduce((s, p) => s + p.likeCount, 0);

  const totalLikes = ytLikes + ttLikes + igLikes;
  const totalViews = ytViews + ttViews;
  const engagementRate = totalViews > 0 ? ((totalLikes / totalViews) * 100).toFixed(1) : '0';

  const totalContent = (channelStats?.videoCount || 0) + tiktokVideos.length + instagramPosts.length;

  return (
    <div style={container}>
      <div style={card}>
        <span style={labelStyle}>Inscritos YT</span>
        <span style={valueStyle}>
          {channelStats ? formatBigNumber(channelStats.subscriberCount) : '—'}
        </span>
        <span style={subStyle}>no canal YouTube</span>
      </div>

      <div style={card}>
        <span style={labelStyle}>Views Total</span>
        <span style={{ ...valueStyle, color: 'var(--accent-gold-dark)' }}>
          {formatBigNumber(totalViews)}
        </span>
        <span style={subStyle}>YT {formatBigNumber(ytViews)} · TT {formatBigNumber(ttViews)} · IG {formatBigNumber(igLikes)} likes</span>
      </div>

      <div style={card}>
        <span style={labelStyle}>Videos</span>
        <span style={valueStyle}>
          {formatBigNumber(totalContent)}
        </span>
        <span style={subStyle}>
          YT {videos.length} · TT {tiktokVideos.length} · IG {instagramPosts.length}
        </span>
      </div>

      <div style={card}>
        <span style={labelStyle}>Engagement</span>
        <span style={{ ...valueStyle, color: 'var(--accent-green)' }}>
          {engagementRate}%
        </span>
        <span style={subStyle}>likes / views (cross-platform)</span>
      </div>

      <div style={card}>
        <span style={labelStyle}>TT Shares</span>
        <span style={{ ...valueStyle, color: '#00C4BD' }}>
          {formatBigNumber(publishedTT.reduce((s, v) => s + v.shareCount, 0))}
        </span>
        <span style={subStyle}>compartilhamentos TikTok</span>
      </div>
    </div>
  );
}
