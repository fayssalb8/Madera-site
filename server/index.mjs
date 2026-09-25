import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { getDb } from './db.mjs';
import {
  signSession,
  sessionCookie,
  readSession,
  requireAuth,
} from './auth.mjs';
import * as catalogue from './lib/catalogue.mjs';
import { searchLeads } from './lib/search.mjs';
import { notifyNewLead } from './lib/notify.mjs';
import {
  isImageMime,
  isVideoMime,
  processImageUpload,
  processVideoUpload,
} from './lib/media.mjs';
import { runWebpConversionOnce } from './lib/webpConvert.mjs';
import { getSetting, getSessionEpoch, bumpSessionEpoch } from './lib/settings.mjs';
import { verifyTotp } from './lib/totp.mjs';
import { generateSitemap } from './lib/sitemap.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT ?? 3001);

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required');
}

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function normalizeOrigin(value) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

const UPLOADS_DIR =
  process.env.UPLOADS_DIR ?? path.join(__dirname, 'data', 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

/**
 * Build the Content-Security-Policy. Inline <scripts> are disallowed except
 * the static JSON-LD block baked into dist/index.html, whose exact sha256 is
 * pinned at startup — no 'unsafe-inline' needed for scripts.
 */
function buildCsp() {
  let policy =
    "default-src 'self'; " +
    "img-src 'self' data: blob: https:; " +
    "media-src 'self' blob:; " +
    'frame-src https://www.youtube.com https://www.youtube-nocookie.com; ' +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "object-src 'none'; " +
    // Framer Motion / React apply styles via the style attribute, which
    // requires 'unsafe-inline' here — a widely accepted trade-off.
    "style-src 'self' 'unsafe-inline'; " +
    "connect-src 'self'; " +
    "frame-ancestors 'none'";
  return policy;
}

/** Compute the CSP hash for the JSON-LD block inside the built index.html. */
function jsonLdHash(distPath) {
  try {
    const html = fs.readFileSync(path.join(distPath, 'index.html'), 'utf8');
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!match) return null;
    return `'sha256-${crypto.createHash('sha256').update(match[1], 'utf8').digest('base64')}'`;
  } catch {
    return null;
  }
}

const PORTFOLIO_CATEGORIES = new Set(['Chêne', 'Frêne', 'Hêtre', 'MDF', 'High Gloss', 'Dressing']);
const LEAD_STATUSES = new Set(['new', 'contacted', 'qualified', 'won', 'lost']);

function boundedString(value, maxLength, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new Error('required');
    return null;
  }
  if (typeof value !== 'string') throw new Error('invalid type');
  const result = value.trim();
  if ((required && !result) || result.length > maxLength) throw new Error('invalid length');
  return result || null;
}

function boundedInteger(value, min, max) {
  if (value === undefined || value === null || value === '') return null;
  if (!Number.isInteger(value) || value < min || value > max) throw new Error('invalid number');
  return value;
}

function validatePortfolioPatch(body, { creating = false } = {}) {
  const allowed = new Set(['title', 'alt', 'image', 'youtubeUrl', 'videoUrl', 'color', 'aspectRatio', 'categories', 'position']);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Données invalides');
  if (Object.keys(body).some((key) => !allowed.has(key))) throw new Error('Champ non autorisé');
  const patch = {};
  if (creating || 'title' in body) patch.title = boundedString(body.title ?? 'Réalisation Madera Kitchen', 160, { required: true });
  if (creating || 'alt' in body) patch.alt = boundedString(body.alt ?? '', 300);
  for (const key of ['image', 'youtubeUrl', 'videoUrl']) {
    if (creating || key in body) patch[key] = boundedString(body[key], 2_000);
  }
  if (creating || 'color' in body) patch.color = '#B89872';
  if (creating || 'aspectRatio' in body) {
    const aspectRatio = body.aspectRatio ?? '4/3';
    if (typeof aspectRatio !== 'string' || !/^\d{1,5}\/\d{1,5}$/.test(aspectRatio)) throw new Error('Format invalide');
    patch.aspectRatio = aspectRatio;
  }
  if (creating || 'categories' in body) {
    if (!Array.isArray(body.categories) || body.categories.length < 1 || body.categories.length > PORTFOLIO_CATEGORIES.size) {
      throw new Error('Sélectionnez au moins une catégorie');
    }
    patch.categories = [...new Set(body.categories)];
    if (patch.categories.some((category) => !PORTFOLIO_CATEGORIES.has(category))) throw new Error('Catégorie invalide');
  }
  if (creating || 'position' in body) patch.position = boundedInteger(body.position ?? 0, 0, 100_000);
  if (creating && !patch.image && !patch.youtubeUrl && !patch.videoUrl) throw new Error('Image ou vidéo requise');
  return patch;
}

