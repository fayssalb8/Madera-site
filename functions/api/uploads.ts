/**
 * POST /api/uploads — Upload a file to Cloudflare R2 (admin only)
 *
 * Replaces the multer + sharp + ffmpeg pipeline with direct R2 upload.
 * No server-side image/video processing — Cloudflare Image Transformations
 * can be enabled later for on-the-fly resizing.
 */
import type { Env } from '../env';
import { requireAuth } from '../auth';
import { jsonResponse, errorResponse } from '../utils';

interface PagesContext {
  request: Request;
  env: Env;
}

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm',
]);

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context;

  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    return errorResponse('Content-Type multipart/form-data requis');
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse('Données de formulaire invalides');
  }

  const file = formData.get('file') as File | null;
  if (!file) return errorResponse('Aucun fichier');

  if (!ALLOWED_TYPES.has(file.type)) {
    return errorResponse('Type de fichier non autorisé');
  }

  if (file.size > MAX_FILE_SIZE) {
    return errorResponse('Fichier trop volumineux (max 20 Mo)');
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const key = `${Date.now()}-${crypto.randomUUID()}.${ext}`;

  await env.MEDIA_BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  // Return the URL path. The R2 bucket should be served via a custom domain
  // or Cloudflare public bucket URL configured in wrangler.toml.
  return jsonResponse({
    url: `/uploads/${key}`,
    mime: file.type,
  }, 201);
};
