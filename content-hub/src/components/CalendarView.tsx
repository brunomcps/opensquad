import { useState, useMemo, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useContentStore } from '../store/useContentStore';
import { useFinancialStore } from '../store/useFinancialStore';
import { StatusBadge } from './StatusBadge';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 7h-22h

type ViewType = 'month' | 'week';

const platformColors: Record<string, { bg: string; color: string; border: string }> = {
  'yt-long': { bg: 'rgba(255, 0, 0, 0.08)', color: '#CC0000', border: '#CC0000' },
  'yt-short': { bg: 'rgba(255, 68, 68, 0.08)', color: '#FF4444', border: '#FF4444' },
  tiktok: { bg: 'rgba(0, 242, 234, 0.08)', color: '#00C4BD', border: '#00C4BD' },
  instagram: { bg: 'rgba(225, 48, 108, 0.08)', color: '#C41E5C', border: '#C41E5C' },
  gcal: { bg: 'rgba(66, 133, 244, 0.12)', color: '#1967D2', border: '#4285F4' },
  'gcal-allday': { bg: 'rgba(124, 58, 237, 0.12)', color: '#7C3AED', border: '#7C3AED' },
};

interface CalendarEntry {
  id: string;
  title: string;
  thumbnail: string;
  platform: string;
  date: string;
  endDate?: string;
  viewCount: number;
  allDay?: boolean;
  htmlLink?: string;
  scheduledAt?: string;
  privacyStatus?: string;
}

function getWeekStart(d: Date): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - copy.getDay());
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// --- Event Creation Modal ---
function EventModal({ date, onClose, onCreated }: { date: string; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [saving, setSaving] = useState(false);
  const { createCalendarEvent } = useFinancialStore();

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const start = `${date}T${startTime}:00`;
    const end = `${date}T${endTime}:00`;
    await createCalendarEvent(title, start, end);
    setSaving(false);
    onCreated();
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '24px',
        width: '380px', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', gap: '14px',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font)', color: 'var(--text-primary)' }}>
          Novo evento — {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', weekday: 'long' })}
        </div>

        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título do evento"
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          style={{
            padding: '10px 14px', fontSize: '14px', fontFamily: 'var(--font-body)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none',
          }}
        />

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Início</span>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
              style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '14px', fontFamily: 'var(--font)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
          </div>
          <span style={{ color: 'var(--text-muted)', marginTop: '20px' }}>—</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fim</span>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
              style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '14px', fontFamily: 'var(--font)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font)',
            background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            color: 'var(--text-secondary)', cursor: 'pointer',
          }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving || !title.trim()} style={{
            padding: '8px 20px', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font)',
            background: 'var(--accent-gold)', border: 'none', borderRadius: 'var(--radius)',
            color: '#fff', cursor: saving ? 'wait' : 'pointer', opacity: !title.trim() ? 0.5 : 1,
          }}>{saving ? 'Salvando...' : 'Criar evento'}</button>
        </div>
      </div>
    </div>
  );
}

