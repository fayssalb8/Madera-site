import type { LeadStatus } from '@/types/crm';

export const statusLabels: Record<LeadStatus, string> = {
  new: 'Nouveau',
  contacted: 'Contacté',
  qualified: 'Qualifié',
  won: 'Gagné',
  lost: 'Perdu',
};

export const statuses: LeadStatus[] = ['new', 'contacted', 'qualified', 'won', 'lost'];
