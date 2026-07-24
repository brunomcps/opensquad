import { useState, useMemo, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useContentStore } from '../../store/useContentStore';

const wrapper: CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)', padding: '18px 22px',
  boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column',
};

const header: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '6px',
};

const title: CSSProperties = { fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)' };

const controlsRow: CSSProperties = { display: 'flex', gap: '6px', alignItems: 'center' };

const toggleGroup: CSSProperties = {
  display: 'flex', gap: '2px', background: 'var(--bg-primary)', borderRadius: 'var(--radius)', padding: '3px',
};

const toggleBtn: CSSProperties = {
  background: 'transparent', border: 'none', borderRadius: '6px', color: 'var(--text-muted)',
  padding: '4px 10px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font)',
};

const toggleActive: CSSProperties = {
  ...toggleBtn, background: 'var(--bg-card)', color: 'var(--accent-gold-dark)', fontWeight: 700, boxShadow: 'var(--shadow-sm)',
};

const listStyle: CSSProperties = { flex: 1, overflow: 'hidden' };

const row: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0',
  borderBottom: '1px solid var(--border)', overflow: 'hidden', maxWidth: '100%',
};

const rank: CSSProperties = {
  fontSize: '14px', fontWeight: 800, width: '22px', textAlign: 'center', flexShrink: 0, fontFamily: 'var(--font)',
};

const thumb: CSSProperties = {
  width: '60px', height: '34px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0,
};

const info: CSSProperties = { flex: 1, minWidth: 0 };

const videoTitle: CSSProperties = {
  fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden',
  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

const meta: CSSProperties = {
  fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', marginTop: '2px',
};

const metricVal: CSSProperties = {
  fontSize: '13px', fontWeight: 800, color: 'var(--accent-gold-dark)', textAlign: 'right',
  minWidth: '50px', flexShrink: 0, fontFamily: 'var(--font)',
};

const seeMoreBtn: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
  marginTop: '10px', padding: '8px', width: '100%',
  background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600,
  cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all var(--transition)',
};

// Modal
const modalOverlay: CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
  animation: 'fadeIn 0.15s ease',
};
const modalPanel: CSSProperties = {
  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)',
  padding: '24px 28px', maxWidth: '750px', width: '100%', maxHeight: '85vh',
  display: 'flex', flexDirection: 'column',
};
const modalHeader: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px',
};
const modalTitle: CSSProperties = { fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font)' };
const closeBtn: CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '50%',
  width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', fontSize: '16px', color: 'var(--text-secondary)', fontFamily: 'var(--font)',
};
const modalList: CSSProperties = { overflowY: 'auto', flex: 1 };

// Types
type SortBy = 'views' | 'likes' | 'engagement';
type PlatFilter = 'all' | 'youtube' | 'shorts' | 'tiktok';

interface UnifiedVideo {
  id: string;
  title: string;
  thumbnail: string;
  viewCount: number;
  likeCount: number;
  platform: 'yt-long' | 'yt-short' | 'tiktok';
  platformLabel: string;
  platformColor: string;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString('pt-BR');
}

