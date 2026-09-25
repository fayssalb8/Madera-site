import type { Lead, LeadNote, LeadStatus, Profile } from '@/types/crm';
import type { MaterialDetail } from '@/data/materialsDetailed';
import type { PortfolioItemServer } from '@/lib/catalogue';

// ── Types ────────────────────────────────────────────────────────────────────

interface ApiError {
  error?: string;
}

export interface AuthUser {
  sub: string;
  email: string;
  name: string;
  role: 'admin';
}

interface LeadCreatePayload {
  name?: string | undefined;
  phone?: string | undefined;
  wilaya?: string | undefined;
  email?: string | undefined;
  material?: string | null | undefined;
  hardware?: string | null | undefined;
  measures?: string | undefined;
  oven_column?: string | undefined;
  dishwasher?: string | undefined;
  washing_machine?: string | undefined;
  attachments?: string | string[] | undefined;
  drawers?: number | undefined;
  columns?: number | undefined;
  wall_cabinets?: number | undefined;
  accessories?: string | string[] | undefined;
  estimate_low?: number | undefined;
  estimate_high?: number | undefined;
  currency?: string | undefined;
  source?: string | undefined;
}

interface PortfolioItemPayload {
  title?: string;
  alt?: string | null;
  image?: string | null;
  youtubeUrl?: string | null;
  videoUrl?: string | null;
  aspectRatio?: string;
  categories?: string[];
  position?: number;
}

// ── Base helpers ─────────────────────────────────────────────────────────────

async function parseError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}) as ApiError);
  return (
    (body as ApiError).error ??
    `Une erreur est survenue (code ${res.status}). Veuillez réessayer.`
  );
}

async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const { method, body, headers } = options;
  const hasBody = body !== undefined && body !== null;

  const init: RequestInit = { credentials: 'include' };
  if (method !== undefined) init.method = method;
  // Only send Content-Type when a JSON body is present — avoids pointless
  // (and potentially CORS-triggering) headers on GET/DELETE requests.
  if (hasBody) {
    init.body = body;
    init.headers = { 'Content-Type': 'application/json', ...headers };
  } else if (headers !== undefined) {
    init.headers = headers;
  }

  const res = await fetch(`/api${path}`, init);

  if (!res.ok) {
    const message = await parseError(res);
    if (res.status === 401 && !path.startsWith('/auth/login')) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

async function uploadFile(path: string, file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    body: form,
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  const data = await res.json() as { url: string };
  return data.url;
}

const apiUpload = (file: File) => uploadFile('/api/uploads', file);
const publicAttachmentUpload = (file: File) => uploadFile('/api/lead-attachments', file);

export { apiUpload };
export { publicAttachmentUpload };

// ── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string, totpCode?: string) =>
    apiFetch<{ user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, code: totpCode?.trim() || undefined }),
    }),
  logout: () => apiFetch<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  me: () => apiFetch<{ user: AuthUser }>('/auth/me'),
};

// ── Admin tools ──────────────────────────────────────────────────────────────

export interface WebpConversionSummary {
  ok?: boolean;
  converted: number;
  keptReferenced: number;
  skippedExisting: number;
  failed: number;
  bytesSaved: number;
  error?: string;
}

export const adminApi = {
  /** Trigger on-demand WebP conversion of every legacy image in the uploads dir. */
  convertWebp: () =>
    apiFetch<WebpConversionSummary>('/admin/convert-webp', { method: 'POST' }),
};

// ── Leads ────────────────────────────────────────────────────────────────────

export const leadsApi = {
  list: ({ status, search }: { status?: LeadStatus | 'all'; search?: string } = {}) => {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.set('status', status);
    if (search) params.set('search', search);
    const qs = params.toString();
    return apiFetch<{ leads: Lead[] }>(`/leads${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => apiFetch<{ lead: Lead; notes: LeadNote[] }>(`/leads/${id}`),
  create: (payload: LeadCreatePayload) =>
    apiFetch<{ id: string }>('/leads', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, patch: { status?: LeadStatus; notes?: string }) =>
    apiFetch<{ ok: boolean }>(`/leads/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  addNote: (id: string, content: string) =>
    apiFetch<{ id: string }>(`/leads/${id}/notes`, { method: 'POST', body: JSON.stringify({ content }) }),
  stats: () => apiFetch<LeadStats>('/leads/stats'),
};

export interface LeadStats {
  total: number;
  byStatus: Record<string, number>;
  last7Days: number;
  last30Days: number;
  conversionRate: number;
  topWilayas: Array<{ name: string; count: number }>;
  topMaterials: Array<{ name: string; count: number }>;
  daily: Array<{ date: string; count: number }>;
}

// ── Catalogue ─────────────────────────────────────────────────────────────────

export const catalogueApi = {
  getPortfolio: () => apiFetch<{ items: PortfolioItemServer[] }>('/catalogue/portfolio'),
  addPortfolioItem: (item: PortfolioItemPayload) =>
    apiFetch<{ item: PortfolioItemServer }>('/catalogue/portfolio', {
      method: 'POST',
      body: JSON.stringify(item),
    }),
  updatePortfolioItem: (id: string, patch: Partial<PortfolioItemPayload>) =>
    apiFetch<{ item: PortfolioItemServer }>(`/catalogue/portfolio/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),
  deletePortfolioItem: (id: string) =>
    apiFetch<{ ok: boolean }>(`/catalogue/portfolio/${id}`, { method: 'DELETE' }),
  getMaterials: () => apiFetch<{ materials: MaterialDetail[] }>('/catalogue/materials'),
};

// ── Profile stub for type-compat with existing code ─────────────────────────

export type { Profile };
