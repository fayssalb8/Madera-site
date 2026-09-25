import { type FC } from 'react';
import { Hero } from '@/components/sections/Hero';
import { Process } from '@/components/sections/Process';
import { Materials } from '@/components/sections/Materials';
import { Portfolio } from '@/components/sections/Portfolio';
import { SEO } from '@/components/seo/SEO';
import { buildWebsiteStructuredData } from '@/lib/seo';

// LocalBusiness JSON-LD lives in index.html (server-rendered, crawler-first);
// only the WebSite schema is injected here to avoid duplicate entities.
const structuredData = [buildWebsiteStructuredData()];

export const HomePage: FC = () => {
  return (
    <main>
      <SEO
        title="Madera Kitchen | Cuisine sur mesure moderne en Algérie"
        description="Madera Kitchen fabrique et installe des cuisines sur mesure modernes en Algérie : design 3D, matériaux premium et devis gratuit en 24h."
        structuredData={structuredData}
      />
      <Hero />
      <Materials />
      <Process />
      <Portfolio />
    </main>
  );
};
