/**
 * PUT    /api/catalogue/portfolio/:id — Update portfolio item (admin only)
 * DELETE /api/catalogue/portfolio/:id — Delete portfolio item (admin only)
 */
import type { Env } from '../../../env';
import { requireAuth } from '../../../auth';
import { validatePortfolioPatch, jsonResponse, errorResponse } from '../../../utils';

interface PagesContext {
  request: Request;
  env: Env;
  params: { id: string };
}

// ── Catalogue helpers (duplicated inline to avoid cross-function imports) ────

interface Catalogue {
  portfolioItems: Record<string, unknown>[];
  materialsDetailed: Record<string, unknown>[];
  updatedAt: string;
}

async function readCatalogue(db: D1Database): Promise<Catalogue> {
  const row = await db.prepare('SELECT value FROM settings WHERE key = ?')
    .bind('catalogue')
    .first<{ value: string }>();
  if (!row?.value) return { portfolioItems: [], materialsDetailed: [], updatedAt: new Date().toISOString() };
  try {
    const data = JSON.parse(row.value) as Catalogue;
    if (!data.portfolioItems) data.portfolioItems = [];
    if (!data.materialsDetailed) data.materialsDetailed = [];
    return data;
  } catch {
    return { portfolioItems: [], materialsDetailed: [], updatedAt: new Date().toISOString() };
  }
}

async function writeCatalogue(db: D1Database, data: Catalogue): Promise<void> {
  data.updatedAt = new Date().toISOString();
  await db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).bind('catalogue', JSON.stringify(data)).run();
}

// ── PUT ─────────────────────────────────────────────────────────────────────

export const onRequestPut = async (context: PagesContext): Promise<Response> => {
  const { request, env, params } = context;

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
    patch = validatePortfolioPatch(body);
  } catch (err) {
    return errorResponse((err as Error).message);
  }

  const catalogue = await readCatalogue(env.DB);
  const idx = catalogue.portfolioItems.findIndex((i) => (i as { id: string }).id === params.id);
  if (idx === -1) return errorResponse('Élément introuvable', 404);

  catalogue.portfolioItems[idx] = { ...catalogue.portfolioItems[idx], ...patch };
  await writeCatalogue(env.DB, catalogue);

  return jsonResponse({ item: catalogue.portfolioItems[idx] });
};

// ── DELETE ──────────────────────────────────────────────────────────────────

export const onRequestDelete = async (context: PagesContext): Promise<Response> => {
  const { request, env, params } = context;

  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const catalogue = await readCatalogue(env.DB);
  const item = catalogue.portfolioItems.find((i) => (i as { id: string }).id === params.id);
  if (!item) return errorResponse('Élément introuvable', 404);

  catalogue.portfolioItems = catalogue.portfolioItems.filter((i) => (i as { id: string }).id !== params.id);
  await writeCatalogue(env.DB, catalogue);

  return jsonResponse({ ok: true });
};
