import { useState, useEffect, useMemo, type CSSProperties } from 'react';
import { useFichaStore } from '../store/useFichaStore';

function renderMarkdown(md: string): string {
  const lines = md.split('\n');
  const html: string[] = [];
  let inTable = false;
  let tableStarted = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();

    // Skip the first section header (already shown in the collapsible)
    if (i === 0 && trimmed.startsWith('### ')) continue;

    // Table rows
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      // Separator row
      if (trimmed.match(/^\|[\s\-:|]+\|$/)) continue;

      const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
      const cellTag = !tableStarted ? 'th' : 'td';

      if (!inTable) {
        html.push('<table>');
        inTable = true;
        tableStarted = false;
      }
      if (!tableStarted && lines[i + 1]?.trim().match(/^\|[\s\-:|]+\|$/)) {
        // This is the header row
        html.push('<thead><tr>' + cells.map(c => `<th>${escapeHtml(c)}</th>`).join('') + '</tr></thead><tbody>');
        tableStarted = true;
        continue;
      }
      html.push('<tr>' + cells.map(c => `<td>${formatInline(c)}</td>`).join('') + '</tr>');
      continue;
    }

    // Close table if we were in one
    if (inTable) {
      html.push('</tbody></table>');
      inTable = false;
      tableStarted = false;
    }

    // Empty line
    if (!trimmed) {
      html.push('');
      continue;
    }

    // Headers
    if (trimmed.startsWith('#### ')) {
      html.push(`<h4>${formatInline(trimmed.slice(5))}</h4>`);
      continue;
    }
    if (trimmed.startsWith('### ')) {
      html.push(`<h3>${formatInline(trimmed.slice(4))}</h3>`);
      continue;
    }

    // Horizontal rule
    if (trimmed === '---') {
      html.push('<hr>');
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      html.push(`<blockquote>${formatInline(trimmed.slice(2))}</blockquote>`);
      continue;
    }

    // List items
    if (trimmed.match(/^[-*]\s/)) {
      html.push(`<li>${formatInline(trimmed.slice(2))}</li>`);
      continue;
    }
    if (trimmed.match(/^\d+\.\s/)) {
      html.push(`<li>${formatInline(trimmed.replace(/^\d+\.\s/, ''))}</li>`);
      continue;
    }

    // Regular paragraph
    html.push(`<p>${formatInline(trimmed)}</p>`);
  }

  if (inTable) html.push('</tbody></table>');

  return html.join('\n');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatInline(s: string): string {
  let r = escapeHtml(s);
  // Bold
  r = r.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  r = r.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Inline code
  r = r.replace(/`(.+?)`/g, '<code>$1</code>');
  return r;
}

type PanelMode = 'side' | 'center' | 'full';

function getOverlayStyle(mode: PanelMode): CSSProperties {
  return {
    position: 'fixed',
    inset: 0,
    background: mode === 'full' ? 'var(--bg-primary)' : 'rgba(0,0,0,0.5)',
    zIndex: 1000,
    display: 'flex',
    justifyContent: mode === 'side' ? 'flex-end' : 'center',
    alignItems: mode === 'center' ? 'center' : 'stretch',
  };
}

function getPanelStyle(mode: PanelMode): CSSProperties {
  const base: CSSProperties = {
    background: 'var(--bg-primary)',
    overflowY: 'auto',
    padding: '24px',
  };
  switch (mode) {
    case 'side':
      return { ...base, width: '700px', maxWidth: '90vw', height: '100vh', boxShadow: '-4px 0 20px rgba(0,0,0,0.2)' };
    case 'center':
      return { ...base, width: '900px', maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' };
    case 'full':
      return { ...base, width: '100%', maxWidth: '1000px', height: '100vh', margin: '0 auto' };
  }
}

const topBar: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '4px',
  marginBottom: '16px',
  position: 'sticky',
  top: 0,
  background: 'var(--bg-primary)',
  padding: '8px 0',
  zIndex: 2,
};

const modeBtn: CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '5px 10px',
  cursor: 'pointer',
  fontSize: '12px',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font)',
  transition: 'all var(--transition)',
};

