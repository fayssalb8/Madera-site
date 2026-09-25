/**
 * GET  /api/leads/:id       — Lead detail (admin only)
 * PUT  /api/leads/:id       — Update lead status/notes (admin only)
 * POST /api/leads/:id/notes — Add a note to a lead (admin only)
 *
 * Cloudflare Pages dynamic route: functions/api/leads/[id].ts
 */
import type { Env } from '../../env';
import { requireAuth } from '../../auth';
import { LEAD_STATUSES, jsonResponse, errorResponse } from '../../utils';

interface PagesContext {
  request: Request;
  env: Env;
  params: { id: string };
}

// ── GET /api/leads/:id ──────────────────────────────────────────────────────

export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const { request, env, params } = context;

  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const lead = await env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(params.id).first();
  if (!lead) return errorResponse('Lead introuvable', 404);

  const notes = (await env.DB
    .prepare('SELECT * FROM lead_notes WHERE lead_id = ? ORDER BY created_at DESC')
    .bind(params.id)
    .all()).results;

  return jsonResponse({ lead, notes });
};

// ── PUT /api/leads/:id ──────────────────────────────────────────────────────

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

  const { status, notes } = body;
  const existing = await env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(params.id).first();
  if (!existing) return errorResponse('Lead introuvable', 404);

  if (status) {
    if (!LEAD_STATUSES.has(status as string))
      return errorResponse('Statut invalide');
    await env.DB.prepare("UPDATE leads SET status = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(status, params.id).run();
  }
  if (notes !== undefined) {
    await env.DB.prepare("UPDATE leads SET notes = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(notes, params.id).run();
  }

  return jsonResponse({ ok: true });
};

// ── POST /api/leads/:id/notes ───────────────────────────────────────────────
// Note: Cloudflare Pages doesn't support sub-paths in dynamic routes directly.
// The frontend calls POST /api/leads/:id/notes — we handle it here by checking
// the URL path suffix.

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const { request, env, params } = context;

  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  // Verify this is the /notes sub-path
  const url = new URL(request.url);
  if (!url.pathname.endsWith('/notes')) {
    return errorResponse('Not found', 404);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return errorResponse('JSON invalide');
  }

  const { content } = body;
  if (!content || typeof content !== 'string' || !content.trim()) {
    return errorResponse('Contenu requis');
  }

  const lead = await env.DB.prepare('SELECT id FROM leads WHERE id = ?').bind(params.id).first();
  if (!lead) return errorResponse('Lead introuvable', 404);

  const id = crypto.randomUUID();
  const session = auth as { sub?: string };
  await env.DB.prepare(
    'INSERT INTO lead_notes (id, lead_id, user_id, content) VALUES (?, ?, ?, ?)'
  ).bind(id, params.id, session.sub ?? 'admin', content.trim()).run();

  return jsonResponse({ id }, 201);
};
