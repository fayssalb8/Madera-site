export type MaterialSlug = 'chene' | 'hetre' | 'frene' | 'mdf' | 'high-gloss' | 'egger';

export type HardwareQuality = 'standard_bnc' | 'premium_blum';

export interface ContactData {
  name: string;
  phone: string;
  wilaya: string;
  email?: string;
}

export interface DimensionState {
  manualMeasures?: string;
  dishwasherIntegrated?: boolean;
  washingMachineIntegrated?: boolean;
  ovenColumn?: boolean;
  attachments?: string[];
  attachmentFiles?: File[];
}

export interface WizardPayload {
  contact: ContactData | null;
  material: MaterialSlug | null;
  hardware: HardwareQuality | null;
  dimensions: DimensionState;
  submitted_at: string;
  source: 'website_wizard';
}
