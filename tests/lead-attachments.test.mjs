import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLeadAttachments } from '../src/lib/leadAttachments.ts';

test('renders absolute image attachment URLs as available images', () => {
  assert.deepEqual(
    parseLeadAttachments('https://example.com/storage/v1/object/public/wizard-attachments/123/photo.webp'),
    [
      {
        href: 'https://example.com/storage/v1/object/public/wizard-attachments/123/photo.webp',
        label: 'photo.webp',
        isImage: true,
        isAvailable: true,
      },
    ]
  );
});

test('does not render legacy filename-only attachments as URLs', () => {
  assert.deepEqual(
    parseLeadAttachments('WhatsApp Image 2026-01-31 at 14.03.12.jpeg'),
    [
      {
        href: null,
        label: 'WhatsApp Image 2026-01-31 at 14.03.12.jpeg',
        isImage: false,
        isAvailable: false,
      },
    ]
  );
});

test('splits comma-separated attachment values and ignores blanks', () => {
  assert.deepEqual(
    parseLeadAttachments(' , https://example.com/a.pdf, /uploads/plan.png '),
    [
      {
        href: 'https://example.com/a.pdf',
        label: 'a.pdf',
        isImage: false,
        isAvailable: true,
      },
      {
        href: '/uploads/plan.png',
        label: 'plan.png',
        isImage: true,
        isAvailable: true,
      },
    ]
  );
});
