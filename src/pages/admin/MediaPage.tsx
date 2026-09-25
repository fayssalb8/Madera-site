import { type FC, useEffect, useRef, useState, type FormEvent, type ChangeEvent, type DragEvent } from 'react';
import { catalogueApi, apiUpload, adminApi, type WebpConversionSummary } from '@/lib/api';
import { compressImage, createPreviewUrl, mapWithConcurrency } from '@/lib/imageCompress';
import { DEFAULT_CATEGORIES, invalidateCatalogueCache, type PortfolioItemServer } from '@/lib/catalogue';
import { parseYoutubeId, youtubeThumbnail } from '@/lib/youtube';

// ── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  id?: string;
  title: string;
  alt: string;
  image: string;
  youtubeUrl: string;
  videoUrl: string;
  aspectRatio: string;
  categories: string[];
  position: number;
}

interface PendingFile {
  id: string;
  file: File;
  preview: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  alt: '',
  image: '',
  youtubeUrl: '',
  videoUrl: '',
  aspectRatio: '4/3',
  categories: ['Chêne'],
  position: 0,
};

const ALL_CATEGORIES = DEFAULT_CATEGORIES.slice(1); // without 'Tous'

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // must match server limit
/** Images get compressed client-side before upload, so larger sources are OK. */
const MAX_SOURCE_IMAGE_BYTES = 60 * 1024 * 1024;
/** Parallel uploads during a bulk import. */
const BULK_CONCURRENCY = 4;
/** Attempts per file (1 try + 2 retries with backoff). */
const BULK_ATTEMPTS = 3;

/** Reads intrinsic dimensions of an image file; falls back to 4/3 on failure. */
async function imageAspectRatio(file: File): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    bitmap.close();
    if (!width || !height) return '4/3';
    return `${width}/${height}`;
  } catch {
    return '4/3';
  }
}

function isUploadable(file: File): boolean {
  const isImage = file.type.startsWith('image/');
  // Images are compressed in-browser before upload → larger sources allowed.
  if (isImage && file.size <= MAX_SOURCE_IMAGE_BYTES) {
    return /^image\/(jpeg|png|webp|gif)$/.test(file.type);
  }
  return file.size <= MAX_UPLOAD_BYTES && /^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm))$/.test(file.type);
}

function mapPortfolioItems(raw: PortfolioItemServer[] | undefined): FormState[] {
  return (raw ?? [])
    .sort((a: PortfolioItemServer, b: PortfolioItemServer) => (a.position ?? 0) - (b.position ?? 0))
    .map((i: PortfolioItemServer) => ({
      id: i.id as string,
      title: (i.title as string) ?? '',
      alt: (i.alt as string) ?? '',
      image: (i.image as string) ?? '',
      youtubeUrl: (i.youtubeUrl as string) ?? '',
      videoUrl: (i.videoUrl as string) ?? '',
      aspectRatio: i.aspectRatio ?? '4/3',
      categories: (i.categories as string[]) ?? [],
      position: (i.position as number) ?? 0,
    }));
}

// ── Component ────────────────────────────────────────────────────────────────

