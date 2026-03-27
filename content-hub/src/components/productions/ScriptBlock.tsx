import { useState } from 'react';
import type { CSSProperties } from 'react';

const brollThumb: CSSProperties = {
  width: '48px', height: '27px', borderRadius: '3px', objectFit: 'cover', flexShrink: 0,
  border: '1px solid var(--border)',
};

const suggestionRow: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px',
  fontFamily: 'var(--font-body)', color: 'var(--accent-gold-dark)',
  background: 'rgba(240,186,60,0.08)', padding: '6px 10px', borderRadius: '6px',
  marginLeft: '28px',
};
const suggestionIcon: CSSProperties = { fontSize: '13px', flexShrink: 0 };
const suggestionText: CSSProperties = { flex: 1, fontSize: '12px' };
const acceptBtn: CSSProperties = {
  background: 'var(--accent-gold)', border: 'none', borderRadius: '4px',
  color: '#fff', padding: '2px 10px', fontSize: '11px', fontWeight: 700,
  cursor: 'pointer', fontFamily: 'var(--font)',
};
const dismissBtn: CSSProperties = {
  background: 'none', border: '1px solid var(--border)', borderRadius: '4px',
  color: 'var(--text-muted)', padding: '2px 6px', fontSize: '11px',
  cursor: 'pointer', fontFamily: 'var(--font)',
};

interface ScriptBlockProps {
  block: {
    id: string;
    text: string;
    startTime: string;
    endTime: string;
    brollId?: string;
    lowerThird?: {
      type: 'name-id' | 'concept' | 'topic';
      text: string;
      subtitle?: string;
      pngPath?: string;
    };
    note?: string;
    aiSuggestion?: {
      broll?: { brollId: string | null; newConcept: string | null; reason: string };
      lowerThird?: { type: 'name-id' | 'concept' | 'topic'; text: string; subtitle?: string; reason: string };
    };
  };
  brollName?: string;
  brollThumbnail?: string;
  onAssignBRoll: (blockId: string) => void;
  onRemoveBRoll: (blockId: string) => void;
  onEditLowerThird: (blockId: string) => void;
  onRemoveLowerThird: (blockId: string) => void;
  onUpdateNote: (blockId: string, note: string) => void;
  onAcceptBRollSuggestion?: (blockId: string, brollId: string) => void;
  onAcceptLowerThirdSuggestion?: (blockId: string, data: { type: 'name-id' | 'concept' | 'topic'; text: string; subtitle?: string }) => void;
  onDismissSuggestion?: (blockId: string, type: 'broll' | 'lowerThird') => void;
}

const LOWER_THIRD_LABELS: Record<string, string> = {
  'name-id': 'Nome/ID',
  concept: 'Conceito',
  topic: 'Tema',
};

/* ---------- styles ---------- */

const card: CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '14px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  transition: 'all var(--transition)',
  boxShadow: 'var(--shadow-sm)',
};

const timestampBadge: CSSProperties = {
  fontSize: '11px',
  fontFamily: 'var(--font)',
  fontVariantNumeric: 'tabular-nums',
  color: 'var(--text-muted)',
  letterSpacing: '0.02em',
};

const transcriptText: CSSProperties = {
  fontSize: '14px',
  lineHeight: 1.55,
  fontFamily: 'var(--font-body)',
  color: 'var(--text-primary)',
};

const assignmentRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '12px',
  fontFamily: 'var(--font-body)',
  color: 'var(--text-secondary)',
  minHeight: '28px',
};

const assignmentIcon: CSSProperties = {
  fontSize: '14px',
  flexShrink: 0,
  width: '20px',
  textAlign: 'center',
};

const assignedName: CSSProperties = {
  color: 'var(--accent-gold)',
  fontWeight: 600,
  fontFamily: 'var(--font)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const mutedLabel: CSSProperties = {
  color: 'var(--text-muted)',
  fontStyle: 'italic',
};

const smallBtn: CSSProperties = {
  background: 'none',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  padding: '2px 8px',
  fontSize: '11px',
  fontFamily: 'var(--font)',
  fontWeight: 500,
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  transition: 'all var(--transition)',
  whiteSpace: 'nowrap',
};

const smallBtnAccent: CSSProperties = {
  ...smallBtn,
  borderColor: 'var(--accent-gold)',
  color: 'var(--accent-gold)',
};

const removeBtn: CSSProperties = {
  ...smallBtn,
  color: 'var(--text-muted)',
};

const noteInput: CSSProperties = {
  width: '100%',
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  padding: '4px 8px',
  fontSize: '12px',
  fontFamily: 'var(--font-body)',
  color: 'var(--text-primary)',
  outline: 'none',
  transition: 'border-color var(--transition)',
};

const ltTypeBadge: CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  fontFamily: 'var(--font)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  background: 'var(--bg-primary)',
  color: 'var(--accent-gold)',
  padding: '1px 6px',
  borderRadius: '3px',
};

/* ---------- component ---------- */

