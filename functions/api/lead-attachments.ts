/**
 * POST /api/lead-attachments — Public image upload for lead wizard
 * Limited to JPEG/PNG/WebP, max 5MB.
 */
import type { Env } from '../env';
import { jsonResponse, errorResponse } from '../utils';

interface PagesContext {
  request: Request;
  env: Env;
}

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context;

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
    return errorResponse('Seules les images JPEG, PNG et WebP sont acceptées');
  }

  if (file.size > MAX_FILE_SIZE) {
    return errorResponse('Fichier trop volumineux (max 5 Mo)');
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const key = `${Date.now()}-${crypto.randomUUID()}.${ext}`;

  await env.MEDIA_BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  return jsonResponse({
    url: `/uploads/${key}`,
    mime: file.type,
  }, 201);
};
