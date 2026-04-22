import { useEffect } from 'react';
import { useAudienceIntelStore } from '../../store/useAudienceIntelStore';

export function SuperfanList() {
  const { superfans, loading, fetchSuperfans, drillDown, fetchComments, fetchSuperfanProfile } = useAudienceIntelStore();

  useEffect(() => {
    if (superfans.items.length === 0) fetchSuperfans();
  }, []);

  if (loading && superfans.items.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</div>;
  }

  const handleClick = (s: any) => {
    drillDown(5, s.author_name, 'superfan', s.author_channel_url);
    fetchSuperfanProfile(s.author_channel_url);
    fetchComments({ author_channel_url: s.author_channel_url, limit: 50, sort: 'recent', exclude_team: false, exclude_channel_owner: false });
  };

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
        Superfas ({superfans.total})
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {superfans.items.map((s: any, i: number) => (
          <button
            key={s.author_channel_url}
            onClick={() => handleClick(s)}
            style={{
              display: 'flex', alignItems: 'center', gap: 16,
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
              padding: '12px 16px', cursor: 'pointer', textAlign: 'left',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-gold)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <span style={{ width: 30, fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center', flexShrink: 0 }}>
              {i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{s.author_name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span>{s.video_count} videos</span>
                <span>{s.comment_count} comentarios</span>
                <span>PS: {s.total_peso_social}</span>
                {s.perfil_genero && <span>{s.perfil_genero}</span>}
                {s.perfil_diagnostico && <span>{s.perfil_diagnostico}</span>}
                {s.elogios_qualificados > 0 && <span style={{ color: 'var(--accent-green)' }}>{s.elogios_qualificados} elogios qual.</span>}
              </div>
              {s.categorias_top && s.categorias_top.length > 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {s.categorias_top.map((c: any) => (
                    <span key={c.categoria} style={{ padding: '1px 6px', borderRadius: 4, background: 'var(--accent-gold-bg)', color: 'var(--accent-gold-dark)' }}>
                      {c.categoria} ({c.count})
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {s.sentimento_predominante}
              </div>
            </div>
          </button>
        ))}
      </div>

      {superfans.items.length < superfans.total && (
        <button
          onClick={() => fetchSuperfans(true)}
          disabled={loading}
          style={{
            display: 'block', margin: '16px auto', padding: '10px 24px',
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
            cursor: 'pointer', fontSize: 13, color: 'var(--accent-gold-dark)',
          }}
        >
          {loading ? 'Carregando...' : `Carregar mais (${superfans.total - superfans.items.length} restantes)`}
        </button>
      )}
    </div>
  );
}
