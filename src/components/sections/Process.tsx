import { type FC } from 'react';
import { motion } from 'framer-motion';
import { SectionHeader } from '@/components/ui/SectionHeader';

const steps = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Prise de Mesures',
    description: 'Notre équipe se déplace chez vous pour prendre les mesures exactes de votre espace.',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Conception 3D',
    description: 'Visualisez votre future cuisine en 3D avec notre logiciel KitchenDraw professionnel.',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.59-5.59a1.5 1.5 0 010-2.12l.71-.71a1.5 1.5 0 012.12 0l4.17 4.17 4.17-4.17a1.5 1.5 0 012.12 0l.71.71a1.5 1.5 0 010 2.12l-5.59 5.59a1.5 1.5 0 01-2.12 0z" />
      </svg>
    ),
    title: 'Fabrication',
    description: "Fabrication sur mesure dans notre atelier avec des matériaux de première qualité.",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
    title: 'Installation',
    description: 'Installation soignée par nos techniciens expérimentés. Livraison et pose dans les délais.',
  },
];

export const Process: FC = () => {
  return (
    <section id="processus" className="bg-bg py-14 sm:py-16 md:py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          label="Notre Processus"
          title="Du Rêve à la Réalité"
          description="Découvrez comment nous transformons votre vision en une cuisine d'exception, étape par étape."
        />

        <div className="relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-16 left-0 right-0 h-0.5 border-t-2 border-dashed border-primary-200" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-6">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="relative"
              >
                <div className="flex h-full items-start gap-4 rounded-2xl border border-border-subtle bg-surface p-4 text-left shadow-xs sm:block sm:p-6 sm:text-center">
                  {/* Step Number */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500 text-sm font-bold text-white sm:mx-auto sm:mb-4">
                    {index + 1}
                  </div>
                  <div>
                    {/* Icon */}
                    <div className="mb-2 hidden justify-center text-primary-500 sm:flex sm:mb-4">
                      {step.icon}
                    </div>
                    <h3 className="mb-1 text-base font-semibold text-text-primary sm:mb-2 sm:text-lg">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-text-secondary">{step.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
