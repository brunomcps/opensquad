import { StatusBadge } from './StatusBadge';
import type { CSSProperties } from 'react';

interface ContentCardProps {
  title: string;
  thumbnail?: string;
  status: string;
  date?: string;
  views?: number;
  likes?: number;
  duration?: string;
  url?: string;
  videoId?: string;
  onClick?: () => void;
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatNumber(n?: number): string {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

const card: CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--border)',
  overflow: 'hidden',
  transition: 'all var(--transition)',
  cursor: 'pointer',
  boxShadow: 'var(--shadow-sm)',
  flexShrink: 0,
};

const thumbContainer: CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  width: '100%',
  paddingTop: '56.25%', /* 16:9 aspect ratio */
  background: 'var(--bg-primary)',
};

const thumbStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
  transition: 'transform 0.3s ease',
};

const durationBadge: CSSProperties = {
  position: 'absolute',
  bottom: 6,
  right: 6,
  background: 'rgba(0, 0, 0, 0.8)',
  color: '#fff',
  fontSize: '11px',
  fontWeight: 700,
  padding: '2px 6px',
  borderRadius: '4px',
  fontVariantNumeric: 'tabular-nums',
};

const bodyStyle: CSSProperties = {
  padding: '12px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const titleStyle: CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  lineHeight: 1.4,
  color: 'var(--text-primary)',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  fontFamily: 'var(--font)',
};

const metaStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontSize: '12px',
  color: 'var(--text-secondary)',
  fontVariantNumeric: 'tabular-nums',
};

export function ContentCard({ title, thumbnail, status, date, views, likes, duration, url, videoId, onClick }: ContentCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (url) {
      window.open(url, '_blank');
    }
  };

  return (
    <div
      className="fade-in"
      style={card}
      onClick={handleClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent-gold)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        const img = e.currentTarget.querySelector('img');
        if (img) (img as HTMLElement).style.transform = 'scale(1.03)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        const img = e.currentTarget.querySelector('img');
        if (img) (img as HTMLElement).style.transform = 'scale(1)';
      }}
    >
      {thumbnail && (
        <div style={thumbContainer}>
          <img src={thumbnail} alt={title} style={thumbStyle} loading="lazy" />
          {duration && <span style={durationBadge}>{duration}</span>}
        </div>
      )}
      <div style={bodyStyle}>
        <StatusBadge status={status} />
        <div style={titleStyle}>{title}</div>
        <div style={metaStyle}>
          <span>{formatDate(date)}</span>
          {(views !== undefined || likes !== undefined) && (
            <span>{formatNumber(views)} views · {formatNumber(likes)} likes</span>
          )}
        </div>
      </div>
    </div>
  );
}
