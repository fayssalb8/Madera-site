/** Total number of steps in the quote wizard (welcome + 6 content steps). */
export const WIZARD_TOTAL_STEPS = 7;

/** Final "thank you" step shown after a successful submission. */
export const WIZARD_FINAL_STEP = WIZARD_TOTAL_STEPS;

// ── Attachment upload rules ──────────────────────────────────────────────────
// Single source of truth shared by the UI validators and the API client.
// NOTE: must stay in sync with the server allowlist in `server/index.mjs`.

export const MAX_ATTACHMENT_FILES = 5;
export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ACCEPTED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const ACCEPTED_IMAGE_MIME_SET: ReadonlySet<string> = new Set(ACCEPTED_IMAGE_MIMES);
const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

/** Human-readable list of accepted formats for UI copy. */
export const ACCEPTED_FORMATS_LABEL = 'JPEG, PNG ou WebP';

export function isAcceptedAttachmentFile(file: File): boolean {
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) return false;
  if (ACCEPTED_IMAGE_MIME_SET.has(file.type)) return true;
  // Some browsers/OS report an empty type — fall back to the extension.
  if (!file.type) {
    const lower = file.name.toLowerCase();
    return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
  }
  return false;
}

// ── Phone helpers ────────────────────────────────────────────────────────────

/**
 * Normalize any Algerian phone representation into wa.me digits.
 * Handles local formats ("0555 12 34 56", "0555123456") by prefixing the
 * country code, and passes through already-international numbers.
 */
export function normalizeToWaNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('213')) return digits;
  if (digits.startsWith('0')) return `213${digits.slice(1)}`;
  return digits;
}
