export function parseAllowedOrigins(value: string | undefined): string[] {
  return (value || '').split(',').map(origin => origin.trim()).filter(Boolean);
}

export function resolveAllowedOrigin(origin: string | null, configured: string | undefined): string | null {
  const allowed = parseAllowedOrigins(configured);
  if (!origin) return allowed[0] || null;
  if (allowed.includes(origin)) return origin;
  if (origin.startsWith('http://localhost:') && allowed.includes('localhost')) return origin;
  return null;
}
