/**
 * GET /api/catalogue/materials — Public materials listing
 */
import type { Env } from '../../env';
import { jsonResponse } from '../../utils';

interface PagesContext {
  request: Request;
  env: Env;
}

async function readCatalogue(db: D1Database) {
  const row = await db.prepare('SELECT value FROM settings WHERE key = ?')
    .bind('catalogue')
    .first<{ value: string }>();
  if (!row?.value) return { portfolioItems: [], materialsDetailed: [] };
  try {
    return JSON.parse(row.value);
  } catch {
    return { portfolioItems: [], materialsDetailed: [] };
  }
}

export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const catalogue = await readCatalogue(context.env.DB);
  return jsonResponse({ materials: catalogue.materialsDetailed ?? [] });
};
