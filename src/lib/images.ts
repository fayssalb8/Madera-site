/**
 * Responsive-image helpers.
 *
 * Uploaded images are stored as `<base>-optimized.webp` (max 1920px) plus a
 * small `<base>-thumb.webp` (480px). Exposing both via `srcSet` lets phones
 * download the ~30 KB thumb instead of the full-size image — a major mobile
 * data / LCP win on the portfolio grids.
 */

const OPTIMIZED_RE = /^(.*\/uploads\/.+)-optimized\.webp$/;

/** srcSet covering the two generated sizes, or undefined when not applicable. */
export function imageSrcSet(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const match = OPTIMIZED_RE.exec(url);
  if (!match) return undefined;
  return `${match[1]}-thumb.webp 480w, ${url} 1920w`;
}

/**
 * Sensible `sizes` for a grid card: full-width on phones, half on tablets,
 * roughly a third on desktop masonry layouts.
 */
export const GRID_IMAGE_SIZES = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
