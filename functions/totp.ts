/**
 * Minimal TOTP (RFC 6238) implementation using Web Crypto API.
 * Edge-compatible — no Node.js crypto dependency.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Decode a base32 string (case-insensitive, ignores spaces and '=' padding). */
export function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/[=\s]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
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
  return new Uint8Array(bytes);
}

/** HMAC-based one-time password for a time counter (RFC 4226). */
async function hotp(secretBuffer: Uint8Array, counter: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    secretBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );

  const counterBuf = new ArrayBuffer(8);
  const view = new DataView(counterBuf);
  view.setBigUint64(0, BigInt(counter));

  const hmac = new Uint8Array(await crypto.subtle.sign('HMAC', key, counterBuf));
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, '0');
}

/** Current 30-second time-step counter. */
function currentCounter(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / 1000 / 30);
}

/**
 * Verify a 6-digit TOTP code against a base32 secret.
 * Accepts codes from the previous/current/next 30s window.
 */
export async function verifyTotp(
  base32Secret: string,
  code: string,
  { window = 1, nowMs = Date.now() }: { window?: number; nowMs?: number } = {},
): Promise<boolean> {
  if (!base32Secret || typeof code !== 'string') return false;
  const normalized = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(normalized)) return false;

  let secretBuffer: Uint8Array;
  try {
    secretBuffer = base32Decode(base32Secret);
  } catch {
    return false;
  }
  if (secretBuffer.length === 0) return false;

  const counter = currentCounter(nowMs);
  for (let drift = -window; drift <= window; drift++) {
    if (await hotp(secretBuffer, counter + drift) === normalized) return true;
  }
  return false;
}
