/**
 * Minimal TOTP (RFC 6238) implementation — no external dependencies.
 * Used for admin two-factor authentication. Secrets are base32-encoded.
 */
import crypto from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Encode a Buffer as base32 (RFC 4648, no padding). */
export function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

/** Decode a base32 string (case-insensitive, ignores spaces and '=' padding). */
export function base32Decode(input) {
  const clean = input.toUpperCase().replace(/[=\s]/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error('Invalid base32 character');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** HMAC-based one-time password for a time counter (RFC 4226). */
function hotp(secretBuffer, counter) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', secretBuffer).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, '0');
}

/** Current 30-second time-step counter. */
function currentCounter(nowMs = Date.now()) {
  return Math.floor(nowMs / 1000 / 30);
}

/**
 * Verify a 6-digit TOTP code against a base32 secret.
 * Accepts codes from the previous/current/next 30s window to tolerate
 * small clock drift between the server and the authenticator app.
 */
export function verifyTotp(base32Secret, code, { window = 1, nowMs = Date.now() } = {}) {
  if (!base32Secret || typeof code !== 'string') return false;
  const normalized = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(normalized)) return false;

  let secretBuffer;
  try {
    secretBuffer = base32Decode(base32Secret);
  } catch {
    return false;
  }
  if (secretBuffer.length === 0) return false;

  const counter = currentCounter(nowMs);
  for (let drift = -window; drift <= window; drift++) {
    if (hotp(secretBuffer, counter + drift) === normalized) return true;
  }
  return false;
}

/** Generate a new random base32 secret (160 bits of entropy). */
export function generateTotpSecret() {
  return base32Encode(crypto.randomBytes(20));
}

/** Build the otpauth:// provisioning URI for authenticator apps. */
export function buildOtpauthUri({ secret, account, issuer = 'Madera Kitchen' }) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
