import { type FC, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useWizardStore } from '@/store/wizardStore';
import { submitWizard } from '@/lib/wizardApi';
import { materialOptions, hardwareOptions } from './wizardOptions';

export const StepEstimate: FC = () => {
  const material = useWizardStore((s) => s.material);
  const hardware = useWizardStore((s) => s.hardware);
  const dimensions = useWizardStore((s) => s.dimensions);
  const nextStep = useWizardStore((s) => s.nextStep);
  const getPayload = useWizardStore((s) => s.getPayload);
  const setSubmittedLeadId = useWizardStore((s) => s.setSubmittedLeadId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const materialLabel = materialOptions.find((item) => item.id === material)?.label ?? '-';
  const hardwareLabel = hardwareOptions.find((item) => item.id === hardware)?.label ?? '-';

  const columns: string[] = [];
  if (dimensions.ovenColumn) columns.push('Colonne four + micro-ondes');

  const summaryItems = [
    { label: 'Matériau', value: materialLabel },
    { label: 'Quincaillerie', value: hardwareLabel },
    { label: 'Mesures', value: dimensions.manualMeasures || 'Non renseigné' },
    { label: 'Colonnes', value: columns.length > 0 ? columns.join(', ') : 'Aucune' },
    { label: 'Lave-vaisselle intégré', value: dimensions.dishwasherIntegrated ? 'Oui' : 'Non' },
    { label: 'Machine à laver intégrée', value: dimensions.washingMachineIntegrated ? 'Oui' : 'Non' },
  ];

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await submitWizard(getPayload());
      if (result.success && result.leadId) {
        setSubmittedLeadId(result.leadId);
        nextStep();
      } else if (result.success) {
        nextStep();
      } else {
        setError(result.error ?? 'Une erreur est survenue. Veuillez réessayer.');
      }
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <h3 className="mb-2 text-center text-xl font-bold text-text-primary sm:text-2xl">
        Récapitulatif de votre projet
      </h3>
      <p className="mb-6 text-center text-sm text-text-muted">
        Vérifiez vos choix avant d'envoyer votre demande.
      </p>

      <div className="space-y-3">
        {summaryItems.map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-xs text-text-muted">{label}</p>
            <p className="mt-1 text-sm font-semibold text-text-primary whitespace-pre-wrap">{value}</p>
          </div>
        ))}
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-xl bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="sticky bottom-0 -mx-4 mt-6 bg-surface/95 px-4 pb-[max(.25rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:p-0">
        <Button className="w-full" onClick={handleSubmit} isLoading={isSubmitting}>
          Envoyer ma demande de devis
        </Button>
      </div>
    </div>
  );
};
