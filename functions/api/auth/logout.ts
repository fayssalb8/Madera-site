/**
 * POST /api/auth/logout
 * Bumps the session epoch to invalidate all tokens, then clears the cookie.
 */
import type { Env } from '../../env';
import { bumpSessionEpoch, sessionCookie } from '../../auth';
import { jsonResponse } from '../../utils';

interface PagesContext {
  request: Request;
  env: Env;
}

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const { env } = context;

  await bumpSessionEpoch(env.DB);

  return jsonResponse(
    { ok: true },
    200,
    { 'Set-Cookie': sessionCookie('', env, { maxAgeMs: 0 }) },
  );
};
