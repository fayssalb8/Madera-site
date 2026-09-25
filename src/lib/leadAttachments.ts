export interface LeadAttachmentView {
  href: string | null;
  label: string;
  isImage: boolean;
  isAvailable: boolean;
}

function isUsableUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith('/');
}

function labelFromAttachment(value: string): string {
  try {
    const path = /^https?:\/\//i.test(value) ? new URL(value).pathname : value;
    const withoutQuery = path.split(/[?#]/)[0] ?? path;
    return decodeURIComponent(withoutQuery.split('/').filter(Boolean).pop() ?? value);
  } catch {
    return value;
  }
}

function isImageUrl(value: string): boolean {
  return /\.(jpg|jpeg|png|webp|gif)(?:[?#].*)?$/i.test(value);
}

export function parseLeadAttachments(value: string | null | undefined): LeadAttachmentView[] {
  if (!value) return [];

  return value
    .split(',')
    .map((attachment) => attachment.trim())
    .filter(Boolean)
    .map((attachment) => {
      const href = isUsableUrl(attachment) ? attachment : null;

      return {
        href,
        label: labelFromAttachment(attachment),
        isImage: href ? isImageUrl(href) : false,
        isAvailable: Boolean(href),
      };
    });
}