// --- Main Component ---
export function CalendarView() {
  const youtubeVideos = useContentStore((s) => s.youtubeVideos);
  const tiktokVideos = useContentStore((s) => s.tiktokVideos);
  const instagramPosts = useContentStore((s) => s.instagramPosts);
  const setSelectedVideoId = useContentStore((s) => s.setSelectedVideoId);
  const setSelectedTikTokId = useContentStore((s) => s.setSelectedTikTokId);
  const { upcomingEvents, fetchUpcomingEvents } = useFinancialStore();

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewType, setViewType] = useState<ViewType>('week');
  const [showGcal, setShowGcal] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [eventModalDate, setEventModalDate] = useState<string | null>(null);
  const timeGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchUpcomingEvents(60); }, [fetchUpcomingEvents]);

  // Auto-scroll to current hour on mount
  useEffect(() => {
    if (viewType === 'week' && timeGridRef.current) {
      const now = new Date();
      const scrollTo = Math.max(0, (now.getHours() - 8) * 60);
      timeGridRef.current.scrollTop = scrollTo;
    }
  }, [viewType]);

  const today = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Build unified entries
  const entries = useMemo(() => {
    const items: CalendarEntry[] = [];
    for (const v of youtubeVideos) {
      const date = v.scheduledAt || v.publishedAt;
      if (!date) continue;
      items.push({ id: v.id, title: v.title, thumbnail: v.thumbnail, platform: v.isShort ? 'yt-short' : 'yt-long', date, viewCount: v.viewCount || 0, scheduledAt: v.scheduledAt, privacyStatus: v.privacyStatus });
    }
    for (const v of tiktokVideos) {
      const date = v.scheduledAt || v.createTime;
      if (!date) continue;
      items.push({ id: v.id, title: v.title, thumbnail: v.thumbnail, platform: 'tiktok', date, viewCount: v.viewCount || 0 });
    }
    for (const p of instagramPosts) {
      if (!p.timestamp) continue;
      items.push({ id: p.id, title: p.caption.replace(/#\w+/g, '').trim().slice(0, 80) || 'Post', thumbnail: p.thumbnailUrl || '', platform: 'instagram', date: p.timestamp, viewCount: p.likeCount || 0 });
    }
    if (showGcal) {
      for (const e of upcomingEvents) {
        items.push({
          id: `gcal-${e.id}`, title: e.summary, thumbnail: '', platform: e.allDay ? 'gcal-allday' : 'gcal',
          date: e.start, endDate: e.end, viewCount: 0, allDay: e.allDay, htmlLink: e.htmlLink,
        });
      }
    }
    return items;
  }, [youtubeVideos, tiktokVideos, instagramPosts, upcomingEvents, showGcal]);

  // Week data
  const weekStart = useMemo(() => getWeekStart(currentDate), [currentDate]);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const weekLabel = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return `${weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} — ${end.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }, [weekStart]);

  // Month data
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthCells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) monthCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) monthCells.push(d);
  while (monthCells.length % 7 !== 0) monthCells.push(null);

  const entriesByMonthDay = useMemo(() => {
    const map: Record<number, CalendarEntry[]> = {};
    for (const e of entries) {
      const d = new Date(e.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        (map[day] ||= []).push(e);
      }
    }
    return map;
  }, [entries, year, month]);

  // Navigation
  const prev = () => {
    if (viewType === 'month') setCurrentDate(new Date(year, month - 1, 1));
    else { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }
    setSelectedDay(null);
  };
  const next = () => {
    if (viewType === 'month') setCurrentDate(new Date(year, month + 1, 1));
    else { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }
    setSelectedDay(null);
  };

  const handleEntryClick = (e: CalendarEntry) => {
    if (e.platform === 'gcal' || e.platform === 'gcal-allday') {
      if (e.htmlLink) window.open(e.htmlLink, '_blank');
    } else if (e.platform === 'tiktok') {
      setSelectedTikTokId(e.id);
    } else {
      setSelectedVideoId(e.id);
    }
  };

  const openCreateModal = (dateStr: string) => setEventModalDate(dateStr);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px 20px', gap: '12px' }}>
      {eventModalDate && (
        <EventModal
          date={eventModalDate}
          onClose={() => setEventModalDate(null)}
          onCreated={() => fetchUpcomingEvents(60)}
        />
      )}

      {/* Nav bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={prev} style={navBtnStyle}>←</button>
        <span style={{ fontSize: '17px', fontWeight: 700, fontFamily: 'var(--font)', color: 'var(--text-primary)', minWidth: '220px', textAlign: 'center' }}>
          {viewType === 'month' ? `${MONTHS[month]} ${year}` : weekLabel}
        </span>
        <button onClick={next} style={navBtnStyle}>→</button>
        <button onClick={() => { setCurrentDate(new Date()); setSelectedDay(today.getDate()); }} style={{ ...navBtnStyle, fontSize: '12px', padding: '5px 10px' }}>Hoje</button>

        <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-primary)', borderRadius: 'var(--radius)', padding: '3px', marginLeft: '8px' }}>
          <button onClick={() => setViewType('month')} style={viewType === 'month' ? toggleActiveS : toggleBtnS}>Mensal</button>
          <button onClick={() => setViewType('week')} style={viewType === 'week' ? toggleActiveS : toggleBtnS}>Semanal</button>
        </div>

        <button onClick={() => setShowGcal(!showGcal)} style={{
          ...navBtnStyle, fontSize: '12px', padding: '5px 10px', marginLeft: '4px',
          background: showGcal ? 'var(--accent-gold-bg)' : 'var(--bg-card)',
          borderColor: showGcal ? 'var(--accent-gold)' : 'var(--border)',
          color: showGcal ? 'var(--accent-gold-dark)' : 'var(--text-muted)',
        }}>📅 Agenda</button>
      </div>

      {/* ============ WEEK VIEW (time grid like Google Calendar) ============ */}
      {viewType === 'week' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', minHeight: 0 }}>
          {/* All-day row */}
          <div style={{ display: 'grid', gridTemplateColumns: '54px repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
            <div style={{ padding: '6px', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right', paddingRight: '8px', fontFamily: 'var(--font)' }}>DIA TODO</div>
            {weekDays.map((wd, i) => {
              const isToday2 = isSameDay(wd, today);
              const dayEntries = entries.filter(e => e.allDay && isSameDay(new Date(e.date), wd));
              const dateStr = `${wd.getFullYear()}-${String(wd.getMonth() + 1).padStart(2, '0')}-${String(wd.getDate()).padStart(2, '0')}`;
              return (
                <div key={i} style={{
                  borderLeft: '1px solid var(--border)', padding: '4px 6px', minHeight: '28px',
                  background: isToday2 ? 'rgba(240, 186, 60, 0.04)' : 'transparent',
                }}>
                  {dayEntries.map((e) => {
                    const c = platformColors[e.platform] || platformColors.gcal;
                    return (
                      <div key={e.id} onClick={() => handleEntryClick(e)} style={{
                        fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '3px',
                        background: c.bg, color: c.color, cursor: 'pointer', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px',
                      }}>{e.title}</div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '54px repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
            <div />
            {weekDays.map((wd, i) => {
              const isToday2 = isSameDay(wd, today);
              const dateStr = `${wd.getFullYear()}-${String(wd.getMonth() + 1).padStart(2, '0')}-${String(wd.getDate()).padStart(2, '0')}`;
              return (
                <div key={i} style={{
                  textAlign: 'center', padding: '8px 4px', borderLeft: '1px solid var(--border)',
                  background: isToday2 ? 'rgba(240, 186, 60, 0.04)' : 'transparent',
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font)' }}>{WEEKDAYS[wd.getDay()]}</div>
                  <div style={{
                    fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font)', marginTop: '2px',
                    color: isToday2 ? '#fff' : 'var(--text-primary)',
                    ...(isToday2 ? { background: 'var(--accent-gold)', borderRadius: '50%', width: '34px', height: '34px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } : {}),
                  }}>{wd.getDate()}</div>
                  <button onClick={() => openCreateModal(dateStr)} style={{
                    background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer',
                    color: 'var(--text-muted)', marginTop: '4px', padding: '2px 6px',
                    borderRadius: '4px', transition: 'all var(--transition)',
                  }} title="Criar evento"
                    onMouseEnter={(ev) => { ev.currentTarget.style.background = 'var(--accent-gold-bg)'; ev.currentTarget.style.color = 'var(--accent-gold-dark)'; }}
                    onMouseLeave={(ev) => { ev.currentTarget.style.background = 'none'; ev.currentTarget.style.color = 'var(--text-muted)'; }}
                  >+ evento</button>
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div ref={timeGridRef} style={{ flex: 1, overflowY: 'auto', position: 'relative', minHeight: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '54px repeat(7, 1fr)', minHeight: `${HOURS.length * 60}px` }}>
              {/* Time labels */}
              <div style={{ position: 'relative' }}>
                {HOURS.map((h) => (
                  <div key={h} style={{
                    position: 'absolute', top: `${(h - 7) * 60}px`, right: '8px',
                    fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font)',
                    fontVariantNumeric: 'tabular-nums', lineHeight: '1',
                  }}>{String(h).padStart(2, '0')}:00</div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((wd, colIdx) => {
                const isToday2 = isSameDay(wd, today);
                const dayEntries = entries.filter(e => !e.allDay && isSameDay(new Date(e.date), wd));
                const dateStr = `${wd.getFullYear()}-${String(wd.getMonth() + 1).padStart(2, '0')}-${String(wd.getDate()).padStart(2, '0')}`;

                return (
                  <div key={colIdx} style={{
                    position: 'relative', borderLeft: '1px solid var(--border)',
                    background: isToday2 ? 'rgba(240, 186, 60, 0.02)' : 'transparent',
                  }}
                    onDoubleClick={(ev) => {
                      const rect = ev.currentTarget.getBoundingClientRect();
                      const y = ev.clientY - rect.top + ev.currentTarget.parentElement!.parentElement!.scrollTop;
                      const hour = Math.floor(y / 60) + 7;
                      setEventModalDate(dateStr);
                    }}
                  >
                    {/* Hour lines */}
                    {HOURS.map((h) => (
                      <div key={h} style={{
                        position: 'absolute', top: `${(h - 7) * 60}px`, left: 0, right: 0,
                        borderTop: '1px solid var(--border)', height: '60px',
                      }} />
                    ))}

                    {/* Now indicator */}
                    {isToday2 && (() => {
                      const now = new Date();
                      const mins = (now.getHours() - 7) * 60 + now.getMinutes();
                      if (mins < 0 || mins > HOURS.length * 60) return null;
                      return <div style={{ position: 'absolute', top: `${mins}px`, left: 0, right: 0, height: '2px', background: 'var(--accent-red)', zIndex: 5 }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-red)', marginTop: '-3px' }} />
                      </div>;
                    })()}

                    {/* Events */}
                    {(() => {
                      // Calculate overlap groups for proper horizontal splitting
                      const positioned = dayEntries.map((entry) => {
                        const start = new Date(entry.date);
                        const end = entry.endDate ? new Date(entry.endDate) : new Date(start.getTime() + 60 * 60 * 1000);
                        return { entry, start, end, startMin: (start.getHours() - 7) * 60 + start.getMinutes(), duration: Math.max((end.getTime() - start.getTime()) / 60000, 30) };
                      });

                      // For each event, find how many overlap and its index in the overlap group
                      return positioned.map((item, idx) => {
                        const overlaps = positioned.filter((other, otherIdx) => {
                          if (otherIdx === idx || other.entry.allDay) return false;
                          return item.start < other.end && item.end > other.start;
                        });
                        const groupSize = overlaps.length + 1;
                        const groupIndex = overlaps.filter((_, oi) => positioned.indexOf(overlaps[oi]) < idx).length;
                        const widthPercent = 100 / groupSize;
                        const leftPercent = groupIndex * widthPercent;

                        const c = platformColors[item.entry.platform] || platformColors.gcal;
                        const isGcal = item.entry.platform === 'gcal';
                        const icon = isGcal ? '📅' : item.entry.platform === 'tiktok' ? '♪' : item.entry.platform === 'yt-short' ? '⚡' : item.entry.platform === 'instagram' ? '◻' : '▶';

                        return (
                        <div key={item.entry.id} onClick={() => handleEntryClick(item.entry)} style={{
                          position: 'absolute', top: `${item.startMin}px`,
                          left: `${leftPercent}%`, width: `${widthPercent - 1}%`,
                          height: `${item.duration - 2}px`, minHeight: '22px',
                          background: c.bg, borderLeft: `3px solid ${c.border}`, borderRadius: '4px',
                          padding: '2px 6px', cursor: 'pointer', overflow: 'hidden', zIndex: 3,
                          fontSize: '11px', color: c.color, fontWeight: 600, fontFamily: 'var(--font)',
                          transition: 'box-shadow var(--transition)',
                        }}
                          onMouseEnter={(ev) => { ev.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                          onMouseLeave={(ev) => { ev.currentTarget.style.boxShadow = 'none'; }}
                        >
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {icon} {item.entry.title}
                          </div>
                          {item.duration >= 40 && (
                            <div style={{ fontSize: '10px', fontWeight: 400, opacity: 0.8, marginTop: '1px' }}>
                              {item.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} — {item.end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                        );
                      });
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============ MONTH VIEW ============ */}
      {viewType === 'month' && (
        <>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px',
            background: 'var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', flex: 1,
          }}>
            {WEEKDAYS.map((wd) => (
              <div key={wd} style={{
                background: 'var(--bg-card)', padding: '8px', textAlign: 'center', fontSize: '11px',
                fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font)',
              }}>{wd}</div>
            ))}
            {monthCells.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} style={{ background: 'var(--bg-primary)', padding: '6px', minHeight: '100px', opacity: 0.4 }} />;
              const dayEntries = entriesByMonthDay[day] || [];
              const isToday2 = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
              const isSelected = selectedDay === day;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

              return (
                <div key={day} onClick={() => setSelectedDay(day)} onDoubleClick={() => openCreateModal(dateStr)}
                  style={{
                    background: isSelected ? 'var(--bg-card-hover)' : 'var(--bg-secondary)',
                    padding: '6px', minHeight: '100px', display: 'flex', flexDirection: 'column', gap: '3px',
                    overflow: 'hidden', cursor: 'pointer', transition: 'background var(--transition)',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-card)'; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                >
                  <div style={{
                    fontSize: '12px', fontWeight: 600, marginBottom: '2px',
                    ...(isToday2 ? { background: 'var(--accent-gold)', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' } : { color: 'var(--text-secondary)' }),
                  }}>{day}</div>
                  {dayEntries.slice(0, 3).map((entry) => {
                    const c = platformColors[entry.platform] || platformColors['yt-long'];
                    const icon = entry.platform === 'gcal' ? '📅' : entry.platform === 'gcal-allday' ? '🟣' : entry.platform === 'instagram' ? '◻' : entry.platform === 'tiktok' ? '♪' : entry.platform === 'yt-short' ? '⚡' : '▶';
                    return (
                      <div key={entry.id} style={{
                        fontSize: '10px', fontWeight: 500, padding: '2px 5px', borderRadius: '3px',
                        background: c.bg, color: c.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{icon} {entry.title.slice(0, 25)}</div>
                    );
                  })}
                  {dayEntries.length > 3 && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>+{dayEntries.length - 3} mais</div>}
                </div>
              );
            })}
          </div>

          {/* Detail panel for selected day */}
          {selectedDay !== null && (() => {
            const dayEntries = entriesByMonthDay[selectedDay] || [];
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
            return (
              <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
                padding: '16px', maxHeight: '280px', overflowY: 'auto', boxShadow: 'var(--shadow-sm)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)' }}>
                    {selectedDay} de {MONTHS[month]} — {dayEntries.length} item{dayEntries.length !== 1 ? 's' : ''}
                  </span>
                  <button onClick={() => openCreateModal(dateStr)} style={{
                    background: 'var(--accent-gold)', border: 'none', borderRadius: 'var(--radius)',
                    color: '#fff', padding: '5px 12px', fontSize: '12px', fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'var(--font)',
                  }}>+ Evento</button>
                </div>
                {dayEntries.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>Nenhum evento. Clique em "+ Evento" para criar.</div>
                ) : dayEntries.map((entry) => {
                  const c = platformColors[entry.platform] || platformColors['yt-long'];
                  const isGcal = entry.platform === 'gcal' || entry.platform === 'gcal-allday';
                  return (
                    <div key={entry.id} onClick={() => handleEntryClick(entry)} style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0',
                      borderBottom: '1px solid var(--border)', cursor: 'pointer',
                    }}>
                      {!isGcal && entry.thumbnail && <img src={entry.thumbnail} alt="" style={{ width: '56px', height: '32px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />}
                      {isGcal && <div style={{ width: '56px', height: '32px', borderRadius: '4px', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>📅</div>}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                          <span style={{ color: c.color, fontWeight: 600 }}>{isGcal ? 'Agenda' : entry.platform === 'instagram' ? 'Instagram' : entry.platform === 'tiktok' ? 'TikTok' : entry.platform === 'yt-short' ? 'Short' : 'YouTube'}</span>
                          {entry.allDay ? <span>Dia todo</span> : entry.endDate && <span>{new Date(entry.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} — {new Date(entry.endDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>}
                          {!isGcal && <span>{entry.viewCount > 0 ? `${entry.viewCount >= 1000 ? (entry.viewCount / 1000).toFixed(1) + 'K' : entry.viewCount} views` : ''}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

// --- Shared button styles ---
const navBtnStyle: CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  color: 'var(--text-primary)', padding: '6px 14px', fontSize: '14px', cursor: 'pointer',
  fontFamily: 'var(--font)', transition: 'all var(--transition)',
};
const toggleBtnS: CSSProperties = {
  background: 'transparent', border: 'none', borderRadius: '6px', color: 'var(--text-muted)',
  padding: '5px 14px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font)',
};
const toggleActiveS: CSSProperties = {
  ...toggleBtnS, background: 'var(--bg-card)', color: 'var(--accent-gold-dark)', fontWeight: 700, boxShadow: 'var(--shadow-sm)',
};
