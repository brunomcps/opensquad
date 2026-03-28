import { useState, useEffect, type CSSProperties } from 'react';

// ─── Markdown Renderer (same as FichaDetail) ───────────────────────────────

function renderMarkdown(md: string): string {
  const lines = md.split('\n');
  const html: string[] = [];
  let inTable = false;
  let tableStarted = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (i === 0 && trimmed.startsWith('### ')) continue;

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (trimmed.match(/^\|[\s\-:|]+\|$/)) continue;
      const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
      if (!inTable) { html.push('<table>'); inTable = true; tableStarted = false; }
      if (!tableStarted && lines[i + 1]?.trim().match(/^\|[\s\-:|]+\|$/)) {
        html.push('<thead><tr>' + cells.map(c => `<th>${esc(c)}</th>`).join('') + '</tr></thead><tbody>');
        tableStarted = true;
        continue;
      }
      html.push('<tr>' + cells.map(c => `<td>${fmt(c)}</td>`).join('') + '</tr>');
      continue;
    }
    if (inTable) { html.push('</tbody></table>'); inTable = false; tableStarted = false; }
    if (!trimmed) { html.push(''); continue; }
    if (trimmed.startsWith('#### ')) { html.push(`<h4>${fmt(trimmed.slice(5))}</h4>`); continue; }
    if (trimmed.startsWith('### ')) { html.push(`<h3>${fmt(trimmed.slice(4))}</h3>`); continue; }
    if (trimmed === '---') { html.push('<hr>'); continue; }
    if (trimmed.startsWith('> ')) { html.push(`<blockquote>${fmt(trimmed.slice(2))}</blockquote>`); continue; }
    if (trimmed.match(/^[-*]\s/)) { html.push(`<li>${fmt(trimmed.slice(2))}</li>`); continue; }
    if (trimmed.match(/^\d+\.\s/)) { html.push(`<li>${fmt(trimmed.replace(/^\d+\.\s/, ''))}</li>`); continue; }
    html.push(`<p>${fmt(trimmed)}</p>`);
  }
  if (inTable) html.push('</tbody></table>');
  return html.join('\n');
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmt(s: string): string {
  let r = esc(s);
  r = r.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  r = r.replace(/\*(.+?)\*/g, '<em>$1</em>');
  r = r.replace(/`(.+?)`/g, '<code>$1</code>');
  return r;
}

// ─── Types ──────────────────────────────────────────────────────────────────

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

// ─── Styles ─────────────────────────────────────────────────────────────────

type PanelMode = 'side' | 'center' | 'full';

const mdStyles = `
.comp-ficha-md table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12px; }
.comp-ficha-md th { background: var(--bg-primary); font-weight: 700; text-align: left; padding: 6px 10px; border: 1px solid var(--border); color: var(--text-primary); font-family: var(--font); white-space: nowrap; }
.comp-ficha-md td { padding: 6px 10px; border: 1px solid var(--border); vertical-align: top; }
.comp-ficha-md h3 { font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 16px 0 8px; font-family: var(--font); }
.comp-ficha-md h4 { font-size: 13px; font-weight: 700; color: var(--accent-gold-dark); margin: 12px 0 6px; font-family: var(--font); }
.comp-ficha-md hr { border: none; border-top: 1px solid var(--border); margin: 12px 0; }
.comp-ficha-md p { margin: 4px 0; }
.comp-ficha-md li { margin: 2px 0; padding-left: 4px; }
.comp-ficha-md blockquote { border-left: 3px solid var(--accent-gold); padding-left: 12px; margin: 8px 0; color: var(--text-muted); font-style: italic; }
.comp-ficha-md strong { color: var(--text-primary); }
.comp-ficha-md code { background: var(--bg-primary); padding: 1px 4px; border-radius: 3px; font-size: 12px; }
`;

const SECTION_LABELS: Record<string, string> = {
  '1': 'Estrutura Macro',
  '2': 'Hook — Anatomia',
  '3': 'Contextualização',
  '4': 'Blocos de Conteúdo',
  '5': 'Estratégias',
  '5b': 'CTAs Intermediários',
  '6': 'Transições',
  '7': 'Fechamento',
  '8': 'Histórias / Evidências',
  '9': 'Metáforas / Analogias',
  '10': 'Linguagem / Tom / Retórica',
};

const SECTION_GROUPS = [
  { emoji: '🏗️', title: 'Estrutura do Roteiro', keys: ['1', '2', '3', '4', '5', '7'] },
  { emoji: '🔄', title: 'Engajamento e Fluxo', keys: ['6', '5b'] },
  { emoji: '🎭', title: 'Análise Retórica', keys: ['8', '9', '10'] },
];

