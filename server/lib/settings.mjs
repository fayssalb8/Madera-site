/**
 * Key/value settings persisted in SQLite. Used for server-managed state that
 * must survive restarts without new deployments:
 *  - `session_epoch`  — bumped to instantly revoke every issued session token
 *  - `totp_secret`    — base32 secret for admin two-factor authentication
 */
import { getDb } from '../db.mjs';

export function getSetting(key) {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row?.value ?? null;
}

export function setSetting(key, value) {
  getDb()
    .prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    )
    .run(key, String(value));
}

/** Current session epoch (defaults to 0 — tokens signed without an epoch claim). */
export function getSessionEpoch() {
  return Number(getSetting('session_epoch') ?? '0');
}

/**
 * Invalidate every existing session token. Called on logout so a stolen
 * cookie becomes useless even before its JWT expiry.
 */
export function bumpSessionEpoch() {
  setSetting('session_epoch', getSessionEpoch() + 1);
}
