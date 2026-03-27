import { useState, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useContentStore } from '../../store/useContentStore';

// --- Pocket card styles ---

const wrapper: CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)', padding: '18px 22px', boxShadow: 'var(--shadow-sm)',
  flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
};

const title: CSSProperties = { fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)' };
const subtitle: CSSProperties = { fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', marginBottom: '14px' };

const slotRow: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0',
  borderBottom: '1px solid var(--border)',
};

const rankNum: CSSProperties = {
  fontSize: '14px', fontWeight: 800, fontFamily: 'var(--font)', width: '20px', textAlign: 'center',
};

const slotInfo: CSSProperties = { flex: 1 };
const slotDay: CSSProperties = { fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)' };
const slotMeta: CSSProperties = { fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' };
const slotViews: CSSProperties = { fontSize: '14px', fontWeight: 800, color: 'var(--accent-gold-dark)', fontFamily: 'var(--font)', textAlign: 'right' as const };

const expandBtn: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
  marginTop: '12px', padding: '8px', width: '100%',
  background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600,
  cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all var(--transition)',
};

// --- Full heatmap modal styles ---

const modalOverlay: CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
  animation: 'fadeIn 0.15s ease',
};

const modalPanel: CSSProperties = {
  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)',
  padding: '24px 28px', maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
};

const modalHeader: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px',
};

const modalTitle: CSSProperties = { fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font)' };

const closeBtn: CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '50%',
  width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', fontSize: '16px', color: 'var(--text-secondary)', fontFamily: 'var(--font)',
  transition: 'all var(--transition)',
};

const tooltipBox: CSSProperties = {
  position: 'fixed', background: '#fff', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: '6px 10px', fontSize: '11px',
  boxShadow: 'var(--shadow-md)', zIndex: 210, pointerEvents: 'none',
};

// --- Data ---

const DAYS_SHORT = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const DAYS_FULL = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
const DAY_MAP = [1, 2, 3, 4, 5, 6, 0]; // Mon=1...Sun=0

function getColor(value: number, max: number): string {
  if (value === 0) return 'var(--bg-primary)';
  const r = value / max;
  if (r < 0.25) return 'rgba(240,186,60,0.15)';
  if (r < 0.5) return 'rgba(240,186,60,0.3)';
  if (r < 0.75) return 'rgba(240,186,60,0.55)';
  return 'rgba(240,186,60,0.85)';
}

function getTextColor(value: number, max: number): string {
  if (value === 0) return 'transparent';
  return value / max > 0.5 ? '#1a1a1a' : 'var(--accent-gold-dark)';
}

interface SlotData {
  jsDay: number;
  hour: number;
  count: number;
  avgViews: number;
}

