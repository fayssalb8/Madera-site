import { type FC, useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { useWizardStore } from '@/store/wizardStore';
import {
  MAX_ATTACHMENT_FILES,
  MAX_ATTACHMENT_SIZE_BYTES,
  ACCEPTED_FORMATS_LABEL,
  isAcceptedAttachmentFile,
} from '@/lib/constants';

const MAX_FILE_SIZE_MB = Math.round(MAX_ATTACHMENT_SIZE_BYTES / (1024 * 1024));

export const StepDimensions: FC = () => {
  const dimensions = useWizardStore((s) => s.dimensions);
  const setDimensions = useWizardStore((s) => s.setDimensions);
  const nextStep = useWizardStore((s) => s.nextStep);

  const [manualMeasures, setManualMeasures] = useState(dimensions.manualMeasures ?? '');
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Single source of truth: the File list lives in the store.
  const files = dimensions.attachmentFiles ?? [];

  const updateFiles = (next: File[], measures = manualMeasures) => {
    setDimensions({ ...dimensions, manualMeasures: measures, attachmentFiles: next });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = ''; // allow re-selecting the same file

    const oversized = selected.filter((f) => f.size > MAX_ATTACHMENT_SIZE_BYTES);
    if (oversized.length > 0) {
      setFileError(
        `Fichier(s) trop volumineux (max ${MAX_FILE_SIZE_MB} Mo) : ${oversized.map((f) => f.name).join(', ')}`
      );
      return;
    }

    const invalid = selected.filter((f) => !isAcceptedAttachmentFile(f));
    if (invalid.length > 0) {
      setFileError(`Seules les images ${ACCEPTED_FORMATS_LABEL} sont acceptées.`);
      return;
    }

    if (files.length + selected.length > MAX_ATTACHMENT_FILES) {
      setFileError(`Vous pouvez joindre jusqu'à ${MAX_ATTACHMENT_FILES} images.`);
      return;
    }

    setFileError(null);
    updateFiles([...files, ...selected]);
  };

  const removeFile = (index: number) => {
    updateFiles(files.filter((_, i) => i !== index));
  };

  const handleContinue = () => {
    updateFiles(files, manualMeasures);
    nextStep();
  };

  return (
    <div className="mx-auto max-w-xl">
      <h3 className="mb-2 text-center text-xl font-bold text-text-primary sm:text-2xl">
        Mesures de votre cuisine
      </h3>
      <p className="mb-6 text-center text-sm text-text-muted">
        Indiquez vos mesures manuellement ou joignez des photos pour nous aider à préparer votre devis.
      </p>

      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <label htmlFor="wizard-measures" className="block text-sm font-semibold text-text-primary mb-2">
            Vos mesures (murs, hauteur, etc.)
          </label>
          <textarea
            id="wizard-measures"
            value={manualMeasures}
            onChange={(e) => {
              setManualMeasures(e.target.value);
              if (dimensions.manualMeasures !== undefined || e.target.value) {
                setDimensions({ ...dimensions, manualMeasures: e.target.value });
              }
            }}
            placeholder="Ex: Mur gauche 3.20m, Mur droit 2.80m, Hauteur 2.70m..."
            rows={4}
            className="w-full resize-none rounded-xl border border-border bg-surface px-4 py-3 text-base text-text-primary outline-none transition-all focus:border-primary-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
          />
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="mb-3 text-sm font-semibold text-text-primary">Options</p>
          <div className="space-y-3">
            <label htmlFor="wizard-oven-column" className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text-primary">
              <span>Colonne four + micro-ondes intégrée</span>
              <input
                id="wizard-oven-column"
                type="checkbox"
                checked={Boolean(dimensions.ovenColumn)}
                onChange={(e) => setDimensions({ ...dimensions, ovenColumn: e.target.checked })}
                className="h-5 w-5 accent-primary-500"
              />
            </label>
            <label htmlFor="wizard-dishwasher" className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text-primary">
              <span>Lave-vaisselle intégré ?</span>
              <input
                id="wizard-dishwasher"
                type="checkbox"
                checked={Boolean(dimensions.dishwasherIntegrated)}
                onChange={(e) => setDimensions({ ...dimensions, dishwasherIntegrated: e.target.checked })}
                className="h-5 w-5 accent-primary-500"
              />
            </label>
            <label htmlFor="wizard-washing-machine" className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text-primary">
              <span>Machine à laver intégrée ?</span>
              <input
                id="wizard-washing-machine"
                type="checkbox"
                checked={Boolean(dimensions.washingMachineIntegrated)}
                onChange={(e) => setDimensions({ ...dimensions, washingMachineIntegrated: e.target.checked })}
                className="h-5 w-5 accent-primary-500"
              />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <p id="wizard-photos-label" className="mb-3 text-sm font-semibold text-text-primary">Photos</p>
          <p id="wizard-photos-hint" className="text-xs text-text-muted mb-3">
            Joignez jusqu'à {MAX_ATTACHMENT_FILES} photos {ACCEPTED_FORMATS_LABEL} (max {MAX_FILE_SIZE_MB} Mo chacune).
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
            aria-labelledby="wizard-photos-label"
            aria-describedby="wizard-photos-hint"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-describedby="wizard-photos-hint"
            className="w-full rounded-xl border-2 border-dashed border-primary-200 bg-primary-50 px-4 py-6 text-sm font-medium text-primary-600 hover:bg-primary-100 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
          >
            Choisir des fichiers
          </button>
          {fileError && (
            <p role="alert" className="mt-2 text-xs text-error">{fileError}</p>
          )}
          {files.length > 0 && (
            <ul className="mt-3 space-y-1" aria-label="Fichiers sélectionnés">
              {files.map((file, i) => (
                <li
                  key={`${file.name}-${i}`}
                  className="flex items-center justify-between rounded-lg bg-surface-hover px-3 py-2 text-xs text-text-secondary"
                >
                  <span className="truncate flex-1">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    aria-label={`Retirer le fichier ${file.name}`}
                    className="ml-2 rounded p-1 text-error hover:bg-error/10 cursor-pointer focus-visible:outline-2 focus-visible:outline-error"
                  >
                    <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 mt-6 bg-surface/95 px-4 pb-[max(.25rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:p-0">
        <Button className="w-full" onClick={handleContinue}>
          Continuer
        </Button>
      </div>
    </div>
  );
};