const modeBtnActive: CSSProperties = {
  ...modeBtn,
  borderColor: 'var(--accent-gold)',
  color: 'var(--accent-gold-dark)',
  fontWeight: 700,
};

const closeBtnStyle: CSSProperties = {
  ...modeBtn,
  marginLeft: '8px',
  color: 'var(--text-secondary)',
  fontWeight: 600,
};

const headerStyle: CSSProperties = {
  marginBottom: '24px',
  paddingBottom: '16px',
  borderBottom: '1px solid var(--border)',
};

const titleStyle: CSSProperties = {
  fontSize: '18px',
  fontWeight: 800,
  color: 'var(--text-primary)',
  fontFamily: 'var(--font)',
  marginBottom: '8px',
  lineHeight: '1.3',
};

const metaStyle: CSSProperties = {
  fontSize: '13px',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-body)',
  display: 'flex',
  gap: '16px',
};

const sectionHeader: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 12px',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  cursor: 'pointer',
  marginBottom: '4px',
  fontSize: '13px',
  fontWeight: 700,
  color: 'var(--text-primary)',
  fontFamily: 'var(--font)',
  transition: 'all var(--transition)',
};

const sectionContent: CSSProperties = {
  padding: '12px 16px',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderTop: 'none',
  borderRadius: '0 0 var(--radius) var(--radius)',
  marginBottom: '8px',
  fontSize: '13px',
  lineHeight: '1.6',
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-body)',
  overflowX: 'auto',
};

