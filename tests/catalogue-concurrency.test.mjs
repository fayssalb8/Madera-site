import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('catalogue mutations preserve concurrent updates', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'madera-catalogue-'));
  process.env.CATALOGUE_PATH = dataDir;

  try {
    const catalogue = await import(`../server/lib/catalogue.mjs?test=${Date.now()}`);
    await Promise.all(Array.from({ length: 20 }, (_, index) =>
      catalogue.addPortfolioItem({
        id: String(index),
        title: `Item ${index}`,
        image: '/image.webp',
        categories: ['Chêne'],
      })
    ));

    const items = catalogue.getPortfolio();
    assert.equal(items.length, 20);
    assert.equal(new Set(items.map((item) => item.id)).size, 20);
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true });
    delete process.env.CATALOGUE_PATH;
  }
});
