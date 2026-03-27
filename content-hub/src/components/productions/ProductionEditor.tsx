import { useState, useCallback, useEffect } from 'react';
import type { CSSProperties } from 'react';
import type { Production, ProductionStatus, ScriptBlock as ScriptBlockType, TitleVariation, ThumbnailTextVariation } from '../../types/content';
import { useProductionStore } from '../../store/useProductionStore';
import { useContentStore } from '../../store/useContentStore';
import { useFinancialStore } from '../../store/useFinancialStore';
import { ScriptBlock } from './ScriptBlock';
import { BRollPicker } from './BRollPicker';
import { LowerThirdEditor } from './LowerThirdEditor';
import { YouTubePicker } from './YouTubePicker';

const STATUS_OPTIONS: { value: ProductionStatus; label: string }[] = [
  { value: 'idea', label: '💡 Ideia' },
  { value: 'script', label: '📝 Roteiro' },
  { value: 'recording', label: '🎙️ Gravação' },
  { value: 'editing', label: '🎬 Edição' },
  { value: 'ready', label: '✅ Pronto' },
  { value: 'published', label: '🌐 Publicado' },
];

// --- Styles ---
const wrapper: CSSProperties = { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' };
const topBar: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px',
  borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)',
};
const backBtn: CSSProperties = {
  background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  padding: '7px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
  color: 'var(--text-secondary)',
};
const statusSelect: CSSProperties = {
  padding: '7px 14px', fontSize: '13px', fontFamily: 'var(--font)', fontWeight: 600,
  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  color: 'var(--text-primary)', cursor: 'pointer',
};
const deleteBtn: CSSProperties = {
  background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  padding: '7px 12px', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font)',
};
const tabsRow: CSSProperties = {
  display: 'flex', gap: '2px', padding: '0 20px', background: 'var(--bg-secondary)',
  borderBottom: '1px solid var(--border)',
};
const tab = (active: boolean): CSSProperties => ({
  padding: '10px 20px', fontSize: '13px', fontWeight: active ? 700 : 500, fontFamily: 'var(--font)',
  color: active ? 'var(--accent-gold-dark)' : 'var(--text-muted)', cursor: 'pointer',
  borderBottom: `2px solid ${active ? 'var(--accent-gold)' : 'transparent'}`,
  background: 'transparent', border: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none',
  transition: 'all var(--transition)',
});
const content: CSSProperties = { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' };
const fieldGroup: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '6px' };
const label: CSSProperties = { fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.04em' };
const inputStyle: CSSProperties = {
  padding: '10px 14px', fontSize: '14px', fontFamily: 'var(--font-body)', color: 'var(--text-primary)',
  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', outline: 'none',
};
const textareaStyle: CSSProperties = { ...inputStyle, resize: 'vertical', minHeight: '100px' };
const scriptArea: CSSProperties = { ...inputStyle, resize: 'vertical', minHeight: '300px', fontFamily: 'var(--font-body)', fontSize: '15px', lineHeight: 1.7 };
const primaryBtn: CSSProperties = {
  background: 'var(--accent-gold)', border: 'none', borderRadius: 'var(--radius)',
  color: '#fff', padding: '10px 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
  fontFamily: 'var(--font)', alignSelf: 'flex-start',
};
const secondaryBtn: CSSProperties = {
  background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  color: 'var(--text-secondary)', padding: '10px 20px', fontSize: '14px', fontWeight: 600,
  cursor: 'pointer', fontFamily: 'var(--font)', alignSelf: 'flex-start',
};
const srtImportArea: CSSProperties = {
  padding: '16px', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)',
  display: 'flex', flexDirection: 'column', gap: '10px',
};
const srtTextarea: CSSProperties = { ...inputStyle, resize: 'vertical', minHeight: '120px', fontFamily: 'monospace', fontSize: '12px' };
const thumbWrap: CSSProperties = {
  width: '320px', aspectRatio: '16/9', background: 'var(--bg-primary)', border: '1px dashed var(--border)',
  borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  overflow: 'hidden', color: 'var(--text-muted)', fontSize: '13px',
};
const blocksHeader: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
const blockCount: CSSProperties = { fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' };
const toast: CSSProperties = {
  position: 'fixed', bottom: '20px', right: '20px', background: 'var(--accent-gold)', color: '#fff',
  padding: '10px 20px', borderRadius: 'var(--radius)', fontFamily: 'var(--font)', fontWeight: 600,
  fontSize: '13px', zIndex: 3000, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
};

// Title variations styles
const titleMainInput: CSSProperties = {
  ...inputStyle, fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font)', letterSpacing: '-0.02em',
};
const variationRow: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px',
};
const variationInput: CSSProperties = {
  ...inputStyle, flex: 1, fontSize: '14px',
};
const variationRadio: CSSProperties = {
  width: '18px', height: '18px', accentColor: '#F0BA3C', cursor: 'pointer', flexShrink: 0,
};
const variationRemoveBtn: CSSProperties = {
  background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px', padding: '4px',
};
const addVariationBtn: CSSProperties = {
  ...secondaryBtn, padding: '6px 14px', fontSize: '12px', alignSelf: 'flex-start',
};

