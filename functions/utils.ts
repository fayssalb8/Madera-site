/**
 * Shared validation helpers and constants.
 * Ported from server/index.mjs — logic is identical.
 */

export const PORTFOLIO_CATEGORIES = new Set(['Chêne', 'Frêne', 'Hêtre', 'MDF', 'High Gloss', 'Dressing']);
export const LEAD_STATUSES = new Set(['new', 'contacted', 'qualified', 'won', 'lost']);

export function boundedString(
  value: unknown,
  maxLength: number,
  { required = false }: { required?: boolean } = {},
): string | null {
  if (value === undefined || value === null || value === '') {
    if (required) throw new Error('required');
    return null;
  }
  if (typeof value !== 'string') throw new Error('invalid type');
  const result = value.trim();
  if ((required && !result) || result.length > maxLength) throw new Error('invalid length');
  return result || null;
}

export function boundedInteger(value: unknown, min: number, max: number): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max)
    throw new Error('invalid number');
  return value as number;
}

export interface PortfolioPatch {
  title?: string;
  alt?: string | null;
  image?: string | null;
  youtubeUrl?: string | null;
  videoUrl?: string | null;
  color?: string;
  aspectRatio?: string;
  categories?: string[];
  position?: number | null;
}

export function validatePortfolioPatch(
  body: Record<string, unknown>,
  { creating = false }: { creating?: boolean } = {},
): PortfolioPatch {
  const allowed = new Set([
    'title', 'alt', 'image', 'youtubeUrl', 'videoUrl', 'color', 'aspectRatio', 'categories', 'position',
  ]);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Données invalides');
  if (Object.keys(body).some((key) => !allowed.has(key))) throw new Error('Champ non autorisé');

  const patch: PortfolioPatch = {};

  if (creating || 'title' in body)
    patch.title = boundedString(body.title ?? 'Réalisation Madera Kitchen', 160, { required: true }) ?? undefined;
  if (creating || 'alt' in body)
    patch.alt = boundedString(body.alt ?? '', 300);
  for (const key of ['image', 'youtubeUrl', 'videoUrl'] as const) {
    if (creating || key in body)
      (patch as Record<string, unknown>)[key] = boundedString(body[key], 2_000);
  }
  if (creating || 'color' in body) patch.color = '#B89872';
  if (creating || 'aspectRatio' in body) {
    const aspectRatio = (body.aspectRatio ?? '4/3') as string;
    if (typeof aspectRatio !== 'string' || !/^\d{1,5}\/\d{1,5}$/.test(aspectRatio))
      throw new Error('Format invalide');
    patch.aspectRatio = aspectRatio;
  }
  if (creating || 'categories' in body) {
    const cats = body.categories;
    if (!Array.isArray(cats) || cats.length < 1 || cats.length > PORTFOLIO_CATEGORIES.size) {
      throw new Error('Sélectionnez au moins une catégorie');
    }
    patch.categories = [...new Set(cats as string[])];
    if (patch.categories.some((c) => !PORTFOLIO_CATEGORIES.has(c))) throw new Error('Catégorie invalide');
  }
  if (creating || 'position' in body) patch.position = boundedInteger(body.position ?? 0, 0, 100_000);
  if (creating && !patch.image && !patch.youtubeUrl && !patch.videoUrl)
    throw new Error('Image ou vidéo requise');

  return patch;
}

/**
 * Timing-safe string comparison to prevent timing attacks on auth.
 * Uses the Web Crypto API's subtle.timingSafeEqual equivalent pattern.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.length !== bufB.length) return false;
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}

/** JSON response helper */
export function jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

/** Error JSON response helper */
export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

/** Normalize an origin URL — returns null for invalid URLs */
export function normalizeOrigin(value: string | undefined | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}
