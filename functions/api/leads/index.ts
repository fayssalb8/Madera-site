/**
 * GET /api/leads — List leads (admin only)
 * POST /api/leads — Create a new lead (public, from wizard)
 */
import type { Env } from '../../env';
import { requireAuth } from '../../auth';
import { boundedString, boundedInteger, jsonResponse, errorResponse } from '../../utils';

interface PagesContext {
  request: Request;
  env: Env;
  waitUntil: (promise: Promise<unknown>) => void;
}

// ── GET /api/leads ──────────────────────────────────────────────────────────

export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context;

  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const search = url.searchParams.get('search');

  let query = 'SELECT * FROM leads';
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (status && status !== 'all') {
    conditions.push('status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push('(name LIKE ? OR phone LIKE ? OR wilaya LIKE ? OR email LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY created_at DESC';

  const { results } = await env.DB.prepare(query).bind(...params).all();
  return jsonResponse({ leads: results });
};

// ── POST /api/leads ─────────────────────────────────────────────────────────

async function notifyWebhook(lead: Record<string, unknown>, webhookUrl: string): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'lead.created',
        timestamp: new Date().toISOString(),
        lead,
      }),
    });
  } catch (err) {
    console.error('[notify] webhook failed:', (err as Error).message);
  }
}

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const { request, env, waitUntil } = context;

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return errorResponse('JSON invalide');
  }

  const {
    name, phone, wilaya, email, material, hardware,
    measures, oven_column, dishwasher, washing_machine,
    attachments, drawers, columns, wall_cabinets, accessories,
    estimate_low, estimate_high, currency, source,
  } = body;

  let clean: Record<string, unknown>;
  try {
    const attachmentList = Array.isArray(attachments) ? attachments : attachments ? [attachments] : [];
    if (
      (attachmentList as string[]).length > 5 ||
      (attachmentList as string[]).some((url) => typeof url !== 'string' || !/^\/uploads\/[A-Za-z0-9._-]+$/.test(url))
    ) {
      throw new Error('invalid attachments');
    }
    const accessoryList = Array.isArray(accessories) ? accessories : accessories ? [accessories] : [];
    if (
      (accessoryList as string[]).length > 20 ||
      (accessoryList as string[]).some((item) => typeof item !== 'string' || (item as string).length > 100)
    ) {
      throw new Error('invalid accessories');
    }
    clean = {
      name: boundedString(name, 120, { required: true }),
      phone: boundedString(phone, 30, { required: true }),
      wilaya: boundedString(wilaya, 100, { required: true }),
      email: boundedString(email, 254),
      material: boundedString(material, 60),
      hardware: boundedString(hardware, 60),
      measures: boundedString(measures, 2_000),
      ovenColumn: boundedString(oven_column, 10),
      dishwasher: boundedString(dishwasher, 10),
      washingMachine: boundedString(washing_machine, 10),
      attachments: (attachmentList as string[]).join(', ') || null,
      drawers: boundedInteger(drawers, 0, 100),
      columns: boundedInteger(columns, 0, 100),
      wallCabinets: boundedInteger(wall_cabinets, 0, 100),
      accessories: (accessoryList as string[]).join(', ') || null,
      estimateLow: boundedInteger(estimate_low, 0, 1_000_000_000),
      estimateHigh: boundedInteger(estimate_high, 0, 1_000_000_000),
      currency: boundedString(currency, 10) ?? 'DZD',
      source: boundedString(source, 50) ?? 'website_wizard',
    };
    if (clean.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email as string))
      throw new Error('invalid email');
    if (!/^[+\d][\d\s().\\-]{5,29}$/.test(clean.phone as string))
      throw new Error('invalid phone');
  } catch {
    return errorResponse('Données de demande invalides');
  }

  const id = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO leads (
      id, name, phone, wilaya, email, material, hardware,
      measures, oven_column, dishwasher, washing_machine,
      attachments, drawers, columns, wall_cabinets, accessories,
      estimate_low, estimate_high, currency, source, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')
  `).bind(
    id, clean.name, clean.phone, clean.wilaya, clean.email, clean.material, clean.hardware,
    clean.measures, clean.ovenColumn, clean.dishwasher, clean.washingMachine,
    clean.attachments, clean.drawers, clean.columns, clean.wallCabinets,
    clean.accessories, clean.estimateLow, clean.estimateHigh, clean.currency, clean.source,
  ).run();

  // Fire-and-forget webhook notification
  if (env.LEAD_NOTIFY_WEBHOOK_URL) {
    const leadRow = await env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first();
    if (leadRow) {
      waitUntil(notifyWebhook(leadRow as Record<string, unknown>, env.LEAD_NOTIFY_WEBHOOK_URL));
    }
  }

  return jsonResponse({ id }, 201);
};