export const MediaPage: FC = () => {
  const [items, setItems] = useState<FormState[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('Tous');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [converting, setConverting] = useState(false);
  const [webpResult, setWebpResult] = useState<WebpConversionSummary | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  /** Refetch items and drop the public-site cache so visitors see changes. */
  const refreshItems = async () => {
    invalidateCatalogueCache();
    const { items: raw } = await catalogueApi.getPortfolio();
    setItems(mapPortfolioItems(raw));
  };

  // ── Load items ────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    catalogueApi.getPortfolio().then(({ items: raw }) => {
      if (cancelled) return;
      setItems(mapPortfolioItems(raw));
    }).catch((err) => {
      if (cancelled) return;
      console.error('Failed to load portfolio:', err);
      setError('Impossible de charger le portfolio. Vérifiez que le serveur est démarré.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // ── Form helpers ──────────────────────────────────────────────────────────

  const openEdit = (item: FormState) => {
    setForm({ ...item });
    setIsEditing(true);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setForm(EMPTY_FORM);
    setIsEditing(false);
    setError(null);
  };

  const toggleCategory = (cat: string) => {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
  };

  // ── File upload ───────────────────────────────────────────────────────────

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!isUploadable(file)) {
      setError(
        file.size > MAX_SOURCE_IMAGE_BYTES
          ? 'Fichier trop volumineux.'
          : 'Type de fichier non autorisé.'
      );
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const isVideo = file.type.startsWith('video/');
      // Compress images in-browser before sending (keeps payloads small).
      const toUpload = isVideo ? file : await compressImage(file);
      const aspectRatio = !isVideo ? await imageAspectRatio(toUpload) : '16/9';
      const url = await apiUpload(toUpload);
      setForm((f) => ({
        ...f,
        title: f.title || file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim(),
        image: isVideo ? '' : url,
        videoUrl: isVideo ? url : '',
        youtubeUrl: isVideo ? '' : f.youtubeUrl,
        aspectRatio,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setDragOver(false);
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;

    const rejected = list.filter((f) => !isUploadable(f));
    if (rejected.length === list.length) {
      setError(
        rejected.some((f) => f.size > MAX_UPLOAD_BYTES)
          ? 'Fichier(s) trop volumineux (max 20 Mo).'
          : 'Type de fichier non autorisé.'
      );
      return;
    }

    const accepted = list.filter((f) => isUploadable(f));

    // Single file → keep the existing single-item flow.
    if (accepted.length === 1 && rejected.length === 0 && !accepted[0].type.startsWith('image/')) {
      void handleFile(accepted[0]);
      return;
    }

    // Multiple files → bulk import queue (images only).
    const images = accepted.filter((f) => f.type.startsWith('image/'));
    if (images.length === 0) {
      void handleFile(accepted[0]);
      return;
    }
    if (rejected.length > 0) {
      setError(`${rejected.length} fichier(s) ignoré(s) : format non autorisé ou supérieur à la limite.`);
    }
    // Lightweight canvas previews — full-resolution object URLs would make
    // the browser lag with 30+ large photos queued at once.
    const withPreviews = await Promise.all(
      images.map(async (file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        preview: await createPreviewUrl(file),
      }))
    );
    setPendingFiles((prev) => [...prev, ...withPreviews]);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length) void handleFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onDragOver = (e: DragEvent) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length) handleFiles(files);
  };

  const removePendingFile = (id: string) => {
    setPendingFiles((prev) => {
      const target = prev.find((pf) => pf.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((pf) => pf.id !== id);
    });
  };

  const clearPendingFiles = () => {
    setPendingFiles((prev) => {
      prev.forEach((pf) => URL.revokeObjectURL(pf.preview));
      return [];
    });
  };

  // ── Bulk import ──────────────────────────────────────────────────────────

  const handleBulkSubmit = async () => {
    if (pendingFiles.length === 0) return;
    if (form.categories.length === 0) {
      setError("Sélectionnez au moins une catégorie pour l'import en masse.");
      return;
    }
    setBulkUploading(true);
    setBulkProgress({ done: 0, total: pendingFiles.length });
    setError(null);

    // New items continue after the highest existing position.
    const basePosition = items.reduce((max, i) => Math.max(max, i.position ?? 0), -1);
    const files = [...pendingFiles];
    const total = files.length;

    let added = 0;
    let completed = 0;
    const failed: string[] = [];

    /** Upload with retry + exponential backoff (transient network/429 errors). */
    const uploadWithRetry = async (file: File): Promise<string> => {
      let lastError: unknown;
      for (let attempt = 0; attempt < BULK_ATTEMPTS; attempt++) {
        try {
          return await apiUpload(file);
        } catch (err) {
          lastError = err;
          if (attempt < BULK_ATTEMPTS - 1) {
            await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
          }
        }
      }
      throw lastError instanceof Error ? lastError : new Error('Échec du téléversement');
    };

    // Parallel uploads with bounded concurrency — much faster than a
    // sequential loop for large batches without overwhelming the server.
    await mapWithConcurrency(files, BULK_CONCURRENCY, async (pf, i) => {
      try {
        // Compress in-browser first → smaller payloads, faster transfers.
        const toUpload = await compressImage(pf.file);
        const url = await uploadWithRetry(toUpload);
        const title =
          pf.file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() ||
          'Réalisation Madera Kitchen';
        const aspectRatio = await imageAspectRatio(toUpload);
        await catalogueApi.addPortfolioItem({
          image: url,
          title,
          alt: title,
          aspectRatio,
          categories: form.categories,
          position: basePosition + 1 + i,
        });
        added += 1;
      } catch (err) {
        console.error(`Bulk import failed for ${pf.file.name}:`, err);
        failed.push(pf.file.name);
      }
      completed += 1;
      setBulkProgress({ done: completed, total });
    });

    clearPendingFiles();
    try {
      await refreshItems();
    } catch {
      // reload failure is non-fatal here
    }
    setBulkUploading(false);
    setBulkProgress(null);

    if (failed.length > 0) {
      setError(
        `${added} élément(s) ajouté(s), ${failed.length} en échec : ${failed.join(', ')}.`
      );
    } else {
      flash(`${added} élément${added > 1 ? 's' : ''} ajouté${added > 1 ? 's' : ''} au portfolio.`);
    }
  };

  // ── Manual WebP conversion ────────────────────────────────────────────────

  const handleConvertWebp = async () => {
    setConverting(true);
    setWebpResult(null);
    setError(null);
    try {
      const summary = await adminApi.convertWebp();
      if (summary.error) throw new Error(summary.error);
      setWebpResult(summary);
      if (summary.failed > 0) {
        setError(`Conversion WebP : ${summary.failed} fichier(s) en échec.`);
      } else {
        flash('Conversion WebP terminée.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la conversion WebP');
    } finally {
      setConverting(false);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.image && !form.youtubeUrl && !form.videoUrl) {
      setError('Fournissez une image, une vidéo ou une URL YouTube.');
      return;
    }
    if (form.youtubeUrl && !parseYoutubeId(form.youtubeUrl)) {
      setError("L'URL YouTube n'est pas valide.");
      return;
    }
    if (form.categories.length === 0) { setError('Sélectionnez au moins une catégorie.'); return; }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title.trim() || 'Réalisation Madera Kitchen',
        alt: form.alt.trim() || null,
        image: form.image || null,
        youtubeUrl: form.youtubeUrl.trim() || null,
        videoUrl: form.videoUrl || null,
        aspectRatio: form.youtubeUrl ? '16/9' : form.aspectRatio,
        categories: form.categories,
        position: form.position,
      };
      if (isEditing && form.id) {
        await catalogueApi.updatePortfolioItem(form.id, payload);
        flash('Élément mis à jour.');
      } else {
        await catalogueApi.addPortfolioItem(payload);
        flash('Élément ajouté au portfolio.');
      }
      setForm(EMPTY_FORM);
      setIsEditing(false);
      await refreshItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Supprimer « ${title} » ?`)) return;
    setError(null);
    try {
      await catalogueApi.deletePortfolioItem(id);
      flash('Élément supprimé.');
      await refreshItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression.');
    }
  };

  // ── Bulk delete ───────────────────────────────────────────────────────────

  const enterSelectMode = () => {
    setSelectMode(true);
    setSelectedIds(new Set());
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds(new Set(filteredItems.map((i) => i.id as string)));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!window.confirm(`Supprimer ${count} élément${count > 1 ? 's' : ''} ?`)) return;
    setDeleting(true);
    setError(null);
    try {
      const results = await Promise.allSettled(
        [...selectedIds].map((id) => catalogueApi.deletePortfolioItem(id))
      );
      const failedCount = results.filter((r) => r.status === 'rejected').length;
      exitSelectMode();
      await refreshItems();
      if (failedCount > 0) {
        setError(`${count - failedCount} élément(s) supprimé(s), ${failedCount} en échec.`);
      } else {
        flash(`${count} élément${count > 1 ? 's' : ''} supprimé${count > 1 ? 's' : ''}.`);
      }
    } finally {
      setDeleting(false);
    }
  };

  // ── Reorder ───────────────────────────────────────────────────────────────

  /**
   * Persist a complete ordering. Every item gets its array index as position,
   * which repairs legacy duplicate/zero positions instead of swapping two
   * values inside an otherwise unordered set (the source of past corruption).
   */
  const persistOrder = async (ordered: FormState[]) => {
    const moved = ordered
      .map((item, index) => ({ id: item.id as string, position: index }))
      .filter(({ id, position }) => {
        const previous = items.find((i) => i.id === id);
        return !previous || (previous.position ?? 0) !== position;
      });
    if (moved.length === 0) return;

    try {
      await Promise.all(
        moved.map(({ id, position }) =>
          catalogueApi.updatePortfolioItem(id, { position })
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de réordonner. Rafraîchissez la page.');
      await refreshItems();
    }
  };

  const moveItem = async (id: string, direction: 'up' | 'down') => {
    const idx = items.findIndex((i) => i.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx === -1 || swapIdx < 0 || swapIdx >= items.length) return;

    const newItems = [...items];
    [newItems[idx], newItems[swapIdx]] = [newItems[swapIdx], newItems[idx]];
    // Optimistic update with normalized sequential positions.
    setItems(newItems.map((item, index) => ({ ...item, position: index })));
    await persistOrder(newItems);
  };

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filteredItems = activeCategory === 'Tous'
    ? items
    : items.filter((i) => i.categories.includes(activeCategory));

  // ── Preview thumbnail for form ────────────────────────────────────────────

  const formThumb = form.image
    || (form.youtubeUrl ? youtubeThumbnail(form.youtubeUrl) : null)
    || null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Médiathèque</h1>
          <p className="text-text-secondary text-sm mt-1">
            Gérez les photos et vidéos affichées dans le portfolio public.
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div role="alert" className="rounded-xl border border-error/30 bg-error/10 p-4 mb-6">
          <p className="text-sm font-medium text-error">{error}</p>
        </div>
      )}
      {success && (
        <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 mb-6">
          <p className="text-sm font-medium text-green-700">{success}</p>
        </div>
      )}

      {/* Form */}
      <div className="bg-surface rounded-xl border border-border p-6 mb-8">
        <h2 className="text-lg font-semibold text-text-primary mb-5">
          {isEditing ? 'Modifier le média' : 'Nouveau média'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label htmlFor="media-title" className="block text-sm font-medium text-text-primary mb-1.5">
              Titre <span className="font-normal text-text-muted">(affiché sur la réalisation)</span>
            </label>
            <input
              id="media-title"
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ex: Cuisine moderne en chêne — Alger"
              maxLength={160}
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text-primary outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Alt text (SEO + accessibility) */}
          <div>
            <label htmlFor="media-alt" className="block text-sm font-medium text-text-primary mb-1.5">
              Texte alternatif <span className="font-normal text-text-muted">(description de l'image pour Google et les lecteurs d'écran)</span>
            </label>
            <input
              id="media-alt"
              type="text"
              value={form.alt}
              onChange={(e) => setForm((f) => ({ ...f, alt: e.target.value }))}
              placeholder="Ex: Cuisine sur mesure en chêne massif avec îlot central"
              maxLength={300}
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text-primary outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Drop zone */}
          <div>
            <p className="text-sm font-medium text-text-primary mb-2">Image ou vidéo</p>
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`relative rounded-xl border-2 border-dashed transition-colors ${
                dragOver
                  ? 'border-primary-400 bg-primary-50'
                  : 'border-border bg-surface hover:border-primary-300'
              } p-6 text-center`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                onChange={onFileChange}
                className="hidden"
                id="media-file-input"
              />
              <label htmlFor="media-file-input" className="cursor-pointer block">
                {uploading ? (
                  <p className="text-sm text-primary-500 font-medium">Upload en cours…</p>
                ) : (
                  <>
                    <svg className="w-8 h-8 text-text-muted mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm font-medium text-text-primary">
                      Glissez un ou plusieurs fichiers ici ou <span className="text-primary-500">parcourez</span>
                    </p>
                    <p className="text-xs text-text-muted mt-1">JPEG, PNG, WebP, GIF, MP4, WebM — max 20 MB. Sélectionnez plusieurs images pour un import en masse.</p>
                  </>
                )}
              </label>
            </div>

            {/* Uploaded previews */}
            {(form.image || form.videoUrl) && (
              <div className="mt-3 flex items-center gap-3">
                {form.image && (
                  <div className="relative">
                    <img src={form.image} alt="Aperçu du média téléversé" className="h-20 w-20 rounded-xl object-cover border border-border" />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, image: '' }))}
                      aria-label="Supprimer l'image téléversée"
                      className="absolute -top-2 -right-2 w-5 h-5 bg-error text-white rounded-full text-xs flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-error"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {form.videoUrl && (
                  <div className="relative">
                    <video src={form.videoUrl} preload="metadata" muted className="h-20 w-32 rounded-xl object-cover border border-border" />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, videoUrl: '' }))}
                      aria-label="Supprimer la vidéo téléversée"
                      className="absolute -top-2 -right-2 w-5 h-5 bg-error text-white rounded-full text-xs flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-error"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Manual WebP optimization */}
          <div className="rounded-xl border border-border bg-surface p-4 mt-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <p className="text-sm font-semibold text-text-primary">Optimisation WebP</p>
                <p className="text-xs text-text-muted mt-0.5">
                  Convertit toutes les images JPG/PNG du serveur en WebP optimisé et supprime les
                  originaux. Les images utilisées par le site sont conservées. Une conversion
                  automatique a lieu chaque semaine.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleConvertWebp()}
                disabled={converting || uploading || bulkUploading}
                className="px-4 py-2 rounded-xl border border-primary-500 text-primary-600 text-sm font-semibold hover:bg-primary-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {converting ? 'Conversion en cours…' : 'Convertir les images en WebP'}
              </button>
            </div>
            {webpResult && (
              <p className="text-xs text-text-muted mt-2">
                {webpResult.converted} image(s) converti(es)
                {webpResult.keptReferenced > 0 && `, ${webpResult.keptReferenced} conservée(s) (utilisées par le site)`}
                {webpResult.skippedExisting > 0 && `, ${webpResult.skippedExisting} déjà optimisée(s)`}
                {webpResult.failed > 0 && `, ${webpResult.failed} échec(s)`}
                {webpResult.bytesSaved > 0 &&
                  ` — ${(webpResult.bytesSaved / (1024 * 1024)).toFixed(1)} Mo économisés`}
                .
              </p>
            )}
          </div>

          {/* Bulk import queue */}
          {pendingFiles.length > 0 && (
            <div className="rounded-xl border border-primary-200 bg-primary-50 p-4 mt-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-text-primary">
                  Import en masse — {pendingFiles.length} image{pendingFiles.length > 1 ? 's' : ''}
                </p>
                {!bulkUploading && (
                  <button
                    type="button"
                    onClick={clearPendingFiles}
                    className="text-xs font-medium text-error hover:underline cursor-pointer"
                  >
                    Vider la sélection
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mb-3">
                {pendingFiles.map((pf) => (
                  <div key={pf.id} className="relative group rounded-lg overflow-hidden border border-border bg-white">
                    <img src={pf.preview} alt={pf.file.name} className="h-20 w-full object-cover" />
                    {!bulkUploading && (
                      <button
                        type="button"
                        onClick={() => removePendingFile(pf.id)}
                        aria-label={`Retirer ${pf.file.name} de la sélection`}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-error text-white rounded-full text-xs flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-error"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {bulkUploading && bulkProgress ? (
                <div className="text-xs text-text-muted mb-3">
                  Import en cours — {bulkProgress.done}/{bulkProgress.total}…
                </div>
              ) : (
                <p className="text-xs text-text-muted mb-3">
                  Chaque image sera ajoutée au portfolio avec les catégories sélectionnées ci-dessus.
                </p>
              )}

              <button
                type="button"
                onClick={() => void handleBulkSubmit()}
                disabled={bulkUploading || form.categories.length === 0}
                className="px-5 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {bulkUploading
                  ? 'Import en cours…'
                  : `Ajouter ${pendingFiles.length} image${pendingFiles.length > 1 ? 's' : ''} au portfolio`}
              </button>
            </div>
          )}

          {/* YouTube */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              URL YouTube <span className="font-normal text-text-muted">(optionnel — prioritaire sur image/vidéo)</span>
            </label>
            <input
              type="url"
              value={form.youtubeUrl}
              onChange={(e) => setForm((f) => ({ ...f, youtubeUrl: e.target.value }))}
              placeholder="https://www.youtube.com/watch?v=… ou https://youtu.be/…"
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text-primary outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-500"
            />
            {form.youtubeUrl && (
              <p className={`text-xs mt-1.5 ${parseYoutubeId(form.youtubeUrl) ? 'text-green-600' : 'text-error'}`}>
                {parseYoutubeId(form.youtubeUrl) ? '✓ URL YouTube valide' : '✗ URL YouTube invalide'}
              </p>
            )}
          </div>

          <div>
            {/* Categories */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Catégories <span className="text-error">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    aria-pressed={form.categories.includes(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 ${
                      form.categories.includes(cat)
                        ? 'bg-primary-500 text-white'
                        : 'bg-surface border border-border text-text-secondary hover:border-primary-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          {formThumb && (
            <div>
              <p className="text-sm font-medium text-text-primary mb-2">Aperçu</p>
              <div
                className="w-48 rounded-xl overflow-hidden border border-border"
                style={{ aspectRatio: form.aspectRatio, backgroundColor: '#B89872' }}
              >
                <img src={formThumb} alt="aperçu" className="w-full h-full object-cover" />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving || uploading}
              className="px-6 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Sauvegarde…' : isEditing ? 'Mettre à jour' : 'Ajouter au portfolio'}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-6 py-2.5 rounded-xl border border-border text-sm font-medium text-text-secondary hover:text-text-primary hover:border-primary-300 transition-colors cursor-pointer"
              >
                Annuler
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap mb-5">
        {['Tous', ...ALL_CATEGORIES].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            aria-pressed={activeCategory === cat}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              activeCategory === cat
                ? 'bg-primary-500 text-white'
                : 'bg-surface border border-border text-text-secondary hover:border-primary-300'
            }`}
          >
            {cat}
            {cat !== 'Tous' && (
              <span className="ml-1.5 opacity-70">
                ({items.filter((i) => i.categories.includes(cat)).length})
              </span>
            )}
          </button>
        ))}
        <span className="ml-auto text-xs text-text-muted self-center">
          {filteredItems.length} élément{filteredItems.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={selectMode ? exitSelectMode : enterSelectMode}
          disabled={loading || filteredItems.length === 0}
          className={`ml-3 px-3 py-1.5 rounded-full text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer ${
            selectMode
              ? 'bg-text-secondary text-white'
              : 'border border-border text-text-secondary hover:border-primary-300 hover:text-primary-600'
          }`}
        >
          {selectMode ? 'Quitter la sélection' : 'Sélectionner'}
        </button>
      </div>

      {/* Bulk delete toolbar */}
      {selectMode && (
        <div className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-xl border border-primary-200 bg-primary-50">
          <span className="text-sm font-medium text-text-primary">
            {selectedIds.size} élément{selectedIds.size !== 1 ? 's' : ''} sélectionné{selectedIds.size !== 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={selectAllVisible}
            className="text-xs font-medium text-primary-600 hover:underline cursor-pointer"
          >
            Tout sélectionner
          </button>
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs font-medium text-text-secondary hover:text-text-primary cursor-pointer"
            >
              Désélectionner
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleBulkDelete()}
            disabled={selectedIds.size === 0 || deleting}
            className="ml-auto px-4 py-1.5 rounded-lg bg-error text-white text-xs font-semibold hover:bg-error/80 disabled:opacity-50 cursor-pointer"
          >
            {deleting ? 'Suppression…' : `Supprimer (${selectedIds.size})`}
          </button>
        </div>
      )}

      {/* Items list */}
      {loading ? (
        <div className="text-center py-16 text-text-muted">Chargement…</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-border bg-surface text-text-muted">
          <p className="text-4xl mb-3">🖼️</p>
          <p className="text-sm">Aucun élément dans cette catégorie.</p>
          <p className="text-xs mt-1">Utilisez le formulaire ci-dessus pour en ajouter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item, idx) => {
            const thumb = item.image || youtubeThumbnail(item.youtubeUrl) || null;
            const aspectStyle = { aspectRatio: item.aspectRatio };

            const isSelected = selectMode && selectedIds.has(item.id!);

            return (
              <div
                key={item.id}
                onClick={selectMode ? () => toggleSelected(item.id!) : undefined}
                role={selectMode ? 'checkbox' : undefined}
                aria-checked={selectMode ? isSelected : undefined}
                tabIndex={selectMode ? 0 : undefined}
                onKeyDown={
                  selectMode
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleSelected(item.id!);
                        }
                      }
                    : undefined
                }
                className={`group relative rounded-xl overflow-hidden border bg-surface transition-colors ${
                  selectMode
                    ? isSelected
                      ? 'border-primary-500 ring-2 ring-primary-500 cursor-pointer'
                      : 'border-border hover:border-primary-300 cursor-pointer'
                    : 'border-border'
                }`}
                style={aspectStyle}
              >
                {/* Thumbnail */}
                {thumb ? (
                  <img
                    src={thumb}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div
                    className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium"
                    style={{ backgroundColor: '#B89872' }}
                  >
                    Pas d'aperçu
                  </div>
                )}

                {/* Selection checkbox */}
                {selectMode && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleSelected(item.id!); }}
                    aria-label={isSelected ? 'Désélectionner' : 'Sélectionner'}
                    className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-primary-500 border-primary-500 text-white'
                        : 'bg-white/90 border-text-muted text-transparent hover:border-primary-400'
                    }`}
                  >
                    ✓
                  </button>
                )}

                {/* Video badge */}
                {(item.youtubeUrl || item.videoUrl) && (
                  <div className={`absolute top-2 ${selectMode ? 'left-9' : 'left-2'} bg-black/60 rounded-full p-1`}>
                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                )}

                {/* Reorder buttons — always visible on touch, hover/focus on desktop */}
                {!selectMode && (
                  <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => void moveItem(item.id!, 'up')}
                      disabled={idx === 0}
                      aria-label={`Monter « ${item.title} »`}
                      className="w-7 h-7 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black/80 disabled:opacity-30 cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => void moveItem(item.id!, 'down')}
                      disabled={idx === filteredItems.length - 1}
                      aria-label={`Descendre « ${item.title} »`}
                      className="w-7 h-7 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black/80 disabled:opacity-30 cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
                    >
                      ↓
                    </button>
                  </div>
                )}

                {/* Actions overlay */}
                {!selectMode && (
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
                  <p className="text-white text-xs font-medium truncate mb-2">{item.title}</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {item.categories.map((cat) => (
                      <span key={cat} className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full">
                        {cat}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="flex-1 text-center text-xs bg-white/20 hover:bg-white/40 text-white py-1.5 rounded-lg transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item.id!, item.title)}
                      className="flex-1 text-center text-xs bg-error/70 hover:bg-error text-white py-1.5 rounded-lg transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
                    >
                      Supprimer
                    </button>
                  </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
