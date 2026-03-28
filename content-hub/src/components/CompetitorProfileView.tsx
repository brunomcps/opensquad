import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CompetitorFichaDetail } from './CompetitorFichaDetail';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ContentItem {
  id: string;
  title: string;
  url: string;
  thumbnail: string | null;
  publishedAt: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  duration: number | null;
  type: string;
  zScore: number | null;
  isOutlier: boolean;
  isFlop: boolean;
  outlierMultiplier: string | null;
}

interface PlatformData {
  competitorId: string;
  platform: string;
  profile: {
    handle: string;
    name: string;
    followers: number | null;
    bio: string | null;
    profilePicture: string | null;
    scrapedAt: string;
  };
  items: ContentItem[];
  syncedAt: string;
  itemCount: number;
}

interface HistoryEntry {
  syncedAt: string;
  followers: number | null;
  itemCount: number;
  outlierCount: number;
  flopCount: number;
}

interface CompetitorFicha {
  competitorId: string;
  videoId: string;
  platform: string;
  title: string;
  durationText?: string;
  durationSeconds?: number;
  publishedAt?: string;
  structureType?: string;
  proportions?: { hook?: number; content?: number; closing?: number };
  hookElementCount?: number;
  blockCount?: number;
  blocks?: any[];
  sections: Record<string, string>;
  generatedAt?: string;
}

type ProfileTab = 'conteudos' | 'fichas' | 'evolucao' | 'produtos';
type ContentSort = 'date' | 'views' | 'likes' | 'zScore';
type ContentFilter = 'all' | 'outliers' | 'flops';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatNum(n: number | null): string {
  if (n == null) return '-';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString('pt-BR');
}

function formatDate(dateStr: string): string {
  if (!dateStr || dateStr.startsWith('1970')) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const day = d.getDate().toString().padStart(2, '0');
  const month = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][d.getMonth()];
  const year = d.getFullYear();
  const now = new Date();
  if (year === now.getFullYear()) return `${day} ${month}`;
  return `${day} ${month} ${year}`;
}

const PLATFORM_COLORS: Record<string, string> = {
  youtube: '#FF0000', instagram: '#E1306C', tiktok: '#010101', twitter: '#1DA1F2',
};

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube', instagram: 'Instagram', tiktok: 'TikTok', twitter: 'X',
};