const mdStyles = `
.ficha-md table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12px; }
.ficha-md th { background: var(--bg-primary); font-weight: 700; text-align: left; padding: 6px 10px; border: 1px solid var(--border); color: var(--text-primary); font-family: var(--font); white-space: nowrap; }
.ficha-md td { padding: 6px 10px; border: 1px solid var(--border); vertical-align: top; }
.ficha-md h3 { font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 16px 0 8px; font-family: var(--font); }
.ficha-md h4 { font-size: 13px; font-weight: 700; color: var(--accent-gold-dark); margin: 12px 0 6px; font-family: var(--font); }
.ficha-md hr { border: none; border-top: 1px solid var(--border); margin: 12px 0; }
.ficha-md p { margin: 4px 0; }
.ficha-md li { margin: 2px 0; padding-left: 4px; }
.ficha-md blockquote { border-left: 3px solid var(--accent-gold); padding-left: 12px; margin: 8px 0; color: var(--text-muted); font-style: italic; }
.ficha-md strong { color: var(--text-primary); }
.ficha-md code { background: var(--bg-primary); padding: 1px 4px; border-radius: 3px; font-size: 12px; }
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

interface SectionGroup {
  emoji: string;
  title: string;
  description: string;
  keys: string[];
}

const SECTION_GROUPS: SectionGroup[] = [
  {
    emoji: '🏗️',
    title: 'Estrutura do Roteiro',
    description: 'O que o vídeo é — esqueleto cronológico',
    keys: ['1', '2', '3', '4', '5', '7'],
  },
  {
    emoji: '🔄',
    title: 'Engajamento e Fluxo',
    description: 'Como o vídeo se move e retém',
    keys: ['6', '5b'],
  },
  {
    emoji: '🎭',
    title: 'Análise Retórica',
    description: 'Como o vídeo persuade — linguagem e estilo',
    keys: ['8', '9', '10'],
  },
];

const groupHeader: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '12px 0 6px',
  marginTop: '16px',
  borderBottom: '2px solid var(--border)',
  marginBottom: '8px',
};

const groupEmoji: CSSProperties = {
  fontSize: '18px',
};

const groupTitle: CSSProperties = {
  fontSize: '14px',
  fontWeight: 800,
  color: 'var(--text-primary)',
  fontFamily: 'var(--font)',
};

const groupDesc: CSSProperties = {
  fontSize: '11px',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-body)',
  marginLeft: '4px',
};

export function FichaDetail() {
  const selectedFicha = useFichaStore((s) => s.selectedFicha);
  const setSelectedFicha = useFichaStore((s) => s.setSelectedFicha);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [panelMode, setPanelMode] = useState<PanelMode>('side');
  const [copied, setCopied] = useState(false);

  const copyAsMarkdown = () => {
    if (!selectedFicha) return;
    const header = `# Ficha de Roteiro — ${selectedFicha.title}\n\n- **ID:** ${selectedFicha.videoId}\n- **Duração:** ${selectedFicha.durationText}\n- **Publicado:** ${selectedFicha.publishedAt}\n\n---\n\n`;
    const sections = Object.entries(selectedFicha.sections)
      .sort(([a], [b]) => parseFloat(a.replace('b', '.5')) - parseFloat(b.replace('b', '.5')))
      .map(([, content]) => content)
      .join('\n\n---\n\n');
    navigator.clipboard.writeText(header + sections).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    setExpanded(new Set());
  }, [selectedFicha?.videoId]);

  if (!selectedFicha) return null;

  const availableKeys = new Set(Object.keys(selectedFicha.sections));

  const toggleSection = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(availableKeys));
  const collapseAll = () => setExpanded(new Set());

  const renderSection = (key: string) => {
    if (!availableKeys.has(key)) return null;
    return (
      <div key={key}>
        <div
          style={{
            ...sectionHeader,
            borderColor: expanded.has(key) ? 'var(--accent-gold)' : 'var(--border)',
          }}
          onClick={() => toggleSection(key)}
        >
          <span>{SECTION_LABELS[key] || `Seção ${key}`}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {expanded.has(key) ? '▼' : '▶'}
          </span>
        </div>
        {expanded.has(key) && (
          <div
            style={sectionContent}
            className="ficha-md"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedFicha.sections[key]) }}
          />
        )}
      </div>
    );
  };

  return (
    <div style={getOverlayStyle(panelMode)} onClick={() => panelMode !== 'full' && setSelectedFicha(null)}>
      <style>{mdStyles}</style>
      <div style={getPanelStyle(panelMode)} onClick={(e) => e.stopPropagation()}>
        <div style={topBar}>
          <button style={panelMode === 'side' ? modeBtnActive : modeBtn} onClick={() => setPanelMode('side')} title="Painel lateral">
            ◧ Lateral
          </button>
          <button style={panelMode === 'center' ? modeBtnActive : modeBtn} onClick={() => setPanelMode('center')} title="Centralizado">
            ⬜ Centro
          </button>
          <button style={panelMode === 'full' ? modeBtnActive : modeBtn} onClick={() => setPanelMode('full')} title="Tela cheia">
            ⛶ Expandir
          </button>
          <button
            style={{ ...modeBtn, color: copied ? 'var(--accent-gold-dark)' : 'var(--text-muted)' }}
            onClick={copyAsMarkdown}
            title="Copiar ficha como Markdown"
          >
            {copied ? '✓ Copiado!' : '📋 Copiar MD'}
          </button>
          <button style={closeBtnStyle} onClick={() => setSelectedFicha(null)}>
            ✕ Fechar
          </button>
        </div>

        <div style={headerStyle}>
          <div style={titleStyle}>{selectedFicha.title}</div>
          <div style={metaStyle}>
            <span>{selectedFicha.videoId}</span>
            <span>{selectedFicha.publishedAt}</span>
            <span>{selectedFicha.durationText}</span>
            <span>{availableKeys.size} seções</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <button
            onClick={expandAll}
            style={{ ...sectionHeader, flex: 1, justifyContent: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--accent-gold-dark)' }}
          >
            Expandir tudo
          </button>
          <button
            onClick={collapseAll}
            style={{ ...sectionHeader, flex: 1, justifyContent: 'center', fontSize: '12px', fontWeight: 600 }}
          >
            Colapsar tudo
          </button>
        </div>

        {SECTION_GROUPS.map((group) => {
          const groupKeysPresent = group.keys.filter((k) => availableKeys.has(k));
          if (groupKeysPresent.length === 0) return null;
          return (
            <div key={group.title}>
              <div style={groupHeader}>
                <span style={groupEmoji}>{group.emoji}</span>
                <span style={groupTitle}>{group.title}</span>
                <span style={groupDesc}>— {group.description}</span>
              </div>
              {groupKeysPresent.map(renderSection)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
