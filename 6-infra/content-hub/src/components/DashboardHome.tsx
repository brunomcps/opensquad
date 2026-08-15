import { useMemo, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useContentStore } from '../store/useContentStore';
import { useFinancialStore } from '../store/useFinancialStore';
import { YouTubeIcon, ShortsIcon, TikTokIcon, InstagramIcon, FacebookIcon, ThreadsIcon } from './icons/PlatformIcons';
import type { ViewMode } from './Header';

// --- Styles ---
const container: CSSProperties = {
  padding: '24px', flex: 1, overflowY: 'auto',
  display: 'flex', flexDirection: 'column', gap: '20px',
};

const grid2: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' };
const grid4: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' };

const kpiCard: CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)', padding: '20px 24px',
  display: 'flex', flexDirection: 'column', gap: '4px',
  boxShadow: 'var(--shadow-sm)', transition: 'all var(--transition)',
};
const kpiLabel: CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font)',
};
const kpiValue: CSSProperties = {
  fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)',
  lineHeight: 1.1, fontFamily: 'var(--font)', letterSpacing: '-0.02em',
};
const kpiSub: CSSProperties = { fontSize: '12px', color: 'var(--text-secondary)' };

const sectionCard: CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)',
  display: 'flex', flexDirection: 'column', overflow: 'hidden',
};
const sectionHeader: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 20px', borderBottom: '1px solid var(--border)',
};
const sectionTitle: CSSProperties = {
  fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)',
};
const sectionLink: CSSProperties = {
  fontSize: '12px', fontWeight: 600, color: 'var(--accent-gold-dark)',
  cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'var(--font)',
  textDecoration: 'none',
};
const listBody: CSSProperties = { padding: '0', maxHeight: '340px', overflowY: 'auto' };

const itemRow: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '12px',
  padding: '10px 20px', borderBottom: '1px solid var(--border)',
  cursor: 'pointer', transition: 'background var(--transition)',
};
const itemThumb: CSSProperties = {
  width: '48px', height: '36px', borderRadius: '4px',
  objectFit: 'cover', background: 'var(--bg-primary)', flexShrink: 0,
};
const itemTitle: CSSProperties = {
  fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)',
  fontFamily: 'var(--font)', overflow: 'hidden', textOverflow: 'ellipsis',
  whiteSpace: 'nowrap', flex: 1,
};
const itemMeta: CSSProperties = {
  fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap',
};
const platformDot = (color: string): CSSProperties => ({
  width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0,
});

const emptyState: CSSProperties = {
  padding: '24px', textAlign: 'center', fontSize: '13px',
  color: 'var(--text-muted)', fontStyle: 'italic',
};

const welcomeBar: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
};
const welcomeTitle: CSSProperties = {
  fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)',
  fontFamily: 'var(--font)', letterSpacing: '-0.02em',
};
const welcomeSub: CSSProperties = {
  fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px',
};

