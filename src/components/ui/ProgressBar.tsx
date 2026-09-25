import { type FC } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
  /** Accessible label describing what the progress represents. */
  ariaLabel?: string;
}

export const ProgressBar: FC<ProgressBarProps> = ({
  currentStep,
  totalSteps,
  className,
  ariaLabel = 'Progression du formulaire',
}) => {
  const percent = Math.round((currentStep / totalSteps) * 100);

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-valuetext={`Étape ${currentStep} sur ${totalSteps}`}
      className={cn('flex items-center gap-1.5', className)}
    >
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isCompleted = step < currentStep;
        const isActive = step === currentStep;

        return (
          <div key={step} className="flex-1 flex items-center" aria-hidden="true">
            <motion.div
              className={cn(
                'h-1.5 w-full rounded-full',
                isCompleted
                  ? 'bg-primary-500'
                  : isActive
                    ? 'bg-primary-400'
                    : 'bg-primary-100',
              )}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              style={{ originX: 0 }}
            />
          </div>
        );
      })}
      <span className="sr-only">{percent}% complété</span>
    </div>
  );
};