function buildUnifiedList(videos: any[], tiktokVideos: any[], contentGroups: any[]): UnifiedVideo[] {
  const all: UnifiedVideo[] = [];

  // Build TikTok ID → YouTube title map from content groups
  const ttToYtTitle: Record<string, string> = {};
  for (const g of contentGroups) {
    if (g.platforms?.tiktok?.videoId && g.platforms?.youtube?.videoId) {
      const ytVideo = videos.find((v: any) => v.id === g.platforms.youtube.videoId);
      if (ytVideo) {
        ttToYtTitle[g.platforms.tiktok.videoId] = ytVideo.title;
      }
    }
  }

  for (const v of videos) {
    if (v.privacyStatus !== 'public') continue;
    all.push({
      id: v.id, title: v.title, thumbnail: v.thumbnail,
      viewCount: v.viewCount || 0, likeCount: v.likeCount || 0,
      platform: v.isShort ? 'yt-short' : 'yt-long',
      platformLabel: v.isShort ? 'Short' : 'YT',
      platformColor: v.isShort ? '#FF4444' : '#CC0000',
    });
  }

  for (const v of tiktokVideos) {
    if (v.viewCount === 0 && v.likeCount === 0) continue;
    // Use YouTube title if linked, otherwise clean TikTok title
    let ttTitle = ttToYtTitle[v.id] || v.title;
    ttTitle = ttTitle.replace(/#\w+/g, '').trim();
    if (ttTitle.length > 80) ttTitle = ttTitle.slice(0, 80) + '...';
    all.push({
      id: `tt-${v.id}`, title: ttTitle, thumbnail: v.thumbnail,
      viewCount: v.viewCount, likeCount: v.likeCount,
      platform: 'tiktok', platformLabel: 'TikTok', platformColor: '#00C4BD',
    });
  }

  return all;
}

function sortList(list: UnifiedVideo[], sortBy: SortBy): UnifiedVideo[] {
  return [...list].sort((a, b) => {
    if (sortBy === 'views') return b.viewCount - a.viewCount;
    if (sortBy === 'likes') return b.likeCount - a.likeCount;
    const engA = a.viewCount > 0 ? a.likeCount / a.viewCount : 0;
    const engB = b.viewCount > 0 ? b.likeCount / b.viewCount : 0;
    return engB - engA;
  });
}

function filterByPlatform(list: UnifiedVideo[], plat: PlatFilter): UnifiedVideo[] {
  if (plat === 'all') return list;
  if (plat === 'youtube') return list.filter((v) => v.platform === 'yt-long');
  if (plat === 'shorts') return list.filter((v) => v.platform === 'yt-short');
  if (plat === 'tiktok') return list.filter((v) => v.platform === 'tiktok');
  return list;
}

function VideoRow({ v, i, sortBy }: { v: UnifiedVideo; i: number; sortBy: SortBy }) {
  const eng = v.viewCount > 0 ? ((v.likeCount / v.viewCount) * 100).toFixed(1) : '0';
  const mainMetric =
    sortBy === 'views' ? formatNumber(v.viewCount) :
    sortBy === 'likes' ? formatNumber(v.likeCount) :
    `${eng}%`;

  return (
    <div style={row}>
      <span style={{ ...rank, color: i < 3 ? 'var(--accent-gold-dark)' : 'var(--text-muted)' }}>{i + 1}</span>
      {v.thumbnail && <img src={v.thumbnail} alt="" style={thumb} />}
      <div style={info}>
        <div style={videoTitle}>{v.title}</div>
        <div style={meta}>
          <span>{formatNumber(v.viewCount)} views</span>
          <span>{eng}% eng</span>
          <span style={{ color: v.platformColor, fontWeight: 600 }}>{v.platformLabel}</span>
        </div>
      </div>
      <span style={metricVal}>{mainMetric}</span>
    </div>
  );
}

export function TopVideosCompact() {
  const videos = useContentStore((s) => s.youtubeVideos);
  const tiktokVideos = useContentStore((s) => s.tiktokVideos);
  const [sortBy, setSortBy] = useState<SortBy>('views');
  const [platFilter, setPlatFilter] = useState<PlatFilter>('all');
  const [showModal, setShowModal] = useState(false);
  const [contentGroups, setContentGroups] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/crosspost/groups')
      .then((r) => r.json())
      .then((d) => { if (d.ok) setContentGroups(d.groups); })
      .catch(() => {});
  }, []);

  const allVideos = useMemo(() => buildUnifiedList(videos, tiktokVideos, contentGroups), [videos, tiktokVideos, contentGroups]);

  const filtered = useMemo(() =>
    sortList(filterByPlatform(allVideos, platFilter), sortBy),
  [allVideos, platFilter, sortBy]);

  const top10 = filtered.slice(0, 10);

  return (
    <>
      <div style={wrapper}>
        <div style={header}>
          <span style={title}>Top Videos</span>
          <div style={controlsRow}>
            <div style={toggleGroup}>
              {([['all', 'Todos'], ['youtube', 'YT'], ['shorts', 'Shorts'], ['tiktok', 'TikTok']] as [PlatFilter, string][]).map(([val, label]) => (
                <button key={val} style={platFilter === val ? toggleActive : toggleBtn} onClick={() => setPlatFilter(val)}>
                  {label}
                </button>
              ))}
            </div>
            <div style={toggleGroup}>
              {(['views', 'likes', 'engagement'] as SortBy[]).map((s) => (
                <button key={s} style={sortBy === s ? toggleActive : toggleBtn} onClick={() => setSortBy(s)}>
                  {s === 'views' ? 'Views' : s === 'likes' ? 'Likes' : 'Eng%'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={listStyle}>
          {top10.map((v, i) => <VideoRow key={v.id} v={v} i={i} sortBy={sortBy} />)}
          {top10.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '20px', textAlign: 'center' }}>
              Sem videos nessa plataforma
            </div>
          )}
        </div>

        {filtered.length > 10 && (
          <button style={seeMoreBtn} onClick={() => setShowModal(true)}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; e.currentTarget.style.color = 'var(--accent-gold-dark)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            Ver todos ({filtered.length}) →
          </button>
        )}
      </div>

      {/* Full list modal */}
      {showModal && (
        <div style={modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={modalPanel}>
            <div style={modalHeader}>
              <div>
                <div style={modalTitle}>Todos os videos ({filtered.length})</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {platFilter === 'all' ? 'Todas as plataformas' : platFilter === 'youtube' ? 'YouTube Longos' : platFilter === 'shorts' ? 'YouTube Shorts' : 'TikTok'}
                  {' · ordenado por '}{sortBy === 'views' ? 'views' : sortBy === 'likes' ? 'likes' : 'engagement'}
                </div>
              </div>
              <button style={closeBtn} onClick={() => setShowModal(false)}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              >✕</button>
            </div>
            <div style={modalList}>
              {filtered.map((v, i) => <VideoRow key={v.id} v={v} i={i} sortBy={sortBy} />)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
