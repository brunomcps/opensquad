import type { CSSProperties } from 'react';
import { useContentStore } from '../store/useContentStore';
import { SearchIcon } from './icons/PlatformIcons';
import { YouTubeIcon, ShortsIcon, TikTokIcon, InstagramIcon, FacebookIcon, ThreadsIcon, LinkedInIcon, XIcon } from './icons/PlatformIcons';
import type { SortField, StatusFilter, Platform } from '../store/useContentStore';

const bar: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  padding: '10px 24px',
  background: 'var(--bg-secondary)',
  borderBottom: '1px solid var(--border)',
};

const searchWrapper: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
};

const searchIconStyle: CSSProperties = {
  position: 'absolute',
  left: '10px',
  color: 'var(--text-muted)',
  pointerEvents: 'none',
};

const searchInput: CSSProperties = {
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '7px 12px 7px 32px',
  fontSize: '13px',
  fontFamily: 'var(--font-body)',
  outline: 'none',
  width: '220px',
  transition: 'border-color var(--transition), box-shadow var(--transition)',
};

const divider: CSSProperties = {
  width: '1px',
  height: '22px',
  background: 'var(--border)',
  flexShrink: 0,
};

const group: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
};

const label: CSSProperties = {
  fontSize: '11px',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  fontWeight: 700,
  marginRight: '4px',
  fontFamily: 'var(--font)',
};

const chip: CSSProperties = {
  padding: '5px 12px',
  borderRadius: '16px',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
  border: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font)',
  transition: 'all var(--transition)',
};

const chipActive: CSSProperties = {
  ...chip,
  background: 'var(--accent-gold-bg)',
  color: 'var(--accent-gold-dark)',
  borderColor: 'var(--accent-gold)',
  fontWeight: 700,
};

const select: CSSProperties = {
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '6px 10px',
  fontSize: '12px',
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
  outline: 'none',
};

const sortBtn: CSSProperties = {
  ...chip,
  padding: '5px 10px',
  fontSize: '13px',
  borderRadius: 'var(--radius)',
  minWidth: '30px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const statusOptions: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'published', label: 'Publicados' },
  { value: 'scheduled', label: 'Agendados' },
  { value: 'private', label: 'Privados' },
];

const platformOptions: { value: Platform; label: string; icon: any }[] = [
  { value: 'youtube', label: 'YouTube', icon: <YouTubeIcon size={12} /> },
  { value: 'tiktok', label: 'TikTok', icon: <TikTokIcon size={12} /> },
  { value: 'instagram', label: 'Instagram', icon: <InstagramIcon size={12} /> },
  { value: 'facebook', label: 'Facebook', icon: <FacebookIcon size={12} /> },
  { value: 'threads', label: 'Threads', icon: <ThreadsIcon size={12} /> },
  { value: 'linkedin', label: 'LinkedIn', icon: <LinkedInIcon size={12} /> },
  { value: 'twitter', label: 'X', icon: <XIcon size={12} /> },
];

export function FilterBar() {
  const sortField = useContentStore((s) => s.sortField);
  const sortOrder = useContentStore((s) => s.sortOrder);
  const statusFilter = useContentStore((s) => s.statusFilter);
  const platformFilters = useContentStore((s) => s.platformFilters);
  const searchQuery = useContentStore((s) => s.searchQuery);
  const setSortField = useContentStore((s) => s.setSortField);
  const setSortOrder = useContentStore((s) => s.setSortOrder);
  const setStatusFilter = useContentStore((s) => s.setStatusFilter);
  const togglePlatformFilter = useContentStore((s) => s.togglePlatformFilter);
  const selectAllPlatforms = useContentStore((s) => s.selectAllPlatforms);
  const setSearchQuery = useContentStore((s) => s.setSearchQuery);
  const totalYT = useContentStore((s) => s.youtubeVideos.length);
  const totalTT = useContentStore((s) => s.tiktokVideos.length);

  return (
    <div style={bar}>
      <div style={searchWrapper}>
        <SearchIcon size={14} style={searchIconStyle} />
        <input
          type="text"
          placeholder="Buscar por titulo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={searchInput}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-gold)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(240, 186, 60, 0.12)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </div>

      <div style={divider} />

      <div style={group}>
        <span style={label}>Plataforma</span>
        <button
          style={platformFilters.length === 0 ? chipActive : chip}
          onClick={selectAllPlatforms}
        >
          Todas
        </button>
        {platformOptions.map((opt) => {
          const isExplicit = platformFilters.includes(opt.value);
          return (
            <button
              key={opt.value}
              style={isExplicit ? chipActive : platformFilters.length > 0 ? { ...chip, opacity: 0.5 } : chip}
              onClick={() => togglePlatformFilter(opt.value)}
            >
              {opt.icon && <span style={{ display: 'inline-flex', marginRight: '3px', verticalAlign: 'middle' }}>{opt.icon}</span>}
              {opt.label}
            </button>
          );
        })}
      </div>

      <div style={divider} />

      <div style={group}>
        <span style={label}>Status</span>
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            style={statusFilter === opt.value ? chipActive : chip}
            onClick={() => setStatusFilter(opt.value as any)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div style={divider} />

      <div style={group}>
        <span style={label}>Ordenar</span>
        <select
          value={sortField}
          onChange={(e) => setSortField(e.target.value as SortField)}
          style={select}
        >
          <option value="date">Data</option>
          <option value="views">Views</option>
          <option value="likes">Likes</option>
          <option value="duration">Duracao</option>
        </select>
        <button
          style={sortBtn}
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
        >
          {sortOrder === 'desc' ? '\u2193' : '\u2191'}
        </button>
      </div>

      <div style={{ flex: 1 }} />

      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
        {totalYT + totalTT} videos
      </span>
    </div>
  );
}
