/**
 * POST /api/auth/login
 * Admin login with optional TOTP 2FA.
 */
import type { Env } from '../../env';
import {
  signJwt,
  sessionCookie,
  getSessionEpoch,
  type SessionPayload,
} from '../../auth';
import { verifyTotp } from '../../totp';
import { timingSafeEqual, jsonResponse, errorResponse } from '../../utils';

interface PagesContext {
  request: Request;
  env: Env;
}

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context;

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return errorResponse('JSON invalide');
  }

  const { email, password, code } = body;
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return errorResponse('Email et mot de passe requis');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const adminEmail = (env.ADMIN_EMAIL ?? '').trim().toLowerCase();

  if (!timingSafeEqual(normalizedEmail, adminEmail) || !timingSafeEqual(password, env.ADMIN_PASSWORD ?? '')) {
    return errorResponse('Identifiants invalides', 401);
  }

  // Two-factor authentication
  const totpSecret = env.TOTP_SECRET;
  if (totpSecret) {
    const valid = await verifyTotp(totpSecret, typeof code === 'string' ? code : '');
    if (!valid) {
      return jsonResponse({ error: 'Code 2FA requis ou invalide', codeRequired: true }, 401);
    }
  }

  const epoch = await getSessionEpoch(env.DB);
  const payload: Omit<SessionPayload, 'iat' | 'exp'> = {
    sub: 'admin',
    email: normalizedEmail,
    name: 'Administrateur',
    role: 'admin',
    ep: epoch,
  };

  const maxAge = Number(env.SESSION_MAX_AGE_MS ?? 7 * 24 * 3600 * 1000);
  const token = await signJwt(payload, env.SESSION_SECRET, maxAge);

  return jsonResponse(
    { user: { sub: payload.sub, email: payload.email, name: payload.name, role: payload.role } },
    200,
    { 'Set-Cookie': sessionCookie(token, env) },
  );
};
