#!/usr/bin/env node
/**
 * Generate a TOTP secret for admin two-factor authentication.
 *
 * Usage:
 *   node scripts/generate-totp-secret.mjs [admin@example.com]
 *
 * Then either:
 *   - add the printed secret to .env as TOTP_SECRET=<base32 secret>, or
 *   - run it once: the server also accepts a secret stored in the database
 *     settings table (set automatically on first login setup via CLI below).
 *
 * Scan the otpauth URI with Google Authenticator / Authy / FreeOTP.
 */
import { generateTotpSecret, buildOtpauthUri } from '../server/lib/totp.mjs';

const account = process.argv[2] ?? process.env.ADMIN_EMAIL ?? 'admin@example.com';
const secret = generateTotpSecret();

console.log('Two-factor authentication setup');
console.log('===============================');
console.log(`\nBase32 secret (put in .env as TOTP_SECRET):\n  ${secret}`);
console.log(`\notpauth URI (scan with your authenticator app):\n  ${buildOtpauthUri({ secret, account })}`);
