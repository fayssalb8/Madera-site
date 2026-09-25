/**
 * GET /api/health — Health check endpoint
 */
import type { Env } from '../env';
import { jsonResponse, errorResponse } from '../utils';

interface PagesContext {
  request: Request;
  env: Env;
}

export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const { env } = context;

  try {
    // Check D1 is accessible
    await env.DB.prepare('SELECT 1').first();

    return jsonResponse({ status: 'ok', platform: 'cloudflare-pages' });
  } catch (err) {
    return errorResponse(`Service unavailable: ${(err as Error).message}`, 503);
  }
};
