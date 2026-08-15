import { useState, useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { useContentStore } from '../store/useContentStore';
import { StatusBadge } from './StatusBadge';
import { InstagramIcon } from './icons/PlatformIcons';

// --- Types ---
interface Comment {
  id: string;
  text: string;
  username: string;
  timestamp: string;
  like_count: number;
}

type CommentCategory = 'pergunta' | 'elogio' | 'critica' | 'spam' | 'neutro';

interface CommentSuggestion {
  commentId: string;
  category: CommentCategory;
  suggestedReply: string;
  confidence: number;
}

// --- Category config ---
const CATEGORY_CONFIG: Record<CommentCategory, { label: string; color: string; bg: string }> = {
  pergunta: { label: 'Pergunta', color: '#1a73e8', bg: '#e8f0fe' },
  elogio: { label: 'Elogio', color: '#0d7a3f', bg: '#e6f4ea' },
  critica: { label: 'Critica', color: '#c5221f', bg: '#fce8e6' },
  spam: { label: 'Spam', color: '#80868b', bg: '#f1f3f4' },
  neutro: { label: 'Neutro', color: '#80868b', bg: '#f1f3f4' },
};

// --- Styles ---
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
const captionBox: CSSProperties = { fontSize: '13px', lineHeight: 1.6, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '150px', overflowY: 'auto', background: 'var(--bg-primary)', borderRadius: 'var(--radius)', padding: '12px 14px', border: '1px solid var(--border)' };
const linkBtn: CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', fontFamily: 'var(--font)' };

// Comment styles
const commentItem: CSSProperties = { display: 'flex', gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)' };
const commentAvatar: CSSProperties = { width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0, fontFamily: 'var(--font)' };
const commentBody: CSSProperties = { flex: 1, minWidth: 0 };
const commentUser: CSSProperties = { fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)' };
const commentText: CSSProperties = { fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4, marginTop: '2px' };
const commentMeta: CSSProperties = { fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '10px', alignItems: 'center' };
const replyInput: CSSProperties = { width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--text-primary)', outline: 'none', resize: 'none' };
const replyBtn: CSSProperties = { background: 'var(--accent-gold)', border: 'none', borderRadius: 'var(--radius)', color: '#fff', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' };
const hideBtn: CSSProperties = { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font)', textDecoration: 'underline' };
const loadingText: CSSProperties = { fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' };
const successMsg: CSSProperties = { fontSize: '12px', color: 'var(--accent-green)', padding: '4px 0' };
const errorMsg: CSSProperties = { fontSize: '12px', color: 'var(--accent-red)', padding: '4px 0' };

// AI suggestion styles
const aiBtn: CSSProperties = {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  border: 'none', borderRadius: 'var(--radius)', color: '#fff',
  padding: '8px 16px', fontSize: '12px', fontWeight: 700,
  cursor: 'pointer', fontFamily: 'var(--font)',
  display: 'flex', alignItems: 'center', gap: '6px',
  transition: 'all var(--transition)',
};
const categoryBadge = (cat: CommentCategory): CSSProperties => ({
  display: 'inline-flex', alignItems: 'center',
  padding: '2px 8px', borderRadius: '10px',
  fontSize: '10px', fontWeight: 700, fontFamily: 'var(--font)',
  color: CATEGORY_CONFIG[cat].color,
  background: CATEGORY_CONFIG[cat].bg,
  letterSpacing: '0.02em',
});
const suggestionBox: CSSProperties = {
  marginTop: '8px', padding: '10px 12px',
  background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
  border: '1px solid #ddd6fe', borderRadius: 'var(--radius)',
  fontSize: '13px', color: '#4c1d95', lineHeight: 1.4,
};
const suggestionActions: CSSProperties = {
  display: 'flex', gap: '6px', marginTop: '8px',
};
const approveBtn: CSSProperties = {
  background: '#0d7a3f', border: 'none', borderRadius: 'var(--radius)',
  color: '#fff', padding: '5px 12px', fontSize: '11px', fontWeight: 700,
  cursor: 'pointer', fontFamily: 'var(--font)',
};
const editBtn: CSSProperties = {
  background: 'var(--accent-gold)', border: 'none', borderRadius: 'var(--radius)',
  color: '#fff', padding: '5px 12px', fontSize: '11px', fontWeight: 700,
  cursor: 'pointer', fontFamily: 'var(--font)',
};
const skipBtn: CSSProperties = {
  background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  color: 'var(--text-muted)', padding: '5px 12px', fontSize: '11px', fontWeight: 600,
  cursor: 'pointer', fontFamily: 'var(--font)',
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString('pt-BR');
}
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}
const MEDIA_TYPES: Record<string, string> = { IMAGE: 'Foto', VIDEO: 'Video', CAROUSEL_ALBUM: 'Carrossel', REEL: 'Reel' };

export function InstagramDetail() {
  const selectedId = useContentStore((s) => s.selectedInstagramId);
  const posts = useContentStore((s) => s.instagramPosts);
  const setSelectedInstagramId = useContentStore((s) => s.setSelectedInstagramId);
  const [expanded, setExpanded] = useState(false);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // AI suggestions state
  const [suggestions, setSuggestions] = useState<Map<string, CommentSuggestion>>(new Map());
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [editingReply, setEditingReply] = useState<string | null>(null); // commentId being edited
  const [editText, setEditText] = useState('');
  const [sentReplies, setSentReplies] = useState<Set<string>>(new Set()); // commentIds already replied
  const [skippedComments, setSkippedComments] = useState<Set<string>>(new Set());

  const post = selectedId ? posts.find((p) => p.id === selectedId) : null;

  // Fetch comments
  const fetchComments = useCallback(async (mediaId: string) => {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/instagram/comments/${mediaId}`);
      const data = await res.json();
      if (data.ok) setComments(data.comments);
    } catch {}
    setLoadingComments(false);
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchComments(selectedId);
      setReplyTo(null);
      setReplyText('');
      setFeedback(null);
      setSuggestions(new Map());
      setAiError(null);
      setSentReplies(new Set());
      setSkippedComments(new Set());
      setEditingReply(null);
    } else {
      setComments([]);
    }
  }, [selectedId, fetchComments]);

  // AI suggest
  const handleAISuggest = async () => {
    if (!selectedId || !post) return;
    setLoadingAI(true);
    setAiError(null);
    try {
      const res = await fetch(`/api/instagram/comments/${selectedId}/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: post.caption }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const map = new Map<string, CommentSuggestion>();
      for (const s of data.suggestions) {
        map.set(s.commentId, s);
      }
      setSuggestions(map);

      // Update comments from fresh data if returned
      if (data.comments) setComments(data.comments);
    } catch (err: any) {
      setAiError(err.message);
    }
    setLoadingAI(false);
  };

  // Reply handlers
  const handleReply = async (targetId: string, message?: string) => {
    const text = message || replyText;
    if (!text.trim()) return;
    setReplying(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/instagram/comments/${targetId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFeedback({ type: 'success', msg: 'Resposta enviada!' });
      setReplyText('');
      setReplyTo(null);
      setEditingReply(null);
      setSentReplies((prev) => new Set([...prev, targetId]));
      if (selectedId) fetchComments(selectedId);
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message });
    }
    setReplying(false);
  };

  const handleApprove = (commentId: string) => {
    const s = suggestions.get(commentId);
    if (s?.suggestedReply) handleReply(commentId, s.suggestedReply);
  };

  const handleEdit = (commentId: string) => {
    const s = suggestions.get(commentId);
    setEditingReply(commentId);
    setEditText(s?.suggestedReply || '');
  };

  const handleSkip = (commentId: string) => {
    setSkippedComments((prev) => new Set([...prev, commentId]));
  };

  const handleHide = async (commentId: string) => {
    try {
      await fetch(`/api/instagram/comments/${commentId}/hide`, { method: 'POST' });
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {}
  };

  if (!post) return null;

  // Stats for AI mode
  const pendingCount = suggestions.size > 0
    ? comments.filter((c) => {
        const s = suggestions.get(c.id);
        return s && s.suggestedReply && !sentReplies.has(c.id) && !skippedComments.has(c.id);
      }).length
    : 0;

  return (
    <div style={getOverlayStyle(expanded)} onClick={(e) => { if (e.target === e.currentTarget) setSelectedInstagramId(null); }}>
      <div style={getPanelStyle(expanded)}>
        <div style={topBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>Detalhes — Instagram</span>
            <button style={expandBtn} onClick={() => setExpanded(!expanded)}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-gold-dark)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {expanded ? (<><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" /></>) : (<><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></>)}
              </svg>
            </button>
          </div>
          <button style={btn} onClick={() => { setSelectedInstagramId(null); setExpanded(false); }}>Fechar</button>
        </div>

        {post.thumbnailUrl && (
          <div style={{ display: 'flex', justifyContent: 'center', background: 'var(--bg-primary)' }}>
            <img src={post.thumbnailUrl} alt="" style={thumbImg} />
          </div>
        )}

        <div style={body}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <StatusBadge status="published" />
              <InstagramIcon size={16} />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{MEDIA_TYPES[post.mediaType] || post.mediaType}</span>
            </div>
          </div>

          <div style={statsGrid}>
            <div style={statCard}>
              <div style={statVal}>{formatNumber(post.likeCount)}</div>
              <div style={statLbl}>Likes</div>
            </div>
            <div style={statCard}>
              <div style={statVal}>{formatNumber(post.commentsCount)}</div>
              <div style={statLbl}>Comentarios</div>
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
            <div style={sectionTitle}>Legenda</div>
            <div style={captionBox}>{post.caption || 'Sem legenda'}</div>
          </div>

          {/* Comments section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={sectionTitle}>Comentarios ({comments.length})</div>
                {suggestions.size > 0 && pendingCount > 0 && (
                  <span style={{ fontSize: '11px', color: '#667eea', fontWeight: 700, fontFamily: 'var(--font)' }}>
                    {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  style={{ ...aiBtn, opacity: loadingAI ? 0.6 : 1, pointerEvents: loadingAI ? 'none' : 'auto' }}
                  onClick={handleAISuggest}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(102,126,234,0.4)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                  </svg>
                  {loadingAI ? 'Analisando...' : suggestions.size > 0 ? 'Reanalisar' : 'IA Sugerir'}
                </button>
                <button
                  style={{ ...hideBtn, textDecoration: 'none', fontSize: '11px' }}
                  onClick={() => selectedId && fetchComments(selectedId)}
                >Atualizar</button>
              </div>
            </div>

            {aiError && <div style={errorMsg}>{aiError}</div>}
            {feedback && (
              <div style={feedback.type === 'success' ? successMsg : errorMsg}>{feedback.msg}</div>
            )}

            {loadingComments ? (
              <div style={loadingText}>Carregando comentarios...</div>
            ) : comments.length === 0 ? (
              <div style={loadingText}>Sem comentarios</div>
            ) : (
              comments.map((c) => {
                const suggestion = suggestions.get(c.id);
                const isSent = sentReplies.has(c.id);
                const isSkipped = skippedComments.has(c.id);
                const isEditing = editingReply === c.id;

                return (
                  <div key={c.id} style={{ ...commentItem, opacity: isSent || isSkipped ? 0.5 : 1 }}>
                    <div style={commentAvatar}>{c.username[0]?.toUpperCase()}</div>
                    <div style={commentBody}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={commentUser}>@{c.username}</span>
                        {suggestion && <span style={categoryBadge(suggestion.category)}>{CATEGORY_CONFIG[suggestion.category].label}</span>}
                        {isSent && <span style={{ fontSize: '10px', color: '#0d7a3f', fontWeight: 700 }}>Respondido</span>}
                        {isSkipped && <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>Pulado</span>}
                      </div>
                      <div style={commentText}>{c.text}</div>
                      <div style={commentMeta}>
                        <span>{timeAgo(c.timestamp)}</span>
                        {c.like_count > 0 && <span>{c.like_count} likes</span>}
                        {!isSent && !isSkipped && (
                          <>
                            <button style={hideBtn} onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}>
                              {replyTo === c.id ? 'Cancelar' : 'Responder'}
                            </button>
                            <button style={hideBtn} onClick={() => { if (confirm('Tem certeza que quer ocultar esse comentario?')) handleHide(c.id); }}>Ocultar</button>
                          </>
                        )}
                      </div>

                      {/* Manual reply */}
                      {replyTo === c.id && !suggestion && (
                        <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Escreva sua resposta..."
                            style={{ ...replyInput, minHeight: '36px', maxHeight: '80px' }}
                            rows={1}
                          />
                          <button
                            style={{ ...replyBtn, opacity: replying ? 0.5 : 1 }}
                            onClick={() => handleReply(c.id)}
                            disabled={replying}
                          >
                            {replying ? '...' : 'Enviar'}
                          </button>
                        </div>
                      )}

                      {/* AI suggestion */}
                      {suggestion && suggestion.suggestedReply && !isSent && !isSkipped && (
                        <div style={suggestionBox}>
                          {isEditing ? (
                            <>
                              <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                style={{ ...replyInput, minHeight: '50px', background: '#fff', border: '1px solid #c4b5fd', color: '#4c1d95' }}
                                rows={2}
                              />
                              <div style={{ ...suggestionActions, marginTop: '6px' }}>
                                <button
                                  style={{ ...approveBtn, opacity: replying ? 0.5 : 1 }}
                                  onClick={() => handleReply(c.id, editText)}
                                  disabled={replying}
                                >
                                  {replying ? '...' : 'Enviar editado'}
                                </button>
                                <button style={skipBtn} onClick={() => setEditingReply(null)}>Cancelar</button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div style={{ fontStyle: 'italic' }}>"{suggestion.suggestedReply}"</div>
                              <div style={suggestionActions}>
                                <button
                                  style={{ ...approveBtn, opacity: replying ? 0.5 : 1 }}
                                  onClick={() => handleApprove(c.id)}
                                  disabled={replying}
                                >
                                  {replying ? '...' : 'Aprovar'}
                                </button>
                                <button style={editBtn} onClick={() => handleEdit(c.id)}>Editar</button>
                                <button style={skipBtn} onClick={() => handleSkip(c.id)}>Pular</button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div>
            <div style={sectionTitle}>Links</div>
            <a href={post.permalink} target="_blank" rel="noopener" style={linkBtn}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <InstagramIcon size={18} />
              Abrir no Instagram
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
