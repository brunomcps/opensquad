import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { BRoll, BRollSource } from '../types/content';
import { useBRollStore } from '../store/useBRollStore';

const SOURCE_LABELS: Record<string, string> = {
  veo: 'Veo (Gemini)', grok: 'Grok (Aurora)', pexels: 'Pexels', pixabay: 'Pixabay',
  filmed: 'Gravado', remotion: 'Remotion', other: 'Outro',
};

const overlay: CSSProperties = {
  position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px',
  background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)',
  boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', zIndex: 1000,
  display: 'flex', flexDirection: 'column', overflowY: 'auto',
};

const closeBtn: CSSProperties = {
  position: 'absolute', top: '12px', right: '12px', background: 'var(--bg-primary)',
  border: '1px solid var(--border)', borderRadius: '50%', width: '32px', height: '32px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', fontSize: '16px', color: 'var(--text-secondary)', zIndex: 2,
};

const videoWrap: CSSProperties = {
  width: '100%', aspectRatio: '16/9', background: '#000', position: 'relative',
};

const videoEl: CSSProperties = { width: '100%', height: '100%', objectFit: 'contain' };

const body: CSSProperties = { padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' };

const sectionTitle: CSSProperties = {
  fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
  color: 'var(--text-muted)', fontFamily: 'var(--font)', marginBottom: '6px',
};

const fieldRow: CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-primary)' };
const fieldLabel: CSSProperties = { color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' };
const fieldValue: CSSProperties = { fontWeight: 600, fontFamily: 'var(--font)' };

const textArea: CSSProperties = {
  width: '100%', padding: '10px 12px', fontSize: '13px', fontFamily: 'var(--font-body)',
  background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  color: 'var(--text-primary)', resize: 'vertical', minHeight: '60px', outline: 'none',
};

const inputStyle: CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: '13px', fontFamily: 'var(--font-body)',
  background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  color: 'var(--text-primary)', outline: 'none',
};

const tagsWrap: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '6px' };

const tagChip: CSSProperties = {
  fontSize: '12px', background: 'var(--bg-primary)', color: 'var(--text-secondary)',
  padding: '3px 10px', borderRadius: '12px', fontFamily: 'var(--font-body)',
  border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '4px',
};

const removeTag: CSSProperties = {
  cursor: 'pointer', fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1,
};

const selectStyle: CSSProperties = {
  ...inputStyle, appearance: 'auto' as any, cursor: 'pointer',
};

const saveBtn: CSSProperties = {
  background: 'var(--accent-gold)', border: 'none', borderRadius: 'var(--radius)',
  color: '#fff', padding: '10px 20px', fontSize: '14px', fontWeight: 700,
  cursor: 'pointer', fontFamily: 'var(--font)', alignSelf: 'flex-end',
};

const usageItem: CSSProperties = {
  padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius)',
  border: '1px solid var(--border)', fontSize: '13px',
};

const promptBox: CSSProperties = {
  ...textArea, background: 'var(--bg-card)', fontStyle: 'italic', fontSize: '12px',
  color: 'var(--text-secondary)', resize: 'none', cursor: 'default',
};

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) return (bytes / 1_000_000).toFixed(1) + ' MB';
  if (bytes >= 1_000) return (bytes / 1_000).toFixed(0) + ' KB';
  return bytes + ' B';
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

interface Props {
  broll: BRoll;
  onClose: () => void;
}

export function BRollDetail({ broll, onClose }: Props) {
  const updateBRoll = useBRollStore((s) => s.updateBRoll);
  const [description, setDescription] = useState(broll.description);
  const [tags, setTags] = useState<string[]>(broll.tags);
  const [source, setSource] = useState<BRollSource>(broll.source);
  const [newTag, setNewTag] = useState('');
  const [saved, setSaved] = useState(false);

  const dirty = description !== broll.description || source !== broll.source
    || JSON.stringify(tags) !== JSON.stringify(broll.tags);

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/brolls/${broll.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, tags, source }),
      });
      if (res.ok) {
        updateBRoll(broll.id, { description, tags, source });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch { /* ignore */ }
  };

  const addTag = () => {
    const t = newTag.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setNewTag('');
    }
  };

  return (
    <div style={overlay}>
      <button style={closeBtn} onClick={onClose}>✕</button>

      <div style={videoWrap}>
        <video src={`/api/brolls/video/${broll.id}`} style={videoEl} controls preload="metadata" />
      </div>

      <div style={body}>
        {/* Metadata */}
        <div>
          <div style={sectionTitle}>Informações</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={fieldRow}><span style={fieldLabel}>ID</span><span style={fieldValue}>{broll.id}</span></div>
            <div style={fieldRow}><span style={fieldLabel}>Arquivo</span><span style={fieldValue}>{broll.filename}</span></div>
            <div style={fieldRow}><span style={fieldLabel}>Duração</span><span style={fieldValue}>{formatDuration(broll.duration)}</span></div>
            <div style={fieldRow}><span style={fieldLabel}>Resolução</span><span style={fieldValue}>{broll.resolution}</span></div>
            <div style={fieldRow}><span style={fieldLabel}>Aspect Ratio</span><span style={fieldValue}>{broll.aspectRatio}</span></div>
            <div style={fieldRow}><span style={fieldLabel}>Tamanho</span><span style={fieldValue}>{formatBytes(broll.fileSize)}</span></div>
            <div style={fieldRow}><span style={fieldLabel}>Criado em</span><span style={fieldValue}>{new Date(broll.createdAt).toLocaleDateString('pt-BR')}</span></div>
          </div>
        </div>

        {/* Description */}
        <div>
          <div style={sectionTitle}>Descrição</div>
          <textarea style={textArea} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {/* Source */}
        <div>
          <div style={sectionTitle}>Fonte</div>
          <select style={selectStyle} value={source} onChange={(e) => setSource(e.target.value as BRollSource)}>
            {Object.entries(SOURCE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div>
          <div style={sectionTitle}>Tags</div>
          <div style={tagsWrap}>
            {tags.map((t) => (
              <span key={t} style={tagChip}>
                {t}
                <span style={removeTag} onClick={() => setTags(tags.filter((x) => x !== t))}>×</span>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Nova tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
            />
            <button style={{ ...saveBtn, padding: '8px 14px', fontSize: '12px' }} onClick={addTag}>+</button>
          </div>
        </div>

        {/* Prompt */}
        {broll.prompt && (
          <div>
            <div style={sectionTitle}>Prompt</div>
            <textarea style={promptBox} value={broll.prompt} readOnly rows={3} />
          </div>
        )}

        {/* Usage */}
        <div>
          <div style={sectionTitle}>Usado em ({broll.usedIn.length} vídeos)</div>
          {broll.usedIn.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Nenhum uso registrado</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {broll.usedIn.map((u, i) => (
                <div key={i} style={usageItem}>
                  <div style={{ fontWeight: 600, fontFamily: 'var(--font)' }}>{u.videoTitle}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Timestamp: {u.timestamp}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save */}
        {dirty && (
          <button style={saveBtn} onClick={handleSave}>
            {saved ? '✓ Salvo' : 'Salvar alterações'}
          </button>
        )}
      </div>
    </div>
  );
}
