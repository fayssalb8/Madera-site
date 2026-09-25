/**
 * GET /uploads/* — Serve files from Cloudflare R2 bucket.
 *
 * This function intercepts requests to /uploads/<key> and streams
 * the file directly from R2 with proper caching headers.
 */
import type { Env } from '../env';

interface PagesContext {
  request: Request;
  env: Env;
  params: { path: string };
}

export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context;

  const url = new URL(request.url);
  // Extract the R2 key from the path: /uploads/filename.ext → filename.ext
  const key = url.pathname.replace(/^\/uploads\//, '');

  if (!key) {
    return new Response('Not Found', { status: 404 });
  }

  const object = await env.MEDIA_BUCKET.get(key);
  if (!object) {
    return new Response('Not Found', { status: 404 });
  }

  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType ?? 'application/octet-stream');
  headers.set('Cache-Control', 'public, max-age=2592000, immutable'); // 30 days
  headers.set('ETag', object.httpEtag);

  // Support conditional requests (If-None-Match)
  const ifNoneMatch = request.headers.get('If-None-Match');
  if (ifNoneMatch && ifNoneMatch === object.httpEtag) {
    return new Response(null, { status: 304, headers });
  }

  return new Response(object.body, { headers });
};
