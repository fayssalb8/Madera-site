import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { business } from '../src/lib/business.ts';
import {
  absoluteUrl,
  buildLocalBusinessStructuredData,
  buildWebsiteStructuredData,
  canonicalUrl,
} from '../src/lib/seo.ts';

test('uses the live production domain for canonical URLs and assets', () => {
  assert.equal(business.siteUrl, 'https://maderakitchen-dz.com');
  assert.equal(canonicalUrl('/materiaux/hetre'), 'https://maderakitchen-dz.com/materiaux/hetre');
  assert.equal(canonicalUrl('realisations'), 'https://maderakitchen-dz.com/realisations');
  assert.equal(absoluteUrl('/hero.webp'), 'https://maderakitchen-dz.com/hero.webp');
});

test('builds complete local business structured data for Madera Kitchen', () => {
  const schema = buildLocalBusinessStructuredData();

  assert.equal(schema['@context'], 'https://schema.org');
  assert.deepEqual(schema['@type'], ['LocalBusiness', 'HomeAndConstructionBusiness']);
  assert.equal(schema.name, 'Madera Kitchen');
  assert.equal(schema.url, 'https://maderakitchen-dz.com');
  assert.equal(schema.telephone, '+213562398283');
  assert.equal(schema.logo, 'https://maderakitchen-dz.com/logo1.webp');
  assert.equal(schema.address.addressLocality, 'Mohammadia');
  assert.equal(schema.address.addressRegion, 'Alger');
  assert.equal(schema.address.addressCountry, 'DZ');
  assert.deepEqual(schema.sameAs, [
    'https://www.facebook.com/Maderakitchen16/',
    'https://www.instagram.com/mad.erakitchen',
    'https://www.tiktok.com/@maderalespins',
  ]);
});

test('builds website structured data on the canonical domain', () => {
  const schema = buildWebsiteStructuredData();

  assert.equal(schema['@context'], 'https://schema.org');
  assert.equal(schema['@type'], 'WebSite');
  assert.equal(schema.name, 'Madera Kitchen');
  assert.equal(schema.url, 'https://maderakitchen-dz.com');
  assert.equal(schema.publisher.name, 'Madera Kitchen');
});

test('sitemap only exposes indexable public routes on the canonical domain', () => {
  const sitemap = readFileSync('public/sitemap.xml', 'utf8');

  assert.match(sitemap, /https:\/\/maderakitchen-dz\.com\//);
  assert.doesNotMatch(sitemap, /madera-kitchen\.dz/);
  assert.doesNotMatch(sitemap, /\/admin/);
  assert.doesNotMatch(sitemap, /\/materiaux\/high-gloss/);
});

test('robots file blocks admin routes and references the canonical sitemap', () => {
  const robots = readFileSync('public/robots.txt', 'utf8');

  assert.match(robots, /Disallow: \/admin\//);
  assert.match(robots, /Sitemap: https:\/\/maderakitchen-dz\.com\/sitemap\.xml/);
  assert.doesNotMatch(robots, /madera-kitchen\.dz/);
});

test('above-the-fold hero images are prioritized for faster LCP', () => {
  const heroSource = readFileSync('src/components/sections/Hero.tsx', 'utf8');
  const materialPageSource = readFileSync('src/pages/MaterialPage.tsx', 'utf8');

  assert.match(heroSource, /fetchPriority="high"/);
  assert.match(heroSource, /loading="eager"/);
  assert.match(materialPageSource, /fetchPriority="high"/);
  assert.doesNotMatch(materialPageSource, /backgroundImage:\s*`url\(\$\{material\.heroImage\}\)`/);
});