function getOverlayStyle(mode: PanelMode): CSSProperties {
  return {
    position: 'fixed', inset: 0,
    background: mode === 'full' ? 'var(--bg-primary)' : 'rgba(0,0,0,0.5)',
    zIndex: 1000, display: 'flex',
    justifyContent: mode === 'side' ? 'flex-end' : 'center',
    alignItems: mode === 'center' ? 'center' : 'stretch',
  };
}

function getPanelStyle(mode: PanelMode): CSSProperties {
  const base: CSSProperties = { background: 'var(--bg-primary)', overflowY: 'auto', padding: '24px' };
  switch (mode) {
    case 'side': return { ...base, width: '700px', maxWidth: '90vw', height: '100vh', boxShadow: '-4px 0 20px rgba(0,0,0,0.2)' };
    case 'center': return { ...base, width: '900px', maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' };
    case 'full': return { ...base, width: '100%', maxWidth: '1000px', height: '100vh', margin: '0 auto' };
  }
}

const btn: CSSProperties = {
  background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  padding: '5px 10px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-muted)',
  fontFamily: 'var(--font)', transition: 'all var(--transition)',
};

const btnActive: CSSProperties = { ...btn, borderColor: 'var(--accent-gold)', color: 'var(--accent-gold-dark)', fontWeight: 700 };

const sectionHeaderStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '10px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', cursor: 'pointer', marginBottom: '4px',
  fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)',
};

const sectionContentStyle: CSSProperties = {
  padding: '12px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)',
  borderTop: 'none', borderRadius: '0 0 var(--radius) var(--radius)', marginBottom: '8px',
  fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', overflowX: 'auto',
};

// ─── Component ──────────────────────────────────────────────────────────────

