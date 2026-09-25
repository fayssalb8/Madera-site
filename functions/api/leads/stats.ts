/**
 * GET /api/leads/stats — Lead analytics (admin only)
 */
import type { Env } from '../../env';
import { requireAuth } from '../../auth';
import { jsonResponse, errorResponse } from '../../utils';

interface PagesContext {
  request: Request;
  env: Env;
}

export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context;

  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  try {
    const byStatusRows = (await env.DB
      .prepare('SELECT status, COUNT(*) AS n FROM leads GROUP BY status')
      .all()).results as Array<{ status: string; n: number }>;

    const byStatus = Object.fromEntries(byStatusRows.map((r) => [r.status, r.n]));
    const total = byStatusRows.reduce((sum, r) => sum + r.n, 0);

    const last7Days = (await env.DB
      .prepare("SELECT COUNT(*) AS n FROM leads WHERE created_at >= datetime('now', '-7 days')")
      .first<{ n: number }>())?.n ?? 0;

    const last30Days = (await env.DB
      .prepare("SELECT COUNT(*) AS n FROM leads WHERE created_at >= datetime('now', '-30 days')")
      .first<{ n: number }>())?.n ?? 0;

    const topWilayas = (await env.DB
      .prepare('SELECT wilaya AS name, COUNT(*) AS count FROM leads GROUP BY wilaya ORDER BY count DESC LIMIT 5')
      .all()).results;

    const topMaterials = (await env.DB
      .prepare("SELECT material AS name, COUNT(*) AS count FROM leads WHERE material IS NOT NULL AND material != '' GROUP BY material ORDER BY count DESC LIMIT 5")
      .all()).results;

    const daily = (await env.DB
      .prepare("SELECT date(created_at) AS date, COUNT(*) AS count FROM leads WHERE created_at >= datetime('now', '-13 days') GROUP BY date ORDER BY date")
      .all()).results;

    return jsonResponse({
      total,
      byStatus,
      last7Days,
      last30Days,
      conversionRate: total > 0 ? Math.round(((byStatus.won ?? 0) / total) * 1000) / 10 : 0,
      topWilayas,
      topMaterials,
      daily,
    });
  } catch (err) {
    console.error('[leads] stats failed:', (err as Error).message);
    return errorResponse('Erreur interne du serveur', 500);
  }
};
