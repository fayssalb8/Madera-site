import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const indexHtml = readFileSync('index.html', 'utf8');

test('does not globally preload logo image on routes that may not render it', () => {
  assert.doesNotMatch(indexHtml, /<link[^>]+rel=["']preload["'][^>]+href=["']\/logo1\.webp["']/i);
});
