/**
 * Cloudflare Pages Functions environment bindings.
 * These types are available in all Functions handlers via `context.env`.
 */
export interface Env {
  // ── Cloudflare Bindings ──────────────────────────────────────────────────
  /** Cloudflare D1 database */
  DB: D1Database;
  /** Cloudflare R2 media storage bucket */
  MEDIA_BUCKET: R2Bucket;

  // ── Environment Variables (set in Cloudflare Dashboard) ─────────────────
  /** Admin email address for login */
  ADMIN_EMAIL: string;
  /** Admin password for login */
  ADMIN_PASSWORD: string;
  /** JWT signing secret (min 32 characters) */
  SESSION_SECRET: string;
  /** Canonical site origin, e.g. https://maderakitchen-dz.com */
  APP_ORIGIN?: string;
  /** Session cookie name (default: madera_session) */
  SESSION_COOKIE_NAME?: string;
  /** Session max age in milliseconds (default: 7 days) */
  SESSION_MAX_AGE_MS?: string;
  /** TOTP base32 secret for 2FA (optional) */
  TOTP_SECRET?: string;
  /** Webhook URL for lead notifications (optional) */
  LEAD_NOTIFY_WEBHOOK_URL?: string;
}

/**
 * Typed context for Cloudflare Pages Functions.
 */
export interface CFContext {
  env: Env;
  request: Request;
  params: Record<string, string>;
  waitUntil: (promise: Promise<unknown>) => void;
}
