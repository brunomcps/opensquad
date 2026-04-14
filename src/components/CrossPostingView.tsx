import { useState, useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { useContentStore } from '../store/useContentStore';
import { YouTubeIcon, TikTokIcon, InstagramIcon } from './icons/PlatformIcons';

// --- Types ---

interface ContentGroup {
  id: string;
  name: string;
  createdAt: string;
  platforms: {
    youtube?: { videoId: string; url: string };
    tiktok?: { videoId: string; url: string };
    instagram?: { postId: string; url: string };
  };
}

interface MatchSuggestion {
  ytVideoId: string;
  ttVideoId: string;
  titleScore: number;
  descScore: number;
  thumbScore: number;
  totalScore: number;
  confidence: 'high' | 'medium' | 'low';
}

// --- Styles ---

const wrapper: CSSProperties = { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' };

const headerSection: CSSProperties = { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' };
const pageTitle: CSSProperties = { fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font)', letterSpacing: '-0.02em' };
const pageSubtitle: CSSProperties = { fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' };

const statsBar: CSSProperties = {
  display: 'flex', gap: '12px', alignItems: 'center',
};
const statChip: CSSProperties = {
  padding: '4px 12px', borderRadius: '14px', fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font)',
};

const btn: CSSProperties = {
  background: 'var(--accent-gold)', border: 'none', borderRadius: 'var(--radius)',
  color: '#fff', padding: '10px 20px', fontSize: '14px', fontWeight: 700,
  cursor: 'pointer', fontFamily: 'var(--font)',
};

const section: CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
  padding: '18px 22px', boxShadow: 'var(--shadow-sm)',
};
const sectionTitle: CSSProperties = { fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)', marginBottom: '14px' };

// Group row
const groupRow: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0',
  borderBottom: '1px solid var(--border)',
};
const groupName: CSSProperties = { fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

const platformCheck: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600,
  padding: '3px 8px', borderRadius: '4px',
};
const checkYes: CSSProperties = { ...platformCheck, background: 'rgba(34,163,91,0.1)', color: 'var(--accent-green)' };
const checkNo: CSSProperties = { ...platformCheck, background: 'rgba(220,53,69,0.06)', color: 'var(--accent-red)', opacity: 0.6 };

// Match suggestion
const matchCard: CSSProperties = {
  background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
  padding: '14px', display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '10px',
};
const matchInfo: CSSProperties = { flex: 1, minWidth: 0 };
const matchTitle: CSSProperties = { fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)' };
const matchMeta: CSSProperties = { fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px', display: 'flex', gap: '10px' };
const matchThumb: CSSProperties = { width: '56px', height: '32px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 };
const matchArrow: CSSProperties = { fontSize: '18px', color: 'var(--text-muted)', flexShrink: 0 };
const matchActions: CSSProperties = { display: 'flex', gap: '6px', flexShrink: 0 };
const confirmBtn: CSSProperties = {
  background: 'var(--accent-green)', border: 'none', borderRadius: 'var(--radius)',
  color: '#fff', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)',
};
const rejectBtn: CSSProperties = {
  background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  color: 'var(--text-muted)', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
};
const confidenceBadge: CSSProperties = {
  fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '3px', fontFamily: 'var(--font)',
  textTransform: 'uppercase',
};

const emptyState: CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: '8px', padding: '40px', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center',
};

// --- Component ---

export function CrossPostingView() {
  const ytVideos = useContentStore((s) => s.youtubeVideos);
  const ttVideos = useContentStore((s) => s.tiktokVideos);

  const [groups, setGroups] = useState<ContentGroup[]>([]);
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);

  // Load groups
  useEffect(() => {
    fetch('/api/crosspost/groups')
      .then((r) => r.json())
      .then((d) => { if (d.ok) setGroups(d.groups); })
      .catch(() => {});
  }, []);

  // Auto-match
  const runAutoMatch = useCallback(async () => {
    setMatchLoading(true);
    try {
      const res = await fetch('/api/crosspost/auto-match', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setSuggestions(data.matches.filter((m: MatchSuggestion) => m.totalScore > 40));
      }
    } catch (err: any) {
      console.error('Auto-match error:', err);
    } finally {
      setMatchLoading(false);
    }
  }, []);

  // Confirm match
  const confirmMatch = async (match: MatchSuggestion) => {
    const ytVideo = ytVideos.find((v) => v.id === match.ytVideoId);
    const ttVideo = ttVideos.find((v) => v.id === match.ttVideoId);

    const res = await fetch('/api/crosspost/confirm-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ytVideoId: match.ytVideoId,
        ytTitle: ytVideo?.title,
        ytUrl: `https://youtube.com/shorts/${match.ytVideoId}`,
        ttVideoId: match.ttVideoId,
        ttUrl: ttVideo?.url,
        name: ytVideo?.title || ttVideo?.title,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setGroups((prev) => [...prev, data.group]);
      setSuggestions((prev) => prev.filter((s) => s.ttVideoId !== match.ttVideoId));
    }
  };

  const rejectMatch = (match: MatchSuggestion) => {
    setSuggestions((prev) => prev.filter((s) => s.ttVideoId !== match.ttVideoId));
  };

  const getVideoTitle = (platform: 'youtube' | 'tiktok', id: string) => {
    if (platform === 'youtube') return ytVideos.find((v) => v.id === id)?.title || id;
    return ttVideos.find((v) => v.id === id)?.title || id;
  };

  const getVideoThumb = (platform: 'youtube' | 'tiktok', id: string) => {
    if (platform === 'youtube') return ytVideos.find((v) => v.id === id)?.thumbnail;
    return ttVideos.find((v) => v.id === id)?.thumbnail;
  };

  const completedGroups = groups.filter((g) => g.platforms.youtube && g.platforms.tiktok);
  const incompleteGroups = groups.filter((g) => !(g.platforms.youtube && g.platforms.tiktok));

  const confColors = {
    high: { bg: 'rgba(34,163,91,0.1)', color: 'var(--accent-green)' },
    medium: { bg: 'var(--accent-gold-bg)', color: 'var(--accent-gold-dark)' },
    low: { bg: 'rgba(220,53,69,0.06)', color: 'var(--accent-red)' },
  };

  return (
    <div style={wrapper}>
      <div style={headerSection}>
        <div>
          <div style={pageTitle}>Cross-posting Tracker</div>
          <div style={pageSubtitle}>Acompanhe quais conteudos foram publicados em cada plataforma.</div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={statsBar}>
            <span style={{ ...statChip, background: 'rgba(34,163,91,0.1)', color: 'var(--accent-green)' }}>
              {completedGroups.length} completos
            </span>
            <span style={{ ...statChip, background: 'var(--accent-gold-bg)', color: 'var(--accent-gold-dark)' }}>
              {incompleteGroups.length} incompletos
            </span>
          </div>
          <button
            style={{ ...btn, opacity: matchLoading ? 0.5 : 1 }}
            onClick={runAutoMatch}
            disabled={matchLoading}
          >
            {matchLoading ? 'Analisando...' : 'Auto-Match'}
          </button>
        </div>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div style={section}>
          <div style={sectionTitle}>Sugestoes de vinculo ({suggestions.length})</div>
          {suggestions.map((match, i) => {
            const ytTitle = getVideoTitle('youtube', match.ytVideoId);
            const ttTitle = getVideoTitle('tiktok', match.ttVideoId);
            const ytThumb = getVideoThumb('youtube', match.ytVideoId);
            const ttThumb = getVideoThumb('tiktok', match.ttVideoId);
            const conf = confColors[match.confidence];

            return (
              <div key={i} style={matchCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <YouTubeIcon size={14} />
                  {ytThumb && <img src={ytThumb} alt="" style={matchThumb} />}
                </div>
                <div style={matchInfo}>
                  <div style={matchTitle}>{ytTitle}</div>
                  <div style={matchMeta}>
                    <span>Titulo: {match.titleScore}%</span>
                    <span>Desc: {match.descScore}%</span>
                    <span>Thumb: {match.thumbScore}%</span>
                  </div>
                </div>

                <div style={matchArrow}>→</div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TikTokIcon size={14} />
                  {ttThumb && <img src={ttThumb} alt="" style={matchThumb} />}
                </div>
                <div style={matchInfo}>
                  <div style={matchTitle}>{ttTitle}</div>
                </div>

                <span style={{ ...confidenceBadge, background: conf.bg, color: conf.color }}>
                  {match.totalScore}% {match.confidence}
                </span>

                <div style={matchActions}>
                  <button style={confirmBtn} onClick={() => confirmMatch(match)}>Vincular</button>
                  <button style={rejectBtn} onClick={() => rejectMatch(match)}>Nao</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Linked groups */}
      <div style={section}>
        <div style={sectionTitle}>Conteudos vinculados ({groups.length})</div>

        {groups.length === 0 ? (
          <div style={emptyState}>
            Nenhum vinculo criado ainda. Clique em "Auto-Match" para encontrar correspondencias automaticamente.
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.id} style={groupRow}>
              <div style={groupName}>{group.name}</div>

              {group.platforms.youtube ? (
                <a href={group.platforms.youtube.url} target="_blank" rel="noopener" style={{ textDecoration: 'none' }}>
                  <div style={checkYes}><YouTubeIcon size={12} /> YT</div>
                </a>
              ) : (
                <div style={checkNo}><YouTubeIcon size={12} /> YT</div>
              )}

              {group.platforms.tiktok ? (
                <a href={group.platforms.tiktok.url} target="_blank" rel="noopener" style={{ textDecoration: 'none' }}>
                  <div style={checkYes}><TikTokIcon size={12} /> TT</div>
                </a>
              ) : (
                <div style={checkNo}><TikTokIcon size={12} /> TT</div>
              )}

              {group.platforms.instagram ? (
                <a href={group.platforms.instagram.url} target="_blank" rel="noopener" style={{ textDecoration: 'none' }}>
                  <div style={checkYes}><InstagramIcon size={12} /> IG</div>
                </a>
              ) : (
                <div style={checkNo}><InstagramIcon size={12} /> IG</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
