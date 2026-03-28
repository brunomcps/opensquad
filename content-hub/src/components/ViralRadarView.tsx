import { useState, useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { CompetitorFichasTab } from './CompetitorFichaDetail';
import { TrendTab, ComparisonTab, BookmarksTab, CommentsTab, EvolutionTab } from './ViralRadarTabs';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FeedItem {
  id: string;
  competitor?: string;
  competitorId?: string;
  competitorName: string;
  platform: string;
  url: string;
  title: string;
  description?: string;
  thumbnail?: string | null;
  thumbnailUrl?: string;
  publishedAt: string;
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  zScore?: number | null;
  isOutlier?: boolean;
  isFlop?: boolean;
  outlierMultiplier?: string | null;
  metrics?: {
    views: number | null;
    likes: number | null;
    comments: number | null;
    shares?: number | null;
  };
}

interface CompetitorPlatform {
  platform: string;
  handle: string;
  lastSyncedAt: string | null;
  itemCount: number;
}

interface CompetitorEntry {
  id: string;
  name: string;
  niche?: string;
  region?: string;
  platforms: CompetitorPlatform[];
}

type SubTab = 'feed' | 'concorrentes' | 'fichas' | 'tendencias' | 'vs-bruno' | 'salvos' | 'comentarios' | 'evolucao';
type SortOption = 'date' | 'views' | 'likes' | 'comments' | 'zScore';
type PlatformFilter = 'all' | 'youtube' | 'instagram' | 'tiktok' | 'twitter';
type CategoryFilter = 'all' | 'outliers' | 'flops';

// ─── Constants ───────────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<string, string> = {
  youtube: '#FF0000',
  instagram: '#E1306C',
  tiktok: '#010101',
  twitter: '#1DA1F2',
  x: '#1DA1F2',
};

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  twitter: 'X',
  x: 'X',
};

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'date', label: 'Mais recentes' },
  { value: 'views', label: 'Mais views' },
  { value: 'likes', label: 'Mais likes' },
  { value: 'comments', label: 'Mais comentários' },
  { value: 'zScore', label: 'Maior z-score' },
];

