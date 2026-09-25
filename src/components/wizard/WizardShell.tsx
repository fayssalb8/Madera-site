import { type FC, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useWizardStore } from '@/store/wizardStore';
import { WIZARD_TOTAL_STEPS } from '@/lib/constants';
import { StepWelcome } from './StepWelcome';
import { StepContact } from './StepContact';
import { StepMaterials } from './StepMaterials';
import { StepHardware } from './StepHardware';
import { StepDimensions } from './StepDimensions';
import { StepEstimate } from './StepEstimate';
import { StepWhatsApp } from './StepWhatsApp';

const STEP_TITLES = [
  'Bienvenue',
  'Contact',
  'Matériau',
  'Systèmes',
  'Mesures',
  'Récapitulatif',
  'Confirmation',
];

function stepComponent(step: number) {
  switch (step) {
    case 1: return <StepWelcome />;
    case 2: return <StepContact />;
    case 3: return <StepMaterials />;
    case 4: return <StepHardware />;
    case 5: return <StepDimensions />;
    case 6: return <StepEstimate />;
    case 7: return <StepWhatsApp />;
    default: return <StepWelcome />;
  }
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

export const WizardShell: FC = () => {
  const isOpen = useWizardStore((s) => s.isOpen);
  const closeWizard = useWizardStore((s) => s.closeWizard);
  const currentStep = useWizardStore((s) => s.currentStep);
  const prevStep = useWizardStore((s) => s.prevStep);

  // Slide direction follows navigation: forward → left, back → right.
  const [direction, setDirection] = useState(1);
  const previousStepRef = useRef(currentStep);
  useEffect(() => {
    if (currentStep !== previousStepRef.current) {
      setDirection(currentStep > previousStepRef.current ? 1 : -1);
      previousStepRef.current = currentStep;
    }
  }, [currentStep]);

  const isWelcomeStep = currentStep === 1;
  const isFinalStep = currentStep === WIZARD_TOTAL_STEPS;

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeWizard}
      fullScreenOnMobile
      ariaLabel="Demande de devis en ligne"
      className="sm:max-w-xl md:max-w-2xl"
    >
      {!isWelcomeStep && !isFinalStep && (
        <div className="sticky top-0 z-20 -mx-4 mb-5 border-b border-border-subtle bg-surface/95 px-4 pb-4 pt-1 backdrop-blur sm:static sm:mx-0 sm:mb-6 sm:border-0 sm:bg-transparent sm:p-0">
          <div className="mb-2 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={prevStep}
              className="flex min-h-10 items-center gap-1 rounded-full pr-3 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary cursor-pointer"
            >
              ← Retour
            </button>
            <span className="shrink-0 text-xs font-medium text-text-muted">
              Étape {currentStep} sur {WIZARD_TOTAL_STEPS - 2}
            </span>
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary-500">
            {STEP_TITLES[currentStep - 1]}
          </p>
          <ProgressBar
            currentStep={currentStep - 1}
            totalSteps={WIZARD_TOTAL_STEPS - 2}
            ariaLabel={`Progression du devis — ${STEP_TITLES[currentStep - 1]}`}
          />
        </div>
      )}

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className={isWelcomeStep ? 'min-h-full sm:min-h-0' : 'pb-2 sm:pb-0'}
        >
          <ErrorBoundary>
            {stepComponent(currentStep)}
          </ErrorBoundary>
        </motion.div>
      </AnimatePresence>
    </Modal>
  );
};
