import { useEffect, useState, type CSSProperties } from 'react';

// Radar de Viral do Nicho — aba nova, independente do Viral Radar antigo.

interface Finding {
  video_id: string;
  score: number;
  outlier_score: number | null;
  velocity: number | null;
  track: 'br' | 'gringo';
  detected_on: string;
  radar_videos: { title: string | null; thumb_url: string | null; channel_id: string; published_at: string | null } | null;
}

const wrap: CSSProperties = { padding: '24px', fontFamily: 'var(--font)' };
const topbar: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' };
const title: CSSProperties = { fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' };
const runBtn: CSSProperties = {
  background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold-dark))',
  color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '9px 18px',
  fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: 'var(--shadow-gold)',
};
const columns: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' };
const colTitle: CSSProperties = { fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' };
const card: CSSProperties = {
  display: 'flex', gap: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: '10px', marginBottom: '10px', boxShadow: 'var(--shadow-sm)',
  textDecoration: 'none', color: 'inherit',
};
const thumb: CSSProperties = { width: '120px', height: '68px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0, background: 'var(--bg-primary)' };
const cardBody: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 };
const cardTitle: CSSProperties = { fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' };
const metaRow: CSSProperties = { display: 'flex', gap: '10px', fontSize: '11px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' };

function scoreBadge(score: number): CSSProperties {
  const hot = score >= 70;
  return {
    fontSize: '12px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px',
    background: hot ? 'var(--accent-gold)' : 'var(--bg-primary)',
    color: hot ? '#fff' : 'var(--text-secondary)', alignSelf: 'flex-start',
  };
}

function Column({ label, items }: { label: string; items: Finding[] }) {
  return (
    <div>
      <div style={colTitle}>{label} · {items.length}</div>
      {items.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Nada ainda. Rode o radar.</div>}
      {items.map((f) => (
        <a key={f.video_id} style={card} href={`https://www.youtube.com/watch?v=${f.video_id}`} target="_blank" rel="noreferrer">
          {f.radar_videos?.thumb_url && <img style={thumb} src={f.radar_videos.thumb_url} alt="" />}
          <div style={cardBody}>
            <span style={scoreBadge(f.score)}>{Math.round(f.score)}</span>
            <span style={cardTitle}>{f.radar_videos?.title ?? f.video_id}</span>
            <div style={metaRow}>
              <span>outlier {f.outlier_score?.toFixed(1)}x</span>
              <span>{Math.round(f.velocity ?? 0).toLocaleString('pt-BR')} views/dia</span>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

export function NicheRadarView() {
  const [br, setBr] = useState<Finding[]>([]);
  const [gringo, setGringo] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [rbr, rgr] = await Promise.all([
        fetch('/api/niche-radar/findings?track=br').then((r) => r.json()),
        fetch('/api/niche-radar/findings?track=gringo').then((r) => r.json()),
      ]);
      if (rbr.ok) setBr(rbr.data);
      if (rgr.ok) setGringo(rgr.data);
    } finally {
      setLoading(false);
    }
  }

  async function runNow() {
    setRunning(true);
    try {
      await fetch('/api/niche-radar/run-daily', { method: 'POST' });
      await load();
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div style={wrap}>
      <div style={topbar}>
        <span style={title}>Radar de Viral do Nicho</span>
        <button style={{ ...runBtn, opacity: running ? 0.6 : 1 }} onClick={runNow} disabled={running}>
          {running ? 'Rodando...' : 'Rodar agora'}
        </button>
      </div>
      {loading ? (
        <div style={{ color: 'var(--text-muted)' }}>Carregando achados...</div>
      ) : (
        <div style={columns}>
          <Column label="Brasil" items={br} />
          <Column label="Gringo" items={gringo} />
        </div>
      )}
    </div>
  );
}