const PLATFORM_FILTERS: { value: PlatformFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'twitter', label: 'X' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d atrás`;
  return `${Math.floor(days / 30)}m atrás`;
}

function formatNum(n: number | null): string {
  if (n == null) return '-';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString('pt-BR');
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  subTabRow: {
    display: 'flex',
    gap: 6,
  },
  subTab: {
    padding: '8px 18px',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    background: 'var(--bg-card)',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font)',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    transition: 'var(--transition)',
  },
  subTabActive: {
    background: 'var(--accent-gold)',
    color: '#fff',
    border: '1px solid var(--accent-gold)',
  },
  filterBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
  },
  selectWrapper: {
    position: 'relative' as const,
  },
  select: {
    padding: '7px 12px',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font)',
    fontSize: 13,
    cursor: 'pointer',
    minWidth: 160,
  },
  platformPillRow: {
    display: 'flex',
    gap: 4,
  },
  platformPill: {
    padding: '6px 14px',
    borderRadius: 20,
    border: '1px solid var(--border)',
    background: 'var(--bg-card)',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font)',
    fontWeight: 600,
    fontSize: 12,
    cursor: 'pointer',
    transition: 'var(--transition)',
  },
  platformPillActive: {
    background: 'var(--accent-gold)',
    color: '#fff',
    border: '1px solid var(--accent-gold)',
  },
  filterPill: {
    padding: '6px 14px',
    borderRadius: 20,
    border: '1px solid var(--border)',
    background: 'var(--bg-card)',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font)',
    fontWeight: 600,
    fontSize: 12,
    cursor: 'pointer',
    transition: 'var(--transition)',
  },
  filterPillActive: {
    background: 'var(--accent-gold)',
    color: '#fff',
    border: '1px solid var(--accent-gold)',
  },
  statsBar: {
    fontSize: 13,
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-body)',
  },
  feedGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 14,
  },
  feedCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-sm)',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'var(--transition)',
    textDecoration: 'none',
    color: 'inherit',
    display: 'flex',
    flexDirection: 'column',
  },
  thumbnailWrapper: {
    position: 'relative' as const,
    width: '100%',
    aspectRatio: '16/9',
    overflow: 'hidden',
    backgroundColor: 'var(--bg-secondary)',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  platformBadge: {
    position: 'absolute' as const,
    top: 8,
    left: 8,
    padding: '3px 8px',
    borderRadius: 4,
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    fontFamily: 'var(--font)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  cardBody: {
    padding: '12px 14px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    flex: 1,
  },
  competitorName: {
    fontSize: 11,
    color: 'var(--text-muted)',
    fontFamily: 'var(--font)',
    fontWeight: 500,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font)',
    lineHeight: 1.35,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  metricsRow: {
    display: 'flex',
    gap: 12,
    fontSize: 12,
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-body)',
    marginTop: 'auto',
  },
  metricItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
  },
  cardDate: {
    fontSize: 11,
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-body)',
    marginTop: 2,
  },
  // Concorrentes tab
  competitorsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 14,
  },
  competitorCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: 18,
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  competitorCardName: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font)',
  },
  badgeRow: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  badge: {
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: 'var(--font)',
    background: 'var(--bg-secondary)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border)',
  },
  platformRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid var(--border)',
  },
  platformInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  platformHandle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font)',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  platformMeta: {
    fontSize: 11,
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-body)',
  },
  syncBtn: {
    padding: '5px 12px',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font)',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'var(--transition)',
    whiteSpace: 'nowrap' as const,
  },
  syncAllBtn: {
    padding: '8px 16px',
    borderRadius: 'var(--radius)',
    background: 'var(--accent-gold)',
    color: '#fff',
    fontFamily: 'var(--font)',
    fontSize: 13,
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
    transition: 'var(--transition)',
    width: '100%',
    marginTop: 4,
  },
  masterSyncBtn: {
    padding: '10px 20px',
    borderRadius: 'var(--radius)',
    background: 'var(--accent-gold)',
    color: '#fff',
    fontFamily: 'var(--font)',
    fontSize: 14,
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
    transition: 'var(--transition)',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-body)',
    fontSize: 14,
  },
  skeleton: {
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-lg)',
    animation: 'pulse 1.5s ease-in-out infinite',
    minHeight: 280,
  },
  dropdownOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  dropdownPanel: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    marginTop: 4,
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
    padding: '6px 0',
    zIndex: 100,
    minWidth: 200,
    maxHeight: 260,
    overflowY: 'auto' as const,
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 14px',
    fontSize: 13,
    fontFamily: 'var(--font)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    transition: 'var(--transition)',
  },
  gradientFallback: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'var(--font)',
  },
};

// ─── Platform Icon (emoji placeholders) ──────────────────────────────────────

function PlatformIcon({ platform, size = 14 }: { platform: string; size?: number }) {
  const icons: Record<string, string> = {
    youtube: '▶',
    instagram: '◎',
    tiktok: '♪',
    twitter: '𝕏',
    x: '𝕏',
  };
  return (
    <span style={{ fontSize: size, lineHeight: 1 }}>
      {icons[platform.toLowerCase()] || '●'}
    </span>
  );
}

// ─── Competitor Multi-Select Dropdown ────────────────────────────────────────

function CompetitorMultiSelect({
  competitors,
  selected,
  onChange,
}: {
  competitors: { id: string; name: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const allSelected = selected.length === 0;

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const label = allSelected
    ? 'Todos concorrentes'
    : selected.length === 1
      ? competitors.find((c) => c.id === selected[0])?.name || '1 selecionado'
      : `${selected.length} selecionados`;

  return (
    <div style={styles.selectWrapper}>
      <button
        style={styles.select}
        onClick={() => setOpen(!open)}
      >
        {label} ▾
      </button>
      {open && (
        <>
          <div style={styles.dropdownOverlay} onClick={() => setOpen(false)} />
          <div style={styles.dropdownPanel}>
            <div
              style={styles.dropdownItem}
              onClick={() => { onChange([]); setOpen(false); }}
            >
              <input type="checkbox" checked={allSelected} readOnly style={{ accentColor: 'var(--accent-gold)' }} />
              <span style={{ fontWeight: 600 }}>Todos</span>
            </div>
            {competitors.map((c) => (
              <div
                key={c.id}
                style={styles.dropdownItem}
                onClick={() => toggle(c.id)}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(c.id)}
                  readOnly
                  style={{ accentColor: 'var(--accent-gold)' }}
                />
                <span>{c.name}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Feed Sub-Tab ────────────────────────────────────────────────────────────

function FeedTab() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>([]);
  const [competitors, setCompetitors] = useState<{ id: string; name: string }[]>([]);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('sortBy', sortBy);
      params.set('sortOrder', 'desc');
      params.set('limit', '200');
      if (selectedCompetitors.length > 0) {
        params.set('competitors', selectedCompetitors.join(','));
      }
      if (platformFilter !== 'all') {
        params.set('platforms', platformFilter);
      }
      const res = await fetch(`/api/competitors/feed?${params}`);
      if (!res.ok) throw new Error('Feed fetch failed');
      const json = await res.json();
      const feed = json.data || json;
      const feedItems = feed.items || feed || [];
      if (sortBy === 'zScore') {
        feedItems.sort((a: FeedItem, b: FeedItem) =>
          ((b.zScore ?? -999) - (a.zScore ?? -999))
        );
      }
      setItems(feedItems);
      setLastFetched(new Date().toISOString());

      // Extract unique competitors for the filter dropdown
      const seen = new Map<string, string>();
      feedItems.forEach((item: FeedItem) => {
        const compId = item.competitorId || item.competitor || '';
        if (compId && !seen.has(compId)) {
          seen.set(compId, item.competitorName);
        }
      });
      if (competitors.length === 0) {
        setCompetitors(Array.from(seen, ([id, name]) => ({ id, name })));
      }
    } catch (err) {
      console.error('Error fetching feed:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [sortBy, platformFilter, selectedCompetitors, competitors.length]);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  const uniqueCompetitorCount = new Set(items.map((i) => i.competitor)).size;
  const outlierCount = items.filter(i => i.isOutlier).length;
  const flopCount = items.filter(i => i.isFlop).length;

  const displayedItems = items.filter(item => {
    if (categoryFilter === 'outliers') return item.isOutlier === true;
    if (categoryFilter === 'flops') return item.isFlop === true;
    return true;
  });

  const handleBookmark = async (item: FeedItem) => {
    try {
      await fetch('/api/competitors/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitorId: item.competitorId || item.competitor || '',
          videoId: item.id,
          platform: item.platform,
          title: item.title,
          url: item.url,
          thumbnail: item.thumbnail || item.thumbnailUrl || '',
          tag: 'referência',
        }),
      });
    } catch (e) { console.error('Bookmark error:', e); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Filter bar */}
      <div style={styles.filterBar}>
        <CompetitorMultiSelect
          competitors={competitors}
          selected={selectedCompetitors}
          onChange={setSelectedCompetitors}
        />
        <div style={styles.platformPillRow}>
          {PLATFORM_FILTERS.map((pf) => (
            <button
              key={pf.value}
              style={{
                ...styles.platformPill,
                ...(platformFilter === pf.value ? styles.platformPillActive : {}),
              }}
              onClick={() => setPlatformFilter(pf.value)}
            >
              {pf.label}
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 8px' }} />
        {(['all', 'outliers', 'flops'] as const).map((cat) => (
          <button
            key={cat}
            style={{
              ...styles.filterPill,
              ...(categoryFilter === cat ? styles.filterPillActive : {}),
              ...(cat === 'outliers' ? { borderColor: '#F0BA3C' } : {}),
              ...(cat === 'flops' ? { borderColor: '#FF4444' } : {}),
            }}
            onClick={() => setCategoryFilter(cat)}
          >
            {cat === 'all' ? 'Todos' : cat === 'outliers' ? '🔥 Outliers' : '📉 Flops'}
          </button>
        ))}
        <select
          style={styles.select}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Stats bar */}
      <div style={styles.statsBar}>
        {items.length} conteúdos de {uniqueCompetitorCount} concorrentes • 🔥 {outlierCount} outliers • 📉 {flopCount} flops
        {lastFetched && <> &bull; Última coleta: {timeAgo(lastFetched)}</>}
      </div>

      {/* Content grid */}
      {loading ? (
        <div style={styles.feedGrid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={styles.skeleton} />
          ))}
        </div>
      ) : displayedItems.length === 0 ? (
        <div style={styles.emptyState}>
          {items.length === 0
            ? 'Nenhum conteúdo coletado. Vá na aba Concorrentes para sincronizar.'
            : 'Nenhum conteúdo encontrado com esse filtro.'}
        </div>
      ) : (
        <div style={styles.feedGrid}>
          {displayedItems.map((item) => (
            <FeedCard key={item.id} item={item} onBookmark={handleBookmark} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Feed Card ───────────────────────────────────────────────────────────────

function FeedCard({ item, onBookmark }: { item: FeedItem; onBookmark?: (item: FeedItem) => void }) {
  const platformKey = item.platform.toLowerCase();
  const platformColor = PLATFORM_COLORS[platformKey] || '#666';

  const gradientMap: Record<string, string> = {
    youtube: 'linear-gradient(135deg, #FF0000 0%, #CC0000 100%)',
    instagram: 'linear-gradient(135deg, #833AB4 0%, #E1306C 50%, #FCAF45 100%)',
    tiktok: 'linear-gradient(135deg, #010101 0%, #69C9D0 100%)',
    twitter: 'linear-gradient(135deg, #1DA1F2 0%, #0D8BD9 100%)',
    x: 'linear-gradient(135deg, #1DA1F2 0%, #0D8BD9 100%)',
  };

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      style={styles.feedCard}
    >
      {/* Thumbnail */}
      <div style={styles.thumbnailWrapper}>
        {(item.thumbnail || item.thumbnailUrl) ? (
          <img
            src={(item.thumbnail || item.thumbnailUrl)!}
            alt=""
            style={styles.thumbnail}
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              const parent = (e.target as HTMLImageElement).parentElement;
              if (parent) {
                parent.style.background = gradientMap[platformKey] || 'linear-gradient(135deg, #333 0%, #555 100%)';
              }
            }}
          />
        ) : (
          <div
            style={{
              ...styles.gradientFallback,
              background: gradientMap[platformKey] || 'linear-gradient(135deg, #333 0%, #555 100%)',
            }}
          >
            <PlatformIcon platform={platformKey} size={36} />
          </div>
        )}
        {/* Platform badge */}
        <div style={{ ...styles.platformBadge, backgroundColor: platformColor }}>
          {PLATFORM_LABELS[platformKey] || item.platform}
        </div>
        {/* Z-score badge */}
        {item.zScore != null && (item.isOutlier || item.isFlop) && (
          <div style={{
            position: 'absolute',
            top: 8,
            right: 8,
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 800,
            fontFamily: 'var(--font)',
            color: '#fff',
            background: item.isOutlier ? '#F0BA3C' : '#FF4444',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}>
            {item.isOutlier ? `🔥 ${item.outlierMultiplier || 'outlier'}` : `📉 ${item.outlierMultiplier || 'flop'}`}
          </div>
        )}
      </div>

      {/* Card body */}
      <div style={styles.cardBody}>
        <div style={styles.competitorName}>{item.competitorName}</div>
        <div style={styles.cardTitle}>{item.title || item.description || '(sem título)'}</div>
        <div style={styles.metricsRow}>
          <span style={styles.metricItem}>👁 {formatNum(item.views ?? item.metrics?.views ?? null)}</span>
          <span style={styles.metricItem}>♡ {formatNum(item.likes ?? item.metrics?.likes ?? null)}</span>
          <span style={styles.metricItem}>💬 {formatNum(item.comments ?? item.metrics?.comments ?? null)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={styles.cardDate}>{timeAgo(item.publishedAt)}</div>
          {onBookmark && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBookmark(item); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '2px 4px', color: 'var(--text-muted)' }}
              title="Salvar"
            >
              🔖
            </button>
          )}
        </div>
      </div>
    </a>
  );
}

// ─── Concorrentes Sub-Tab ────────────────────────────────────────────────────

function ConcorrentesTab() {
  const [competitors, setCompetitors] = useState<CompetitorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncState, setSyncState] = useState<Record<string, string>>({}); // "competitorId:platform" -> "loading" | "done:N" | "error"

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [registryRes, statusRes] = await Promise.all([
        fetch('/api/competitors/registry'),
        fetch('/api/competitors/status'),
      ]);
      const registryJson = registryRes.ok ? await registryRes.json() : { data: { competitors: [] } };
      const statusJson = statusRes.ok ? await statusRes.json() : { data: {} };

      const registryData = registryJson.data || registryJson;
      const rawCompetitors = registryData.competitors || (Array.isArray(registryData) ? registryData : []);
      const statusData = statusJson.data || statusJson;

      // Transform registry format to component format + merge status
      const merged: CompetitorEntry[] = rawCompetitors.map((comp: any) => {
        const platformEntries = Object.entries(comp.platforms || {}).map(([platform, cfg]: [string, any]) => {
          const compStatus = statusData[comp.id] || {};
          const platStatus = compStatus[platform] || {};
          return {
            platform,
            handle: cfg.handle || '',
            lastSyncedAt: platStatus.syncedAt || null,
            itemCount: platStatus.itemCount ?? 0,
          };
        });
        return {
          id: comp.id,
          name: comp.name,
          niche: comp.niche || '',
          region: comp.region || '',
          platforms: platformEntries,
        };
      });
      setCompetitors(merged);
    } catch (err) {
      console.error('Error fetching competitors:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const syncPlatform = async (competitorId: string, platform: string) => {
    const key = `${competitorId}:${platform}`;
    setSyncState((prev) => ({ ...prev, [key]: 'loading' }));
    try {
      const res = await fetch(`/api/competitors/${competitorId}/${platform}/sync`, { method: 'POST' });
      if (!res.ok) throw new Error('Sync failed');
      const json = await res.json();
      const syncData = json.data || json;
      const count = syncData.itemCount ?? syncData.count ?? syncData.items?.length ?? '?';
      setSyncState((prev) => ({ ...prev, [key]: `done:${count}` }));
      // Refresh data after sync
      await fetchData();
    } catch {
      setSyncState((prev) => ({ ...prev, [key]: 'error' }));
    }
  };

  const syncAllForCompetitor = async (comp: CompetitorEntry) => {
    for (const p of comp.platforms) {
      await syncPlatform(comp.id, p.platform);
    }
  };

  const syncAllCompetitors = async () => {
    setSyncingAll(true);
    for (const comp of competitors) {
      await syncAllForCompetitor(comp);
    }
    setSyncingAll(false);
  };

  const totalPlatforms = competitors.reduce((acc, c) => acc + c.platforms.length, 0);

  const renderSyncLabel = (competitorId: string, platform: string, itemCount: number) => {
    const key = `${competitorId}:${platform}`;
    const state = syncState[key];
    if (state === 'loading') return '⏳ ...';
    if (state === 'error') return '✗ Erro';
    if (state?.startsWith('done:')) return `✓ ${state.split(':')[1]} items`;
    return 'Sincronizar';
  };

  if (loading) {
    return (
      <div style={styles.competitorsGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ ...styles.skeleton, minHeight: 200 }} />
        ))}
      </div>
    );
  }

  if (competitors.length === 0) {
    return (
      <div style={styles.emptyState}>
        Nenhum concorrente cadastrado. Use o Opensquad para adicionar concorrentes.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Top section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={styles.statsBar}>
          {competitors.length} concorrentes &bull; {totalPlatforms} plataformas rastreadas
        </div>
        <button
          style={{
            ...styles.masterSyncBtn,
            opacity: syncingAll ? 0.6 : 1,
            cursor: syncingAll ? 'wait' : 'pointer',
          }}
          onClick={syncAllCompetitors}
          disabled={syncingAll}
        >
          {syncingAll ? '⏳ Sincronizando...' : 'Sincronizar Todos'}
        </button>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
        ⚠ Sincronizar vai usar créditos Apify
      </div>

      {/* Competitor cards */}
      <div style={styles.competitorsGrid}>
        {competitors.map((comp) => (
          <div key={comp.id} style={styles.competitorCard}>
            <div style={styles.competitorCardName}>{comp.name}</div>
            <div style={styles.badgeRow}>
              {comp.niche && <span style={styles.badge}>{comp.niche}</span>}
              {comp.region && <span style={styles.badge}>{comp.region}</span>}
            </div>

            {/* Platform rows */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {comp.platforms.map((p) => {
                const pKey = p.platform.toLowerCase();
                const color = PLATFORM_COLORS[pKey] || '#666';
                const syncKey = `${comp.id}:${p.platform}`;
                const isSyncing = syncState[syncKey] === 'loading';

                return (
                  <div key={p.platform} style={styles.platformRow}>
                    <div style={styles.platformInfo}>
                      <div style={styles.platformHandle}>
                        <span style={{ color }}><PlatformIcon platform={pKey} size={13} /></span>
                        {' '}{p.handle || PLATFORM_LABELS[pKey] || p.platform}
                      </div>
                      <div style={styles.platformMeta}>
                        {p.lastSyncedAt ? `Último sync: ${timeAgo(p.lastSyncedAt)}` : 'Nunca sincronizado'}
                        {p.itemCount > 0 && <> &bull; {p.itemCount} itens</>}
                      </div>
                    </div>
                    <button
                      style={{
                        ...styles.syncBtn,
                        opacity: isSyncing ? 0.6 : 1,
                        cursor: isSyncing ? 'wait' : 'pointer',
                      }}
                      onClick={() => syncPlatform(comp.id, p.platform)}
                      disabled={isSyncing}
                    >
                      {renderSyncLabel(comp.id, p.platform, p.itemCount)}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Sync all for this competitor */}
            {comp.platforms.length > 1 && (
              <button
                style={styles.syncAllBtn}
                onClick={() => syncAllForCompetitor(comp)}
              >
                Sincronizar Tudo
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ViralRadarView() {
  const [subTab, setSubTab] = useState<SubTab>('feed');

  return (
    <div style={styles.container}>
      {/* Sub-tab navigation */}
      <div style={styles.subTabRow}>
        {([
          { key: 'feed' as SubTab, label: 'Feed' },
          { key: 'concorrentes' as SubTab, label: 'Concorrentes' },
          { key: 'fichas' as SubTab, label: 'Fichas' },
          { key: 'tendencias' as SubTab, label: 'Tendências' },
          { key: 'vs-bruno' as SubTab, label: 'vs Bruno' },
          { key: 'salvos' as SubTab, label: 'Salvos' },
          { key: 'comentarios' as SubTab, label: 'Comentários' },
          { key: 'evolucao' as SubTab, label: 'Evolução' },
        ]).map((tab) => (
          <button
            key={tab.key}
            style={{
              ...styles.subTab,
              ...(subTab === tab.key ? styles.subTabActive : {}),
            }}
            onClick={() => setSubTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {subTab === 'feed' && <FeedTab />}
      {subTab === 'concorrentes' && <ConcorrentesTab />}
      {subTab === 'fichas' && <CompetitorFichasTab />}
      {subTab === 'tendencias' && <TrendTab />}
      {subTab === 'vs-bruno' && <ComparisonTab />}
      {subTab === 'salvos' && <BookmarksTab />}
      {subTab === 'comentarios' && <CommentsTab />}
      {subTab === 'evolucao' && <EvolutionTab />}
    </div>
  );
}
