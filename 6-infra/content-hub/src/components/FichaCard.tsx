import type { CSSProperties } from 'react';
import type { FichaListItem } from '../types/content';

const card: CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  overflow: 'hidden',
  cursor: 'pointer',
  transition: 'all var(--transition)',
};

const thumbContainer: CSSProperties = {
  position: 'relative',
  width: '100%',
  aspectRatio: '16/9',
  overflow: 'hidden',
  background: 'var(--bg-primary)',
};

const thumbImg: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
};

const durationBadge: CSSProperties = {
  position: 'absolute',
  bottom: '6px',
  right: '6px',
  background: 'rgba(0,0,0,0.8)',
  color: '#fff',
  padding: '2px 6px',
  borderRadius: '3px',
  fontSize: '11px',
  fontWeight: 700,
  fontFamily: 'var(--font)',
  fontVariantNumeric: 'tabular-nums',
};

const body: CSSProperties = {
  padding: '12px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const titleStyle: CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  color: 'var(--text-primary)',
  fontFamily: 'var(--font)',
  lineHeight: '1.3',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

const metaRow: CSSProperties = {
  display: 'flex',
  gap: '10px',
  fontSize: '11px',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-body)',
};

interface FichaCardProps {
  ficha: FichaListItem;
  onClick: () => void;
}

export function FichaCard({ ficha, onClick }: FichaCardProps) {
  const thumbUrl = `https://i.ytimg.com/vi/${ficha.videoId}/mqdefault.jpg`;

  return (
    <div
      style={card}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent-gold)';
        e.currentTarget.style.boxShadow = 'var(--shadow-gold)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={thumbContainer}>
        <img src={thumbUrl} alt={ficha.title} style={thumbImg} loading="lazy" />
        {ficha.durationText && <span style={durationBadge}>{ficha.durationText}</span>}
      </div>
      <div style={body}>
        <div style={titleStyle}>{ficha.title}</div>
        <div style={metaRow}>
          <span>{ficha.publishedAt}</span>
          <span>{ficha.sectionCount} seções</span>
        </div>
      </div>
    </div>
  );
}
