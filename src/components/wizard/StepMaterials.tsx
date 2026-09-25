import { type FC, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useWizardStore } from '@/store/wizardStore';
import { materialOptions } from './wizardOptions';
import type { MaterialSlug } from '@/types/wizard';
import { cn } from '@/lib/utils';

export const StepMaterials: FC = () => {
  const material = useWizardStore((s) => s.material);
  const setMaterial = useWizardStore((s) => s.setMaterial);
  const nextStep = useWizardStore((s) => s.nextStep);

  // Guard against double-taps scheduling two advance timers.
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
  }, []);

  const handleSelect = (id: MaterialSlug) => {
    if (advanceTimerRef.current) return;
    setMaterial(id);
    advanceTimerRef.current = setTimeout(() => {
      advanceTimerRef.current = null;
      nextStep();
    }, 250);
  };

  return (
    <div>
      <h3 className="text-xl font-bold text-text-primary text-center mb-2">
        Choisissez le style qui vous ressemble
      </h3>
      <p className="text-sm text-text-muted text-center mb-6">
        Chaque matériau influence le style, la durabilité et le niveau de prix.
      </p>
      <p className="mb-3 text-center text-xs font-medium text-primary-500">
        Touchez une option pour continuer
      </p>
      <div className="grid grid-cols-1 gap-3 pb-2 sm:grid-cols-2">
        {materialOptions.map((mat) => (
          <motion.button
            key={mat.id}
            type="button"
            onClick={() => handleSelect(mat.id)}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.97 }}
            className={cn(
              'relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-200 ease-in-out cursor-pointer w-full touch-manipulation',
              material === mat.id
                ? 'border-primary-500 shadow-glow bg-primary-50 ring-2 ring-primary-500/30'
                : 'border-border-subtle bg-surface shadow-xs hover:shadow-md hover:border-primary-300 hover:bg-primary-50/50',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
            )}
            aria-pressed={material === mat.id}
          >
            {mat.image ? (
              <img
                src={mat.image}
                alt={mat.label}
                loading="lazy"
                decoding="async"
                className="h-32 w-full object-cover sm:h-36"
              />
            ) : (
              <div className="flex h-32 w-full items-center justify-center sm:h-36" style={{ backgroundColor: mat.color }}>
                <span className="text-white/80 text-lg font-semibold">{mat.label}</span>
              </div>
            )}
            <div className="p-3 text-center sm:p-4">
              <span className="text-base font-semibold leading-tight text-text-primary sm:text-sm">
                {mat.label}
              </span>
              <p className="mt-1 text-xs leading-snug text-text-muted">
                {mat.desc}
              </p>
            </div>
            {material === mat.id && (
              <motion.div
                layoutId="material-check"
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
};
