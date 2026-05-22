// \p{L} matches any Unicode letter (covers ã, é, ç, ü, etc.)
const SAFE_QUERY_RE = /^[\p{L}\p{N}\s\-.,'"()]+$/u;
const MIN_LEN = 3;
const MAX_LEN = 200;
const CURRENT_YEAR = new Date().getFullYear();

const INJECTION_PATTERNS = [
  /ignore previous/i,
  /system:/i,
  /<\//,
  /\{[%{]/,
  /\n\n(human|assistant):/i,
];

export function sanitizeQuery(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length < MIN_LEN || trimmed.length > MAX_LEN) return null;
  if (!SAFE_QUERY_RE.test(trimmed)) return null;
  if (INJECTION_PATTERNS.some((p) => p.test(trimmed))) return null;
  return trimmed;
}

export function sanitizeYear(raw: unknown): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n)) return null;
  if (n < 1900 || n > CURRENT_YEAR + 1) return null;
  return n;
}

const SAFE_NAME_RE = /^[\w\s-]{1,50}$/;

export function sanitizeName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!SAFE_NAME_RE.test(trimmed)) return null;
  return trimmed;
}
