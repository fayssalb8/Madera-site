/**
 * Client-side image compression helpers for admin uploads.
 *
 * Large photos are decoded and re-encoded in the browser BEFORE being sent to
 * the server. This keeps bulk imports (>30 images) fast: much smaller
 * payloads, no server-side sharp bottleneck, and no rate-limit / timeout
 * errors on big batches.
 */

const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 0.82;
/** Files at or below this size are sent as-is (re-encoding won't help). */
const SKIP_COMPRESS_BYTES = 512 * 1024;

/**
 * Compress/downscale an image File in-browser. Returns a new WebP File when
 * that produces a smaller result; otherwise returns the original file.
 * GIFs are returned untouched (animation would be lost).
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  if (file.type === 'image/webp' && file.size <= SKIP_COMPRESS_BYTES) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY)
    );
    // Keep the original when compression did not help (e.g. already optimized).
    if (!blob || blob.size >= file.size) return file;

    const name = `${file.name.replace(/\.[^.]+$/, '')}.webp`;
    return new File([blob], name, { type: 'image/webp', lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}

/**
 * Create a lightweight object URL for UI previews. Downscale via canvas so a
 * grid of 30+ thumbnails doesn't force the browser to decode/hold every
 * full-resolution photo in memory (a major source of tab lag).
 */
export async function createPreviewUrl(file: File, maxDimension = 320): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return URL.createObjectURL(file);
      ctx.drawImage(bitmap, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/webp', 0.7)
      );
      return blob ? URL.createObjectURL(blob) : URL.createObjectURL(file);
    } finally {
      bitmap.close();
    }
  } catch {
    return URL.createObjectURL(file);
  }
}

/**
 * Run `worker` over `items` with limited concurrency. Unlike a sequential
 * for-loop this parallelizes uploads; unlike Promise.all it never fires all
 * requests at once (which is what overwhelmed the server on large batches).
 */
export async function mapWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  let next = 0;
  const runners = Array.from(
    { length: Math.min(Math.max(1, concurrency), items.length) },
    async () => {
      while (true) {
        const index = next++;
        if (index >= items.length) break;
        await worker(items[index], index);
      }
    }
  );
  await Promise.all(runners);
}
