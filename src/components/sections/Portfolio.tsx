import { type FC, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Lightbox } from '@/components/ui/Lightbox';
import { useCatalogue, type DisplayPortfolioItem } from '@/lib/catalogue';
import { imageSrcSet, GRID_IMAGE_SIZES } from '@/lib/images';
import { isVideoItem, portfolioItemThumbnail } from '@/lib/youtube';

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getRandomPreview(items: DisplayPortfolioItem[], count: number): DisplayPortfolioItem[] {
  const grouped: Record<string, DisplayPortfolioItem[]> = {};
  items.forEach((item) => {
    const cat = item.categories[0];
    if (!cat) return;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  const result: DisplayPortfolioItem[] = [];
  const categories = Object.keys(grouped);
  const shuffledCategories = shuffleArray(categories);
  if (shuffledCategories.length === 0) return [];
  const shuffledPools: Record<string, DisplayPortfolioItem[]> = {};
  categories.forEach((cat) => {
    shuffledPools[cat] = shuffleArray(grouped[cat]);
  });

  let idx = 0;
  while (result.length < count && result.length < items.length) {
    const cat = shuffledCategories[idx % shuffledCategories.length];
    const pool = shuffledPools[cat];
    if (pool.length > 0) {
      result.push(pool.shift()!);
    }
    idx++;
  }
  return result;
}

export const Portfolio: FC = () => {
  const { portfolioItems } = useCatalogue();
  const [lightbox, setLightbox] = useState<number | null>(null);

  // With the module-level catalogue cache, this array identity only changes
  // when actual data arrives — one shuffle per dataset, not per refetch.
  const previewItems = useMemo(
    () => getRandomPreview(portfolioItems, 6),
    [portfolioItems]
  );

  return (
    <section id="realisations" className="bg-bg py-14 sm:py-16 md:py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          label="Nos Rأ©alisations"
          title="Des Projets Qui Inspirent"
          description="Dأ©couvrez nos cuisines sur mesure et dressings rأ©alisأ©s avec les meilleurs matأ©riaux."
        />

        <div className="columns-1 gap-3 space-y-3 sm:columns-2 sm:gap-4 sm:space-y-4 lg:columns-3">
          {previewItems.map((item, index) => {
            const thumb = portfolioItemThumbnail(item);
            const isVideo = isVideoItem(item);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.4, delay: (index % 3) * 0.1 }}
                className="group break-inside-avoid overflow-hidden rounded-xl sm:rounded-2xl"
              >
                <button
                  type="button"
                  onClick={() => setLightbox(index)}
                  aria-label={`Agrandir : ${item.title}`}
                  className="w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 rounded-xl cursor-pointer"
                >
                <div
                  className="w-full transition-transform duration-300 group-hover:scale-[1.03] relative"
                  style={{ backgroundColor: item.color, aspectRatio: item.aspectRatio }}
                >
                  {thumb ? (
                    <img
                      src={imageSrcSet(item.image) ? item.image : thumb}
                      srcSet={imageSrcSet(item.image)}
                      sizes={imageSrcSet(item.image) ? GRID_IMAGE_SIZES : undefined}
                      alt={item.alt}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : item.videoUrl ? (
                    <video src={item.videoUrl} preload="metadata" muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                  ) : null}

                  {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                        <svg aria-hidden="true" className="w-5 h-5 text-primary-600 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* Caption: always visible on touch, revealed on hover for pointer devices */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-100 transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
                    <p className="text-white text-sm font-medium">{item.title}</p>
                  </div>
                </div>
                </button>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/realisations"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-primary-500 bg-transparent px-8 py-3 text-sm font-semibold text-primary-500 transition-all hover:bg-primary-500 hover:text-white cursor-pointer sm:w-auto"
          >
            Voir Toutes Nos Rأ©alisations â†’
          </Link>
        </div>
      </div>

      <Lightbox
        items={previewItems}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onNavigate={setLightbox}
      />
    </section>
  );
};
