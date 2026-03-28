import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useContentStore } from '../store/useContentStore';
import { StatusBadge } from './StatusBadge';
import { TikTokIcon } from './icons/PlatformIcons';

function getOverlayStyle(expanded: boolean): CSSProperties {
  return {
    position: 'fixed', inset: 0,
    background: expanded ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.3)',
    zIndex: 100, display: 'flex',
    justifyContent: expanded ? 'center' : 'flex-end',
    alignItems: expanded ? 'center' : 'stretch',
    animation: 'fadeIn 0.15s ease',
    padding: expanded ? '24px' : 0,
  };
}

function getPanelStyle(expanded: boolean): CSSProperties {
  return expanded ? {
    width: '900px', maxWidth: '95vw', maxHeight: '95vh',
    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)',
    overflowY: 'auto', display: 'flex', flexDirection: 'column',
  } : {
    width: '540px', maxWidth: '90vw', height: '100vh',
    background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)',
    boxShadow: 'var(--shadow-lg)', overflowY: 'auto',
    display: 'flex', flexDirection: 'column',
  };
}

const topBar: CSSProperties = {
  position: 'sticky', top: 0, zIndex: 2, display: 'flex', alignItems: 'center',
  justifyContent: 'space-between', padding: '10px 20px',
  background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
};
const btn: CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  padding: '6px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  fontFamily: 'var(--font)', transition: 'all var(--transition)', color: 'var(--text-secondary)',
};
const expandBtn: CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px',
  color: 'var(--text-muted)', display: 'flex', alignItems: 'center', borderRadius: '4px',
};
const thumbImg: CSSProperties = { width: '100%', aspectRatio: '9/16', maxHeight: '400px', objectFit: 'cover', display: 'block', background: 'var(--bg-primary)' };
const body: CSSProperties = { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 };
const titleStyle: CSSProperties = { fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.35, fontFamily: 'var(--font)' };
const statsGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' };
const statCard: CSSProperties = { background: 'var(--bg-primary)', borderRadius: 'var(--radius)', padding: '12px 10px', textAlign: 'center' };
const statVal: CSSProperties = { fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font)' };
const statLbl: CSSProperties = { fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' };
const sectionTitle: CSSProperties = { fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font)', marginBottom: '6px' };
const infoRow: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid var(--border)' };
const linkBtn: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
  background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  textDecoration: 'none', transition: 'all var(--transition)', fontFamily: 'var(--font)',
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString('pt-BR');
}

function formatDuration(s: number): string {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function TikTokDetail() {
  const selectedId = useContentStore((s) => s.selectedTikTokId);
  const videos = useContentStore((s) => s.tiktokVideos);
  const setSelectedTikTokId = useContentStore((s) => s.setSelectedTikTokId);
  const [expanded, setExpanded] = useState(false);

  if (!selectedId) return null;
  const video = videos.find((v) => v.id === selectedId);
  if (!video) return null;

  const isScheduled = !!(video.scheduledAt && new Date(video.scheduledAt).getTime() > Date.now());

  return (
    <div style={getOverlayStyle(expanded)} onClick={(e) => { if (e.target === e.currentTarget) setSelectedTikTokId(null); }}>
      <div style={getPanelStyle(expanded)}>
        <div style={topBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>
              Detalhes — TikTok
            </span>
            <button style={expandBtn} onClick={() => setExpanded(!expanded)}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-gold-dark)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {expanded ? (<><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" /></>) : (<><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></>)}
              </svg>
            </button>
          </div>
          <button style={btn} onClick={() => { setSelectedTikTokId(null); setExpanded(false); }}>Fechar</button>
        </div>

        {video.thumbnail && (
          <div style={{ display: 'flex', justifyContent: 'center', background: 'var(--bg-primary)' }}>
            <img src={video.thumbnail} alt={video.title} style={thumbImg} />
          </div>
        )}

        <div style={body}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <StatusBadge status={isScheduled ? 'scheduled' : 'published'} />
              <TikTokIcon size={16} />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>TikTok</span>
            </div>
            <div style={titleStyle}>{video.title || 'Sem titulo'}</div>
          </div>

          <div style={statsGrid}>
            <div style={statCard}>
              <div style={statVal}>{formatNumber(video.viewCount)}</div>
              <div style={statLbl}>Views</div>
            </div>
            <div style={statCard}>
              <div style={statVal}>{formatNumber(video.likeCount)}</div>
              <div style={statLbl}>Likes</div>
            </div>
            <div style={statCard}>
              <div style={statVal}>{formatNumber(video.commentCount)}</div>
              <div style={statLbl}>Comentarios</div>
            </div>
            <div style={statCard}>
              <div style={statVal}>{formatNumber(video.shareCount)}</div>
              <div style={statLbl}>Shares</div>
            </div>
          </div>

          <div>
            <div style={sectionTitle}>Detalhes</div>
            {video.scheduledAt && (
              <div style={infoRow}>
                <span style={{ color: 'var(--accent-gold-dark)', fontWeight: 600 }}>Agendado para</span>
                <span style={{ fontWeight: 600, color: 'var(--accent-gold-dark)' }}>{formatDate(video.scheduledAt)}</span>
              </div>
            )}
            <div style={infoRow}>
              <span style={{ color: 'var(--text-muted)' }}>{isScheduled ? 'Criado em' : 'Publicado em'}</span>
              <span style={{ fontWeight: 600 }}>{formatDate(video.createTime)}</span>
            </div>
            <div style={infoRow}>
              <span style={{ color: 'var(--text-muted)' }}>Duracao</span>
              <span style={{ fontWeight: 600 }}>{formatDuration(video.duration)}</span>
            </div>
          </div>

          <div>
            <div style={sectionTitle}>Links</div>
            <a href={video.url} target="_blank" rel="noopener" style={linkBtn}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <TikTokIcon size={18} />
              Abrir no TikTok
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{video.url}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
