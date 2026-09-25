import { type FC } from 'react';
import { Helmet } from 'react-helmet-async';
import { business } from '@/lib/business';
import { absoluteUrl, canonicalUrl } from '@/lib/seo';

interface SEOProps {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article';
  imageAlt?: string;
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
}

const DEFAULT_IMAGE_DIMENSIONS = { width: 1200, height: 900 };

export const SEO: FC<SEOProps> = ({
  title,
  description,
  path = '/',
  image = business.defaultImage,
  type = 'website',
  imageAlt,
  structuredData,
}) => {
  const canonical = canonicalUrl(path);
  const imageUrl = absoluteUrl(image);

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="index, follow, max-image-preview:large" />
      <link rel="canonical" href={canonical} />

      <meta property="og:type" content={type} />
      <meta property="og:locale" content="fr_DZ" />
      <meta property="og:site_name" content={business.name} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content={String(DEFAULT_IMAGE_DIMENSIONS.width)} />
      <meta property="og:image:height" content={String(DEFAULT_IMAGE_DIMENSIONS.height)} />
      <meta property="og:image:alt" content={imageAlt ?? title} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      <meta name="geo.region" content={business.addressCountry} />
      <meta name="geo.placename" content={`${business.addressLocality}, ${business.addressRegion}`} />

      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};