// --- Helpers ---
function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString('pt-BR');
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 0) {
    // Future date
    const absMins = Math.abs(mins);
    if (absMins < 60) return `em ${absMins}min`;
    const hrs = Math.floor(absMins / 60);
    if (hrs < 24) return `em ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `em ${days}d`;
  }
  if (mins < 60) return `${mins}min atras`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atras`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d atras`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

interface Props {
  onNavigate: (mode: ViewMode) => void;
}

export function DashboardHome({ onNavigate }: Props) {
  const { summary, todayEvents, fetchSummary, fetchTodayEvents, quickAddEvent } = useFinancialStore();
  const [quickAddText, setQuickAddText] = useState('');

  useEffect(() => {
    fetchSummary();
    fetchTodayEvents();
  }, [fetchSummary, fetchTodayEvents]);

  const channelStats = useContentStore((s) => s.channelStats);
  const ytVideos = useContentStore((s) => s.youtubeVideos);
  const tiktokVideos = useContentStore((s) => s.tiktokVideos);
  const instagramPosts = useContentStore((s) => s.instagramPosts);
  const facebookPosts = useContentStore((s) => s.facebookPosts);
  const threadsPosts = useContentStore((s) => s.threadsPosts);
  const setSelectedVideoId = useContentStore((s) => s.setSelectedVideoId);
  const setSelectedTikTokId = useContentStore((s) => s.setSelectedTikTokId);
  const setSelectedInstagramId = useContentStore((s) => s.setSelectedInstagramId);
  const setSelectedFacebookId = useContentStore((s) => s.setSelectedFacebookId);
  const setSelectedThreadsId = useContentStore((s) => s.setSelectedThreadsId);

  // KPI calculations
  const kpis = useMemo(() => {
    const publicYT = ytVideos.filter((v) => v.privacyStatus === 'public');
    const ytViews = publicYT.reduce((s, v) => s + (v.viewCount || 0), 0);
    const ytLikes = publicYT.reduce((s, v) => s + (v.likeCount || 0), 0);
    const ttViews = tiktokVideos.reduce((s, v) => s + v.viewCount, 0);
    const ttLikes = tiktokVideos.reduce((s, v) => s + v.likeCount, 0);
    const igLikes = instagramPosts.reduce((s, p) => s + p.likeCount, 0);

    const totalViews = ytViews + ttViews;
    const totalLikes = ytLikes + ttLikes + igLikes;
    const engagement = totalViews > 0 ? ((totalLikes / totalViews) * 100).toFixed(1) : '0';
    const totalContent = ytVideos.length + tiktokVideos.length + instagramPosts.length + facebookPosts.length + threadsPosts.length;

    // Recent 7 days
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentYT = ytVideos.filter((v) => new Date(v.publishedAt).getTime() > weekAgo);
    const recentTT = tiktokVideos.filter((v) => new Date(v.createTime).getTime() > weekAgo);
    const recentIG = instagramPosts.filter((p) => new Date(p.timestamp).getTime() > weekAgo);
    const recentCount = recentYT.length + recentTT.length + recentIG.length;

    return {
      subscribers: channelStats?.subscriberCount || 0,
      totalViews, engagement, totalContent, recentCount,
    };
  }, [channelStats, ytVideos, tiktokVideos, instagramPosts, facebookPosts, threadsPosts]);

  // Recent publications (last 10 across all platforms, sorted by date)
  const recentPubs = useMemo(() => {
    type Item = { id: string; title: string; thumb?: string; date: string; platform: string; color: string; views?: number; likes?: number; onClick: () => void };
    const items: Item[] = [];

    for (const v of ytVideos.slice(0, 30)) {
      items.push({
        id: v.id, title: v.title, thumb: v.thumbnail,
        date: v.scheduledAt || v.publishedAt,
        platform: v.isShort ? 'Shorts' : 'YouTube',
        color: v.isShort ? '#ff4444' : '#ff0000',
        views: v.viewCount, likes: v.likeCount,
        onClick: () => setSelectedVideoId(v.id),
      });
    }
    for (const v of tiktokVideos.slice(0, 20)) {
      items.push({
        id: v.id, title: v.title.replace(/#\w+/g, '').trim().slice(0, 80) || 'TikTok',
        thumb: v.thumbnail, date: v.scheduledAt || v.createTime,
        platform: 'TikTok', color: '#00f2ea',
        views: v.viewCount, likes: v.likeCount,
        onClick: () => setSelectedTikTokId(v.id),
      });
    }
    for (const p of instagramPosts.slice(0, 20)) {
      items.push({
        id: p.id, title: p.caption.replace(/#\w+/g, '').trim().slice(0, 80) || 'Instagram',
        thumb: p.thumbnailUrl, date: p.timestamp,
        platform: 'Instagram', color: '#e1306c',
        likes: p.likeCount,
        onClick: () => setSelectedInstagramId(p.id),
      });
    }
    for (const p of facebookPosts.slice(0, 10)) {
      items.push({
        id: p.id, title: p.message.replace(/#\w+/g, '').trim().slice(0, 80) || 'Facebook',
        thumb: p.fullPicture, date: p.createdTime,
        platform: 'Facebook', color: '#1877F2',
        likes: p.likeCount,
        onClick: () => setSelectedFacebookId(p.id),
      });
    }
    for (const p of threadsPosts.slice(0, 10)) {
      items.push({
        id: p.id, title: p.text.replace(/#\w+/g, '').trim().slice(0, 80) || 'Threads',
        thumb: p.mediaUrl, date: p.timestamp,
        platform: 'Threads', color: '#000',
        likes: p.likeCount,
        onClick: () => setSelectedThreadsId(p.id),
      });
    }

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items.slice(0, 12);
  }, [ytVideos, tiktokVideos, instagramPosts, facebookPosts, threadsPosts, setSelectedVideoId, setSelectedTikTokId, setSelectedInstagramId, setSelectedFacebookId, setSelectedThreadsId]);

  // Scheduled / upcoming
  const scheduled = useMemo(() => {
    type Item = { id: string; title: string; thumb?: string; date: string; platform: string; color: string; onClick: () => void };
    const items: Item[] = [];
    const now = Date.now();

    for (const v of ytVideos) {
      if (v.scheduledAt && new Date(v.scheduledAt).getTime() > now) {
        items.push({
          id: v.id, title: v.title, thumb: v.thumbnail,
          date: v.scheduledAt, platform: v.isShort ? 'Shorts' : 'YouTube',
          color: v.isShort ? '#ff4444' : '#ff0000',
          onClick: () => setSelectedVideoId(v.id),
        });
      }
    }
    for (const v of tiktokVideos) {
      if (v.scheduledAt && new Date(v.scheduledAt).getTime() > now) {
        items.push({
          id: v.id, title: v.title.replace(/#\w+/g, '').trim().slice(0, 80) || 'TikTok',
          thumb: v.thumbnail, date: v.scheduledAt,
          platform: 'TikTok', color: '#00f2ea',
          onClick: () => setSelectedTikTokId(v.id),
        });
      }
    }

    items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return items.slice(0, 8);
  }, [ytVideos, tiktokVideos, setSelectedVideoId, setSelectedTikTokId]);

  // Top performing (last 30 days)
  const topPerforming = useMemo(() => {
    type Item = { id: string; title: string; thumb?: string; views: number; likes: number; platform: string; color: string; onClick: () => void };
    const items: Item[] = [];
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    for (const v of ytVideos) {
      if (v.privacyStatus === 'public' && new Date(v.publishedAt).getTime() > monthAgo) {
        items.push({
          id: v.id, title: v.title, thumb: v.thumbnail,
          views: v.viewCount || 0, likes: v.likeCount || 0,
          platform: v.isShort ? 'Shorts' : 'YouTube',
          color: v.isShort ? '#ff4444' : '#ff0000',
          onClick: () => setSelectedVideoId(v.id),
        });
      }
    }
    for (const v of tiktokVideos) {
      if (new Date(v.createTime).getTime() > monthAgo) {
        items.push({
          id: v.id, title: v.title.replace(/#\w+/g, '').trim().slice(0, 80) || 'TikTok',
          thumb: v.thumbnail, views: v.viewCount, likes: v.likeCount,
          platform: 'TikTok', color: '#00f2ea',
          onClick: () => setSelectedTikTokId(v.id),
        });
      }
    }

    items.sort((a, b) => b.views - a.views);
    return items.slice(0, 5);
  }, [ytVideos, tiktokVideos, setSelectedVideoId, setSelectedTikTokId]);

  // Comments needing attention (IG posts with most comments)
  const commentPosts = useMemo(() => {
    return [...instagramPosts]
      .filter((p) => p.commentsCount > 0)
      .sort((a, b) => b.commentsCount - a.commentsCount)
      .slice(0, 5);
  }, [instagramPosts]);

  return (
    <div style={container}>
      {/* Welcome */}
      <div style={welcomeBar}>
        <div>
          <div style={welcomeTitle}>{getGreeting()}, Bruno</div>
          <div style={welcomeSub}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            {kpis.recentCount > 0 && ` · ${kpis.recentCount} publicacoes nos ultimos 7 dias`}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={grid4}>
        <div style={kpiCard}>
          <span style={kpiLabel}>Inscritos YT</span>
          <span style={kpiValue}>{fmt(kpis.subscribers)}</span>
          <span style={kpiSub}>YouTube</span>
        </div>
        <div style={kpiCard}>
          <span style={kpiLabel}>Views Total</span>
          <span style={{ ...kpiValue, color: 'var(--accent-gold-dark)' }}>{fmt(kpis.totalViews)}</span>
          <span style={kpiSub}>cross-platform</span>
        </div>
        <div style={kpiCard}>
          <span style={kpiLabel}>Conteudos</span>
          <span style={kpiValue}>{fmt(kpis.totalContent)}</span>
          <span style={kpiSub}>todas plataformas</span>
        </div>
        <div style={kpiCard}>
          <span style={kpiLabel}>Engagement</span>
          <span style={{ ...kpiValue, color: 'var(--accent-green)' }}>{kpis.engagement}%</span>
          <span style={kpiSub}>likes / views</span>
        </div>
        <div style={{ ...kpiCard, cursor: 'pointer' }} onClick={() => onNavigate('financial')}>
          <span style={kpiLabel}>Receita Hotmart</span>
          <span style={{ ...kpiValue, color: 'var(--accent-gold-dark)' }}>
            R$ {summary ? (summary.netRevenue >= 1000 ? (summary.netRevenue / 1000).toFixed(1) + 'K' : summary.netRevenue.toFixed(0)) : '...'}
          </span>
          <span style={kpiSub}>{summary?.totalSales || 0} vendas no mês</span>
        </div>
      </div>

      {/* Main grid: Recent + Scheduled */}
      <div style={grid2}>
        {/* Recent publications */}
        <div style={sectionCard}>
          <div style={sectionHeader}>
            <span style={sectionTitle}>Publicacoes Recentes</span>
            <button style={sectionLink} onClick={() => onNavigate('timeline')}>Ver timeline →</button>
          </div>
          <div style={listBody}>
            {recentPubs.length === 0 ? (
              <div style={emptyState}>Nenhuma publicacao encontrada</div>
            ) : (
              recentPubs.map((item) => (
                <div
                  key={`${item.platform}-${item.id}`}
                  style={itemRow}
                  onClick={item.onClick}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={platformDot(item.color)} />
                  {item.thumb && <img src={item.thumb} alt="" style={itemThumb} />}
                  <span style={itemTitle}>{item.title}</span>
                  <span style={itemMeta}>
                    {item.views != null && item.views > 0 ? `${fmt(item.views)} views` : item.likes != null ? `${fmt(item.likes)} likes` : ''}
                  </span>
                  <span style={{ ...itemMeta, minWidth: '60px', textAlign: 'right' }}>{relativeDate(item.date)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column: Scheduled + Top performing */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Scheduled */}
          <div style={sectionCard}>
            <div style={sectionHeader}>
              <span style={sectionTitle}>Proximos Agendados</span>
              <button style={sectionLink} onClick={() => onNavigate('calendar')}>Ver calendario →</button>
            </div>
            <div style={listBody}>
              {scheduled.length === 0 ? (
                <div style={emptyState}>Nenhum conteudo agendado</div>
              ) : (
                scheduled.map((item) => (
                  <div
                    key={`sched-${item.id}`}
                    style={itemRow}
                    onClick={item.onClick}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={platformDot(item.color)} />
                    {item.thumb && <img src={item.thumb} alt="" style={itemThumb} />}
                    <span style={itemTitle}>{item.title}</span>
                    <span style={{ ...itemMeta, color: 'var(--accent-gold-dark)', fontWeight: 600 }}>
                      {relativeDate(item.date)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top performing last 30 days */}
          <div style={sectionCard}>
            <div style={sectionHeader}>
              <span style={sectionTitle}>Top Performance (30d)</span>
              <button style={sectionLink} onClick={() => onNavigate('analytics')}>Ver analytics →</button>
            </div>
            <div style={listBody}>
              {topPerforming.length === 0 ? (
                <div style={emptyState}>Sem dados recentes</div>
              ) : (
                topPerforming.map((item, i) => (
                  <div
                    key={`top-${item.id}`}
                    style={itemRow}
                    onClick={item.onClick}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 800, color: i === 0 ? 'var(--accent-gold-dark)' : 'var(--text-muted)', fontFamily: 'var(--font)', width: '20px', textAlign: 'center' }}>
                      {i + 1}
                    </span>
                    <div style={platformDot(item.color)} />
                    {item.thumb && <img src={item.thumb} alt="" style={itemThumb} />}
                    <span style={itemTitle}>{item.title}</span>
                    <span style={itemMeta}>{fmt(item.views)} views</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Today's agenda */}
      <div style={sectionCard}>
        <div style={sectionHeader}>
          <span style={sectionTitle}>Agenda de Hoje</span>
          <form
            style={{ display: 'flex', gap: '6px', alignItems: 'center' }}
            onSubmit={async (e) => {
              e.preventDefault();
              if (!quickAddText.trim()) return;
              await quickAddEvent(quickAddText.trim());
              setQuickAddText('');
            }}
          >
            <input
              type="text"
              value={quickAddText}
              onChange={(e) => setQuickAddText(e.target.value)}
              placeholder="Ex: Gravar vídeo amanhã 14h"
              style={{
                border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                padding: '5px 10px', fontSize: '12px', fontFamily: 'var(--font-body)',
                background: 'var(--bg-primary)', color: 'var(--text-primary)',
                width: '240px', outline: 'none',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            />
            <button
              type="submit"
              style={{
                background: 'var(--accent-gold)', color: '#fff', border: 'none',
                borderRadius: 'var(--radius)', padding: '5px 12px', fontSize: '12px',
                fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
              }}
            >
              +
            </button>
          </form>
        </div>
        <div style={listBody}>
          {todayEvents.length === 0 ? (
            <div style={emptyState}>Nenhum evento hoje</div>
          ) : (
            todayEvents.map((event) => (
              <div
                key={event.id}
                style={itemRow}
                onClick={() => event.htmlLink && window.open(event.htmlLink, '_blank')}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: event.allDay ? 'var(--accent-gold)' : 'var(--accent-blue)',
                  flexShrink: 0,
                }} />
                <span style={{
                  fontSize: '12px', color: 'var(--accent-gold-dark)', fontWeight: 600,
                  fontFamily: 'var(--font)', minWidth: '55px', fontVariantNumeric: 'tabular-nums',
                }}>
                  {event.allDay ? 'Dia todo' : new Date(event.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span style={itemTitle}>{event.summary}</span>
                {!event.allDay && (
                  <span style={itemMeta}>
                    {new Date(event.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    {' — '}
                    {new Date(event.end).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Comments needing attention */}
      {commentPosts.length > 0 && (
        <div style={sectionCard}>
          <div style={sectionHeader}>
            <span style={sectionTitle}>Comentarios para Responder</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Instagram — clique para abrir e usar IA</span>
          </div>
          <div style={{ display: 'flex', gap: '0', overflowX: 'auto' }}>
            {commentPosts.map((p) => (
              <div
                key={p.id}
                style={{
                  padding: '14px 20px', borderRight: '1px solid var(--border)',
                  minWidth: '200px', cursor: 'pointer', transition: 'background var(--transition)',
                  display: 'flex', flexDirection: 'column', gap: '6px',
                }}
                onClick={() => setSelectedInstagramId(p.id)}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <InstagramIcon size={14} />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {new Date(p.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.caption.replace(/#\w+/g, '').trim().slice(0, 60) || 'Sem legenda'}
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span>{fmt(p.commentsCount)} comentarios</span>
                  <span>{fmt(p.likeCount)} likes</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
