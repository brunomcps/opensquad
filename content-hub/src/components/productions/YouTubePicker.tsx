import { useState, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useContentStore } from '../../store/useContentStore';

const backdrop: CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const dialog: CSSProperties = {
  position: 'relative',
  background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
  padding: '28px', width: '700px', maxHeight: '80vh',
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  display: 'flex', flexDirection: 'column', gap: '16px',
};

const titleStyle: CSSProperties = {
  fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font)',
};

const closeBtn: CSSProperties = {
  position: 'absolute', top: '16px', right: '16px', background: 'transparent',
  border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer',
  lineHeight: 1, padding: '4px',
};

const searchInput: CSSProperties = {
  width: '100%', padding: '10px 14px', fontSize: '14px', fontFamily: 'var(--font-body)',
  background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
};

const listWrap: CSSProperties = {
  overflowY: 'auto', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '6px',
};

const videoRow = (hovered: boolean): CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px',
  background: hovered ? 'rgba(240,186,60,0.08)' : 'var(--bg-card)',
  border: `1px solid ${hovered ? 'var(--accent-gold)' : 'var(--border)'}`,
  borderRadius: 'var(--radius)', cursor: 'pointer',
  transition: 'all 0.15s',
});

const thumbStyle: CSSProperties = {
  width: '120px', height: '68px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0,
  background: '#000',
};

const infoArea: CSSProperties = {
  flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden',
};

const videoTitle: CSSProperties = {
  fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font)',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

const videoMeta: CSSProperties = {
  fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)',
  display: 'flex', gap: '10px',
};

const emptyState: CSSProperties = {
  textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '14px',
};

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('pt-BR');
}

function formatViews(n?: number): string {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString('pt-BR');
}

interface YouTubePickerProps {
  onSelect: (videoId: string, videoTitle: string) => void;
  onClose: () => void;
}

export function YouTubePicker({ onSelect, onClose }: YouTubePickerProps) {
  const videos = useContentStore((s) => s.youtubeVideos);
  const [search, setSearch] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const sorted = [...videos].sort((a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter((v) => v.title.toLowerCase().includes(q));
  }, [videos, search]);

  return (
    <div style={backdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={dialog}>
        <button style={closeBtn} onClick={onClose}>✕</button>
        <span style={titleStyle}>Vincular ao vídeo do YouTube</span>

        <input
          style={searchInput}
          placeholder="Buscar por título..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        <div style={listWrap}>
          {filtered.length === 0 ? (
            <div style={emptyState}>
              {videos.length === 0
                ? 'Nenhum vídeo carregado. Atualize a Timeline primeiro.'
                : 'Nenhum vídeo encontrado.'}
            </div>
          ) : (
            filtered.map((v) => (
              <div
                key={v.id}
                style={videoRow(hoveredId === v.id)}
                onClick={() => onSelect(v.id, v.title)}
                onMouseEnter={() => setHoveredId(v.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <img src={v.thumbnail} alt="" style={thumbStyle} loading="lazy" />
                <div style={infoArea}>
                  <div style={videoTitle}>{v.title}</div>
                  <div style={videoMeta}>
                    <span>{formatDate(v.publishedAt)}</span>
                    <span>{formatViews(v.viewCount)} views</span>
                    <span>{formatViews(v.likeCount)} likes</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
