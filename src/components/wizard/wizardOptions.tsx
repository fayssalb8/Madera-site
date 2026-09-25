import type { HardwareQuality, MaterialSlug } from '@/types/wizard';

export const materialOptions: { id: MaterialSlug; label: string; desc: string; color: string; image: string }[] = [
  { id: 'chene', label: 'Chêne', desc: 'Bois naturel luxueux, robuste et intemporel.', color: '#B8935A', image: '/chene.webp' },
  { id: 'hetre', label: 'Hêtre', desc: 'Bois chaleureux avec une élégance classique.', color: '#D4A574', image: '/hetre.webp' },
  { id: 'frene', label: 'Frêne Laquée', desc: 'Finition laquée élégante, moderne et résistante.', color: '#C4956A', image: '/frene.webp' },
  { id: 'mdf', label: 'MDF', desc: 'Accessible, moderne et flexible.', color: '#C8C0B8', image: '/mdf.webp' },
  { id: 'high-gloss', label: 'High Gloss', desc: 'Finition brillante, moderne et lumineuse.', color: '#E8E0D8', image: '/high-gloss.webp' },
  { id: 'egger', label: 'EGGER', desc: 'Panneaux premium et finitions modernes.', color: '#A0A8A0', image: '/egger.webp' },
];

export const hardwareOptions: { id: HardwareQuality; label: string; desc: string }[] = [
  { id: 'standard_bnc', label: 'Standard BNC', desc: 'Quincaillerie fonctionnelle et économique.' },
  { id: 'premium_blum', label: 'Premium Blum', desc: 'Système plus confortable et durable.' },
];