// ── Multer storage ───────────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const extensions = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
    };
    const ext = extensions[file.mimetype] ?? '.bin';
    const safe = `${Date.now()}-${crypto.randomUUID()}${ext}`;
    cb(null, safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé'));
    }
  },
});

const publicAttachmentUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Seules les images JPEG, PNG et WebP sont acceptées'));
  },
});

// ── Rate limiters ───────────────────────────────────────────────────────────
// Leads are submitted by anonymous website visitors — keep this tight.
const leadsLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_LEADS_WINDOW_MS ?? 15 * 60 * 1000), // 15 min
  limit: Number(process.env.RATE_LIMIT_LEADS_MAX ?? 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de demandes, veuillez réessayer plus tard' },
});

// Uploads are admin-only (requireAuth) but still throttle against abuse.
// Bulk imports of 30+ images use 2 requests per file — the default must be
// high enough that a large import never trips the limiter mid-batch.
const uploadsLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_UPLOADS_WINDOW_MS ?? 15 * 60 * 1000), // 15 min
  limit: Number(process.env.RATE_LIMIT_UPLOADS_MAX ?? 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de téléversements, veuillez réessayer plus tard' },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_LOGIN_MAX ?? 5),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Trop de tentatives, veuillez réessayer plus tard' },
});

const publicUploadsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_PUBLIC_UPLOADS_MAX ?? 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de téléversements, veuillez réessayer plus tard' },
});

// ── App ──────────────────────────────────────────────────────────────────────

