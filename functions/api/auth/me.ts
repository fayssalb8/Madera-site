/**
 * GET /api/auth/me
 * Returns the current session user or 401.
 */
import type { Env } from '../../env';
import { readSession } from '../../auth';
import { jsonResponse, errorResponse } from '../../utils';

interface PagesContext {
  request: Request;
  env: Env;
}

export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context;
  const session = await readSession(request, env);
  if (!session) return errorResponse('Not authenticated', 401);
  return jsonResponse({ user: session });
};
