import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ContactData,
  DimensionState,
  HardwareQuality,
  MaterialSlug,
  WizardPayload,
} from '@/types/wizard';
import { WIZARD_TOTAL_STEPS } from '@/lib/constants';

interface WizardState {
  currentStep: number;
  contact: ContactData | null;
  material: MaterialSlug | null;
  hardware: HardwareQuality | null;
  dimensions: DimensionState;
  isOpen: boolean;
  /** Server-generated id of the last submitted lead (not persisted). */
  submittedLeadId: string | null;
}

interface WizardActions {
  openWizard: () => void;
  closeWizard: () => void;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setContact: (contact: ContactData) => void;
  setMaterial: (material: MaterialSlug) => void;
  setHardware: (hardware: HardwareQuality) => void;
  setDimensions: (dimensions: DimensionState) => void;
  setSubmittedLeadId: (id: string | null) => void;
  reset: () => void;
  getPayload: () => WizardPayload;
}

type WizardStore = WizardState & WizardActions;

const initialState: WizardState = {
  currentStep: 1,
  contact: null,
  material: null,
  hardware: null,
  dimensions: {},
  isOpen: false,
  submittedLeadId: null,
};

const PERSISTED_KEYS = new Set([
  'currentStep',
  'contact',
  'material',
  'hardware',
  'dimensions',
]);

export const useWizardStore = create<WizardStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      openWizard: () => set({ isOpen: true }),
      closeWizard: () => set({ isOpen: false }),
      setStep: (step) =>
        set({ currentStep: Math.min(Math.max(step, 1), WIZARD_TOTAL_STEPS) }),
      nextStep: () =>
        set((s) => ({ currentStep: Math.min(s.currentStep + 1, WIZARD_TOTAL_STEPS) })),
      prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 1) })),

      setContact: (contact) => set({ contact }),
      setMaterial: (material) => set({ material }),
      setHardware: (hardware) => set({ hardware }),
      setDimensions: (dimensions) => set({ dimensions }),
      setSubmittedLeadId: (submittedLeadId) => set({ submittedLeadId }),

      reset: () => set(initialState),

      getPayload: () => {
        const s = get();
        return {
          contact: s.contact,
          material: s.material,
          hardware: s.hardware,
          dimensions: s.dimensions,
          submitted_at: new Date().toISOString(),
          source: 'website_wizard',
        };
      },
    }),
    {
      name: 'madera-wizard',
      version: 1,
      // localStorage (not sessionStorage): a client who closes their tab or
      // restarts the browser mid-quote comes back to their saved progress.
      // Cleared automatically on successful submission via reset().
      storage: {
        getItem: (name) => {
          try {
            const str = localStorage.getItem(name);
            return str ? JSON.parse(str) : null;
          } catch {
            // Corrupted entry — drop it rather than crash the store.
            try { localStorage.removeItem(name); } catch { /* ignore */ }
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch {
            // Storage full / private mode — autosave is best-effort.
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch { /* ignore */ }
        },
      },
      partialize: (state) => {
        const { dimensions, ...rest } = state;
        const safeDimensions = { ...(dimensions || {}) };
        delete safeDimensions.attachmentFiles;
        const persisted = Object.fromEntries(
          Object.entries({ ...rest, dimensions: safeDimensions }).filter(([key]) =>
            PERSISTED_KEYS.has(key)
          )
        );
        return persisted as unknown as WizardStore;
      },
    }
  )
);

