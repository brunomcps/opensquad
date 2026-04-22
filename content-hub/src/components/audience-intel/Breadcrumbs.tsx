import { useAudienceIntelStore } from '../../store/useAudienceIntelStore';

export function Breadcrumbs() {
  const { breadcrumbs, navigateTo, stats } = useAudienceIntelStore();

  return (
    <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {breadcrumbs.map((b, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {i > 0 && <span style={{ color: 'var(--text-muted)' }}>/</span>}
          <button
            onClick={() => navigateTo(b.level)}
            style={{
              background: 'none',
              border: 'none',
              cursor: i < breadcrumbs.length - 1 ? 'pointer' : 'default',
              color: i < breadcrumbs.length - 1 ? 'var(--accent-gold-dark)' : 'var(--text-primary)',
              fontWeight: i === breadcrumbs.length - 1 ? 600 : 400,
              fontSize: 14,
              padding: 0,
              textDecoration: i < breadcrumbs.length - 1 ? 'underline' : 'none',
            }}
          >
            {b.label}
          </button>
        </span>
      ))}
      {stats && (
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
          {stats.public_comments.toLocaleString()} comentarios | {stats.total_demandas.toLocaleString()} demandas | {stats.superfan_count} superfas
        </span>
      )}
    </div>
  );
}
