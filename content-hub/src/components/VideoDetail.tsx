import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useContentStore } from '../store/useContentStore';
import { useFichaStore } from '../store/useFichaStore';
import { StatusBadge } from './StatusBadge';
import { YouTubeIcon, ShortsIcon } from './icons/PlatformIcons';
import type { FichaFull } from '../types/content';

// --- Styles ---

function getOverlayStyle(expanded: boolean): CSSProperties {
  return {
    position: 'fixed',
    inset: 0,
    background: expanded ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.3)',
    zIndex: 100,
    display: 'flex',
    justifyContent: expanded ? 'center' : 'flex-end',
    alignItems: expanded ? 'center' : 'stretch',
    animation: 'fadeIn 0.15s ease',
    padding: expanded ? '24px' : 0,
  };
}

function getPanelStyle(expanded: boolean): CSSProperties {
  return expanded ? {
    width: '900px',
    maxWidth: '95vw',
    maxHeight: '95vh',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-lg)',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  } : {
    width: '540px',
    maxWidth: '90vw',
    height: '100vh',
    background: 'var(--bg-secondary)',
    borderLeft: '1px solid var(--border)',
    boxShadow: 'var(--shadow-lg)',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  };
}

const expandBtn: CSSProperties = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: '4px',
  color: 'var(--text-muted)',
  display: 'flex',
  alignItems: 'center',
  transition: 'color var(--transition)',
  borderRadius: '4px',
};

const topBar: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 2,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 20px',
  background: 'var(--bg-secondary)',
  borderBottom: '1px solid var(--border)',
};

const topBarBtns: CSSProperties = {
  display: 'flex',
  gap: '8px',
};

const btn: CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '6px 14px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'var(--font)',
  transition: 'all var(--transition)',
  color: 'var(--text-secondary)',
};

const btnPrimary: CSSProperties = {
  ...btn,
  background: 'var(--accent-gold)',
  borderColor: 'var(--accent-gold)',
  color: '#fff',
};

const btnDanger: CSSProperties = {
  ...btn,
  color: 'var(--accent-red)',
};

const thumbSection: CSSProperties = { position: 'relative', width: '100%' };
const thumbImg: CSSProperties = { width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' };
const durationOverlay: CSSProperties = {
  position: 'absolute', bottom: 8, right: 8,
  background: 'rgba(0,0,0,0.8)', color: '#fff', fontSize: '12px', fontWeight: 700,
  padding: '3px 7px', borderRadius: '4px',
};

const body: CSSProperties = { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 };

const metaRow: CSSProperties = { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' };

const statsGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' };
const statCard: CSSProperties = { background: 'var(--bg-primary)', borderRadius: 'var(--radius)', padding: '12px 14px', textAlign: 'center' };
const statValue: CSSProperties = { fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font)' };
const statLabel: CSSProperties = { fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' };

const sectionTitle: CSSProperties = { fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font)', marginBottom: '6px' };

const infoRow: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid var(--border)' };
const infoLabel: CSSProperties = { color: 'var(--text-muted)', fontWeight: 500 };
const infoValue: CSSProperties = { color: 'var(--text-primary)', fontWeight: 600 };

const tagsContainer: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '6px' };
const tagStyle: CSSProperties = {
  background: 'var(--accent-gold-bg)', color: 'var(--accent-gold-dark)',
  fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '14px',
  fontFamily: 'var(--font)', border: '1px solid rgba(240, 186, 60, 0.2)',
};

const linkBtn: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
  background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  textDecoration: 'none', transition: 'all var(--transition)', fontFamily: 'var(--font)',
};

// Editable field styles
const editInput: CSSProperties = {
  width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--accent-gold)',
  borderRadius: 'var(--radius)', padding: '10px 12px', fontSize: '16px', fontWeight: 700,
  fontFamily: 'var(--font)', color: 'var(--text-primary)', outline: 'none',
  boxShadow: '0 0 0 3px rgba(240, 186, 60, 0.12)',
};

const editTextarea: CSSProperties = {
  ...editInput, fontSize: '13px', fontWeight: 400, fontFamily: 'var(--font-body)',
  minHeight: '120px', resize: 'vertical', lineHeight: 1.6,
};

const editTagsInput: CSSProperties = {
  ...editInput, fontSize: '13px', fontWeight: 400, fontFamily: 'var(--font-body)',
};

const titleDisplay: CSSProperties = {
  fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.35,
  fontFamily: 'var(--font)', letterSpacing: '-0.01em',
};

const descBox: CSSProperties = {
  fontSize: '13px', lineHeight: 1.6, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap',
  wordBreak: 'break-word', maxHeight: '200px', overflowY: 'auto',
  background: 'var(--bg-primary)', borderRadius: 'var(--radius)', padding: '12px 14px',
  border: '1px solid var(--border)',
};

