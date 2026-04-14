import { useState, useRef, useEffect } from 'react';
import type { CSSProperties } from 'react';

type LowerThirdType = 'name-id' | 'concept' | 'topic';

interface LowerThirdEditorProps {
  productionId: string;
  blockId: string;
  initial?: {
    type: LowerThirdType;
    text: string;
    subtitle?: string;
  };
  onSave: (data: { type: LowerThirdType; text: string; subtitle?: string }) => void;
  onGeneratePng: (data: { type: string; text: string; subtitle?: string }) => void;
  onClose: () => void;
}

/* ---------- styles ---------- */

const backdrop: CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const dialog: CSSProperties = {
  position: 'relative',
  background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
  padding: '20px', width: '90vw', maxWidth: '1200px', height: '85vh',
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '12px',
  overflow: 'hidden',
};

const closeBtn: CSSProperties = {
  position: 'absolute', top: '12px', right: '12px', background: 'var(--bg-primary)',
  border: '1px solid var(--border)', borderRadius: '50%', width: '32px', height: '32px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', fontSize: '16px', color: 'var(--text-secondary)', zIndex: 10,
};

const headerRow: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
  flexShrink: 0,
};

const titleStyle: CSSProperties = {
  fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font)',
};

const tabRow: CSSProperties = {
  display: 'flex', gap: '2px', background: 'var(--bg-primary)', borderRadius: 'var(--radius)',
  padding: '3px', flexShrink: 0,
};

const tabBtn = (active: boolean): CSSProperties => ({
  flex: 1, background: active ? 'var(--bg-secondary)' : 'transparent',
  border: 'none', borderRadius: '6px', padding: '8px', fontSize: '13px',
  fontWeight: active ? 700 : 500, color: active ? '#F0BA3C' : 'var(--text-muted)',
  cursor: 'pointer', fontFamily: 'var(--font)', boxShadow: active ? 'var(--shadow-sm)' : 'none',
});

const iframeWrap: CSSProperties = {
  flex: 1, borderRadius: 'var(--radius)', overflow: 'hidden',
  border: '1px solid var(--border)',
};

const btnRow: CSSProperties = {
  display: 'flex', gap: '10px', justifyContent: 'flex-end', flexShrink: 0,
};

const primaryBtn: CSSProperties = {
  background: '#F0BA3C', border: 'none', borderRadius: 'var(--radius)',
  color: '#fff', padding: '10px 20px', fontSize: '14px', fontWeight: 700,
  cursor: 'pointer', fontFamily: 'var(--font)',
};

const infoText: CSSProperties = {
  fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)',
  flex: 1,
};

/* ---------- component ---------- */

export function LowerThirdEditor({
  initial,
  onSave,
  onClose,
}: LowerThirdEditorProps) {
  const [type, setType] = useState<LowerThirdType>(initial?.type ?? 'name-id');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Map type to tab name in the HTML template
  const TAB_MAP: Record<LowerThirdType, string> = {
    'name-id': 'name-id',
    'concept': 'concept',
    'topic': 'topic',
  };

  // Set initial text values in the iframe when it loads
  useEffect(() => {
    if (!iframeLoaded || !iframeRef.current?.contentWindow) return;

    const doc = iframeRef.current.contentWindow.document;

    // Click the right tab
    const tabId = TAB_MAP[type];
    const tabs = doc.querySelectorAll('.tab');
    tabs.forEach((tab: any) => {
      if (tab.dataset.tab === tabId) tab.click();
    });

    // Set initial text values
    if (initial) {
      setTimeout(() => {
        try {
          const win = iframeRef.current?.contentWindow as any;
          if (!win) return;

          switch (initial.type) {
            case 'name-id': {
              const nameInput = doc.getElementById('nameInput') as HTMLInputElement;
              const titleInput = doc.getElementById('titleInput') as HTMLInputElement;
              if (nameInput) nameInput.value = initial.text || 'Dr. Bruno Salles';
              if (titleInput) titleInput.value = initial.subtitle || 'Psicólogo | Neurocientista | PhD';
              break;
            }
            case 'concept': {
              const conceptInput = doc.getElementById('conceptInput') as HTMLInputElement;
              if (conceptInput) conceptInput.value = initial.text || 'DOPAMINA';
              break;
            }
            case 'topic': {
              const labelInput = doc.getElementById('topicLabel') as HTMLInputElement;
              const titleInput = doc.getElementById('topicTitle') as HTMLInputElement;
              if (labelInput) labelInput.value = initial.subtitle || '';
              if (titleInput) titleInput.value = initial.text || '';
              break;
            }
          }

          // Trigger render
          if (win.render) win.render();
        } catch { /* cross-origin safety */ }
      }, 200);
    }
  }, [iframeLoaded, type]);

  const handleTypeChange = (newType: LowerThirdType) => {
    setType(newType);

    // Click tab in iframe
    if (iframeRef.current?.contentWindow) {
      try {
        const doc = iframeRef.current.contentWindow.document;
        const tabs = doc.querySelectorAll('.tab');
        const tabId = TAB_MAP[newType];
        tabs.forEach((tab: any) => {
          if (tab.dataset.tab === tabId) tab.click();
        });
      } catch { /* ignore */ }
    }
  };

  const handleSave = () => {
    // Read current values from iframe
    let text = initial?.text || '';
    let subtitle = initial?.subtitle;

    try {
      const doc = iframeRef.current?.contentWindow?.document;
      if (doc) {
        switch (type) {
          case 'name-id': {
            text = (doc.getElementById('nameInput') as HTMLInputElement)?.value || 'Dr. Bruno Salles';
            subtitle = (doc.getElementById('titleInput') as HTMLInputElement)?.value || '';
            break;
          }
          case 'concept': {
            text = (doc.getElementById('conceptInput') as HTMLInputElement)?.value || '';
            break;
          }
          case 'topic': {
            text = (doc.getElementById('topicTitle') as HTMLInputElement)?.value || '';
            subtitle = (doc.getElementById('topicLabel') as HTMLInputElement)?.value || '';
            break;
          }
        }
      }
    } catch { /* ignore */ }

    onSave({ type, text, subtitle });
  };

  // Resolve the HTML template path — served from project root via vite proxy or direct
  const templateUrl = '/api/productions/lower-third-template';

  return (
    <div style={backdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={dialog}>
        <button style={closeBtn} onClick={onClose}>✕</button>

        <div style={headerRow}>
          <span style={titleStyle}>Lower Third Generator</span>
        </div>

        {/* Type tabs — synced with iframe */}
        <div style={tabRow}>
          <button style={tabBtn(type === 'name-id')} onClick={() => handleTypeChange('name-id')}>
            Name ID
          </button>
          <button style={tabBtn(type === 'concept')} onClick={() => handleTypeChange('concept')}>
            Concept
          </button>
          <button style={tabBtn(type === 'topic')} onClick={() => handleTypeChange('topic')}>
            Topic
          </button>
        </div>

        {/* Iframe with the full HTML template */}
        <div style={iframeWrap}>
          <iframe
            ref={iframeRef}
            src={templateUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
            onLoad={() => setIframeLoaded(true)}
          />
        </div>

        {/* Actions */}
        <div style={btnRow}>
          <span style={infoText}>
            Use os controles acima para personalizar e baixar o PNG. Clique "Salvar" para registrar o tipo e texto no bloco.
          </span>
          <button style={primaryBtn} onClick={handleSave}>
            Salvar no bloco
          </button>
        </div>
      </div>
    </div>
  );
}
