import { type FC } from 'react';
import { Button } from '@/components/ui/Button';
import { useWizardStore } from '@/store/wizardStore';
import { business } from '@/lib/business';

export const StepWelcome: FC = () => {
  const nextStep = useWizardStore((s) => s.nextStep);

  return (
    <div className="relative -m-4 min-h-[calc(100dvh-2rem)] overflow-hidden rounded-none sm:-m-6 sm:min-h-[560px] sm:rounded-3xl md:-m-8">
      <img src="/hero.webp" alt="Cuisine sur mesure Madera" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 flex min-h-[calc(100dvh-2rem)] flex-col items-center justify-center px-5 py-16 text-center text-white sm:min-h-[560px] sm:px-8">
        <img src={business.logoPath} alt="Madera Kitchen" className="mb-7 h-16 w-auto object-contain brightness-0 invert sm:h-20" />
        <h3 className="mb-4 max-w-sm text-3xl font-bold leading-tight sm:max-w-md md:text-4xl">
          Créez votre cuisine sur mesure
        </h3>
        <p className="mb-8 max-w-md text-base leading-relaxed text-white/85">
          Répondez à quelques questions simples et recevez une estimation personnalisée pour votre projet.
        </p>
        <Button size="lg" className="w-full max-w-sm" onClick={nextStep}>
          Commencer mon estimation
        </Button>
        <p className="mt-5 max-w-xs text-xs font-medium leading-relaxed text-white/75">
          Estimation gratuite • Sans engagement • Réponse rapide sur WhatsApp
        </p>
      </div>
    </div>
  );
};
