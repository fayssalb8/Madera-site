/**
 * Dynamic sitemap generation from the live catalogue.
 * Served at /sitemap.xml by the Express server so newly added materials are
 * indexed without a redeploy. public/sitemap.xml remains as a fallback for
 * static hosting and is kept in sync with the same route set.
 */
const DEFAULT_MATERIAL_SLUGS = ['hetre', 'chene', 'frene', 'mdf', 'egger'];

function xmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * Build the sitemap XML.
 * @param {object} options
 * @param {string} options.siteUrl  Absolute site origin, no trailing slash.
 * @param {Array<{id: string}>} [options.materials]  Catalogue materials.
 */
export function generateSitemap({ siteUrl, materials = [] } = {}) {
  const base = (siteUrl ?? '').replace(/\/+$/, '');
  const today = new Date().toISOString().slice(0, 10);

  const slugs = materials.length > 0
    ? materials.map((m) => m.id).filter(Boolean)
    : DEFAULT_MATERIAL_SLUGS;

  const entries = [
    { path: '/', priority: '1.0' },
    ...slugs.map((slug) => ({ path: `/materiaux/${slug}`, priority: '0.8' })),
    { path: '/realisations', priority: '0.7' },
    { path: '/devis', priority: '0.6' },
  ];

  const urls = entries
    .map(
      (e) =>
        `  <url>\n    <loc>${xmlEscape(`${base}${e.path}`)}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${e.priority}</priority>\n  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
