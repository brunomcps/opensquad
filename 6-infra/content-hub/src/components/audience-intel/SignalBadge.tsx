const COLORS: Record<string, { bg: string; text: string }> = {
  forte: { bg: '#dcfce7', text: '#166534' },
  fraco: { bg: '#fef9c3', text: '#854d0e' },
  ausente: { bg: '#f3f4f6', text: '#9ca3af' },
};

export function SignalBadge({ value, label }: { value: string; label?: string }) {
  const colors = COLORS[value] || COLORS.ausente;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 500,
      background: colors.bg,
      color: colors.text,
    }}>
      {label && <span>{label}:</span>}
      {value}
    </span>
  );
}
