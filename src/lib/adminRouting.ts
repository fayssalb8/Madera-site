export const ADMIN_LOGIN_PATH = '/admin/login';
export const ADMIN_LEADS_PATH = '/admin/leads';

export function getAdminIndexRedirect(isAuthenticated: boolean): string {
  return isAuthenticated ? ADMIN_LEADS_PATH : ADMIN_LOGIN_PATH;
}

export function getLoginRedirect(isAuthenticated: boolean): string | null {
  return isAuthenticated ? ADMIN_LEADS_PATH : null;
}
