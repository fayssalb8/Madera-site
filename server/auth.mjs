import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { parse as parseCookie, serialize as serializeCookie } from 'cookie';
import { getSessionEpoch } from './lib/settings.mjs';

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must be set to at least 32 characters');
}
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'madera_session';
const MAX_AGE = Number(process.env.SESSION_MAX_AGE_MS ?? 7 * 24 * 3600 * 1000);

export function signSession(payload) {
  // `ep` pins the token to the current session epoch — bumping the epoch
  // (e.g. on logout) instantly revokes every previously issued token.
  const epoch = safeEpoch();
  return jwt.sign(epoch !== null ? { ...payload, ep: epoch } : payload, SESSION_SECRET, {
    expiresIn: Math.floor(MAX_AGE / 1000),
  });
}

function safeEpoch() {
  try {
    return getSessionEpoch();
  } catch {
    return null; // DB unavailable at import time — sign without epoch claim.
  }
}

export function sessionCookie(token, { maxAgeMs = MAX_AGE } = {}) {
  return serializeCookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(maxAgeMs / 1000),
  });
}

export function readSession(req) {
  const cookies = parseCookie(req.headers.cookie ?? '');
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    // Pin the expected algorithm — prevents algorithm-confusion attacks.
    const session = jwt.verify(token, SESSION_SECRET, { algorithms: ['HS256'] });
    // Reject tokens from a previous session epoch (revoked on logout).
    if ('ep' in session && session.ep !== getSessionEpoch()) return null;
    return session;
  } catch {
    return null;
  }
}

export function requireAuth(req, res, next) {
  const session = readSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.session = session;
  next();
}
