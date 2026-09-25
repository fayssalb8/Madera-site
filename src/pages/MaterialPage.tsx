import { type FC, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useWizardStore } from '@/store/wizardStore';
import { SEO } from '@/components/seo/SEO';
import { buildServiceStructuredData, buildBreadcrumbStructuredData } from '@/lib/seo';
import { useCatalogue } from '@/lib/catalogue';
import { imageSrcSet, GRID_IMAGE_SIZES } from '@/lib/images';

export const MaterialPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const openWizard = useWizardStore((s) => s.openWizard);
  const { materialsDetailed, portfolioItems } = useCatalogue();

  const material = id ? materialsDetailed[id] : null;

  const materialPortfolio = useMemo(() => {
    if (!material) return [];
    const materialName = material.name.toLowerCase().replace('cuisine en ', '');
    return portfolioItems
      .filter((item) => item.categories.some((cat) => cat.toLowerCase().includes(materialName)))
      .slice(0, 3);
  }, [portfolioItems, material]);

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [id]);

  if (!material) {
    return (
      <main className="bg-bg min-h-screen flex items-center justify-center px-4 pt-16">
        <SEO
          title="Matériau introuvable | Madera Kitchen"
          description="Le matériau recherché n'existe pas ou n'est plus disponible."
          path="/materiaux"
        />
        <div className="max-w-md text-center">
          <p className="text-6xl mb-6" aria-hidden="true">🪵</p>
          <h1 className="text-2xl font-bold text-text-primary mb-3">
            Matériau introuvable
          </h1>
          <p className="text-text-secondary mb-8">
            Le matériau que vous cherchez n'existe pas ou n'est plus disponible.
            Découvrez nos autres matériaux ou contactez-nous directement.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/#materiaux"
              className="inline-flex items-center justify-center rounded-xl bg-primary-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-600"
            >
              Voir nos matériaux
            </Link>
            <Link
              to="/realisations"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-6 py-3 font-semibold text-text-secondary transition-colors hover:text-text-primary hover:border-primary-300"
            >
              Nos réalisations
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const title = `${material.name} sur mesure | Madera Kitchen`;
  const description = `${material.name} sur mesure à Alger : design 3D, fabrication locale et pose professionnelle. Devis gratuit Madera Kitchen en 24h.`;
  // Data titles are suffixed with "by Madera" — display only the subject.
  const detailsHeading = material.detailsTitle.replace(/\s*by\s+Madera\s*$/i, '');
  const structuredData = [
    buildServiceStructuredData({
      name: `${material.name} sur mesure`,
      description,
      path: `/materiaux/${material.id}`,
      image: material.heroImage,
    }),
    buildBreadcrumbStructuredData([
      { name: material.name, path: `/materiaux/${material.id}` },
    ]),
  ];

  return (
    <main className="bg-surface">
      <SEO
        title={title}
        description={description}
        path={`/materiaux/${material.id}`}
        image={material.heroImage}
        structuredData={structuredData}
      />
      {/* Hero Section */}
      <section className="relative h-[50vh] min-h-[400px] flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 z-0">
          <img
            src={material.heroImage}
            alt={material.heroHeadline}
            width={1600}
            height={900}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight"
          >
            {material.heroHeadline}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-white/90 font-medium"
          >
            {material.heroSubheadline}
          </motion.p>
        </div>
      </section>

      {/* Intro Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6 leading-tight">
            {material.introTitle}
          </h2>
          <p className="text-text-secondary text-lg leading-relaxed">
            {material.introDescription}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {material.features.map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02, y: -5 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-white rounded-2xl p-8 border border-border text-center shadow-sm hover:shadow-xl transition-shadow cursor-default"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold text-text-primary mb-3">
                {feature.title}
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Details Split Section */}
      <section className="bg-primary-900 text-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white leading-tight">
              {detailsHeading}
            </h2>
            <p className="text-primary-100 text-lg leading-relaxed">
              Chez Madera, nous transformons le {material.name.toLowerCase().replace('cuisine en ', '')} en cuisines modernes, personnalisées et fonctionnelles. 
              Nos équipes vous accompagnent pour concevoir une cuisine sur-mesure qui combine esthétique, confort et budget maîtrisé.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-4"
          >
            {material.detailsChecklist.map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="mt-1 w-6 h-6 rounded-full bg-primary-800 flex items-center justify-center shrink-0 border border-primary-700">
                  <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-primary-100 text-base leading-relaxed">
                  {item}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Styles Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <SectionHeader
          label="Styles"
          title={material.stylesTitle}
          description={material.stylesDescription}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
          {material.styleImages.map((style, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -5 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.2 }}
              className="group cursor-pointer"
            >
              <div className="aspect-[4/3] rounded-2xl overflow-hidden mb-6 relative shadow-sm transition-shadow group-hover:shadow-2xl">
                <img
                  src={style.src}
                  alt={style.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-2 text-center text-primary-800">
                {style.title}
              </h3>
              <p className="text-text-secondary text-center max-w-sm mx-auto">
                {style.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-50 border-y border-border py-20 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6">
            {material.ctaTitle}
          </h2>
          <p className="text-text-secondary text-lg mb-8">
            Alliez élégance naturelle, robustesse et personnalisation pour un espace qui vous ressemble.
          </p>
          <Button size="lg" onClick={openWizard} className="shadow-lg shadow-primary-500/20">
            Obtenir un devis →
          </Button>
        </div>
      </section>

      {/* Portfolio Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <SectionHeader
          label="Inspiration"
          title={material.portfolioHeadline}
          description="Découvrez nos dernières réalisations inspirées de ce matériau."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-12">
          {materialPortfolio.length > 0 ? (
            materialPortfolio.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="aspect-square rounded-2xl relative overflow-hidden group border border-border-subtle"
                style={{ backgroundColor: item.color }}
              >
                <Link
                  to={`/realisations?material=${encodeURIComponent(item.categories[0] ?? '')}`}
                  aria-label={`Voir la réalisation ${item.title}`}
                  className="absolute inset-0 block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      srcSet={imageSrcSet(item.image)}
                      sizes={imageSrcSet(item.image) ? GRID_IMAGE_SIZES : undefined}
                      alt={item.alt}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : null}
                  {/* Caption always visible on touch, hover-revealed on desktop */}
                  <div className="absolute inset-0 bg-primary-900/60 flex items-center justify-center backdrop-blur-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
                    <span className="text-white font-medium border border-white/30 px-6 py-2 rounded-full">{item.title}</span>
                  </div>
                </Link>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-text-muted">
              <Link
                to="/realisations"
                className="text-primary-500 hover:text-primary-600 font-medium"
              >
                Voir toutes les réalisations →
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};
