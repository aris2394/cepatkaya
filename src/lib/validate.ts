// Lightweight input validation helpers for API routes.

export function parseAmount(v: any): number | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function isValidMonth(v: any): boolean {
  return typeof v === 'string' && /^\d{4}-\d{2}$/.test(v);
}

export function isValidDate(v: any): boolean {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}
