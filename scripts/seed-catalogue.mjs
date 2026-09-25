/**
 * Seed the catalogue with the existing hardcoded materials.
 * Safe to re-run — skips materials already in the store.
 *
 * Usage:
 *   npm run import:catalogue
 * or directly:
 *   node --experimental-strip-types scripts/seed-catalogue.mjs
 */

import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as catalogue from '../server/lib/catalogue.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import the existing static data (.ts works with --experimental-strip-types)
const tsPath = path.join(__dirname, '../src/data/materialsDetailed.ts');
const materialsModule = await import(pathToFileURL(tsPath).href);

const materials = materialsModule?.materialsDetailed;

if (!materials) {
  console.error('Could not load materialsDetailed from', tsPath);
  process.exit(1);
}

const materialsArray = Object.values(materials);
const existing = catalogue.getMaterials();
const existingIds = new Set(existing.map((m) => m.id));

let added = 0;
const merged = [...existing];
for (const m of materialsArray) {
  if (!existingIds.has(m.id)) {
    merged.push(m);
    added++;
    console.log(`  + ${m.id}: ${m.name}`);
  } else {
    console.log(`  ~ ${m.id}: already exists, skipping`);
  }
}

if (added > 0) await catalogue.setMaterials(merged);

console.log(`\nSeed complete. ${added}/${materialsArray.length} materials added.`);
console.log(`Catalogue file: ${path.join(__dirname, '..', 'server', 'data', 'catalogue.json')}`);
