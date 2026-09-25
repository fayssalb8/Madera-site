import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import crypto from 'node:crypto';

const root = process.cwd();
const totp = await import(pathToFileURL(path.join(root, 'server/lib/totp.mjs')));
const secret = totp.generateTotpSecret();

// Isolated temp DB so we never touch real data.
const tmpData = fs.mkdtempSync(path.join(os.tmpdir(), 'madera-e2e-'));
const secretBuf = totp.base32Decode(secret);

function hotpNow(counter) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', secretBuf).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, '0');
}

const env = {
  ...process.env,
  ADMIN_EMAIL: 'admin@test.dz',
  ADMIN_PASSWORD: 'test-password-123456',
  SESSION_SECRET: 'a'.repeat(64),
  PORT: '3997',
  DATABASE_PATH: path.join(tmpData, 'test.db'),
  UPLOADS_DIR: path.join(tmpData, 'uploads'),
  WEBP_CONVERT_ENABLED: 'false',
  TOTP_SECRET: secret,
};

const child = spawn(process.execPath, ['server/index.mjs'], { env, stdio: 'ignore' });
const B = 'http://localhost:3997';
await new Promise((r) => setTimeout(r, 2500));

try {
  const post = async (pathName, body, headers = {}) =>
    fetch(`${B}${pathName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });

  // 1. Dynamic sitemap
  const smRes = await fetch(`${B}/sitemap.xml`);
  const smText = await smRes.text();
  console.log('1. sitemap:', smRes.status, '| content-type ok:', smRes.headers.get('content-type').includes('xml'), '| has materiaux:', smText.includes('/materiaux/'), '| has realisations:', smText.includes('/realisations'));

  // 2. Login without 2FA code -> rejected
  let res = await post('/api/auth/login', { email: 'admin@test.dz', password: 'test-password-123456' });
  console.log('2. login WITHOUT code (expect 401):', res.status, (await res.json()).codeRequired === true ? '(codeRequired flagged)' : '');

  // 3. Login with wrong code -> rejected
  res = await post('/api/auth/login', { email: 'admin@test.dz', password: 'test-password-123456', code: '000000' });
  console.log('3. login with WRONG code (expect 401):', res.status);

  // 4. Login with valid current-window code -> success + cookie
  const code = hotpNow(Math.floor(Date.now() / 1000 / 30));
  res = await post('/api/auth/login', { email: 'admin@test.dz', password: 'test-password-123456', code });
  console.log('4. login with VALID code (expect 200):', res.status);
  const cookie = res.headers.getSetCookie()[0]?.split(';')[0];

  // 5. Stats endpoint (auth required)
  res = await fetch(`${B}/api/leads/stats`, { headers: { cookie } });
  const stats = await res.json();
  console.log('5. /api/leads/stats:', res.status, '| keys:', Object.keys(stats).join(','));

  // 6. Unauthenticated stats access blocked
  res = await fetch(`${B}/api/leads/stats`);
  console.log('6. stats without cookie (expect 401):', res.status);

  // 7. Session works before logout...
  res = await fetch(`${B}/api/auth/me`, { headers: { cookie } });
  console.log('7. /me before logout (expect 200):', res.status);

  // 8. Logout revokes ALL tokens...
  await post('/api/auth/logout', null, { cookie });
  res = await fetch(`${B}/api/auth/me`, { headers: { cookie } });
  console.log('8. /me after logout (expect 401 — token revoked):', res.status);
} finally {
  child.kill();
  try { fs.rmSync(tmpData, { recursive: true, force: true }); } catch { /* Windows may hold locks briefly */ }
}
