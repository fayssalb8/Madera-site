import { business } from './business.ts';

type StructuredData = Record<string, unknown>;

export function canonicalUrl(path = '/'): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalizedPath, business.siteUrl).toString();
}

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(path.startsWith('/') ? path : `/${path}`, business.siteUrl).toString();
}

export function buildLocalBusinessStructuredData(): StructuredData {
  const businessId = `${business.siteUrl}/#localbusiness`;

  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'HomeAndConstructionBusiness'],
    '@id': businessId,
    name: business.name,
    url: business.siteUrl,
    logo: absoluteUrl(business.logoPath),
    image: absoluteUrl(business.defaultImage),
    telephone: business.phoneE164,
    email: business.email,
    priceRange: '$$',
    description: 'Conception, fabrication et installation de cuisines sur mesure modernes en Algérie.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.addressStreet,
      addressLocality: business.addressLocality,
      addressRegion: business.addressRegion,
      addressCountry: business.addressCountry,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 36.7236,
      longitude: 3.1426,
    },
    areaServed: business.serviceAreas.map((area) => ({
      '@type': 'AdministrativeArea',
      name: area,
    })),
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: business.phoneE164,
      contactType: 'customer service',
      areaServed: business.addressCountry,
      availableLanguage: ['fr', 'ar'],
    },
    sameAs: business.socialLinks,
  };
}

export function buildWebsiteStructuredData(): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${business.siteUrl}/#website`,
    name: business.name,
    url: business.siteUrl,
    inLanguage: 'fr-DZ',
    publisher: {
      '@id': `${business.siteUrl}/#localbusiness`,
      name: business.name,
    },
  };
}

export function buildServiceStructuredData({
  name,
  description,
  path,
  image,
}: {
  name: string;
  description: string;
  path: string;
  image?: string;
  [key: string]: unknown;
}): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    url: canonicalUrl(path),
    description,
    image: image ? absoluteUrl(image) : undefined,
    provider: {
      '@id': `${business.siteUrl}/#localbusiness`,
      '@type': 'LocalBusiness',
      name: business.name,
      url: business.siteUrl,
      telephone: business.phoneE164,
    },
    areaServed: business.serviceAreas.map((area) => ({
      '@type': 'AdministrativeArea',
      name: area,
    })),
  };
}

export function buildBreadcrumbStructuredData(
  items: Array<{ name: string; path?: string }>,
): StructuredData {
  const crumbs = [
    { name: 'Accueil', path: '/' },
    ...items,
  ];

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.path ? canonicalUrl(item.path) : undefined,
    })),
  };
}
