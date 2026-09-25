import { useEffect, useState } from 'react';
import type { MaterialDetail } from '@/data/materialsDetailed';
import { materialsDetailed as materialsFallback } from '@/data/materialsDetailed';
import { catalogueApi } from '@/lib/api';

export interface PortfolioItemServer {
  id: string;
  title: string;
  alt?: string | null;
  image?: string | null;
  youtubeUrl?: string | null;
  videoUrl?: string | null;
  color: string;
  aspectRatio: string;
  categories: string[];
  position?: number;
}

/** Item ready to render on the public site. */
export interface DisplayPortfolioItem {
  id: string;
  title: string;
  alt: string;
  image: string;
  youtubeUrl?: string | null;
  videoUrl?: string | null;
  color: string;
  aspectRatio: string;
  categories: string[];
}

export const DEFAULT_CATEGORIES = ['Tous', 'Chêne', 'Frêne', 'Hêtre', 'MDF', 'High Gloss', 'Dressing'] as const;

function convertServerItem(i: PortfolioItemServer): DisplayPortfolioItem | null {
  const image = i.image ?? '';
  if (!image && !i.youtubeUrl && !i.videoUrl) return null;
  return {
    id: i.id,
    title: i.title,
    alt: i.alt?.trim() || i.title,
    image,
    youtubeUrl: i.youtubeUrl ?? null,
    videoUrl: i.videoUrl ?? null,
    color: i.color || '#B89872',
    aspectRatio: i.aspectRatio || '4/3',
    categories: i.categories ?? [],
  };
}

export interface CatalogueState {
  loading: boolean;
  portfolioItems: DisplayPortfolioItem[];
  materialsDetailed: Record<string, MaterialDetail>;
  categories: string[];
}

// ── Module-level cache ───────────────────────────────────────────────────────
// Multiple components mount across navigations (HomePage, PortfolioPage,
// MaterialPage); without a shared cache each mount refetched both endpoints.
interface CatalogueResponse {
  rawItems: PortfolioItemServer[];
  serverMaterials: MaterialDetail[];
}
let catalogueCache: Promise<CatalogueResponse> | null = null;

function fetchCatalogue(): Promise<CatalogueResponse> {
  if (!catalogueCache) {
    catalogueCache = Promise.all([
      catalogueApi.getPortfolio().catch(() => null),
      catalogueApi.getMaterials().catch(() => null),
    ]).then(([portfolioRes, materialsRes]) => ({
      rawItems: portfolioRes?.items ?? [],
      serverMaterials: materialsRes?.materials ?? [],
    }));
  }
  return catalogueCache;
}

/** Forget the cached catalogue (e.g. after admin mutations). */
export function invalidateCatalogueCache(): void {
  catalogueCache = null;
}

export function useCatalogue(): CatalogueState {
  const [loading, setLoading] = useState(true);
  const [portfolioItems, setPortfolioItems] = useState<DisplayPortfolioItem[]>([]);
  const [materialsDetailed, setMaterialsDetailed] = useState<Record<string, MaterialDetail>>(
    () => ({ ...materialsFallback })
  );
  const [categories, setCategories] = useState<string[]>([...DEFAULT_CATEGORIES]);

  useEffect(() => {
    let cancelled = false;
    fetchCatalogue().then(({ rawItems, serverMaterials }) => {
      if (cancelled) return;

      const serverItems = rawItems
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map(convertServerItem)
        .filter((x): x is DisplayPortfolioItem => Boolean(x));

      setPortfolioItems(serverItems);
      const dynamicCats = Array.from(new Set(serverItems.flatMap((i) => i.categories)));
      const merged = ['Tous', ...new Set([...DEFAULT_CATEGORIES.slice(1), ...dynamicCats])];
      setCategories(merged);

      if (serverMaterials.length > 0) {
        const matMap: Record<string, MaterialDetail> = { ...materialsFallback };
        serverMaterials.forEach((m: MaterialDetail) => {
          matMap[m.id] = m;
        });
        setMaterialsDetailed(matMap);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return { loading, portfolioItems, materialsDetailed, categories };
}

export { materialsFallback };
