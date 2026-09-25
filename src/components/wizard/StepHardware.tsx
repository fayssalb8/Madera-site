import { type FC, useEffect, useRef } from 'react';
import { SelectionCard } from '@/components/ui/SelectionCard';
import { useWizardStore } from '@/store/wizardStore';
import { hardwareOptions } from './wizardOptions';

export const StepHardware: FC = () => {
  const hardware = useWizardStore((s) => s.hardware);
  const setHardware = useWizardStore((s) => s.setHardware);
  const nextStep = useWizardStore((s) => s.nextStep);

  // Guard against double-taps scheduling two advance timers.
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
  }, []);

  const handleSelect = (id: (typeof hardwareOptions)[number]['id']) => {
    if (advanceTimerRef.current) return;
    setHardware(id);
    advanceTimerRef.current = setTimeout(() => {
      advanceTimerRef.current = null;
      nextStep();
    }, 250);
  };

  return (
    <div className="mx-auto max-w-xl">
      <h3 className="mb-2 text-center text-xl font-bold text-text-primary sm:text-2xl">
        Quel système de quincaillerie ?
      </h3>
      <p className="mb-6 text-center text-sm text-text-muted">
        Choisissez entre la solution standard BNC et le système premium Blum.
      </p>

      <p className="mb-3 text-center text-xs font-medium text-primary-500">
        Touchez une option pour continuer
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {hardwareOptions.map((option) => (
          <SelectionCard
            key={option.id}
            label={option.label}
            sublabel={option.desc}
            isSelected={hardware === option.id}
            onSelect={() => handleSelect(option.id)}
          />
        ))}
      </div>
    </div>
  );
};
