import { type FC, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SEO } from '@/components/seo/SEO';
import { Lightbox } from '@/components/ui/Lightbox';
import { business } from '@/lib/business';
import { buildBreadcrumbStructuredData } from '@/lib/seo';
import { useCatalogue, type DisplayPortfolioItem } from '@/lib/catalogue';
import { imageSrcSet, GRID_IMAGE_SIZES } from '@/lib/images';
import { isVideoItem, portfolioItemThumbnail } from '@/lib/youtube';

const PAGE_SIZE = 24;

function PortfolioCard({ item, index, onClick }: {
  item: DisplayPortfolioItem;
  index: number;
  onClick: () => void;
}) {
  const thumb = portfolioItemThumbnail(item);
  const isVideo = isVideoItem(item);
  const srcSet = imageSrcSet(item.image);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.01, y: -4 }}
      transition={{ duration: 0.3 }}
      className="group break-inside-avoid overflow-hidden rounded-xl sm:rounded-2xl"
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={`Agrandir : ${item.title}`}
        className="w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 rounded-xl cursor-pointer"
      >
      <div
        className="w-full transition-transform duration-300 group-hover:scale-[1.03] relative"
        style={{ backgroundColor: item.color, aspectRatio: item.aspectRatio }}
      >
        {thumb ? (
          <img
            src={srcSet ? item.image : thumb}
            srcSet={srcSet}
            sizes={srcSet ? GRID_IMAGE_SIZES : undefined}
            alt={item.alt}
            loading={index < 6 ? 'eager' : 'lazy'}
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : item.videoUrl ? (
          <video
            src={item.videoUrl}
            preload="metadata"
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : null}

        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
              <svg aria-hidden="true" className="w-6 h-6 text-primary-600 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}

        {/* Caption: always visible on touch, revealed on hover for pointer devices */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-5 opacity-100 transition-all duration-300 translate-y-0 md:translate-y-4 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:focus-within:translate-y-0 md:focus-within:opacity-100 text-left">
          <p className="text-white text-base font-medium">{item.title}</p>
          <div className="flex items-center gap-2 mt-2">
            {item.categories.map((cat) => (
              <span key={cat} className="text-xs text-white/80 bg-white/20 px-2 py-1 rounded-md backdrop-blur-sm">
                {cat}
              </span>
            ))}
          </div>
        </div>
      </div>
      </button>
    </motion.div>
  );
}

export const PortfolioPage: FC = () => {
  const { portfolioItems, categories, loading } = useCatalogue();
  const [searchParams, setSearchParams] = useSearchParams();
  const materialParam = searchParams.get('material');

  // Derive the active category from the URL so deep links like
  // /realisations?material=Dressing work, including late-arriving categories.
  const activeCategory =
    materialParam && materialParam !== 'Tous' && categories.includes(materialParam)
      ? materialParam
      : 'Tous';

  const [lightbox, setLightbox] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // Reset pagination when the category changes — adjusted during render
  // (React-recommended pattern) so URL-driven changes are covered too.
  const [prevCategory, setPrevCategory] = useState(activeCategory);
  if (prevCategory !== activeCategory) {
    setPrevCategory(activeCategory);
    setVisibleCount(PAGE_SIZE);
  }

  const handleCategoryChange = (category: string) => {
    if (category === 'Tous') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ material: category }, { replace: true });
    }
    setLightbox(null);
  };

  const filteredItems = useMemo(() => {
    if (activeCategory === 'Tous') return portfolioItems;
    return portfolioItems.filter((item) => item.categories.includes(activeCategory));
  }, [activeCategory, portfolioItems]);

  const visibleItems = useMemo(
    () => filteredItems.slice(0, visibleCount),
    [filteredItems, visibleCount],
  );

  const structuredData = useMemo(() => [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Réalisations Madera Kitchen',
      url: `${business.siteUrl}/realisations`,
      description: 'Portfolio de cuisines sur mesure installées en Algérie.',
    },
    buildBreadcrumbStructuredData([
      { name: 'Réalisations', path: '/realisations' },
    ]),
  ], []);

  return (
    <div className="min-h-screen bg-bg pb-14 pt-20 sm:pb-16 sm:pt-24">
      <SEO
        title="Réalisations de cuisines sur mesure | Madera Kitchen"
        description="Découvrez le portfolio Madera Kitchen : cuisines modernes, classiques, appartements et villas réalisées sur mesure en Algérie."
        path="/realisations"
        structuredData={structuredData}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          label="Portfolio"
          title="Nos Réalisations"
          description="Filtrez par type de matériau pour trouver l'inspiration parfaite pour votre future cuisine."
        />

        {/* Filter Bar */}
        <div role="group" aria-label="Filtrer les réalisations par matériau" className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:mb-12 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategoryChange(cat)}
              aria-pressed={activeCategory === cat}
              className={`shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 cursor-pointer ${
                activeCategory === cat
                  ? 'bg-primary-500 text-white shadow-md'
                  : 'bg-surface text-text-secondary border border-border hover:border-primary-300 hover:text-primary-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Masonry Grid */}
        {loading && portfolioItems.length === 0 ? (
          <div className="columns-1 gap-3 space-y-3 sm:columns-2 sm:gap-4 sm:space-y-4 lg:columns-3" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="animate-pulse break-inside-avoid rounded-xl bg-surface-hover"
                style={{ aspectRatio: i % 3 === 1 ? '3/4' : '4/3' }}
              />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface py-16 text-center">
            <p className="text-sm font-medium text-text-primary">Aucune réalisation trouvée</p>
            <p className="mt-1 text-xs text-text-muted">
              Revenez bientôt : nos nouvelles réalisations sont ajoutées régulièrement.
            </p>
          </div>
        ) : (
          <>
            <motion.div layout className="columns-1 gap-3 space-y-3 sm:columns-2 sm:gap-4 sm:space-y-4 lg:columns-3">
              <AnimatePresence>
                {visibleItems.map((item, index) => (
                  <PortfolioCard
                    key={item.id}
                    item={item}
                    index={index}
                    onClick={() => setLightbox(filteredItems.findIndex((p) => p.id === item.id))}
                  />
                ))}
              </AnimatePresence>
            </motion.div>

            {visibleItems.length < filteredItems.length && (
              <div className="mt-12 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => Math.min(count + PAGE_SIZE, filteredItems.length))}
                  className="inline-flex w-full items-center justify-center rounded-full border-2 border-primary-500 px-8 py-3 text-sm font-semibold text-primary-500 transition-all hover:bg-primary-500 hover:text-white cursor-pointer sm:w-auto"
                >
                  Voir plus de réalisations ({filteredItems.length - visibleItems.length} restantes)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <Lightbox
        items={filteredItems}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onNavigate={setLightbox}
      />
    </div>
  );
};
