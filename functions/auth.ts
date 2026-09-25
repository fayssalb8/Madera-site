/**
 * Edge-compatible JWT auth using Web Crypto API.
 * Replaces the Node.js `jsonwebtoken` + `cookie` packages.
 */
import type { Env } from './env';

const COOKIE_NAME_DEFAULT = 'madera_session';
const MAX_AGE_DEFAULT = 7 * 24 * 3600 * 1000; // 7 days

// ── Base64url helpers ───────────────────────────────────────────────────────

function base64urlEncode(data: ArrayBuffer | Uint8Array | string): string {
  const bytes = typeof data === 'string'
    ? new TextEncoder().encode(data)
    : new Uint8Array(data);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ── Crypto key cache ────────────────────────────────────────────────────────

const keyCache = new Map<string, CryptoKey>();

async function getSigningKey(secret: string): Promise<CryptoKey> {
  let key = keyCache.get(secret);
  if (!key) {
    key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify'],
    );
    keyCache.set(secret, key);
  }
  return key;
}

// ── JWT sign / verify ───────────────────────────────────────────────────────

export interface SessionPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  ep?: number;
  iat?: number;
  exp?: number;
}

export async function signJwt(
  payload: Omit<SessionPayload, 'iat' | 'exp'>,
  secret: string,
  maxAgeMs: number = MAX_AGE_DEFAULT,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + Math.floor(maxAgeMs / 1000) };

  const header = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64urlEncode(JSON.stringify(fullPayload));
  const message = `${header}.${body}`;

  const key = await getSigningKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));

  return `${message}.${base64urlEncode(signature)}`;
}

export async function verifyJwt(token: string, secret: string): Promise<SessionPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, sig] = parts;

    // Verify header specifies HS256
    const headerObj = JSON.parse(new TextDecoder().decode(base64urlDecode(header)));
    if (headerObj.alg !== 'HS256') return null;

    // Verify signature
    const key = await getSigningKey(secret);
    const message = `${header}.${body}`;
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64urlDecode(sig),
      new TextEncoder().encode(message),
    );
    if (!valid) return null;

    // Decode and validate payload
    const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(body))) as SessionPayload;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
}

// ── Cookie helpers ──────────────────────────────────────────────────────────

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  for (const pair of cookieHeader.split(';')) {
    const [key, ...rest] = pair.trim().split('=');
    if (key) cookies[key.trim()] = decodeURIComponent(rest.join('=').trim());
  }
  return cookies;
}

export function sessionCookie(
  token: string,
  env: Env,
  { maxAgeMs }: { maxAgeMs?: number } = {},
): string {
  const cookieName = env.SESSION_COOKIE_NAME ?? COOKIE_NAME_DEFAULT;
  const maxAge = maxAgeMs ?? Number(env.SESSION_MAX_AGE_MS ?? MAX_AGE_DEFAULT);
  const isProd = (env.APP_ORIGIN ?? '').startsWith('https');
  const parts = [
    `${cookieName}=${encodeURIComponent(token)}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=${Math.floor(maxAge / 1000)}`,
  ];
  if (isProd) parts.push('Secure');
  return parts.join('; ');
}

// ── Session helpers ─────────────────────────────────────────────────────────

export async function readSession(request: Request, env: Env): Promise<SessionPayload | null> {
  const cookieName = env.SESSION_COOKIE_NAME ?? COOKIE_NAME_DEFAULT;
  const cookies = parseCookies(request.headers.get('cookie'));
  const token = cookies[cookieName];
  if (!token) return null;

  const session = await verifyJwt(token, env.SESSION_SECRET);
  if (!session) return null;

  // Validate session epoch
  if ('ep' in session) {
    const epochRow = await env.DB.prepare('SELECT value FROM settings WHERE key = ?')
      .bind('session_epoch')
      .first<{ value: string }>();
    const currentEpoch = Number(epochRow?.value ?? '0');
    if (session.ep !== currentEpoch) return null;
  }

  return session;
}

export async function getSessionEpoch(db: D1Database): Promise<number> {
  const row = await db.prepare('SELECT value FROM settings WHERE key = ?')
    .bind('session_epoch')
    .first<{ value: string }>();
  return Number(row?.value ?? '0');
}

export async function bumpSessionEpoch(db: D1Database): Promise<void> {
  const current = await getSessionEpoch(db);
  await db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).bind('session_epoch', String(current + 1)).run();
}

/**
 * Middleware helper: returns a 401 Response if the request has no valid session.
 * Otherwise returns the session payload.
 */
export async function requireAuth(
  request: Request,
  env: Env,
): Promise<SessionPayload | Response> {
  const session = await readSession(request, env);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return session;
}