export function CompetitorFichaDetail({
  ficha,
  competitorName,
  onClose,
}: {
  ficha: CompetitorFicha;
  competitorName?: string;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [panelMode, setPanelMode] = useState<PanelMode>('side');
  const [copied, setCopied] = useState(false);

  useEffect(() => { setExpanded(new Set()); }, [ficha.videoId]);

  const availableKeys = new Set(Object.keys(ficha.sections));

  const toggleSection = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(availableKeys));
  const collapseAll = () => setExpanded(new Set());

  const copyAsMarkdown = () => {
    const header = `# Ficha de Roteiro — ${ficha.title}\n\n- **Concorrente:** ${competitorName || ficha.competitorId}\n- **ID:** ${ficha.videoId}\n- **Duração:** ${ficha.durationText || '-'}\n- **Publicado:** ${ficha.publishedAt || '-'}\n\n---\n\n`;
    const sections = Object.entries(ficha.sections)
      .sort(([a], [b]) => parseFloat(a.replace('b', '.5')) - parseFloat(b.replace('b', '.5')))
      .map(([, content]) => content)
      .join('\n\n---\n\n');
    navigator.clipboard.writeText(header + sections).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const renderSection = (key: string) => {
    if (!availableKeys.has(key)) return null;
    return (
      <div key={key}>
        <div
          style={{ ...sectionHeaderStyle, borderColor: expanded.has(key) ? 'var(--accent-gold)' : 'var(--border)' }}
          onClick={() => toggleSection(key)}
        >
          <span>{SECTION_LABELS[key] || `Seção ${key}`}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{expanded.has(key) ? '▼' : '▶'}</span>
        </div>
        {expanded.has(key) && (
          <div style={sectionContentStyle} className="comp-ficha-md" dangerouslySetInnerHTML={{ __html: renderMarkdown(ficha.sections[key]) }} />
        )}
      </div>
    );
  };

  return (
    <div style={getOverlayStyle(panelMode)} onClick={() => panelMode !== 'full' && onClose()}>
      <style>{mdStyles}</style>
      <div style={getPanelStyle(panelMode)} onClick={e => e.stopPropagation()}>
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px', marginBottom: '16px', position: 'sticky', top: 0, background: 'var(--bg-primary)', padding: '8px 0', zIndex: 2 }}>
          <button style={panelMode === 'side' ? btnActive : btn} onClick={() => setPanelMode('side')}>◧ Lateral</button>
          <button style={panelMode === 'center' ? btnActive : btn} onClick={() => setPanelMode('center')}>⬜ Centro</button>
          <button style={panelMode === 'full' ? btnActive : btn} onClick={() => setPanelMode('full')}>⛶ Expandir</button>
          <button
            style={{ ...btn, color: copied ? 'var(--accent-gold-dark)' : 'var(--text-muted)' }}
            onClick={copyAsMarkdown}
          >
            {copied ? '✓ Copiado!' : '📋 Copiar MD'}
          </button>
          <button style={{ ...btn, marginLeft: '8px', color: 'var(--text-secondary)', fontWeight: 600 }} onClick={onClose}>✕ Fechar</button>
        </div>

        {/* Header */}
        <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
          {competitorName && (
            <div style={{ fontSize: '12px', color: 'var(--accent-gold-dark)', fontFamily: 'var(--font)', fontWeight: 600, marginBottom: '4px' }}>
              {competitorName}
            </div>
          )}
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font)', marginBottom: '8px', lineHeight: '1.3' }}>
            {ficha.title}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', display: 'flex', gap: '16px' }}>
            <span>{ficha.videoId}</span>
            {ficha.publishedAt && <span>{ficha.publishedAt}</span>}
            {ficha.durationText && <span>{ficha.durationText}</span>}
            <span>{availableKeys.size} seções</span>
          </div>
        </div>

        {/* Expand/collapse */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <button onClick={expandAll} style={{ ...sectionHeaderStyle, flex: 1, justifyContent: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--accent-gold-dark)' }}>
            Expandir tudo
          </button>
          <button onClick={collapseAll} style={{ ...sectionHeaderStyle, flex: 1, justifyContent: 'center', fontSize: '12px', fontWeight: 600 }}>
            Colapsar tudo
          </button>
        </div>

        {/* Sections by group */}
        {SECTION_GROUPS.map(group => {
          const present = group.keys.filter(k => availableKeys.has(k));
          if (present.length === 0) return null;
          return (
            <div key={group.title}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 0 6px', marginTop: '16px', borderBottom: '2px solid var(--border)', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>{group.emoji}</span>
                <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font)' }}>{group.title}</span>
              </div>
              {present.map(renderSection)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Fichas List Component (for ViralRadar sub-tab) ─────────────────────────

interface FichaListItem {
  competitorId: string;
  videoId: string;
  platform: string;
  title: string;
  durationText?: string;
  publishedAt?: string;
  structureType?: string;
  hookElementCount?: number;
  blockCount?: number;
  generatedAt?: string;
}

export function CompetitorFichasTab() {
  const [fichas, setFichas] = useState<FichaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFicha, setSelectedFicha] = useState<CompetitorFicha | null>(null);
  const [selectedCompetitorName, setSelectedCompetitorName] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/competitors/fichas');
        if (res.ok) {
          const json = await res.json();
          setFichas(json.data || []);
        }
      } catch (e) {
        console.error('Error fetching competitor fichas:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openFicha = async (item: FichaListItem) => {
    try {
      const res = await fetch(`/api/competitors/fichas/${item.competitorId}/${item.videoId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setSelectedFicha(json.data);
          // Try to get competitor name from registry
          try {
            const regRes = await fetch('/api/competitors/registry');
            if (regRes.ok) {
              const regJson = await regRes.json();
              const comp = (regJson.data?.competitors || []).find((c: any) => c.id === item.competitorId);
              setSelectedCompetitorName(comp?.name || item.competitorId);
            }
          } catch { setSelectedCompetitorName(item.competitorId); }
        }
      }
    } catch (e) {
      console.error('Error fetching ficha:', e);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', minHeight: 160, animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    );
  }

  if (fichas.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
        Nenhuma ficha de concorrente gerada ainda. Use o squad <strong>competitor-fichas</strong> para gerar fichas de roteiro dos vídeos dos concorrentes.
      </div>
    );
  }

  return (
    <>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-body)', marginBottom: 10 }}>
        {fichas.length} ficha{fichas.length !== 1 ? 's' : ''} de concorrentes
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {fichas.map(f => (
          <div
            key={`${f.competitorId}-${f.videoId}`}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-sm)', overflow: 'hidden', cursor: 'pointer',
              transition: 'var(--transition)', display: 'flex', flexDirection: 'column',
            }}
            onClick={() => openFicha(f)}
          >
            {/* Thumbnail */}
            {f.platform === 'youtube' && (
              <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', backgroundColor: 'var(--bg-secondary)' }}>
                <img
                  src={`https://i.ytimg.com/vi/${f.videoId}/mqdefault.jpg`}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  loading="lazy"
                />
                {f.durationText && (
                  <div style={{
                    position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.8)',
                    color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
                    fontFamily: 'var(--font)',
                  }}>
                    {f.durationText}
                  </div>
                )}
              </div>
            )}
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font)', fontWeight: 500 }}>
                {f.competitorId}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
                {f.title || '(sem título)'}
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-body)', marginTop: 'auto' }}>
                {f.structureType && <span>{f.structureType}</span>}
                {f.hookElementCount != null && <span>{f.hookElementCount} hooks</span>}
                {f.blockCount != null && <span>{f.blockCount} blocos</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedFicha && (
        <CompetitorFichaDetail
          ficha={selectedFicha}
          competitorName={selectedCompetitorName}
          onClose={() => setSelectedFicha(null)}
        />
      )}
    </>
  );
}
