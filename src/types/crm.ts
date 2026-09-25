export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  wilaya: string;
  email: string | null;
  material: string | null;
  hardware: string | null;
  measures: string | null;
  oven_column: string | null;
  dishwasher: string | null;
  washing_machine: string | null;
  attachments: string | null;
  drawers: number | null;
  columns: number | null;
  wall_cabinets: number | null;
  accessories: string | null;
  estimate_low: number | null;
  estimate_high: number | null;
  currency: string | null;
  source: string;
  status: LeadStatus;
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'agent';
  phone: string | null;
  created_at: string;
  updated_at: string;
}
