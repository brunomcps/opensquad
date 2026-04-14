import type { CSSProperties } from 'react';

interface StatusBadgeProps {
  status: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  scheduled: { label: 'Agendado', color: '#D4940A', bg: 'rgba(212, 148, 10, 0.1)' },
  published: { label: 'Publicado', color: '#22A35B', bg: 'rgba(34, 163, 91, 0.1)' },
  public: { label: 'Publicado', color: '#22A35B', bg: 'rgba(34, 163, 91, 0.1)' },
  private: { label: 'Privado', color: '#7C3AED', bg: 'rgba(124, 58, 237, 0.08)' },
  unlisted: { label: 'Nao listado', color: '#888880', bg: 'rgba(136, 136, 128, 0.08)' },
  draft: { label: 'Rascunho', color: '#888880', bg: 'rgba(136, 136, 128, 0.08)' },
  failed: { label: 'Erro', color: '#DC3545', bg: 'rgba(220, 53, 69, 0.08)' },
};

const style: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  padding: '3px 9px',
  borderRadius: '5px',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.03em',
  textTransform: 'uppercase',
  fontFamily: 'var(--font)',
  width: 'fit-content',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const mapped = STATUS_MAP[status] || STATUS_MAP.draft;

  return (
    <span style={{ ...style, color: mapped.color, background: mapped.bg }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: mapped.color,
          flexShrink: 0,
        }}
      />
      {mapped.label}
    </span>
  );
}
