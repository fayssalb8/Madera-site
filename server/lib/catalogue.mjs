import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR =
  process.env.CATALOGUE_PATH ??
  path.join(__dirname, '..', 'data');

const CATALOGUE_FILE = path.join(DATA_DIR, 'catalogue.json');
const LOCK_FILE = `${CATALOGUE_FILE}.lock`;

fs.mkdirSync(DATA_DIR, { recursive: true });

const EMPTY = {
  portfolioItems: [],
  materialsDetailed: [],
  updatedAt: new Date().toISOString(),
};

function acquireLock({ timeoutMs = 5_000, staleMs = 30_000 } = {}) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const tryLock = () => {
      try {
        fs.writeFileSync(LOCK_FILE, String(process.pid), { flag: 'wx' });
        resolve(() => {
          try { fs.unlinkSync(LOCK_FILE); } catch (_e) { /* ignore */ }
        });
      } catch (error) {
        if (error.code !== 'EEXIST') return reject(error);
        try {
          const age = Date.now() - fs.statSync(LOCK_FILE).mtimeMs;
          if (age > staleMs) {
            fs.unlinkSync(LOCK_FILE);
            return tryLock();
          }
        } catch (statError) {
          if (statError.code !== 'ENOENT') return reject(statError);
        }
        if (Date.now() - startedAt >= timeoutMs) {
          return reject(new Error('Timed out waiting for catalogue lock'));
        }
        setTimeout(tryLock, 50);
      }
    };
    tryLock();
  });
}

function readCatalogue() {
  try {
    const raw = fs.readFileSync(CATALOGUE_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (!data.portfolioItems) data.portfolioItems = [];
    if (!data.materialsDetailed) data.materialsDetailed = [];
    return data;
  } catch (error) {
    if (error.code === 'ENOENT') return structuredClone(EMPTY);
    throw error;
  }
}

function writeCatalogue(data) {
  data.updatedAt = new Date().toISOString();
  const content = JSON.stringify(data, null, 2);
  const tmpFile = `${CATALOGUE_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpFile, content, 'utf8');
  fs.renameSync(tmpFile, CATALOGUE_FILE);
}

async function mutateCatalogue(mutator) {
  const release = await acquireLock();
  try {
    const data = readCatalogue();
    const result = mutator(data);
    if (result === null) return null;
    writeCatalogue(data);
    return result;
  } finally {
    release();
  }
}

export function getCatalogue() {
  return readCatalogue();
}

export function getPortfolio() {
  return readCatalogue().portfolioItems;
}

export async function addPortfolioItem(item) {
  return mutateCatalogue((data) => {
    data.portfolioItems.push(item);
    return item;
  });
}

export async function updatePortfolioItem(id, patch) {
  return mutateCatalogue((data) => {
    const idx = data.portfolioItems.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    data.portfolioItems[idx] = { ...data.portfolioItems[idx], ...patch };
    return data.portfolioItems[idx];
  });
}

export async function deletePortfolioItem(id) {
  return mutateCatalogue((data) => {
    const item = data.portfolioItems.find((i) => i.id === id);
    if (!item) return null;
    data.portfolioItems = data.portfolioItems.filter((i) => i.id !== id);
    return item;
  });
}

export function getMaterials() {
  return readCatalogue().materialsDetailed;
}

export async function setMaterials(materials) {
  return mutateCatalogue((data) => {
    data.materialsDetailed = materials;
    return data;
  });
}