const savingBanner: CSSProperties = {
  padding: '8px 14px', background: 'var(--accent-gold-bg)', borderRadius: 'var(--radius)',
  fontSize: '13px', fontWeight: 600, color: 'var(--accent-gold-dark)', textAlign: 'center',
  border: '1px solid rgba(240, 186, 60, 0.2)',
};

const successBanner: CSSProperties = {
  ...savingBanner, background: 'rgba(34, 163, 91, 0.08)', color: 'var(--accent-green)',
  border: '1px solid rgba(34, 163, 91, 0.2)',
};

const errorBanner: CSSProperties = {
  ...savingBanner, background: 'rgba(220, 53, 69, 0.08)', color: 'var(--accent-red)',
  border: '1px solid rgba(220, 53, 69, 0.2)',
};

// --- Helpers ---

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString('pt-BR');
}

function formatDuration(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const CATEGORIES: Record<string, string> = {
  '1': 'Filmes', '10': 'Musica', '15': 'Animais', '17': 'Esportes',
  '20': 'Jogos', '22': 'Pessoas e Blogs', '23': 'Comedia', '24': 'Entretenimento',
  '25': 'Noticias', '26': 'Como fazer', '27': 'Educacao', '28': 'Ciencia e Tech',
};

// --- Comments Section ---

const CATEGORY_COLORS: Record<string, string> = {
  identification: '#3b82f6',
  testimony: '#8b5cf6',
  question: '#f59e0b',
  gratitude: '#10b981',
  objection: '#ef4444',
  sharing: '#ec4899',
};

const CATEGORY_LABELS: Record<string, string> = {
  identification: '🪞 Identificação',
  testimony: '📖 Testemunho',
  question: '❓ Pergunta',
  gratitude: '🙏 Gratidão',
  objection: '⚡ Objeção',
  sharing: '📤 Compartilhamento',
};

function CommentsSection({ videoId }: { videoId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setData(null);
    setExpanded(false);
  }, [videoId]);

  const loadComments = async () => {
    if (data) { setExpanded(!expanded); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/comments/${videoId}`);
      const json = await res.json();
      if (json.ok) { setData(json); setExpanded(true); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const catBadge = (cat: string, count: number): JSX.Element => (
    <span key={cat} style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
      background: `${CATEGORY_COLORS[cat] || '#666'}15`,
      color: CATEGORY_COLORS[cat] || '#666',
      fontFamily: 'var(--font)',
    }}>
      {CATEGORY_LABELS[cat] || cat} <span style={{ fontWeight: 400 }}>{count}</span>
    </span>
  );

  return (
    <div>
      <div
        style={{ ...sectionTitle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        onClick={loadComments}
      >
        💬 Comentários
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
          {loading ? 'carregando...' : expanded ? '▼' : '▶'}
        </span>
      </div>
      {expanded && data && (
        <div style={{ marginTop: '8px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
            {Object.entries(data.categorySummary || {}).map(([cat, count]) =>
              catBadge(cat, count as number)
            )}
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {(data.comments || []).slice(0, 50).map((c: any) => (
              <div key={c.id} style={{
                padding: '8px 10px', background: 'var(--bg-primary)', borderRadius: '6px',
                fontSize: '12px', lineHeight: '1.4', fontFamily: 'var(--font-body)',
                borderLeft: `3px solid ${CATEGORY_COLORS[c.category] || 'var(--border)'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '11px' }}>{c.authorName}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {CATEGORY_LABELS[c.category] || c.category || ''}
                    {c.likeCount > 0 && ` · ♥ ${c.likeCount}`}
                  </span>
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>{c.text?.substring(0, 300)}{c.text?.length > 300 ? '...' : ''}</div>
              </div>
            ))}
          </div>
          {(data.comments || []).length > 50 && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>
              Mostrando 50 de {data.comments.length} comentários
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Ficha Button ---

function FichaButton({ videoId }: { videoId: string }) {
  const setSelectedFicha = useFichaStore((s) => s.setSelectedFicha);
  const [status, setStatus] = useState<'idle' | 'loading' | 'not-found'>('idle');

  // Reset status when videoId changes
  useEffect(() => {
    setStatus('idle');
  }, [videoId]);

  const handleClick = async () => {
    setStatus('loading');
    try {
      const res = await fetch(`/api/fichas/${videoId}`);
      const data = await res.json();
      if (data.ok) {
        setSelectedFicha(data.ficha as FichaFull);
        setStatus('idle');
      } else {
        setStatus('not-found');
      }
    } catch {
      setStatus('not-found');
    }
  };

  if (status === 'not-found') {
    return (
      <div style={{ ...linkBtn, opacity: 0.5, cursor: 'default', justifyContent: 'center' }}>
        <span style={{ fontSize: '13px' }}>📝</span>
        Ficha de roteiro não disponível
      </div>
    );
  }

  return (
    <button
      style={{ ...linkBtn, border: '1px solid var(--accent-gold)', color: 'var(--accent-gold-dark)' }}
      onClick={handleClick}
      disabled={status === 'loading'}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(240, 186, 60, 0.08)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)'; }}
    >
      <span style={{ fontSize: '13px' }}>📝</span>
      {status === 'loading' ? 'Carregando...' : 'Ver Ficha de Roteiro'}
      <span style={{ flex: 1 }} />
      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>Análise</span>
    </button>
  );
}

