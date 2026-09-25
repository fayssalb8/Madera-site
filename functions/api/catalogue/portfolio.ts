/**
 * GET  /api/catalogue/portfolio — Public portfolio listing
 * POST /api/catalogue/portfolio — Create portfolio item (admin only)
 *
 * The catalogue is stored as a JSON blob in D1's settings table
 * (key = 'catalogue'). This replaces the file-based catalogue.json approach.
 */
import type { Env } from '../../env';
import { requireAuth } from '../../auth';
import { validatePortfolioPatch, jsonResponse, errorResponse } from '../../utils';

interface PagesContext {
  request: Request;
  env: Env;
}

// ── Catalogue helpers ───────────────────────────────────────────────────────

interface Catalogue {
  portfolioItems: Record<string, unknown>[];
  materialsDetailed: Record<string, unknown>[];
  updatedAt: string;
}

const EMPTY_CATALOGUE: Catalogue = {
  portfolioItems: [],
  materialsDetailed: [],
  updatedAt: new Date().toISOString(),
};

async function readCatalogue(db: D1Database): Promise<Catalogue> {
  const row = await db.prepare('SELECT value FROM settings WHERE key = ?')
    .bind('catalogue')
    .first<{ value: string }>();
  if (!row?.value) return { ...EMPTY_CATALOGUE };
  try {
    const data = JSON.parse(row.value) as Catalogue;
    if (!data.portfolioItems) data.portfolioItems = [];
    if (!data.materialsDetailed) data.materialsDetailed = [];
    return data;
  } catch {
    return { ...EMPTY_CATALOGUE };
  }
}

async function writeCatalogue(db: D1Database, data: Catalogue): Promise<void> {
  data.updatedAt = new Date().toISOString();
  await db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).bind('catalogue', JSON.stringify(data)).run();
}

// ── GET ─────────────────────────────────────────────────────────────────────

export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const catalogue = await readCatalogue(context.env.DB);
  return jsonResponse({ items: catalogue.portfolioItems });
};

// ── POST ────────────────────────────────────────────────────────────────────

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context;

  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return errorResponse('JSON invalide');
  }

  let patch;
  try {
    patch = validatePortfolioPatch(body, { creating: true });
  } catch (err) {
    return errorResponse((err as Error).message);
  }

  const id = crypto.randomUUID();
  const item = { id, ...patch };

  const catalogue = await readCatalogue(env.DB);
  catalogue.portfolioItems.push(item);
  await writeCatalogue(env.DB, catalogue);

  return jsonResponse({ item }, 201);
};

export { readCatalogue, writeCatalogue };
