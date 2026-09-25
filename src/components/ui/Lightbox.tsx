import { type FC, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollLock } from '@/hooks';
import type { DisplayPortfolioItem } from '@/lib/catalogue';
import { youtubeEmbedUrl } from '@/lib/youtube';

interface LightboxProps {
  items: DisplayPortfolioItem[];
  /** Index of the open item, or null when closed. */
  index: number | null;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Full-screen accessible gallery viewer: keyboard navigation
 * (Escape closes, ←/→ browse), focus trap + restore, scroll lock,
 * prev/next controls and an "n / total" position indicator.
 */
export const Lightbox: FC<LightboxProps> = ({ items, index, onClose, onNavigate }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const isOpen = index !== null && items.length > 0;
  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNavigate(((index ?? 0) + 1) % items.length);
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onNavigate(((index ?? 0) - 1 + items.length) % items.length);
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        // Keep Tab cycling inside the lightbox chrome.
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      restoreFocusRef.current?.focus({ preventScroll: true });
    };
  }, [isOpen, index, items.length, onClose, onNavigate]);

  return (
    <AnimatePresence>
      {isOpen && index !== null && items[index] && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Visionneuse — ${items[index].title}`}
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-4xl outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Media */}
            {items[index].youtubeUrl ? (
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
                <iframe
                  src={youtubeEmbedUrl(items[index].youtubeUrl) ?? ''}
                  title={items[index].title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              </div>
            ) : items[index].videoUrl ? (
              <video
                key={items[index].id}
                src={items[index].videoUrl}
                controls
                autoPlay
                playsInline
                className="max-h-[80dvh] w-full rounded-xl bg-black object-contain"
              />
            ) : (
              <img
                key={items[index].id}
                src={items[index].image}
                alt={items[index].alt}
                decoding="async"
                className="max-h-[80dvh] w-full rounded-xl object-contain"
              />
            )}

            {/* Caption */}
            <div className="mt-3 flex items-center justify-between gap-4">
              <p className="min-w-0 truncate text-sm font-medium text-white">{items[index].title}</p>
              <p className="shrink-0 text-sm text-white/60" aria-live="polite">
                {index + 1} / {items.length}
              </p>
            </div>

            {/* Controls */}
            {items.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate(((index ?? 0) - 1 + items.length) % items.length)}
                  aria-label="Élément précédent"
                  className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-white md:-left-16"
                >
                  <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate(((index ?? 0) + 1) % items.length)}
                  aria-label="Élément suivant"
                  className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-white md:-right-16"
                >
                  <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer la visionneuse"
              className="absolute -top-12 right-0 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-white md:-top-4 md:-right-14"
            >
              <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