// --- Component ---

export function VideoDetail() {
  const selectedId = useContentStore((s) => s.selectedVideoId);
  const videos = useContentStore((s) => s.youtubeVideos);
  const setSelectedVideoId = useContentStore((s) => s.setSelectedVideoId);
  const setYouTubeVideos = useContentStore((s) => s.setYouTubeVideos);

  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTags, setEditTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const video = selectedId ? videos.find((v) => v.id === selectedId) : null;

  useEffect(() => {
    if (video && editing) {
      setEditTitle(video.title);
      setEditDesc(video.description);
      setEditTags(video.tags?.join(', ') || '');
    }
    setFeedback(null);
  }, [editing, video?.id]);

  // Reset editing when panel closes
  useEffect(() => {
    if (!selectedId) {
      setEditing(false);
      setExpanded(false);
      setFeedback(null);
    }
  }, [selectedId]);

  if (!video) return null;

  const engagement = (video.viewCount || 0) > 0
    ? ((video.likeCount || 0) / (video.viewCount || 1) * 100).toFixed(2) : '0';
  const ytUrl = video.isShort ? `https://youtube.com/shorts/${video.id}` : `https://youtube.com/watch?v=${video.id}`;
  const studioUrl = `https://studio.youtube.com/video/${video.id}/edit`;

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);

    try {
      const tags = editTags.split(',').map((t) => t.trim()).filter(Boolean);

      const res = await fetch(`/api/youtube/videos/${video.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, description: editDesc, tags }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');

      // Update local state
      const updated = videos.map((v) =>
        v.id === video.id
          ? { ...v, title: data.video.title, description: data.video.description, tags: data.video.tags }
          : v
      );
      setYouTubeVideos(updated);

      setFeedback({ type: 'success', msg: 'Salvo no YouTube com sucesso!' });
      setEditing(false);
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setFeedback(null);
  };

  return (
    <div style={getOverlayStyle(expanded)} onClick={(e) => { if (e.target === e.currentTarget) setSelectedVideoId(null); }}>
      <div style={getPanelStyle(expanded)}>
        {/* Top bar */}
        <div style={topBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>
              Detalhes do video
            </span>
            <button
              style={expandBtn}
              onClick={() => setExpanded(!expanded)}
              title={expanded ? 'Recolher' : 'Expandir'}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-gold-dark)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {expanded ? (
                  <>
                    <polyline points="4 14 10 14 10 20" />
                    <polyline points="20 10 14 10 14 4" />
                    <line x1="14" y1="10" x2="21" y2="3" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </>
                ) : (
                  <>
                    <polyline points="15 3 21 3 21 9" />
                    <polyline points="9 21 3 21 3 15" />
                    <line x1="21" y1="3" x2="14" y2="10" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </>
                )}
              </svg>
            </button>
          </div>
          <div style={topBarBtns}>
            {editing ? (
              <>
                <button style={btnDanger} onClick={handleCancel}>Cancelar</button>
                <button
                  style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : 'Salvar no YouTube'}
                </button>
              </>
            ) : (
              <>
                <button
                  style={btn}
                  onClick={() => setEditing(true)}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; e.currentTarget.style.color = 'var(--accent-gold-dark)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  Editar
                </button>
                <button
                  style={btn}
                  onClick={() => setSelectedVideoId(null)}
                >
                  Fechar
                </button>
              </>
            )}
          </div>
        </div>

        {/* Feedback banner */}
        {feedback && (
          <div style={{ padding: '0 24px', paddingTop: '12px' }}>
            <div style={feedback.type === 'success' ? successBanner : errorBanner}>
              {feedback.msg}
            </div>
          </div>
        )}

        {/* Thumbnail */}
        <div style={thumbSection}>
          <img src={video.thumbnailHigh || video.thumbnail} alt={video.title} style={thumbImg} />
          <span style={durationOverlay}>{formatDuration(video.durationSeconds)}</span>
        </div>

        <div style={body}>
          {/* Title */}
          <div>
            <div style={metaRow}>
              <StatusBadge status={video.scheduledAt && new Date(video.scheduledAt).getTime() > Date.now() ? 'scheduled' : video.privacyStatus} />
              {video.isShort ? <ShortsIcon size={16} /> : <YouTubeIcon size={16} />}
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {video.isShort ? 'YouTube Short' : 'YouTube Video'}
              </span>
            </div>
            {editing ? (
              <div style={{ marginTop: '8px' }}>
                <div style={{ ...sectionTitle, marginBottom: '4px' }}>Titulo</div>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={editInput}
                  maxLength={100}
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
                  {editTitle.length}/100
                </div>
              </div>
            ) : (
              <div style={{ ...titleDisplay, marginTop: '8px' }}>{video.title}</div>
            )}
          </div>

          {/* Stats */}
          <div style={statsGrid}>
            <div style={statCard}>
              <div style={statValue}>{formatNumber(video.viewCount || 0)}</div>
              <div style={statLabel}>Views</div>
            </div>
            <div style={statCard}>
              <div style={statValue}>{formatNumber(video.likeCount || 0)}</div>
              <div style={statLabel}>Likes</div>
            </div>
            <div style={statCard}>
              <div style={statValue}>{formatNumber(video.commentCount || 0)}</div>
              <div style={statLabel}>Comentarios</div>
            </div>
          </div>

          {/* Engagement row */}
          <div style={{ ...statsGrid, gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div style={{ ...statCard, gridColumn: 'span 3', display: 'flex', justifyContent: 'space-around' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ ...statValue, color: 'var(--accent-gold-dark)', fontSize: '18px' }}>{engagement}%</div>
                <div style={statLabel}>Engagement</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ ...statValue, fontSize: '18px' }}>{formatDuration(video.durationSeconds)}</div>
                <div style={statLabel}>Duracao</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ ...statValue, fontSize: '18px' }}>{CATEGORIES[video.categoryId || ''] || video.categoryId}</div>
                <div style={statLabel}>Categoria</div>
              </div>
            </div>
          </div>

          {/* Details */}
          <div>
            <div style={sectionTitle}>Detalhes</div>
            <div style={infoRow}>
              <span style={infoLabel}>Publicado em</span>
              <span style={infoValue}>{formatDate(video.publishedAt)}</span>
            </div>
            {video.scheduledAt && (
              <div style={infoRow}>
                <span style={infoLabel}>Agendado para</span>
                <span style={{ ...infoValue, color: 'var(--accent-amber)' }}>{formatDate(video.scheduledAt)}</span>
              </div>
            )}
            <div style={infoRow}>
              <span style={infoLabel}>Privacidade</span>
              <span style={infoValue}>{video.privacyStatus}</span>
            </div>
            {video.defaultLanguage && (
              <div style={infoRow}>
                <span style={infoLabel}>Idioma</span>
                <span style={infoValue}>{video.defaultLanguage}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <div style={sectionTitle}>Tags {video.tags?.length ? `(${video.tags.length})` : ''}</div>
            {editing ? (
              <div>
                <textarea
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  style={{ ...editTagsInput, minHeight: '60px', resize: 'vertical' }}
                  placeholder="tag1, tag2, tag3..."
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
                  {editTags.length}/500 caracteres · {editTags.split(',').filter((t) => t.trim()).length} tags
                </div>
              </div>
            ) : (
              <div style={tagsContainer}>
                {video.tags && video.tags.length > 0 ? (
                  video.tags.map((t, i) => <span key={i} style={tagStyle}>{t}</span>)
                ) : (
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sem tags</span>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <div style={sectionTitle}>Descricao</div>
            {editing ? (
              <div>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  style={editTextarea}
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
                  {editDesc.length}/5000
                </div>
              </div>
            ) : (
              <div style={descBox}>{video.description || 'Sem descricao'}</div>
            )}
          </div>

          {/* Comments */}
          {!video.isShort && <CommentsSection videoId={video.id} />}

          {/* Links */}
          <div>
            <div style={sectionTitle}>Links</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <a href={ytUrl} target="_blank" rel="noopener" style={linkBtn}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <YouTubeIcon size={18} />
                Abrir no YouTube
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{ytUrl}</span>
              </a>
              <a href={studioUrl} target="_blank" rel="noopener" style={linkBtn}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <YouTubeIcon size={18} />
                YouTube Studio
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>Editar</span>
              </a>
              {!video.isShort && <FichaButton videoId={video.id} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
