import { useAudienceIntelStore } from '../../store/useAudienceIntelStore';

export function SuperfanProfile() {
  const { selectedSuperfan: s } = useAudienceIntelStore();
  if (!s) return null;

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--accent-gold)',
      borderRadius: 12, padding: '20px 24px', marginBottom: 20,
      borderLeft: '4px solid var(--accent-gold)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {s.author_name}
          </h3>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {s.first_seen && s.last_seen && (
              <span>
                {new Date(s.first_seen).toLocaleDateString('pt-BR')} — {new Date(s.last_seen).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-gold-dark)' }}>
            {s.total_peso_social}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>peso social</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 12 }}>
        <Stat label="Videos" value={s.video_count} />
        <Stat label="Comentarios" value={s.comment_count} />
        <Stat label="Likes recebidos" value={s.total_likes} />
        {s.elogios_qualificados > 0 && <Stat label="Elogios qual." value={s.elogios_qualificados} color="var(--accent-green)" />}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {s.perfil_genero && <Badge text={s.perfil_genero} />}
        {s.perfil_diagnostico && <Badge text={s.perfil_diagnostico} />}
        {s.sentimento_predominante && <Badge text={s.sentimento_predominante} />}
      </div>

      {s.categorias_top && s.categorias_top.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Demandas: </span>
          {s.categorias_top.map((c: any) => (
            <span key={c.categoria} style={{
              padding: '2px 8px', borderRadius: 4, fontSize: 11, marginRight: 6,
              background: 'var(--accent-gold-bg)', color: 'var(--accent-gold-dark)',
            }}>
              {c.categoria} ({c.count})
            </span>
          ))}
        </div>
      )}

      {s.impactos && s.impactos.length > 0 && (
        <div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Impactos relatados:</span>
          {s.impactos.map((imp: string, i: number) => (
            <div key={i} style={{
              fontSize: 13, color: 'var(--accent-green)', fontStyle: 'italic', marginTop: 4,
              paddingLeft: 12, borderLeft: '2px solid var(--accent-green)',
            }}>
              {imp}
            </div>
          ))}
        </div>
      )}

      {s.primeiro_video && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
          Primeiro video: {s.primeiro_video} | Ultimo: {s.ultimo_video}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 6, fontSize: 11,
      background: '#e0e7ff', color: '#3730a3',
    }}>
      {text}
    </span>
  );
}
