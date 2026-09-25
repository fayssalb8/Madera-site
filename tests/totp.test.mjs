import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  base32Encode,
  base32Decode,
  generateTotpSecret,
  verifyTotp,
  buildOtpauthUri,
} from '../server/lib/totp.mjs';

/** Reference HOTP implementation used to compute expected codes. */
function hotpRef(secretBuffer, counter) {
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

test('base32 round-trips arbitrary bytes', () => {
  const buf = Buffer.from([0, 1, 2, 250, 251, 252, 253, 254, 255]);
  const encoded = base32Encode(buf);
  assert.match(encoded, /^[A-Z2-7]+$/);
  assert.deepEqual(base32Decode(encoded), buf);
});

test('base32 decode is case-insensitive and ignores padding/spaces', () => {
  const encoded = base32Encode(Buffer.from('hello world'));
  assert.deepEqual(
    base32Decode(encoded.toLowerCase()),
    base32Decode(`${encoded.replace(/(.{4})/g, '$1 ').trim()}====`)
  );
});

test('valid TOTP code verifies; wrong or expired codes fail', () => {
  // Deterministic secret so this test never flakes.
  const secret = base32Encode(Buffer.alloc(20, 7).fill('madera-test-secret!!'));
  const FIXED_NOW = 1_760_000_000_000; // fixed timestamp (ms)
  const counter = Math.floor(FIXED_NOW / 1000 / 30);
  const secretBuffer = base32Decode(secret);

  assert.equal(verifyTotp(secret, hotpRef(secretBuffer, counter), { nowMs: FIXED_NOW }), true);
  assert.equal(verifyTotp(secret, hotpRef(secretBuffer, counter - 1), { nowMs: FIXED_NOW }), true); // previous window ok
  assert.equal(verifyTotp(secret, hotpRef(secretBuffer, counter + 1), { nowMs: FIXED_NOW }), true); // next window ok
  assert.equal(verifyTotp(secret, hotpRef(secretBuffer, counter - 5), { nowMs: FIXED_NOW }), false); // too old
  assert.equal(verifyTotp(secret, hotpRef(secretBuffer, counter), { nowMs: FIXED_NOW + 30 * 60 * 1000 }), false); // code expired for later "now"
});

test('verifyTotp rejects malformed input', () => {
  const secret = generateTotpSecret();
  assert.equal(verifyTotp(secret, 'abcdef'), false);
  assert.equal(verifyTotp(secret, '12345'), false);
  assert.equal(verifyTotp(secret, ''), false);
  assert.equal(verifyTotp('', '123456'), false);
  assert.equal(verifyTotp(undefined, '123456'), false);
});

test('generateTotpSecret produces valid base32 of 160 bits', () => {
  const secret = generateTotpSecret();
  assert.equal(base32Decode(secret).length, 20);
});

test('buildOtpauthUri encodes issuer, account and params', () => {
  const uri = buildOtpauthUri({ secret: 'ABC234', account: 'a@b.c', issuer: 'Madera Kitchen' });
  assert.ok(uri.startsWith('otpauth://totp/Madera%20Kitchen%3Aa%40b.c?'));
  assert.ok(uri.includes('secret=ABC234'));
  assert.ok(uri.includes('digits=6'));
  assert.ok(uri.includes('period=30'));
});