function proxyThumb(url: string | null | undefined, platform: string): string | null {
  if (!url) return null;
  if (platform === 'youtube' || url.includes('ytimg.com')) return url;
  return `/api/competitors/img-proxy?url=${encodeURIComponent(url)}`;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s: Record<string, CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 20 },
  backBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px',
    borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-card)',
    color: 'var(--text-secondary)', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', transition: 'var(--transition)', alignSelf: 'flex-start',
  },
  profileHeader: {
    display: 'flex', gap: 20, alignItems: 'flex-start', padding: 24,
    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-sm)',
  },
  avatar: {
    width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' as const,
    border: '3px solid var(--border)', flexShrink: 0,
  },
  avatarFallback: {
    width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, var(--accent-gold) 0%, #E09B00 100%)',
    color: '#fff', fontSize: 28, fontWeight: 800, fontFamily: 'var(--font)', flexShrink: 0,
  },
  profileInfo: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 },
  profileName: { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font)' },
  profileBio: { fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', lineHeight: 1.5 },
  statsRow: { display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 4 },
  statBox: {
    display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 16px',
    background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
    minWidth: 100,
  },
  statValue: { fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font)' },
  statLabel: { fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font)', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
  platformBadges: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  platformBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px',
    borderRadius: 12, fontSize: 11, fontWeight: 600, fontFamily: 'var(--font)', color: '#fff',
  },
  tabRow: { display: 'flex', gap: 6 },
  tab: {
    padding: '8px 18px', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
    background: 'var(--bg-card)', color: 'var(--text-secondary)', fontFamily: 'var(--font)',
    fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'var(--transition)',
  },
  tabActive: { background: 'var(--accent-gold)', color: '#fff', border: '1px solid var(--accent-gold)' },
  filterBar: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  pill: {
    padding: '5px 12px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--bg-card)',
    color: 'var(--text-secondary)', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12, cursor: 'pointer',
  },
  pillActive: { background: 'var(--accent-gold)', color: '#fff', border: '1px solid var(--accent-gold)' },
  select: {
    padding: '6px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
    background: 'var(--bg-card)', color: 'var(--text-primary)', fontFamily: 'var(--font)', fontSize: 12,
  },
  contentGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 },
  contentCard: {
    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-sm)', overflow: 'hidden', cursor: 'pointer',
    transition: 'var(--transition)', display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'inherit',
  },
  thumbWrap: { position: 'relative' as const, width: '100%', aspectRatio: '16/9', overflow: 'hidden', backgroundColor: 'var(--bg-secondary)' },
  thumb: { width: '100%', height: '100%', objectFit: 'cover' as const },
  cardBody: { padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 },
  cardTitle: {
    fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)',
    lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden', textOverflow: 'ellipsis',
  },
  metricsRow: { display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', marginTop: 'auto' },
  zBadge: {
    position: 'absolute' as const, top: 6, right: 6, padding: '2px 7px', borderRadius: 4,
    fontSize: 10, fontWeight: 800, fontFamily: 'var(--font)', color: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  },
  platBadgeSmall: {
    position: 'absolute' as const, top: 6, left: 6, padding: '2px 7px', borderRadius: 4,
    fontSize: 9, fontWeight: 700, fontFamily: 'var(--font)', color: '#fff', textTransform: 'uppercase' as const, letterSpacing: '0.5px',
  },
  emptyState: { textAlign: 'center' as const, padding: '40px 20px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 13 },
  skeleton: { background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', animation: 'pulse 1.5s ease-in-out infinite', minHeight: 200 },
  productsSection: {
    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
    padding: 20, boxShadow: 'var(--shadow-sm)',
  },
};

// ─── Profile Header ──────────────────────────────────────────────────────────

function ProfileHeader({ name, platforms }: { name: string; platforms: Record<string, PlatformData> }) {
  const allProfiles = Object.values(platforms);
  const mainProfile = allProfiles.find(p => p.profile?.profilePicture) || allProfiles[0];
  const rawPic = mainProfile?.profile?.profilePicture;
  const mainPlatform = mainProfile?.platform || 'youtube';
  const profilePic = proxyThumb(rawPic, mainPlatform);
  const bio = allProfiles.find(p => p.profile?.bio)?.profile?.bio;

  const totalItems = allProfiles.reduce((a, p) => a + (p.items?.length || 0), 0);
  const totalOutliers = allProfiles.reduce((a, p) => a + (p.items?.filter(i => i.isOutlier).length || 0), 0);
  const totalFlops = allProfiles.reduce((a, p) => a + (p.items?.filter(i => i.isFlop).length || 0), 0);

  return (
    <div style={s.profileHeader}>
      {profilePic ? (
        <img src={profilePic} alt="" style={s.avatar} />
      ) : (
        <div style={s.avatarFallback}>{name.charAt(0).toUpperCase()}</div>
      )}
      <div style={s.profileInfo}>
        <div style={s.profileName}>{name}</div>
        {bio && <div style={s.profileBio}>{bio}</div>}

        {/* Platform badges with followers */}
        <div style={s.platformBadges}>
          {allProfiles.map(p => (
            <span key={p.platform} style={{ ...s.platformBadge, background: PLATFORM_COLORS[p.platform] || '#666' }}>
              {PLATFORM_LABELS[p.platform] || p.platform}
              {p.profile?.followers ? ` ${formatNum(p.profile.followers)}` : ''}
            </span>
          ))}
        </div>

        {/* Stats */}
        <div style={s.statsRow}>
          <div style={s.statBox}>
            <div style={s.statValue}>{totalItems}</div>
            <div style={s.statLabel}>Conteudos</div>
          </div>
          <div style={s.statBox}>
            <div style={{ ...s.statValue, color: '#F0BA3C' }}>{totalOutliers}</div>
            <div style={s.statLabel}>Outliers</div>
          </div>
          <div style={s.statBox}>
            <div style={{ ...s.statValue, color: '#FF4444' }}>{totalFlops}</div>
            <div style={s.statLabel}>Flops</div>
          </div>
          {allProfiles.map(p => p.profile?.followers ? (
            <div key={p.platform + '-followers'} style={s.statBox}>
              <div style={s.statValue}>{formatNum(p.profile.followers)}</div>
              <div style={s.statLabel}>{PLATFORM_LABELS[p.platform]} seguidores</div>
            </div>
          ) : null)}
        </div>
      </div>
    </div>
  );
}

// ─── Content List Tab ────────────────────────────────────────────────────────

function ContentListTab({ platforms, competitorId }: { platforms: Record<string, PlatformData>; competitorId: string }) {
  const [sortBy, setSortBy] = useState<ContentSort>('date');
  const [filter, setFilter] = useState<ContentFilter>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [selectedFicha, setSelectedFicha] = useState<CompetitorFicha | null>(null);
  const [fichaMap, setFichaMap] = useState<Set<string>>(new Set());

  // Load ficha list to know which items have fichas
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/competitors/fichas?competitor=${competitorId}`);
        if (res.ok) {
          const json = await res.json();
          setFichaMap(new Set((json.data || []).map((f: any) => f.videoId)));
        }
      } catch {}
    })();
  }, [competitorId]);

  // Aggregate all items from all platforms
  let allItems: (ContentItem & { platform: string })[] = [];
  for (const [platform, data] of Object.entries(platforms)) {
    for (const item of data.items || []) {
      allItems.push({ ...item, platform });
    }
  }

  // Filter
  if (filter === 'outliers') allItems = allItems.filter(i => i.isOutlier);
  if (filter === 'flops') allItems = allItems.filter(i => i.isFlop);
  if (platformFilter !== 'all') allItems = allItems.filter(i => i.platform === platformFilter);

  // Sort
  const mult = -1; // desc
  allItems.sort((a, b) => {
    if (sortBy === 'date') return mult * (a.publishedAt || '').localeCompare(b.publishedAt || '');
    if (sortBy === 'zScore') return mult * ((a.zScore ?? -999) - (b.zScore ?? -999));
    const va = (a as any)[sortBy] ?? 0;
    const vb = (b as any)[sortBy] ?? 0;
    return mult * (va - vb);
  });

  const availablePlatforms = Object.keys(platforms);

  const openFicha = async (item: ContentItem & { platform: string }) => {
    try {
      const res = await fetch(`/api/competitors/fichas/${competitorId}/${item.id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) setSelectedFicha(json.data);
      }
    } catch {}
  };

  return (
    <>
      <div style={s.filterBar}>
        {availablePlatforms.length > 1 && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={{ ...s.pill, ...(platformFilter === 'all' ? s.pillActive : {}) }} onClick={() => setPlatformFilter('all')}>Todas</button>
            {availablePlatforms.map(p => (
              <button key={p} style={{ ...s.pill, ...(platformFilter === p ? s.pillActive : {}) }} onClick={() => setPlatformFilter(p)}>
                {PLATFORM_LABELS[p] || p}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'outliers', 'flops'] as const).map(cat => (
            <button key={cat} style={{ ...s.pill, ...(filter === cat ? s.pillActive : {}) }} onClick={() => setFilter(cat)}>
              {cat === 'all' ? 'Todos' : cat === 'outliers' ? 'Outliers' : 'Flops'}
            </button>
          ))}
        </div>
        <select style={s.select} value={sortBy} onChange={e => setSortBy(e.target.value as ContentSort)}>
          <option value="date">Mais recentes</option>
          <option value="views">Mais views</option>
          <option value="likes">Mais likes</option>
          <option value="zScore">Maior z-score</option>
        </select>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
          {allItems.length} itens
        </span>
      </div>

      {allItems.length === 0 ? (
        <div style={s.emptyState}>Nenhum conteudo encontrado com esses filtros.</div>
      ) : (
        <div style={s.contentGrid}>
          {allItems.map(item => {
            const pColor = PLATFORM_COLORS[item.platform] || '#666';
            const hasFicha = fichaMap.has(item.id);
            return (
              <a key={`${item.platform}-${item.id}`} href={item.url} target="_blank" rel="noopener noreferrer" style={s.contentCard}>
                <div style={s.thumbWrap}>
                  {item.thumbnail ? (
                    <img src={proxyThumb(item.thumbnail, item.platform) || ''} alt="" style={s.thumb} loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; const p = (e.target as HTMLImageElement).parentElement; if (p) p.style.background = `linear-gradient(135deg, ${pColor} 0%, #333 100%)`; }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${pColor} 0%, #333 100%)`, color: 'rgba(255,255,255,0.5)', fontSize: 24, fontWeight: 700 }}>
                      {PLATFORM_LABELS[item.platform]?.charAt(0) || '?'}
                    </div>
                  )}
                  <div style={{ ...s.platBadgeSmall, background: pColor }}>{PLATFORM_LABELS[item.platform] || item.platform}</div>
                  {item.zScore != null && (item.isOutlier || item.isFlop) && (
                    <div style={{ ...s.zBadge, background: item.isOutlier ? '#F0BA3C' : '#FF4444' }}>
                      {item.isOutlier ? `${item.outlierMultiplier || 'outlier'}` : `${item.outlierMultiplier || 'flop'}`}
                    </div>
                  )}
                </div>
                <div style={s.cardBody}>
                  <div style={s.cardTitle}>{item.title || '(sem titulo)'}</div>
                  <div style={s.metricsRow}>
                    <span>👁 {formatNum(item.views)}</span>
                    <span>♡ {formatNum(item.likes)}</span>
                    <span>💬 {formatNum(item.comments)}</span>
                    {item.publishedAt && <span>{formatDate(item.publishedAt)}</span>}
                  </div>
                  {hasFicha && (
                    <button
                      onClick={e => { e.preventDefault(); e.stopPropagation(); openFicha(item); }}
                      style={{ ...s.pill, fontSize: 11, padding: '3px 8px', marginTop: 4, alignSelf: 'flex-start', background: 'var(--accent-gold)', color: '#fff', border: 'none' }}
                    >
                      Ver Ficha
                    </button>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      )}

      {selectedFicha && (
        <CompetitorFichaDetail ficha={selectedFicha} onClose={() => setSelectedFicha(null)} />
      )}
    </>
  );
}

// ─── Fichas Tab ──────────────────────────────────────────────────────────────

function FichasTab({ competitorId, competitorName }: { competitorId: string; competitorName: string }) {
  const [fichas, setFichas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFicha, setSelectedFicha] = useState<CompetitorFicha | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/competitors/fichas?competitor=${competitorId}`);
        if (res.ok) {
          const json = await res.json();
          setFichas(json.data || []);
        }
      } catch {} finally { setLoading(false); }
    })();
  }, [competitorId]);

  const openFicha = async (f: any) => {
    try {
      const res = await fetch(`/api/competitors/fichas/${competitorId}/${f.videoId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) setSelectedFicha(json.data);
      }
    } catch {}
  };

  if (loading) return <div style={s.skeleton} />;

  if (fichas.length === 0) {
    return (
      <div style={s.emptyState}>
        Nenhuma ficha gerada para este concorrente. Use o squad <strong>competitor-fichas</strong> para gerar.
      </div>
    );
  }

  return (
    <>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-body)', marginBottom: 8 }}>
        {fichas.length} ficha{fichas.length !== 1 ? 's' : ''} de roteiro
      </div>
      <div style={s.contentGrid}>
        {fichas.map((f: any) => (
          <div
            key={f.videoId}
            style={{ ...s.contentCard, cursor: 'pointer' }}
            onClick={() => openFicha(f)}
          >
            {f.platform === 'youtube' && (
              <div style={s.thumbWrap}>
                <img src={`https://i.ytimg.com/vi/${f.videoId}/mqdefault.jpg`} alt="" style={s.thumb} loading="lazy" />
                {f.durationText && (
                  <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.8)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 5px', borderRadius: 3 }}>
                    {f.durationText}
                  </div>
                )}
              </div>
            )}
            <div style={s.cardBody}>
              <div style={s.cardTitle}>{f.title || '(sem titulo)'}</div>
              <div style={s.metricsRow}>
                {f.structureType && <span>{f.structureType}</span>}
                {f.hookElementCount != null && <span>{f.hookElementCount} hooks</span>}
                {f.blockCount != null && <span>{f.blockCount} blocos</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
      {selectedFicha && (
        <CompetitorFichaDetail ficha={selectedFicha} competitorName={competitorName} onClose={() => setSelectedFicha(null)} />
      )}
    </>
  );
}

// ─── Evolution Tab ───────────────────────────────────────────────────────────

function EvolutionTab({ competitorId, platforms }: { competitorId: string; platforms: Record<string, PlatformData> }) {
  const [history, setHistory] = useState<Record<string, HistoryEntry[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const result: Record<string, HistoryEntry[]> = {};
        for (const platform of Object.keys(platforms)) {
          const res = await fetch(`/api/competitors/${competitorId}/${platform}/history`);
          if (res.ok) {
            const json = await res.json();
            result[platform] = json.data || [];
          }
        }
        setHistory(result);
      } catch {} finally { setLoading(false); }
    })();
  }, [competitorId, platforms]);

  if (loading) return <div style={s.skeleton} />;

  const hasData = Object.values(history).some(h => h.length > 1);
  if (!hasData) {
    return <div style={s.emptyState}>Historico insuficiente. Dados aparecem apos multiplos syncs ao longo do tempo.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {Object.entries(history).filter(([, h]) => h.length > 1).map(([platform, entries]) => {
        const chartData = [...entries].reverse().map(e => ({
          date: formatDate(e.syncedAt),
          followers: e.followers,
          items: e.itemCount,
          outliers: e.outlierCount,
        }));

        return (
          <div key={platform} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font)', color: 'var(--text-primary)', marginBottom: 12 }}>
              {PLATFORM_LABELS[platform] || platform} — Seguidores
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
                <Tooltip />
                <Line type="monotone" dataKey="followers" stroke={PLATFORM_COLORS[platform] || '#666'} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}

// ─── Products Tab ────────────────────────────────────────────────────────────

function ProductsTab({ competitorId }: { competitorId: string }) {
  const [products, setProducts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/competitors/${competitorId}/products`);
        if (res.ok) {
          const json = await res.json();
          setProducts(json.data);
          setDraft(json.data ? JSON.stringify(json.data, null, 2) : '');
        }
      } catch {} finally { setLoading(false); }
    })();
  }, [competitorId]);

  const save = async () => {
    try {
      const parsed = JSON.parse(draft);
      await fetch(`/api/competitors/${competitorId}/products`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      setProducts(parsed);
      setEditing(false);
    } catch (e) {
      alert('JSON invalido');
    }
  };

  if (loading) return <div style={s.skeleton} />;

  if (!products && !editing) {
    return (
      <div style={s.emptyState}>
        <p>Nenhum produto/negocio cadastrado.</p>
        <button style={{ ...s.pill, ...s.pillActive, marginTop: 10 }} onClick={() => { setEditing(true); setDraft('{\n  "products": [],\n  "businessModel": "",\n  "notes": ""\n}'); }}>
          Adicionar
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <div style={s.productsSection}>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          style={{ width: '100%', minHeight: 200, fontFamily: 'monospace', fontSize: 12, padding: 12, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button style={{ ...s.pill, ...s.pillActive }} onClick={save}>Salvar</button>
          <button style={s.pill} onClick={() => setEditing(false)}>Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.productsSection}>
      <pre style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
        {JSON.stringify(products, null, 2)}
      </pre>
      <button style={{ ...s.pill, marginTop: 10 }} onClick={() => { setEditing(true); setDraft(JSON.stringify(products, null, 2)); }}>
        Editar
      </button>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function CompetitorProfileView({
  competitorId,
  competitorName,
  onBack,
}: {
  competitorId: string;
  competitorName: string;
  onBack: () => void;
}) {
  const [platforms, setPlatforms] = useState<Record<string, PlatformData>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ProfileTab>('conteudos');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/competitors/${competitorId}`);
      if (res.ok) {
        const json = await res.json();
        setPlatforms(json.data || {});
      }
    } catch (err) {
      console.error('Error fetching competitor profile:', err);
    } finally {
      setLoading(false);
    }
  }, [competitorId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div style={s.container}>
        <button style={s.backBtn} onClick={onBack}>← Voltar</button>
        <div style={s.skeleton} />
        <div style={{ ...s.skeleton, minHeight: 100 }} />
      </div>
    );
  }

  const tabs: { key: ProfileTab; label: string }[] = [
    { key: 'conteudos', label: `Conteudos` },
    { key: 'fichas', label: 'Fichas' },
    { key: 'evolucao', label: 'Evolucao' },
    { key: 'produtos', label: 'Produtos' },
  ];

  return (
    <div style={s.container}>
      <button style={s.backBtn} onClick={onBack}>← Voltar ao Viral Radar</button>

      <ProfileHeader name={competitorName} platforms={platforms} />

      {/* Tabs */}
      <div style={s.tabRow}>
        {tabs.map(t => (
          <button key={t.key} style={{ ...s.tab, ...(tab === t.key ? s.tabActive : {}) }} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'conteudos' && <ContentListTab platforms={platforms} competitorId={competitorId} />}
      {tab === 'fichas' && <FichasTab competitorId={competitorId} competitorName={competitorName} />}
      {tab === 'evolucao' && <EvolutionTab competitorId={competitorId} platforms={platforms} />}
      {tab === 'produtos' && <ProductsTab competitorId={competitorId} />}
    </div>
  );
}