export function ScriptBlock({
  block,
  brollName,
  brollThumbnail,
  onAssignBRoll,
  onRemoveBRoll,
  onEditLowerThird,
  onRemoveLowerThird,
  onUpdateNote,
  onAcceptBRollSuggestion,
  onAcceptLowerThirdSuggestion,
  onDismissSuggestion,
}: ScriptBlockProps) {
  const [hovering, setHovering] = useState(false);
  const [noteDraft, setNoteDraft] = useState(block.note ?? '');

  const hasBRoll = !!block.brollId;
  const hasLT = !!block.lowerThird;
  const showNote = hovering || !!noteDraft;

  const handleNoteBlur = () => {
    if (noteDraft !== (block.note ?? '')) {
      onUpdateNote(block.id, noteDraft);
    }
  };

  return (
    <div
      style={{
        ...card,
        borderColor: hovering ? 'var(--accent-gold)' : 'var(--border)',
        boxShadow: hovering ? 'var(--shadow-gold)' : 'var(--shadow-sm)',
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Timestamp */}
      <span style={timestampBadge}>
        [{block.startTime} — {block.endTime}]
      </span>

      {/* Transcript text */}
      <div style={transcriptText}>{block.text}</div>

      {/* B-Roll row */}
      <div style={assignmentRow}>
        <span style={assignmentIcon}>🎬</span>
        {hasBRoll ? (
          <>
            {brollThumbnail && <img src={brollThumbnail} alt="" style={brollThumb} />}
            <span style={assignedName}>{brollName || block.brollId}</span>
            <button
              style={smallBtnAccent}
              onClick={() => onAssignBRoll(block.id)}
            >
              Trocar
            </button>
            <button
              style={removeBtn}
              onClick={() => onRemoveBRoll(block.id)}
            >
              Remover
            </button>
          </>
        ) : (
          <>
            <span style={mutedLabel}>Nenhum b-roll</span>
            <button
              style={smallBtnAccent}
              onClick={() => onAssignBRoll(block.id)}
            >
              Adicionar
            </button>
          </>
        )}
      </div>

      {/* Lower Third row */}
      <div style={assignmentRow}>
        <span style={assignmentIcon}>📝</span>
        {hasLT ? (
          <>
            <span style={ltTypeBadge}>
              {LOWER_THIRD_LABELS[block.lowerThird!.type] ?? block.lowerThird!.type}
            </span>
            <span style={assignedName}>{block.lowerThird!.text}</span>
            <button
              style={smallBtnAccent}
              onClick={() => onEditLowerThird(block.id)}
            >
              Editar
            </button>
            <button
              style={removeBtn}
              onClick={() => onRemoveLowerThird(block.id)}
            >
              Remover
            </button>
          </>
        ) : (
          <>
            <span style={mutedLabel}>Nenhum lower third</span>
            <button
              style={smallBtnAccent}
              onClick={() => onEditLowerThird(block.id)}
            >
              Adicionar
            </button>
          </>
        )}
      </div>

      {/* AI B-Roll suggestion */}
      {block.aiSuggestion?.broll && !block.brollId && (
        <div style={suggestionRow}>
          <span style={suggestionIcon}>💡</span>
          <span style={suggestionText}>
            {block.aiSuggestion.broll.brollId
              ? `Usar ${block.aiSuggestion.broll.brollId}`
              : `Gerar: ${block.aiSuggestion.broll.newConcept}`}
            {' — '}{block.aiSuggestion.broll.reason}
          </span>
          {block.aiSuggestion.broll.brollId && onAcceptBRollSuggestion && (
            <button style={acceptBtn} onClick={() => onAcceptBRollSuggestion(block.id, block.aiSuggestion!.broll!.brollId!)}>
              Aceitar
            </button>
          )}
          {onDismissSuggestion && (
            <button style={dismissBtn} onClick={() => onDismissSuggestion(block.id, 'broll')}>✕</button>
          )}
        </div>
      )}

      {/* AI Lower Third suggestion */}
      {block.aiSuggestion?.lowerThird && !block.lowerThird && (
        <div style={suggestionRow}>
          <span style={suggestionIcon}>💡</span>
          <span style={suggestionText}>
            {block.aiSuggestion.lowerThird.type}: "{block.aiSuggestion.lowerThird.text}"
            {' — '}{block.aiSuggestion.lowerThird.reason}
          </span>
          {onAcceptLowerThirdSuggestion && (
            <button style={acceptBtn} onClick={() => {
              const lt = block.aiSuggestion!.lowerThird!;
              onAcceptLowerThirdSuggestion(block.id, { type: lt.type, text: lt.text, subtitle: lt.subtitle });
            }}>
              Aceitar
            </button>
          )}
          {onDismissSuggestion && (
            <button style={dismissBtn} onClick={() => onDismissSuggestion(block.id, 'lowerThird')}>✕</button>
          )}
        </div>
      )}

      {/* Note field — visible on hover or when populated */}
      {showNote && (
        <input
          type="text"
          placeholder="Nota..."
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          onBlur={handleNoteBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          style={noteInput}
        />
      )}
    </div>
  );
}