export function BestTimeHeatmap() {
  const videos = useContentStore((s) => s.youtubeVideos);
  const [showModal, setShowModal] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; day: string; hour: number; count: number; avg: number } | null>(null);

  const { grid, maxVal, topSlots } = useMemo(() => {
    const g: { count: number; totalViews: number; avgViews: number }[][] =
      Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => ({ count: 0, totalViews: 0, avgViews: 0 })));

    const publicVids = videos.filter((v) => v.privacyStatus === 'public' && !v.scheduledAt);
    for (const v of publicVids) {
      const d = new Date(v.publishedAt);
      g[d.getDay()][d.getHours()].count++;
      g[d.getDay()][d.getHours()].totalViews += v.viewCount || 0;
    }

    let max = 0;
    const allSlots: SlotData[] = [];

    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        const c = g[d][h];
        c.avgViews = c.count > 0 ? Math.round(c.totalViews / c.count) : 0;
        if (c.avgViews > max) max = c.avgViews;
        if (c.count > 0) allSlots.push({ jsDay: d, hour: h, count: c.count, avgViews: c.avgViews });
      }
    }

    const top = allSlots.sort((a, b) => b.avgViews - a.avgViews).slice(0, 5);
    return { grid: g, maxVal: max, topSlots: top };
  }, [videos]);

  const getDayLabel = (jsDay: number) => DAYS_FULL[DAY_MAP.indexOf(jsDay)] || '';
  const CELL = 24;
  const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

  return (
    <>
      {/* Pocket card */}
      <div style={wrapper}>
        <div style={title}>Melhor horario para postar</div>
        <div style={subtitle}>Top slots por media de views</div>

        {topSlots.map((slot, i) => (
          <div key={i} style={{ ...slotRow, borderBottom: i === topSlots.length - 1 ? 'none' : '1px solid var(--border)' }}>
            <span style={{ ...rankNum, color: i === 0 ? 'var(--accent-gold-dark)' : 'var(--text-muted)' }}>
              {i + 1}
            </span>
            <div style={slotInfo}>
              <div style={slotDay}>
                {getDayLabel(slot.jsDay)} {slot.hour}h
                {i === 0 && <span style={{ marginLeft: '6px', fontSize: '12px' }}>★</span>}
              </div>
              <div style={slotMeta}>{slot.count} video{slot.count > 1 ? 's' : ''} publicado{slot.count > 1 ? 's' : ''}</div>
            </div>
            <div style={slotViews}>{slot.avgViews.toLocaleString('pt-BR')}</div>
          </div>
        ))}

        {topSlots.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0', textAlign: 'center' }}>
            Sem dados suficientes
          </div>
        )}

        <button
          style={expandBtn}
          onClick={() => setShowModal(true)}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; e.currentTarget.style.color = 'var(--accent-gold-dark)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          Ver heatmap completo →
        </button>
      </div>

      {/* Full heatmap modal */}
      {showModal && (
        <div style={modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={modalPanel}>
            <div style={modalHeader}>
              <div>
                <div style={modalTitle}>Heatmap de horarios</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Media de views por dia da semana e hora de publicacao
                </div>
              </div>
              <button style={closeBtn} onClick={() => setShowModal(false)}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              >✕</button>
            </div>

            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: `40px repeat(7, 1fr)`, gap: '3px', marginBottom: '3px' }}>
              <div />
              {DAYS_FULL.map((d) => (
                <div key={d} style={{ textAlign: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font)', padding: '4px 0' }}>{d}</div>
              ))}
            </div>

            {/* Hour rows */}
            {HOURS.map((hour) => (
              <div key={hour} style={{ display: 'grid', gridTemplateColumns: `40px repeat(7, 1fr)`, gap: '3px', marginBottom: '3px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '6px' }}>
                  {String(hour).padStart(2, '0')}h
                </div>
                {DAY_MAP.map((jsDay, colIdx) => {
                  const data = grid[jsDay][hour];
                  const isBest = topSlots[0] && jsDay === topSlots[0].jsDay && hour === topSlots[0].hour;
                  return (
                    <div key={colIdx}
                      style={{
                        height: CELL, borderRadius: '4px',
                        background: getColor(data.avgViews, maxVal),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', fontWeight: 700, color: getTextColor(data.avgViews, maxVal),
                        border: isBest ? '2px solid var(--accent-gold-dark)' : 'none',
                        cursor: data.count > 0 ? 'pointer' : 'default',
                        transition: 'transform 0.1s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (data.count > 0) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltip({ x: rect.left + rect.width / 2, y: rect.top - 4, day: DAYS_FULL[colIdx], hour, count: data.count, avg: data.avgViews });
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }
                      }}
                      onMouseLeave={(e) => { setTooltip(null); e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                      {data.count > 0 ? data.count : ''}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '12px', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Menos views</span>
              {['var(--bg-primary)', 'rgba(240,186,60,0.15)', 'rgba(240,186,60,0.3)', 'rgba(240,186,60,0.55)', 'rgba(240,186,60,0.85)'].map((c, i) => (
                <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: c, border: c === 'var(--bg-primary)' ? '1px solid var(--border)' : 'none' }} />
              ))}
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Mais views</span>
            </div>
          </div>

          {tooltip && (
            <div style={{ ...tooltipBox, left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)' }}>{tooltip.day} {tooltip.hour}h</div>
              <div style={{ color: 'var(--text-secondary)' }}>{tooltip.count} video{tooltip.count > 1 ? 's' : ''} · {tooltip.avg.toLocaleString('pt-BR')} views media</div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
