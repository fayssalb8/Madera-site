/**
 * Cloudflare Pages middleware for the /api/* routes.
 * Handles: security headers, CSRF origin check.
 */
import type { Env } from '../env';
import { normalizeOrigin } from '../utils';

interface PagesContext {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
}

export const onRequest = async (context: PagesContext): Promise<Response> => {
  const { request, env, next } = context;

  // ── CSRF check for mutating requests ──────────────────────────────────
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const origin = normalizeOrigin(request.headers.get('origin'));
    const allowedOrigin = normalizeOrigin(env.APP_ORIGIN);
    if (allowedOrigin && origin && origin !== allowedOrigin) {
      return new Response(JSON.stringify({ error: 'Origine non autorisée' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const response = await next();

  // ── Security headers ──────────────────────────────────────────────────
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-site');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
};
