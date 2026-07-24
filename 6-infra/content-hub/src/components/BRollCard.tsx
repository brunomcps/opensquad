import { useState, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { BRoll } from '../types/content';

const SOURCE_LABELS: Record<string, string> = {
  veo: 'Veo',
  grok: 'Grok',
  pexels: 'Pexels',
  pixabay: 'Pixabay',
  filmed: 'Gravado',
  remotion: 'Remotion',
  other: 'Outro',
};

const SOURCE_COLORS: Record<string, string> = {
  veo: '#4285F4',
  grok: '#1DA1F2',
  pexels: '#05A081',
  pixabay: '#2EC866',
  filmed: '#F0BA3C',
  remotion: '#7C3AED',
  other: '#888',
};

function formatDuration(seconds: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

function formatSize(bytes: number): string {
  if (bytes >= 1_000_000) return (bytes / 1_000_000).toFixed(1) + ' MB';
  if (bytes >= 1_000) return (bytes / 1_000).toFixed(0) + ' KB';
  return bytes + ' B';
}

const card: CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  overflow: 'hidden',
  cursor: 'pointer',
  transition: 'all var(--transition)',
  boxShadow: 'var(--shadow-sm)',
};

const mediaWrap: CSSProperties = {
  position: 'relative',
  width: '100%',
  aspectRatio: '16/9',
  background: '#000',
  overflow: 'hidden',
};

const thumbImg: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
};

const videoPreview: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const durationBadge: CSSProperties = {
  position: 'absolute',
  bottom: '6px',
  right: '6px',
  background: 'rgba(0,0,0,0.75)',
  color: '#fff',
  fontSize: '11px',
  fontWeight: 700,
  padding: '2px 6px',
  borderRadius: '4px',
  fontFamily: 'var(--font)',
  fontVariantNumeric: 'tabular-nums',
};

const sourceBadge = (color: string): CSSProperties => ({
  position: 'absolute',
  top: '6px',
  left: '6px',
  background: color,
  color: '#fff',
  fontSize: '10px',
  fontWeight: 700,
  padding: '2px 7px',
  borderRadius: '4px',
  fontFamily: 'var(--font)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
});

const infoArea: CSSProperties = {
  padding: '10px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const titleStyle: CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--text-primary)',
  fontFamily: 'var(--font)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const metaRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontSize: '11px',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-body)',
};

const tagsRow: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '4px',
};

const tagChip: CSSProperties = {
  fontSize: '10px',
  background: 'var(--bg-primary)',
  color: 'var(--text-secondary)',
  padding: '1px 6px',
  borderRadius: '3px',
  fontFamily: 'var(--font-body)',
};

const usageBadge: CSSProperties = {
  position: 'absolute',
  top: '6px',
  right: '6px',
  background: 'rgba(240,186,60,0.9)',
  color: '#000',
  fontSize: '10px',
  fontWeight: 700,
  padding: '2px 6px',
  borderRadius: '4px',
  fontFamily: 'var(--font)',
};

interface BRollCardProps {
  broll: BRoll;
  onClick: () => void;
}

export function BRollCard({ broll, onClick }: BRollCardProps) {
  const [hovering, setHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    setHovering(true);
    videoRef.current?.play().catch(() => {});
  };

  const handleMouseLeave = () => {
    setHovering(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const srcColor = SOURCE_COLORS[broll.source] || SOURCE_COLORS.other;

  return (
    <div
      style={{
        ...card,
        borderColor: hovering ? 'var(--accent-gold)' : 'var(--border)',
        boxShadow: hovering ? 'var(--shadow-gold)' : 'var(--shadow-sm)',
        transform: hovering ? 'translateY(-2px)' : 'none',
      }}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div style={mediaWrap}>
        <img
          src={`/api/brolls/thumbnail/${broll.id}`}
          alt={broll.description}
          style={{ ...thumbImg, opacity: hovering ? 0 : 1, transition: 'opacity 0.3s' }}
          loading="lazy"
        />
        {broll.previewUrl ? (
          <img
            src={broll.previewUrl}
            alt={broll.description}
            style={{ ...videoPreview, opacity: hovering ? 1 : 0, transition: 'opacity 0.3s' }}
            loading="lazy"
          />
        ) : (
          <video
            ref={videoRef}
            src={`/api/brolls/video/${broll.id}`}
            style={{ ...videoPreview, opacity: hovering ? 1 : 0, transition: 'opacity 0.3s' }}
            muted
            loop
            playsInline
            preload="none"
          />
        )}
        <span style={durationBadge}>{formatDuration(broll.duration)}</span>
        <span style={sourceBadge(srcColor)}>{SOURCE_LABELS[broll.source] || broll.source}</span>
        {broll.usedIn.length > 0 && (
          <span style={usageBadge}>Usado {broll.usedIn.length}x</span>
        )}
      </div>

      <div style={infoArea}>
        <div style={titleStyle}>{broll.description || broll.filename}</div>
        <div style={metaRow}>
          <span>{broll.resolution}</span>
          <span>{formatSize(broll.fileSize)}</span>
        </div>
        {broll.tags.length > 0 && (
          <div style={tagsRow}>
            {broll.tags.slice(0, 5).map((t) => (
              <span key={t} style={tagChip}>{t}</span>
            ))}
            {broll.tags.length > 5 && <span style={tagChip}>+{broll.tags.length - 5}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
