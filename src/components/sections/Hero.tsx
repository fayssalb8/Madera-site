import { type FC } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useInView, useAnimatedCounter } from '@/hooks';
import { useWizardStore } from '@/store/wizardStore';

const stats = [
  { value: 500, suffix: '+', label: 'Projets Réalisés' },
  { value: 15, suffix: '+', label: "Ans d'Expérience" },
  { value: 100, suffix: '%', label: 'Sur Mesure' },
];

const StatCounter: FC<{ value: number; suffix: string; label: string; isInView: boolean }> = ({
  value, suffix, label, isInView,
}) => {
  const count = useAnimatedCounter(value, isInView);
  return (
    <div className="text-center">
      <div className="text-3xl md:text-4xl font-bold text-primary-500">
        {count}{suffix}
      </div>
      <div className="text-xs md:text-sm text-text-muted mt-1">{label}</div>
    </div>
  );
};

export const Hero: FC = () => {
  const openWizard = useWizardStore((s) => s.openWizard);
  const [statsRef, statsInView] = useInView({ threshold: 0.3 });

  return (
    <section id="accueil" className="relative flex min-h-[100svh] items-center overflow-hidden bg-bg pt-20 sm:pt-24">
      <div className="mx-auto w-full max-w-7xl px-4 pb-14 pt-4 sm:px-6 sm:pb-20 lg:px-8 lg:py-24">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-16">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="order-2 text-center lg:order-1 lg:text-left"
          >
            <span className="mb-4 inline-block rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary-500">
              Cuisines sur Mesure en Algérie
            </span>
            <h1 className="mx-auto mb-5 max-w-xl text-4xl font-bold leading-[1.08] tracking-tight text-text-primary sm:text-5xl lg:mx-0 lg:text-6xl">
              Cuisines sur Mesure{' '}
              <span className="text-primary-500">Modernes</span>{' '}
              & Élégantes
            </h1>
            <p className="mx-auto mb-7 max-w-lg text-base leading-relaxed text-text-secondary sm:text-lg lg:mx-0">
              Concevez votre cuisine de rêve en quelques clics. Fabrication locale,
              matériaux premium, installation professionnelle.
            </p>
            <div className="flex w-full flex-col gap-3 sm:mx-auto sm:max-w-md sm:flex-row lg:mx-0 lg:max-w-none">
              <div className="relative group w-full sm:w-auto">
                <div className="absolute inset-0 bg-primary-500 rounded-xl blur-xl opacity-20 group-hover:opacity-40 transition duration-500 animate-pulse" />
                <Button size="lg" className="relative shadow-glow w-full sm:w-auto" onClick={openWizard}>
                  Obtenir un Devis Gratuit
                </Button>
              </div>
              <Button variant="secondary" size="lg" className="w-full sm:w-auto" onClick={() => {
                document.getElementById('realisations')?.scrollIntoView({ behavior: 'smooth' });
              }}>
                Voir nos Réalisations ↓
              </Button>
            </div>
          </motion.div>

          {/* Hero Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="order-1 lg:order-2"
          >
            <motion.div 
              animate={{ y: [0, -15, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              className="relative mx-auto aspect-[4/3] max-h-[42svh] w-full max-w-md overflow-hidden rounded-2xl bg-primary-100 sm:rounded-3xl lg:max-h-none lg:max-w-none"
            >
              <img 
                src="/hero.webp" 
                alt="Cuisine Moderne sur Mesure" 
                width={1200}
                height={900}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className="absolute inset-0 w-full h-full object-cover" 
              />
              {/* Elegant gradient overlay to give depth over the image */}
              <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-transparent" />
            </motion.div>
          </motion.div>
        </div>

        {/* Animated Stats */}
        <motion.div
          ref={statsRef}
          initial={{ opacity: 0, y: 20 }}
          animate={statsInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mx-auto mt-10 grid max-w-md grid-cols-3 gap-3 rounded-2xl border border-border-subtle bg-surface/80 p-4 shadow-xs sm:gap-8 md:mt-16 lg:mx-0 lg:max-w-lg"
        >
          {stats.map((stat) => (
            <StatCounter key={stat.label} {...stat} isInView={statsInView} />
          ))}
        </motion.div>
      </div>
    </section>
  );
};