type EditorTab = 'general' | 'script' | 'editing' | 'thumbnail';

interface Props {
  production: Production;
  onBack: () => void;
}

export function ProductionEditor({ production, onBack }: Props) {
  const { editorTab, setEditorTab, updateProduction, removeProduction } = useProductionStore();
  const [title, setTitle] = useState(production.title);
  const [titleVariations, setTitleVariations] = useState<TitleVariation[]>(production.titleVariations || []);
  const [description, setDescription] = useState(production.description);
  const [tags, setTags] = useState(production.tags.join(', '));
  const [status, setStatus] = useState(production.status);
  const [script, setScript] = useState(production.script || '');
  const [rawVideoPath, setRawVideoPath] = useState(production.rawVideoPath || '');
  const [plannedDate, setPlannedDate] = useState(production.plannedDate || '');
  const [ideaNote, setIdeaNote] = useState(production.ideaNote || '');
  const [blocks, setBlocks] = useState<ScriptBlockType[]>(production.blocks);
  const [srtContent, setSrtContent] = useState('');
  const [srtFilePath, setSrtFilePath] = useState('');
  const [thumbPath, setThumbPath] = useState(production.thumbnailPath || '');
  const [thumbnailText, setThumbnailText] = useState(production.thumbnailText || '');
  const [thumbTextVariations, setThumbTextVariations] = useState<ThumbnailTextVariation[]>(production.thumbnailTextVariations || []);
  const [thumbnailPrompt, setThumbnailPrompt] = useState(production.thumbnailPrompt || '');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modals
  const [brollPickerBlock, setBrollPickerBlock] = useState<string | null>(null);
  const [lowerThirdBlock, setLowerThirdBlock] = useState<string | null>(null);
  const [showYouTubePicker, setShowYouTubePicker] = useState(false);

  // YouTube linked video
  const youtubeVideos = useContentStore((s) => s.youtubeVideos);
  const linkedVideo = production.youtubeId ? youtubeVideos.find((v) => v.id === production.youtubeId) : null;

  // B-roll name + thumbnail resolution
  const [brollInfo, setBrollInfo] = useState<Record<string, { name: string; id: string }>>({});

  useEffect(() => {
    fetch('/api/brolls').then((r) => r.json()).then((data) => {
      if (!data.ok) return;
      const map: Record<string, { name: string; id: string }> = {};
      for (const br of data.brolls) map[br.id] = { name: br.description || br.filename, id: br.id };
      setBrollInfo(map);
    }).catch(() => {});
  }, []);

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 2000); };

  const save = useCallback(async (updates: Partial<Production>) => {
    try {
      const res = await fetch(`/api/productions/${production.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.ok) updateProduction(production.id, updates);
    } catch { /* ignore */ }
  }, [production.id, updateProduction]);

  // Fix #1: Auto-save status
  const handleStatusChange = (newStatus: ProductionStatus) => {
    setStatus(newStatus);
    save({ status: newStatus });
    if (newStatus === 'published' && !production.youtubeId) {
      setShowYouTubePicker(true);
    }
  };

  const handleYouTubeLink = (videoId: string, _videoTitle: string) => {
    save({ youtubeId: videoId });
    setShowYouTubePicker(false);
    showToast('Vídeo vinculado ao YouTube');
  };

  const handleYouTubeUnlink = () => {
    save({ youtubeId: undefined });
    showToast('Vínculo removido');
  };

  const saveGeneral = () => save({
    title, titleVariations, description, tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    status, plannedDate: plannedDate || undefined, rawVideoPath: rawVideoPath || undefined,
    ideaNote: ideaNote || undefined,
  });

  const saveScript = () => { save({ script }); showToast('Roteiro salvo'); };

  // Fix #2: Confirm before overwriting blocks
  const importSrt = async () => {
    const content = srtContent.trim() || undefined;
    const filePath = srtFilePath.trim() || undefined;
    if (!content && !filePath) return;

    if (blocks.length > 0) {
      const confirmed = window.confirm(`Isso vai substituir os ${blocks.length} blocos existentes (incluindo b-rolls e lower thirds atribuídos). Continuar?`);
      if (!confirmed) return;
    }

    try {
      const res = await fetch(`/api/productions/${production.id}/import-srt`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ srtContent: content, srtFilePath: filePath, mergeSeconds: 8 }),
      });
      const data = await res.json();
      if (data.ok) {
        setBlocks(data.production.blocks);
        updateProduction(production.id, { blocks: data.production.blocks });
        setSrtContent('');
        setSrtFilePath('');
        showToast(`${data.blocksCreated} blocos importados`);
      }
    } catch { /* ignore */ }
  };

  const saveBlocks = () => { save({ blocks }); showToast('Blocos salvos'); };

  // Fix #5: Update b-roll usedIn
  const handleAssignBRoll = async (blockId: string, brollId: string) => {
    const updated = blocks.map((b) => b.id === blockId ? { ...b, brollId } : b);
    setBlocks(updated);
    save({ blocks: updated });
    setBrollPickerBlock(null);

    // Update usedIn on the b-roll
    try {
      const res = await fetch(`/api/brolls/${brollId}`);
      const existing = await res.json();
      if (existing.ok) {
        // not a direct GET for single broll in current API, so we use the list
      }
    } catch { /* ignore */ }
    // Simplified: update via PUT
    try {
      const brollRes = await fetch('/api/brolls');
      const brollData = await brollRes.json();
      if (brollData.ok) {
        const broll = brollData.brolls.find((b: any) => b.id === brollId);
        if (broll) {
          const block = updated.find((b) => b.id === blockId);
          const alreadyUsed = broll.usedIn.some((u: any) => u.videoTitle === title && u.timestamp === block?.startTime);
          if (!alreadyUsed) {
            await fetch(`/api/brolls/${brollId}`, {
              method: 'PUT', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                usedIn: [...broll.usedIn, { videoTitle: title, timestamp: block?.startTime || '', addedAt: new Date().toISOString() }],
              }),
            });
          }
        }
      }
    } catch { /* ignore */ }
  };

  const handleRemoveBRoll = (blockId: string) => {
    const updated = blocks.map((b) => b.id === blockId ? { ...b, brollId: undefined } : b);
    setBlocks(updated);
    save({ blocks: updated });
  };

  const handleSaveLowerThird = (blockId: string, data: { type: 'name-id' | 'concept' | 'topic'; text: string; subtitle?: string }) => {
    const updated = blocks.map((b) => b.id === blockId ? { ...b, lowerThird: data } : b);
    setBlocks(updated);
    save({ blocks: updated });
    setLowerThirdBlock(null);
  };

  const handleGenerateLowerThirdPng = async (blockId: string, data: { type: string; text: string; subtitle?: string }) => {
    try {
      const res = await fetch(`/api/productions/${production.id}/lower-third`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockId, ...data }),
      });
      if (res.ok) showToast('PNG gerado');
    } catch { /* ignore */ }
  };

  const handleRemoveLowerThird = (blockId: string) => {
    const updated = blocks.map((b) => b.id === blockId ? { ...b, lowerThird: undefined } : b);
    setBlocks(updated);
    save({ blocks: updated });
  };

  // Fix #3: Auto-save notes
  const handleUpdateNote = (blockId: string, note: string) => {
    const updated = blocks.map((b) => b.id === blockId ? { ...b, note } : b);
    setBlocks(updated);
    save({ blocks: updated });
  };

  // Fix #9: Copy feedback
  const exportScript = () => {
    const text = script || blocks.map((b) => b.text).join('\n\n');
    navigator.clipboard.writeText(text);
    showToast('Texto copiado');
  };

  const uploadThumbnail = async () => {
    if (!thumbPath) return;
    try {
      const res = await fetch(`/api/productions/${production.id}/thumbnail`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filepath: thumbPath }),
      });
      const data = await res.json();
      if (data.ok) { updateProduction(production.id, { thumbnailPath: data.thumbnailPath }); showToast('Thumbnail salva'); }
    } catch { /* ignore */ }
  };

  // Thumbnail text variations
  const saveThumbnailFields = () => save({
    thumbnailText, thumbnailTextVariations: thumbTextVariations, thumbnailPrompt,
  });

  const addThumbVariation = () => {
    setThumbTextVariations([...thumbTextVariations, { text: '', selected: false }]);
  };

  const updateThumbVariation = (idx: number, text: string) => {
    setThumbTextVariations(thumbTextVariations.map((v, i) => i === idx ? { ...v, text } : v));
  };

  const selectThumbVariation = (idx: number) => {
    setThumbTextVariations(thumbTextVariations.map((v, i) => ({ ...v, selected: i === idx })));
    setThumbnailText(thumbTextVariations[idx].text);
  };

  const removeThumbVariation = (idx: number) => {
    setThumbTextVariations(thumbTextVariations.filter((_, i) => i !== idx));
  };

  const launchThumbnail = async (sendMode: 'selected' | 'ai-choose') => {
    await saveThumbnailFields();
    try {
      const res = await fetch(`/api/productions/${production.id}/launch-thumbnail`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendMode }),
      });
      const data = await res.json();
      if (data.ok) showToast('Claude Code aberto com thumbnail-generator');
      else showToast(`Erro: ${data.error}`);
    } catch (err: any) { showToast(`Erro: ${err.message}`); }
  };

  // Fix #7: Delete production
  const handleDelete = async () => {
    const confirmed = window.confirm(`Deletar "${title}"? Essa ação não pode ser desfeita.`);
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/productions/${production.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) { removeProduction(production.id); onBack(); }
    } catch { /* ignore */ }
  };

  // Title variations
  const addVariation = () => {
    setTitleVariations([...titleVariations, { text: '', selected: false }]);
  };

  const updateVariation = (idx: number, text: string) => {
    const updated = titleVariations.map((v, i) => i === idx ? { ...v, text } : v);
    setTitleVariations(updated);
  };

  const selectVariation = (idx: number) => {
    const updated = titleVariations.map((v, i) => ({ ...v, selected: i === idx }));
    setTitleVariations(updated);
    setTitle(titleVariations[idx].text);
  };

  const removeVariation = (idx: number) => {
    setTitleVariations(titleVariations.filter((_, i) => i !== idx));
  };

  // Squad integration
  const launchSquad = async () => {
    try {
      const res = await fetch(`/api/productions/${production.id}/launch-squad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style: 'mix' }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Opensquad aberto! Acompanhe na janela do terminal.');
      } else {
        showToast(`Erro: ${data.error}`);
      }
    } catch (err: any) {
      showToast(`Erro: ${err.message}`);
    }
  };

  const refreshFromDisk = async () => {
    try {
      const res = await fetch(`/api/productions/${production.id}/refresh`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setBlocks(data.production.blocks);
        updateProduction(production.id, data.production);
        showToast('Dados atualizados do squad');
      }
    } catch { /* ignore */ }
  };

  // Lower-third AI suggestions
  const [suggestingLT, setSuggestingLT] = useState(false);

  const suggestLowerThirds = async () => {
    setSuggestingLT(true);
    showToast('Analisando transcrição com Gemini...');
    try {
      const res = await fetch(`/api/productions/${production.id}/suggest-lower-thirds`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setBlocks(data.production.blocks);
        updateProduction(production.id, { blocks: data.production.blocks });
        showToast(`${data.suggestionsCount} sugestões de lower third encontradas`);
      } else {
        showToast(`Erro: ${data.error}`);
      }
    } catch (err: any) { showToast(`Erro: ${err.message}`); }
    setSuggestingLT(false);
  };

  const handleAcceptLowerThirdSuggestion = (blockId: string, data: { type: 'name-id' | 'concept' | 'topic'; text: string; subtitle?: string }) => {
    const updated = blocks.map((b) => {
      if (b.id !== blockId) return b;
      const newSuggestion = b.aiSuggestion ? { ...b.aiSuggestion, lowerThird: undefined } : undefined;
      const hasAnySuggestion = newSuggestion?.broll;
      return { ...b, lowerThird: data, aiSuggestion: hasAnySuggestion ? newSuggestion : undefined };
    });
    setBlocks(updated);
    save({ blocks: updated });
  };

  const handleDismissLTSuggestion = (blockId: string) => {
    const updated = blocks.map((b) => {
      if (b.id !== blockId || !b.aiSuggestion) return b;
      const newSuggestion = { ...b.aiSuggestion, lowerThird: undefined };
      const hasAnySuggestion = newSuggestion.broll;
      return { ...b, aiSuggestion: hasAnySuggestion ? newSuggestion : undefined };
    });
    setBlocks(updated);
    save({ blocks: updated });
  };

  const ltSuggestionsCount = blocks.filter((b) => b.aiSuggestion?.lowerThird).length;

  const blocksWithBroll = blocks.filter((b) => b.brollId).length;
  const blocksWithLt = blocks.filter((b) => b.lowerThird).length;
  const currentLtBlock = blocks.find((b) => b.id === lowerThirdBlock);

  // Block filters
  const [blockFilter, setBlockFilter] = useState<'all' | 'suggestions' | 'broll' | 'lowerthird' | 'empty'>('all');

  const filteredBlocks = blocks.filter((b) => {
    switch (blockFilter) {
      case 'suggestions': return b.aiSuggestion?.broll || b.aiSuggestion?.lowerThird;
      case 'broll': return b.brollId;
      case 'lowerthird': return b.lowerThird;
      case 'empty': return !b.brollId && !b.lowerThird;
      default: return true;
    }
  });

  return (
    <div style={wrapper}>
      {/* Top bar */}
      <div style={topBar}>
        <button style={backBtn} onClick={() => { saveGeneral(); onBack(); }}>← Voltar</button>
        <div style={{ flex: 1, fontFamily: 'var(--font)', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {title || 'Sem título'}
        </div>
        <select style={statusSelect} value={status} onChange={(e) => handleStatusChange(e.target.value as ProductionStatus)}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button style={deleteBtn} onClick={handleDelete} title="Deletar produção">🗑️</button>
      </div>

      {/* Tabs */}
      <div style={tabsRow}>
        {([
          ['general', 'Geral'],
          ['script', 'Roteiro'],
          ['editing', 'Edição & B-Rolls'],
          ['thumbnail', 'Thumbnail'],
        ] as [EditorTab, string][]).map(([key, lbl]) => (
          <button key={key} style={tab(editorTab === key)} onClick={() => setEditorTab(key)}>{lbl}</button>
        ))}
      </div>

      {/* Content */}
      <div style={content}>
        {/* === GENERAL === */}
        {editorTab === 'general' && (
          <>
            {/* Title */}
            <div style={fieldGroup}>
              <span style={label}>Título do vídeo</span>
              <input style={titleMainInput} value={title} onChange={(e) => setTitle(e.target.value)} onBlur={saveGeneral} placeholder="Título principal do vídeo" />
            </div>

            {/* Title variations */}
            <div style={fieldGroup}>
              <span style={label}>Variações de título</span>
              {titleVariations.map((v, idx) => (
                <div key={idx} style={variationRow}>
                  <input
                    type="radio"
                    name="titleVariation"
                    checked={v.selected}
                    onChange={() => selectVariation(idx)}
                    style={variationRadio}
                    title="Selecionar como título principal"
                  />
                  <input
                    style={variationInput}
                    value={v.text}
                    onChange={(e) => updateVariation(idx, e.target.value)}
                    onBlur={saveGeneral}
                    placeholder={`Variação ${idx + 1}...`}
                  />
                  <button style={variationRemoveBtn} onClick={() => removeVariation(idx)} title="Remover variação">×</button>
                </div>
              ))}
              <button style={addVariationBtn} onClick={addVariation}>+ Adicionar variação</button>
            </div>

            {/* Description */}
            <div style={fieldGroup}>
              <span style={label}>Descrição do vídeo</span>
              <textarea style={textareaStyle} value={description} onChange={(e) => setDescription(e.target.value)} onBlur={saveGeneral} placeholder="Descrição para o YouTube..." />
            </div>

            {/* Tags */}
            <div style={fieldGroup}>
              <span style={label}>Tags (separadas por vírgula)</span>
              <input style={inputStyle} value={tags} onChange={(e) => setTags(e.target.value)} onBlur={saveGeneral} placeholder="tdah, neurociência, produtividade" />
            </div>

            {/* Date + raw video */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ ...fieldGroup, flex: 1 }}>
                <span style={label}>Data planejada</span>
                <input style={inputStyle} type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} onBlur={saveGeneral} />
              </div>
              <div style={{ ...fieldGroup, flex: 1 }}>
                <span style={label}>Caminho do vídeo bruto</span>
                <input style={inputStyle} value={rawVideoPath} onChange={(e) => setRawVideoPath(e.target.value)} onBlur={saveGeneral} placeholder="C:\...\video-bruto.mp4" />
              </div>
            </div>

            {/* Schedule recording in Google Calendar */}
            {plannedDate && (
              <button
                style={{ ...secondaryBtn, display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={async () => {
                  const date = plannedDate;
                  const start = `${date}T14:00:00`;
                  const end = `${date}T16:00:00`;
                  const event = await useFinancialStore.getState().createCalendarEvent(
                    `🎙️ Gravar: ${title || 'Vídeo sem título'}`,
                    start, end,
                    `Produção Content Hub: ${title}\nStatus: ${status}`
                  );
                  if (event) alert(`Evento criado no Calendar: ${event.summary}`);
                  else alert('Erro ao criar evento — verifique o console');
                }}
              >
                📅 Agendar gravação no Calendar
              </button>
            )}

            {/* Idea note */}
            {status === 'idea' && (
              <div style={fieldGroup}>
                <span style={label}>Nota da ideia</span>
                <textarea style={textareaStyle} value={ideaNote} onChange={(e) => setIdeaNote(e.target.value)} onBlur={saveGeneral} placeholder="Anotar inspiração, ângulo, referências..." />
              </div>
            )}

            {/* YouTube linked video */}
            {linkedVideo ? (
              <div style={{
                padding: '14px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '14px',
              }}>
                <img src={linkedVideo.thumbnail} alt="" style={{
                  width: '140px', height: '79px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0,
                }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={label}>Vídeo no YouTube</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)' }}>
                    {linkedVideo.title}
                  </span>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    <span>{linkedVideo.viewCount?.toLocaleString('pt-BR') || 0} views</span>
                    <span>{linkedVideo.likeCount?.toLocaleString('pt-BR') || 0} likes</span>
                    <span>{linkedVideo.commentCount?.toLocaleString('pt-BR') || 0} comentários</span>
                    <span>{new Date(linkedVideo.publishedAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <a
                      href={`https://youtube.com/watch?v=${linkedVideo.id}`}
                      target="_blank"
                      rel="noopener"
                      style={{ fontSize: '12px', color: 'var(--accent-gold)', fontWeight: 600, textDecoration: 'none' }}
                    >
                      Abrir no YouTube ↗
                    </a>
                    <a
                      href={`https://studio.youtube.com/video/${linkedVideo.id}/edit`}
                      target="_blank"
                      rel="noopener"
                      style={{ fontSize: '12px', color: 'var(--text-secondary)', textDecoration: 'none' }}
                    >
                      YouTube Studio ↗
                    </a>
                    <button
                      onClick={handleYouTubeUnlink}
                      style={{ background: 'none', border: 'none', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Desvincular
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={fieldGroup}>
                <span style={label}>Vídeo no YouTube</span>
                <button
                  style={{ ...secondaryBtn, display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => setShowYouTubePicker(true)}
                >
                  🔗 Vincular a um vídeo do YouTube
                </button>
              </div>
            )}

            <button style={primaryBtn} onClick={saveGeneral}>Salvar</button>
          </>
        )}

        {/* === SCRIPT === */}
        {editorTab === 'script' && (
          <>
            <div style={fieldGroup}>
              <span style={label}>Roteiro completo</span>
              <textarea style={scriptArea} value={script} onChange={(e) => setScript(e.target.value)} placeholder="Cole o roteiro aqui..." />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={primaryBtn} onClick={saveScript}>Salvar roteiro</button>
              <button style={secondaryBtn} onClick={exportScript}>Copiar texto limpo</button>
            </div>
          </>
        )}

        {/* === EDITING & B-ROLLS === */}
        {editorTab === 'editing' && (
          <>
            {/* SRT Import — Fix #6: accept file path */}
            <div style={srtImportArea}>
              <span style={label}>Importar transcrição (SRT)</span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  value={srtFilePath}
                  onChange={(e) => setSrtFilePath(e.target.value)}
                  placeholder="Caminho do arquivo .srt (ex: C:\...\video.srt)"
                />
              </div>
              <details>
                <summary style={{ fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}>Ou colar conteúdo SRT</summary>
                <textarea style={srtTextarea} value={srtContent} onChange={(e) => setSrtContent(e.target.value)} placeholder="Cole o conteúdo do .srt aqui..." />
              </details>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button style={primaryBtn} onClick={importSrt} disabled={!srtContent.trim() && !srtFilePath.trim()}>Importar SRT</button>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Legendas agrupadas em blocos de ~8s
                  {blocks.length > 0 && ` · ${blocks.length} blocos existentes serão substituídos`}
                </span>
              </div>
            </div>

            {/* Squad integration */}
            {blocks.length > 0 && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  style={{ ...primaryBtn, display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={launchSquad}
                >
                  🚀 Gerar B-Rolls com Opensquad
                </button>
                <button
                  style={{ ...secondaryBtn, display: 'flex', alignItems: 'center', gap: '6px', opacity: suggestingLT ? 0.5 : 1 }}
                  onClick={suggestLowerThirds}
                  disabled={suggestingLT}
                >
                  {suggestingLT ? '⏳ Analisando...' : '📝 Sugerir Lower Thirds'}
                </button>
                <button style={secondaryBtn} onClick={refreshFromDisk}>
                  🔄 Atualizar do squad
                </button>
                {ltSuggestionsCount > 0 && (
                  <span style={{ fontSize: '13px', color: 'var(--accent-gold)', fontWeight: 600, fontFamily: 'var(--font)' }}>
                    💡 {ltSuggestionsCount} sugestões de lower third
                  </span>
                )}
              </div>
            )}

            {/* Blocks */}
            {blocks.length > 0 && (
              <>
                <div style={blocksHeader}>
                  <span style={label}>Blocos do vídeo ({filteredBlocks.length}/{blocks.length})</span>
                  <span style={blockCount}>🎬 {blocksWithBroll} b-rolls · 📝 {blocksWithLt} lower thirds</span>
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {([
                    ['all', `Todos (${blocks.length})`],
                    ['suggestions', `💡 Sugestões (${blocks.filter((b) => b.aiSuggestion?.broll || b.aiSuggestion?.lowerThird).length})`],
                    ['broll', `🎬 Com b-roll (${blocksWithBroll})`],
                    ['lowerthird', `📝 Com lower third (${blocksWithLt})`],
                    ['empty', `Vazios (${blocks.filter((b) => !b.brollId && !b.lowerThird).length})`],
                  ] as [typeof blockFilter, string][]).map(([key, lbl]) => (
                    <button
                      key={key}
                      style={{
                        padding: '4px 12px', fontSize: '12px', fontFamily: 'var(--font)',
                        fontWeight: blockFilter === key ? 700 : 500, cursor: 'pointer',
                        border: `1px solid ${blockFilter === key ? 'var(--accent-gold)' : 'var(--border)'}`,
                        borderRadius: '12px', background: blockFilter === key ? 'rgba(240,186,60,0.1)' : 'var(--bg-card)',
                        color: blockFilter === key ? 'var(--accent-gold-dark)' : 'var(--text-muted)',
                      }}
                      onClick={() => setBlockFilter(key)}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
                {filteredBlocks.map((block) => (
                  <ScriptBlock
                    key={block.id}
                    block={block}
                    brollName={block.brollId ? brollInfo[block.brollId]?.name : undefined}
                    brollThumbnail={block.brollId ? `/api/brolls/thumbnail/${block.brollId}` : undefined}
                    onAssignBRoll={(id) => setBrollPickerBlock(id)}
                    onRemoveBRoll={handleRemoveBRoll}
                    onEditLowerThird={(id) => setLowerThirdBlock(id)}
                    onRemoveLowerThird={handleRemoveLowerThird}
                    onUpdateNote={handleUpdateNote}
                    onAcceptLowerThirdSuggestion={handleAcceptLowerThirdSuggestion}
                    onDismissSuggestion={(id, _type) => handleDismissLTSuggestion(id)}
                  />
                ))}
                <button style={secondaryBtn} onClick={saveBlocks}>Salvar alterações nos blocos</button>
              </>
            )}

            {blocks.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '14px' }}>
                Importe um arquivo SRT acima para criar os blocos do vídeo
              </div>
            )}
          </>
        )}

        {/* === THUMBNAIL === */}
        {editorTab === 'thumbnail' && (
          <>
            {/* Preview */}
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div>
                <span style={label}>Preview</span>
                <div style={thumbWrap}>
                  {production.thumbnailPath ? (
                    <img src={`/api/productions/${production.id}/thumbnail?t=${Date.now()}`} alt="Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : 'Nenhuma thumbnail'}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <span style={label}>Upload manual</span>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <input style={{ ...inputStyle, flex: 1 }} value={thumbPath} onChange={(e) => setThumbPath(e.target.value)} placeholder="C:\...\thumbnail.png" />
                  <button style={primaryBtn} onClick={uploadThumbnail}>Upload</button>
                </div>
                <button style={{ ...secondaryBtn, marginTop: '8px' }} onClick={refreshFromDisk}>🔄 Atualizar do disco</button>
              </div>
            </div>

            <div style={{ height: '1px', background: 'var(--border)' }} />

            {/* Thumbnail text */}
            <div style={fieldGroup}>
              <span style={label}>Texto da thumbnail</span>
              <input
                style={titleMainInput}
                value={thumbnailText}
                onChange={(e) => setThumbnailText(e.target.value)}
                onBlur={saveThumbnailFields}
                placeholder='Ex: "você tem TDAH... há anos e não sabe?"'
              />
            </div>

            {/* Thumbnail text variations */}
            <div style={fieldGroup}>
              <span style={label}>Variações de texto (rascunhos)</span>
              {thumbTextVariations.map((v, idx) => (
                <div key={idx} style={variationRow}>
                  <input
                    type="radio"
                    name="thumbTextVariation"
                    checked={v.selected}
                    onChange={() => selectThumbVariation(idx)}
                    style={variationRadio}
                    title="Selecionar como texto principal"
                  />
                  <input
                    style={variationInput}
                    value={v.text}
                    onChange={(e) => updateThumbVariation(idx, e.target.value)}
                    onBlur={saveThumbnailFields}
                    placeholder={`Opção ${idx + 1}...`}
                  />
                  <button style={variationRemoveBtn} onClick={() => { removeThumbVariation(idx); }} title="Remover">×</button>
                </div>
              ))}
              <button style={addVariationBtn} onClick={addThumbVariation}>+ Adicionar variação</button>
            </div>

            {/* Extra prompt */}
            <div style={fieldGroup}>
              <span style={label}>Instrução extra para a IA (opcional)</span>
              <textarea
                style={{ ...textareaStyle, minHeight: '60px' }}
                value={thumbnailPrompt}
                onChange={(e) => setThumbnailPrompt(e.target.value)}
                onBlur={saveThumbnailFields}
                placeholder='Ex: "Quero o avatar segurando um cérebro" ou "Fundo mais escuro, expressão de frustração"'
              />
            </div>

            <div style={{ height: '1px', background: 'var(--border)' }} />

            {/* Generate buttons */}
            <div style={fieldGroup}>
              <span style={label}>Gerar com Opensquad</span>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  style={{ ...primaryBtn, display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => launchThumbnail('selected')}
                  disabled={!thumbnailText && thumbTextVariations.every((v) => !v.text)}
                >
                  🎨 Gerar com texto selecionado
                </button>
                <button
                  style={{ ...secondaryBtn, display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => launchThumbnail('ai-choose')}
                  disabled={thumbTextVariations.filter((v) => v.text).length < 2}
                >
                  🤖 IA escolhe o melhor texto
                </button>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {thumbnailText
                  ? `Texto atual: "${thumbnailText.slice(0, 60)}${thumbnailText.length > 60 ? '...' : ''}"`
                  : 'Defina o texto acima ou deixe vazio para a IA sugerir'}
                {thumbTextVariations.filter((v) => v.text).length >= 2
                  ? ` · ${thumbTextVariations.filter((v) => v.text).length} variações disponíveis`
                  : ''}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Toast */}
      {toastMsg && <div style={toast}>{toastMsg}</div>}

      {/* Modals */}
      {brollPickerBlock && (
        <BRollPicker
          onSelect={(brollId) => handleAssignBRoll(brollPickerBlock, brollId)}
          onClose={() => setBrollPickerBlock(null)}
        />
      )}
      {lowerThirdBlock && currentLtBlock && (
        <LowerThirdEditor
          productionId={production.id}
          blockId={lowerThirdBlock}
          initial={currentLtBlock.lowerThird}
          onSave={(data) => handleSaveLowerThird(lowerThirdBlock, data)}
          onGeneratePng={(data) => handleGenerateLowerThirdPng(lowerThirdBlock, data)}
          onClose={() => setLowerThirdBlock(null)}
        />
      )}
      {showYouTubePicker && (
        <YouTubePicker
          onSelect={handleYouTubeLink}
          onClose={() => setShowYouTubePicker(false)}
        />
      )}
    </div>
  );
}