export function createApp({ contentSecurityPolicy } = {}) {
  const app = express();
  const db = getDb();

  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy) app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);

  app.disable('x-powered-by');
  const csp = contentSecurityPolicy ?? buildCsp();
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (isProd) {
      // The app is expected to run behind an HTTPS reverse proxy in production.
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    res.setHeader('Content-Security-Policy', csp);
    next();
  });
  app.use(express.json({ limit: '250kb' }));
  app.use(express.urlencoded({ extended: true, limit: '250kb' }));
  app.use('/api', (req, res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
    const origin = normalizeOrigin(req.get('origin'));
    const allowedOrigin = normalizeOrigin(process.env.APP_ORIGIN);
    // CSRF defence-in-depth: when APP_ORIGIN is configured, mutating requests
    // must come from that origin (browsers always attach Origin to POSTs).
    if (allowedOrigin && origin && origin !== allowedOrigin) {
      return res.status(403).json({ error: 'Origine non autorisée' });
    }
    next();
  });

  // Serve uploaded files
  app.use('/uploads', express.static(UPLOADS_DIR, {
    immutable: true,
    maxAge: '30d',
    fallthrough: false,
  }));

  // Dynamic sitemap generated from the live catalogue (overrides the static
  // public/sitemap.xml copy bundled in dist/). Cached for an hour.
  let sitemapCache = { xml: null, at: 0 };
  app.get('/sitemap.xml', (_req, res) => {
    if (!sitemapCache.xml || Date.now() - sitemapCache.at > 60 * 60 * 1000) {
      const siteUrl = normalizeOrigin(process.env.APP_ORIGIN) ?? 'https://maderakitchen-dz.com';
      sitemapCache = {
        xml: generateSitemap({ siteUrl, materials: catalogue.getMaterials() }),
        at: Date.now(),
      };
    }
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(sitemapCache.xml);
  });

  // ── Auth ──────────────────────────────────────────────────────────────────

  app.post('/api/auth/login', loginLimiter, (req, res) => {
    const { email, password, code } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!timingSafeEqual(normalizedEmail, ADMIN_EMAIL) || !timingSafeEqual(password, ADMIN_PASSWORD)) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    // Two-factor authentication — enforced whenever a TOTP secret is configured
    // (env TOTP_SECRET or the settings table).
    const totpSecret = process.env.TOTP_SECRET ?? getSetting('totp_secret');
    if (totpSecret) {
      if (!verifyTotp(totpSecret, typeof code === 'string' ? code : '')) {
        return res.status(401).json({ error: 'Code 2FA requis ou invalide', codeRequired: true });
      }
    }

    const payload = { sub: 'admin', email: normalizedEmail, name: 'Administrateur', role: 'admin' };
    const token = signSession(payload);
    res.setHeader('Set-Cookie', sessionCookie(token));
    res.json({ user: payload });
  });

  app.post('/api/auth/logout', (_req, res) => {
    // Revoke every issued token instantly — a stolen cookie becomes useless.
    bumpSessionEpoch();
    res.setHeader('Set-Cookie', sessionCookie('', { maxAgeMs: 0 }));
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req, res) => {
    const session = readSession(req);
    if (!session) return res.status(401).json({ error: 'Not authenticated' });
    res.json({ user: session });
  });

  // ── Leads ─────────────────────────────────────────────────────────────────

  app.get('/api/leads', requireAuth, (req, res) => {
    const { status, search } = req.query;
    // Full-text search via FTS5 (falls back to LIKE below when FTS errors).
    if (search) {
      try {
        let rows = searchLeads(db, String(search));
        if (status && status !== 'all') {
          rows = rows.filter((r) => r.status === status);
        }
        return res.json({ leads: rows });
      } catch (err) {
        console.warn('[leads] FTS search failed, falling back to LIKE:', err.message);
        /* fall through to LIKE */
      }
    }
    let query = 'SELECT * FROM leads';
    const conditions = [];
    const params = [];
    if (status && status !== 'all') {
      conditions.push('status = ?');
      params.push(status);
    }
    if (search) {
      conditions.push('(name LIKE ? OR phone LIKE ? OR wilaya LIKE ? OR email LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY created_at DESC';
    const rows = db.prepare(query).all(...params);
    res.json({ leads: rows });
  });

  // Lead analytics — MUST be registered before GET /api/leads/:id so that
  // "stats" is never captured as a lead id.
  app.get('/api/leads/stats', requireAuth, (_req, res) => {
    try {
      const byStatusRows = db
        .prepare('SELECT status, COUNT(*) AS n FROM leads GROUP BY status')
        .all();
      const byStatus = Object.fromEntries(byStatusRows.map((r) => [r.status, r.n]));
      const total = byStatusRows.reduce((sum, r) => sum + r.n, 0);

      const last7Days = db
        .prepare("SELECT COUNT(*) AS n FROM leads WHERE created_at >= datetime('now', '-7 days')")
        .get().n;
      const last30Days = db
        .prepare("SELECT COUNT(*) AS n FROM leads WHERE created_at >= datetime('now', '-30 days')")
        .get().n;

      const topWilayas = db
        .prepare('SELECT wilaya AS name, COUNT(*) AS count FROM leads GROUP BY wilaya ORDER BY count DESC LIMIT 5')
        .all();
      const topMaterials = db
        .prepare("SELECT material AS name, COUNT(*) AS count FROM leads WHERE material IS NOT NULL AND material != '' GROUP BY material ORDER BY count DESC LIMIT 5")
        .all();

      const daily = db
        .prepare("SELECT date(created_at) AS date, COUNT(*) AS count FROM leads WHERE created_at >= datetime('now', '-13 days') GROUP BY date ORDER BY date")
        .all();

      res.json({
        total,
        byStatus,
        last7Days,
        last30Days,
        conversionRate: total > 0 ? Math.round(((byStatus.won ?? 0) / total) * 1000) / 10 : 0,
        topWilayas,
        topMaterials,
        daily,
      });
    } catch (err) {
      console.error('[leads] stats failed:', err.message);
      res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  });

  app.get('/api/leads/:id', requireAuth, (req, res) => {
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead introuvable' });
    const notes = db.prepare(
      'SELECT * FROM lead_notes WHERE lead_id = ? ORDER BY created_at DESC'
    ).all(req.params.id);
    res.json({ lead, notes });
  });

  app.post('/api/leads', leadsLimiter, (req, res) => {
    const body = req.body ?? {};
    const {
      name, phone, wilaya, email, material, hardware,
      measures, oven_column, dishwasher, washing_machine,
      attachments, drawers, columns, wall_cabinets, accessories,
      estimate_low, estimate_high, currency, source,
    } = body;

    let clean;
    try {
      const attachmentList = Array.isArray(attachments) ? attachments : attachments ? [attachments] : [];
      if (attachmentList.length > 5 || attachmentList.some((url) => typeof url !== 'string' || !/^\/uploads\/[A-Za-z0-9._-]+$/.test(url))) {
        throw new Error('invalid attachments');
      }
      const accessoryList = Array.isArray(accessories) ? accessories : accessories ? [accessories] : [];
      if (accessoryList.length > 20 || accessoryList.some((item) => typeof item !== 'string' || item.length > 100)) {
        throw new Error('invalid accessories');
      }
      clean = {
        name: boundedString(name, 120, { required: true }),
        phone: boundedString(phone, 30, { required: true }),
        wilaya: boundedString(wilaya, 100, { required: true }),
        email: boundedString(email, 254),
        material: boundedString(material, 60),
        hardware: boundedString(hardware, 60),
        measures: boundedString(measures, 2_000),
        ovenColumn: boundedString(oven_column, 10),
        dishwasher: boundedString(dishwasher, 10),
        washingMachine: boundedString(washing_machine, 10),
        attachments: attachmentList.join(', ') || null,
        drawers: boundedInteger(drawers, 0, 100),
        columns: boundedInteger(columns, 0, 100),
        wallCabinets: boundedInteger(wall_cabinets, 0, 100),
        accessories: accessoryList.join(', ') || null,
        estimateLow: boundedInteger(estimate_low, 0, 1_000_000_000),
        estimateHigh: boundedInteger(estimate_high, 0, 1_000_000_000),
        currency: boundedString(currency, 10) ?? 'DZD',
        source: boundedString(source, 50) ?? 'website_wizard',
      };
      if (clean.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)) throw new Error('invalid email');
      if (!/^[+\d][\d\s().-]{5,29}$/.test(clean.phone)) throw new Error('invalid phone');
    } catch {
      return res.status(400).json({ error: 'Données de demande invalides' });
    }

    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO leads (
        id, name, phone, wilaya, email, material, hardware,
        measures, oven_column, dishwasher, washing_machine,
        attachments, drawers, columns, wall_cabinets, accessories,
        estimate_low, estimate_high, currency, source, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')
    `).run(
      id, clean.name, clean.phone, clean.wilaya, clean.email, clean.material, clean.hardware,
      clean.measures, clean.ovenColumn, clean.dishwasher, clean.washingMachine,
      clean.attachments, clean.drawers, clean.columns, clean.wallCabinets,
      clean.accessories, clean.estimateLow, clean.estimateHigh, clean.currency, clean.source
    );

    // Fire-and-forget: email + webhook notifications must not block the response.
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
    void notifyNewLead(lead);

    res.status(201).json({ id });
  });

  app.put('/api/leads/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body ?? {};
    const existing = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Lead introuvable' });

    if (status) {
      if (!LEAD_STATUSES.has(status)) return res.status(400).json({ error: 'Statut invalide' });
      db.prepare('UPDATE leads SET status = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run(status, id);
    }
    if (notes !== undefined) {
      db.prepare('UPDATE leads SET notes = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run(notes, id);
    }
    res.json({ ok: true });
  });

  app.post('/api/leads/:id/notes', requireAuth, (req, res) => {
    const { content } = req.body ?? {};
    if (!content?.trim()) return res.status(400).json({ error: 'Contenu requis' });
    const lead = db.prepare('SELECT id FROM leads WHERE id = ?').get(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead introuvable' });
    const id = crypto.randomUUID();
    db.prepare(
      'INSERT INTO lead_notes (id, lead_id, user_id, content) VALUES (?, ?, ?, ?)'
    ).run(id, req.params.id, req.session.sub ?? 'admin', content.trim());
    res.status(201).json({ id });
  });

  // ── Uploads ───────────────────────────────────────────────────────────────

  app.post('/api/lead-attachments', publicUploadsLimiter, publicAttachmentUpload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier' });
    try {
      const result = await processImageUpload(req.file.path, req.file.originalname, UPLOADS_DIR);
      return res.status(201).json(result);
    } catch (err) {
      console.warn('[lead-attachments] rejected upload:', err.message);
      return res.status(400).json({ error: 'Image invalide' });
    }
  });

  app.post('/api/uploads', uploadsLimiter, requireAuth, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier' });

    try {
      // Images: resize/compress to optimized .webp + thumbnail via sharp.
      if (isImageMime(req.file.mimetype)) {
        const r = await processImageUpload(req.file.path, req.file.originalname, UPLOADS_DIR);
        return res.status(201).json(r);
      }

      // Videos: extract poster frame + transcode to WebM via ffmpeg.
      if (isVideoMime(req.file.mimetype)) {
        const r = await processVideoUpload(req.file.path, req.file.originalname, UPLOADS_DIR);
        return res.status(201).json(r);
      }
    } catch (err) {
      console.error('[uploads] media processing failed:', err.message);
      try { fs.unlinkSync(req.file.path); } catch { /* already removed */ }
      return res.status(400).json({ error: 'Fichier média invalide' });
    }
    return res.status(400).json({ error: 'Type de fichier non autorisé' });
  });

  // ── Catalogue: Portfolio ──────────────────────────────────────────────────

  app.get('/api/catalogue/portfolio', (_req, res) => {
    res.json({ items: catalogue.getPortfolio() });
  });

  app.post('/api/catalogue/portfolio', requireAuth, async (req, res) => {
    let patch;
    try { patch = validatePortfolioPatch(req.body, { creating: true }); }
    catch (err) { return res.status(400).json({ error: err.message }); }
    const id = crypto.randomUUID();
    const item = { id, ...patch };
    await catalogue.addPortfolioItem(item);
    res.status(201).json({ item });
  });

  app.put('/api/catalogue/portfolio/:id', requireAuth, async (req, res) => {
    let patch;
    try { patch = validatePortfolioPatch(req.body); }
    catch (err) { return res.status(400).json({ error: err.message }); }
    const item = await catalogue.updatePortfolioItem(req.params.id, patch);
    if (!item) return res.status(404).json({ error: 'Élément introuvable' });
    res.json({ item });
  });

  app.delete('/api/catalogue/portfolio/:id', requireAuth, async (req, res) => {
    const item = await catalogue.deletePortfolioItem(req.params.id);
    if (!item) return res.status(404).json({ error: 'Élément introuvable' });
    res.json({ ok: true });
  });

  // ── Catalogue: Materials ──────────────────────────────────────────────────

  app.get('/api/catalogue/materials', (_req, res) => {
    res.json({ materials: catalogue.getMaterials() });
  });

  // ── Admin: manual WebP bulk conversion ─────────────────────────────────────
  // Converts every legacy JPG/PNG in the uploads dir to optimized WebP and
  // deletes the originals (unless still referenced in the database).
  app.post('/api/admin/convert-webp', requireAuth, async (_req, res) => {
    try {
      const summary = await runWebpConversionOnce({ log: (m) => console.log(`[webp] ${m}`) });
      res.json({ ok: !summary.error, ...summary });
    } catch (err) {
      console.error('[webp] manual conversion failed:', err.message);
      res.status(500).json({ error: 'Échec de la conversion WebP' });
    }
  });

  // ── Health ────────────────────────────────────────────────────────────────

  app.get('/api/health', (_req, res) => {
    try {
      db.prepare('SELECT 1').get();
      fs.accessSync(UPLOADS_DIR, fs.constants.R_OK | fs.constants.W_OK);
      catalogue.getCatalogue();
      res.json({ status: 'ok', uptime: process.uptime() });
    } catch (err) {
      res.status(503).json({ status: 'unavailable', error: err.message });
    }
  });

  // ── Error handler ─────────────────────────────────────────────────────────
  // Multer/body-parser failures must return JSON, not an HTML stack trace.
  app.use((err, _req, res, _next) => {
    if (err?.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Requête trop volumineuse' });
    }
    if (err instanceof multer.MulterError) {
      const messages = {
        LIMIT_FILE_SIZE: 'Fichier trop volumineux',
        LIMIT_FILE_COUNT: 'Trop de fichiers',
        LIMIT_UNEXPECTED_FILE: 'Champ de fichier inattendu',
      };
      return res.status(400).json({ error: messages[err.code] ?? 'Téléversement invalide' });
    }
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'JSON invalide' });
    }
    console.error('[server] unhandled error:', err.message);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  });

  return app;
}

// ── Start ────────────────────────────────────────────────────────────────────

/**
 * Weekly automatic WebP conversion of everything in the uploads dir.
 * Keeps the media library fully optimized without manual intervention.
 * Configure via WEBP_CONVERT_ENABLED / WEBP_CONVERT_INTERVAL_MS /
 * WEBP_CONVERT_INITIAL_DELAY_MS (see .env.example).
 */
function startWeeklyWebpSchedule() {
  if (String(process.env.WEBP_CONVERT_ENABLED ?? 'true') === 'false') {
    console.log('[webp] weekly conversion disabled (WEBP_CONVERT_ENABLED=false)');
    return;
  }
  const intervalMs = Number(process.env.WEBP_CONVERT_INTERVAL_MS ?? 7 * 24 * 60 * 60 * 1000);
  const initialDelayMs = Number(process.env.WEBP_CONVERT_INITIAL_DELAY_MS ?? 5 * 60 * 1000);

  const run = () =>
    runWebpConversionOnce({ log: (m) => console.log(`[webp] ${m}`) })
      .then((s) => {
        if (s.converted > 0 || s.failed > 0) {
          console.log(`[webp] scheduled run finished: ${JSON.stringify(s)}`);
        }
      })
      .catch((err) => console.error('[webp] scheduled run failed:', err.message));

  setTimeout(() => {
    void run();
    setInterval(run, intervalMs);
    console.log(`[webp] weekly conversion scheduled (every ${Math.round(intervalMs / 3600000)}h)`);
  }, initialDelayMs);
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule && isProd) {
  // Serve built frontend
  const distPath = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(distPath)) {
    // Pin the exact hash of the static JSON-LD block so the CSP can forbid
    // every other inline script.
    const ldHash = jsonLdHash(distPath);
    const csp = ldHash ? buildCsp().replace("script-src 'self'", `script-src 'self' ${ldHash}`) : undefined;
    const app = createApp({ contentSecurityPolicy: csp });
    app.use(express.static(distPath, {
      maxAge: '1y',
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
      },
    }));
    app.get('*splat', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
    });
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      startWeeklyWebpSchedule();
    });
  } else {
    console.error('dist/ not found. Run npm run build first.');
    process.exit(1);
  }
} else if (isMainModule) {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Dev server on http://localhost:${PORT}`);
    startWeeklyWebpSchedule();
  });
}
