import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useContentStore } from '../store/useContentStore';
import { StatusBadge } from './StatusBadge';
import { ThreadsIcon } from './icons/PlatformIcons';

function getOverlayStyle(expanded: boolean): CSSProperties {
  return {
    position: 'fixed', inset: 0,
    background: expanded ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.3)',
    zIndex: 100, display: 'flex',
    justifyContent: expanded ? 'center' : 'flex-end',
    alignItems: expanded ? 'center' : 'stretch',
    animation: 'fadeIn 0.15s ease', padding: expanded ? '24px' : 0,
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

const topBar: CSSProperties = { position: 'sticky', top: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' };
const btn: CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', color: 'var(--text-secondary)' };
const expandBtn: CSSProperties = { background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', borderRadius: '4px' };
const thumbImg: CSSProperties = { width: '100%', maxHeight: '400px', objectFit: 'cover', display: 'block', background: 'var(--bg-primary)' };
const body: CSSProperties = { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 };
const statsGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' };
const statCard: CSSProperties = { background: 'var(--bg-primary)', borderRadius: 'var(--radius)', padding: '12px 10px', textAlign: 'center' };
const statVal: CSSProperties = { fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font)' };
const statLbl: CSSProperties = { fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' };
const sectionTitle: CSSProperties = { fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font)', marginBottom: '6px' };
const infoRow: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid var(--border)' };
const captionBox: CSSProperties = { fontSize: '13px', lineHeight: 1.6, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '200px', overflowY: 'auto', background: 'var(--bg-primary)', borderRadius: 'var(--radius)', padding: '12px 14px', border: '1px solid var(--border)' };
const linkBtn: CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', fontFamily: 'var(--font)' };

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString('pt-BR');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const MEDIA_TYPES: Record<string, string> = {
  TEXT_POST: 'Texto', IMAGE: 'Imagem', VIDEO: 'Video', CAROUSEL_ALBUM: 'Carrossel',
};

export function ThreadsDetail() {
  const selectedId = useContentStore((s) => s.selectedThreadsId);
  const posts = useContentStore((s) => s.threadsPosts);
  const setSelectedThreadsId = useContentStore((s) => s.setSelectedThreadsId);
  const [expanded, setExpanded] = useState(false);

  if (!selectedId) return null;
  const post = posts.find((p) => p.id === selectedId);
  if (!post) return null;

  return (
    <div style={getOverlayStyle(expanded)} onClick={(e) => { if (e.target === e.currentTarget) setSelectedThreadsId(null); }}>
      <div style={getPanelStyle(expanded)}>
        <div style={topBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>Detalhes — Threads</span>
            <button style={expandBtn} onClick={() => setExpanded(!expanded)}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-gold-dark)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {expanded ? (<><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" /></>) : (<><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></>)}
              </svg>
            </button>
          </div>
          <button style={btn} onClick={() => { setSelectedThreadsId(null); setExpanded(false); }}>Fechar</button>
        </div>

        {post.mediaUrl && post.mediaType !== 'TEXT_POST' && (
          <div style={{ display: 'flex', justifyContent: 'center', background: 'var(--bg-primary)' }}>
            <img src={post.mediaUrl} alt="" style={thumbImg} />
          </div>
        )}

        <div style={body}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <StatusBadge status="published" />
              <ThreadsIcon size={16} />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{MEDIA_TYPES[post.mediaType] || post.mediaType}</span>
            </div>
          </div>

          <div style={statsGrid}>
            <div style={statCard}>
              <div style={statVal}>{formatNumber(post.likeCount)}</div>
              <div style={statLbl}>Likes</div>
            </div>
            <div style={statCard}>
              <div style={statVal}>{formatNumber(post.replyCount)}</div>
              <div style={statLbl}>Respostas</div>
            </div>
          </div>

          <div>
            <div style={sectionTitle}>Detalhes</div>
            <div style={infoRow}>
              <span style={{ color: 'var(--text-muted)' }}>Publicado em</span>
              <span style={{ fontWeight: 600 }}>{formatDate(post.timestamp)}</span>
            </div>
            <div style={infoRow}>
              <span style={{ color: 'var(--text-muted)' }}>Tipo</span>
              <span style={{ fontWeight: 600 }}>{MEDIA_TYPES[post.mediaType] || post.mediaType}</span>
            </div>
          </div>

          <div>
            <div style={sectionTitle}>Texto</div>
            <div style={captionBox}>{post.text || 'Sem texto'}</div>
          </div>

          {post.permalink && (
            <div>
              <div style={sectionTitle}>Links</div>
              <a href={post.permalink} target="_blank" rel="noopener" style={linkBtn}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <ThreadsIcon size={18} />
                Abrir no Threads
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
