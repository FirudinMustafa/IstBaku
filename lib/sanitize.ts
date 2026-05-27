/**
 * Strict text sanitizer for user-supplied content stored in the DB
 * (listing descriptions, message bodies, notification titles/bodies, etc.).
 *
 * Strategy: STRIP, don't escape. The DB stores plain text. Renderers must
 * still treat the output as text (never `dangerouslySetInnerHTML`), but if
 * a future renderer slips, the worst payload here is benign.
 *
 * Rules:
 *  - Strip <script>...</script> blocks entirely (incl. content).
 *  - Strip <iframe>, <object>, <embed>, <link>, <meta>, <svg>, <math>, <style> blocks entirely.
 *  - Strip `on*` event-handler attributes if any HTML somehow survived.
 *  - Strip `javascript:`, `data:`, `vbscript:` URL schemes.
 *  - Collapse NULL bytes and most C0 control chars (keep \n, \r, \t).
 *  - Trim leading/trailing whitespace.
 *  - Cap length defensively at MAX_LEN (default 20_000).
 */

const DEFAULT_MAX_LEN = 20_000;

const DANGEROUS_BLOCK_TAGS = [
  'script',
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
  'svg',
  'math',
  'style',
  'noscript',
  'template',
];

export interface SanitizeOptions {
  maxLength?: number;
  /** If true, strip ALL HTML-looking tags (default true). */
  stripTags?: boolean;
}

export function sanitizeText(input: unknown, opts: SanitizeOptions = {}): string {
  if (input == null) return '';
  let s = String(input);

  const maxLen = opts.maxLength ?? DEFAULT_MAX_LEN;
  const stripTags = opts.stripTags !== false;

  // 1) Drop dangerous block tags with their content.
  for (const tag of DANGEROUS_BLOCK_TAGS) {
    const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    s = s.replace(re, '');
    // Also strip orphan opening tags of these (no closing).
    const reOrphan = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi');
    s = s.replace(reOrphan, '');
  }

  // 2) Strip event-handler attributes (defensive — if any HTML remains).
  s = s.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // 3) Neutralize dangerous URL schemes.
  s = s.replace(/javascript\s*:/gi, '');
  s = s.replace(/vbscript\s*:/gi, '');
  s = s.replace(/data\s*:\s*text\/html/gi, '');

  // 4) Optionally strip remaining tags entirely.
  if (stripTags) {
    s = s.replace(/<\/?[a-z][^>]*>/gi, '');
  }

  // 5) Remove NULL byte + C0 control chars (preserve \n=\x0A, \r=\x0D, \t=\x09).
  s = s.replace(/[\x00\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 6) Trim and cap length.
  s = s.trim();
  if (s.length > maxLen) s = s.slice(0, maxLen);

  return s;
}

/** Validates an http(s) URL; returns null for everything else. */
export function sanitizeHttpUrl(input: unknown, opts: { maxLength?: number } = {}): string | null {
  if (input == null) return null;
  const s = String(input).trim();
  if (!s) return null;
  if (s.length > (opts.maxLength ?? 2048)) return null;
  if (!/^https?:\/\//i.test(s)) return null;
  // Block embedded credentials / control chars.
  if (/[\x00-\x1F\x7F]/.test(s)) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Phone validation: E.164-ish.
 * Accepts optional leading +, leading digit 1-9, then 6-14 more digits.
 * Returns the normalized string (digits + optional leading +), or null.
 */
export function sanitizePhone(input: unknown): string | null {
  if (input == null) return null;
  const raw = String(input).replace(/[\s\-().]/g, '');
  if (!/^\+?[1-9]\d{6,14}$/.test(raw)) return null;
  return raw;
}

/** Validates latitude: finite number in [-90, 90]. */
export function sanitizeLat(input: unknown): number | null {
  const n = typeof input === 'number' ? input : Number(input);
  if (!Number.isFinite(n)) return null;
  if (n < -90 || n > 90) return null;
  return n;
}

/** Validates longitude: finite number in [-180, 180]. */
export function sanitizeLng(input: unknown): number | null {
  const n = typeof input === 'number' ? input : Number(input);
  if (!Number.isFinite(n)) return null;
  if (n < -180 || n > 180) return null;
  return n;
}
