#!/usr/bin/env node
/**
 * Manual WebP conversion CLI.
 *
 * Converts all JPG/JPEG/PNG images in the uploads directory to optimized
 * WebP and deletes the originals (unless still referenced in the database).
 *
 * Usage:
 *   npm run convert:webp             # convert + delete originals
 *   npm run convert:webp -- --dry-run  # preview only, no changes
 *
 * The same conversion runs automatically once a week inside the server
 * (see WEBP_CONVERT_* variables in .env.example), so this CLI is mainly for
 * on-demand cleanups right after a big import.
 */
import { runWebpConversion } from '../server/lib/webpConvert.mjs';

const dryRun = process.argv.includes('--dry-run');

console.log(`[webp] bulk conversion started${dryRun ? ' (dry-run)' : ''}...`);

try {
  const summary = await runWebpConversion({ dryRun });
  console.log('[webp] done:', JSON.stringify(summary, null, 2));
  if (summary.error) {
    console.error(`[webp] error: ${summary.error}`);
    process.exitCode = 1;
  }
} catch (err) {
  console.error('[webp] fatal:', err.message);
  process.exitCode = 1;
}
