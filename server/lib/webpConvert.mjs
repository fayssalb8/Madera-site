/**
 * Bulk WebP conversion tool for uploaded media.
 *
 * Converts every JPG/JPEG/PNG found in the uploads directory to an optimized
 * `.webp` (same pipeline as fresh uploads: max 1920px, quality 80), then
 * deletes the original file — website speed optimization.
 *
 * Safety rules:
 * - Originals still referenced anywhere in the SQLite database are left
 *   completely untouched (no conversion, no deletion).
 * - If a `<base>.webp` file already exists, the source is left untouched.
 * - GIF files are skipped (conversion would drop their animation).
 *
 * Used by:
 * - scripts/convert-to-webp.mjs   (manual CLI run)
 * - server/index.mjs              (weekly automatic schedule + admin endpoint)
 */
import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import sharp from 'sharp';

/** Matches the sharp limits used for fresh uploads (see media.mjs). */
export const IMAGE_MAX_DIMENSION = 1920;
export const IMAGE_QUALITY = 80;

const CONVERTIBLE_RE = /\.(jpe?g|png)$/i;

/** In-flight run guard so scheduled + manual runs never overlap. */
let currentRun = null;

/**
 * Scan the SQLite database for any row whose TEXT columns contain one of the
 * given file names. Returns the subset that is referenced (must be kept).
 */
export function findDbReferences(databasePath, fileNames) {
  const referenced = new Set();
  if (!fileNames.length || !fs.existsSync(databasePath)) return referenced;

  let Database;
  try {
    Database = createRequire(import.meta.url)('better-sqlite3');
  } catch {
    console.warn('[webp] better-sqlite3 unavailable — skipping DB reference check');
    return referenced;
  }

  let db;
  try {
    db = new Database(databasePath, { readonly: true });
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all();

    for (const { name: table } of tables) {
      const safeTable = table.replace(/"/g, '""');
      const textColumns = db
        .pragma(`table_info("${safeTable}")`)
        .filter((c) => /text|char|clob/i.test(String(c.type)))
        .map((c) => String(c.name));
      if (textColumns.length === 0) continue;

      const colList = textColumns.map((c) => `"${c}"`).join(', ');

      // Chunk file names to stay well under SQLite's parameter limit.
      const CHUNK = Math.max(1, Math.floor(900 / textColumns.length));
      for (let i = 0; i < fileNames.length; i += CHUNK) {
        const chunk = fileNames.slice(i, i + CHUNK);
        // One OR-group per file, each group matching any of the text columns.
        const where = chunk
          .map(() => `(${textColumns.map((c) => `"${c}" LIKE ?`).join(' OR ')})`)
          .join(' OR ');
        const sql = `SELECT ${colList} FROM "${safeTable}" WHERE ${where}`;
        const params = chunk.flatMap((n) => textColumns.map(() => `%${n}%`));
        const rows = db.prepare(sql).all(...params);
        if (rows.length === 0) continue;
        for (const n of chunk) {
          const needle = n.toLowerCase();
          for (const row of rows) {
            for (const c of textColumns) {
              const v = row[c];
              if (typeof v === 'string' && v.toLowerCase().includes(needle)) {
                referenced.add(n);
                break;
              }
            }
            if (referenced.has(n)) break;
          }
        }
      }
    }
  } catch (err) {
    console.warn('[webp] DB reference scan failed:', err.message);
  } finally {
    try { db?.close(); } catch { /* ignore */ }
  }
  return referenced;
}

/**
 * Convert all convertible images in `uploadsDir` to WebP and delete the
 * originals when safe. Returns a summary object.
 */
export async function runWebpConversion({
  uploadsDir,
  databasePath,
  dryRun = false,
  log = console.log,
} = {}) {
  uploadsDir ??= path.resolve(process.env.UPLOADS_DIR ?? path.join('server', 'data', 'uploads'));
  databasePath ??= path.resolve(process.env.DATABASE_PATH ?? path.join('server', 'data', 'madera.db'));

  if (!fs.existsSync(uploadsDir)) {
    return { converted: 0, keptReferenced: 0, skippedExisting: 0, failed: 0, bytesSaved: 0, error: `uploads dir not found: ${uploadsDir}` };
  }

  const candidates = fs.readdirSync(uploadsDir).filter((f) => CONVERTIBLE_RE.test(f)).sort();
  const summary = { converted: 0, keptReferenced: 0, skippedExisting: 0, failed: 0, bytesSaved: 0 };

  if (candidates.length === 0) {
    log('No JPG/JPEG/PNG files found — nothing to convert.');
    return summary;
  }

  const referenced = findDbReferences(databasePath, candidates);

  for (const fileName of candidates) {
    const srcPath = path.join(uploadsDir, fileName);
    const destName = `${fileName.replace(/\.[^.]+$/, '')}.webp`;
    const destPath = path.join(uploadsDir, destName);

    try {
      if (referenced.has(fileName)) {
        summary.keptReferenced += 1;
        log(`kept (referenced in database): ${fileName}`);
        continue;
      }
      if (fs.existsSync(destPath)) {
        summary.skippedExisting += 1;
        log(`skipped (${destName} already exists): ${fileName}`);
        continue;
      }

      const sizeBefore = fs.statSync(srcPath).size;

      if (!dryRun) {
        await sharp(srcPath)
          .rotate() // auto-rotate based on EXIF
          .resize({
            width: IMAGE_MAX_DIMENSION,
            height: IMAGE_MAX_DIMENSION,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: IMAGE_QUALITY })
          .toFile(destPath);

        // Only delete the original once a non-empty WebP copy exists.
        const sizeAfter = fs.statSync(destPath).size;
        if (sizeAfter <= 0) throw new Error('empty WebP output');

        fs.unlinkSync(srcPath);
        summary.bytesSaved += Math.max(0, sizeBefore - sizeAfter);
        log(`converted: ${fileName} → ${destName} (${(sizeBefore / 1024).toFixed(0)} KB → ${(sizeAfter / 1024).toFixed(0)} KB)`);
      } else {
        log(`[dry-run] would convert: ${fileName} → ${destName}`);
      }

      summary.converted += 1;
    } catch (err) {
      summary.failed += 1;
      console.warn(`[webp] failed for ${fileName}:`, err.message);
      // Remove partial output so a later retry starts clean.
      try { if (fs.existsSync(destPath)) fs.unlinkSync(destPath); } catch { /* ignore */ }
    }
  }

  return summary;
}

/**
 * Run a conversion unless one is already in flight (returns the running
 * promise instead). Prevents overlapping weekly + manual runs.
 */
export function runWebpConversionOnce(options = {}) {
  if (currentRun) {
    console.log('[webp] conversion already running — reusing current run');
    return currentRun;
  }
  currentRun = runWebpConversion(options).finally(() => {
    currentRun = null;
  });
  return currentRun;
}

