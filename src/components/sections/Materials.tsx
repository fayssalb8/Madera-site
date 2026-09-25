import { type FC } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { SectionHeader } from '@/components/ui/SectionHeader';

interface MaterialCard {
  id: string;
  name: string;
  description: string;
  image: string;
}

const materials: MaterialCard[] = [
  {
    id: 'hetre',
    name: 'Cuisine en Hêtre',
    description: 'Grâce à sa texture fine et homogène, il apporte une touche naturelle et intemporelle aux cuisines modernes.',
    image: '/hetre.webp',
  },
  {
    id: 'chene',
    name: 'Cuisine en Chêne',
    description: 'Le chêne est reconnu pour sa robustesse et son grain distinctif, idéal pour une cuisine élégante et durable.',
    image: '/chene.webp',
  },
  {
    id: 'frene',
    name: 'Cuisine en Frêne',
    description: 'Le bois frêne est une essence haut de gamme, très appréciée dans l\'aménagement intérieur et la fabrication de cuisines.',
    image: '/frene.webp',
  },
  {
    id: 'mdf',
    name: 'Cuisine en MDF',
    description: 'Le MDF est un panneau de fibres de bois à densité moyenne, très utilisé dans la fabrication de meubles et de cuisines.',
    image: '/mdf.webp',
  },
  {
    id: 'egger',
    name: 'Cuisine en EGGER',
    description: 'Panneaux EGGER reconnus pour leur qualité européenne, offrant des finitions décoratives variées et une résistance supérieure.',
    image: '/egger.webp',
  },
];

export const Materials: FC = () => {
  const navigate = useNavigate();

  return (
    <section id="materiaux" className="bg-surface py-14 sm:py-16 md:py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          label="Nos Matériaux"
          title="Choisissez le style qui vous ressemble"
          description="Découvrez nos matériaux phares, chacun offrant un style unique et une qualité adaptée à vos besoins."
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {materials.map((material, index) => (
            <motion.div
              key={material.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="group"
            >
              <button
                type="button"
                onClick={() => navigate(`/materiaux/${material.id}`)}
                aria-label={`Découvrir la ${material.name}`}
                className="block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 rounded-xl cursor-pointer"
              >
                <div className="relative mb-3 aspect-[16/10] w-full overflow-hidden rounded-xl transition-transform duration-300 group-hover:scale-[1.03] sm:mb-4 sm:aspect-[4/3] sm:rounded-2xl">
                  <img
                    src={material.image}
                    alt={material.name}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <div className="absolute bottom-3 left-0 right-0 text-center">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-white/90 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full">
                      Découvrir le matériau
                      <svg aria-hidden="true" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>

                <h3 className="mb-1.5 text-center text-base font-bold text-text-primary sm:mb-2">
                  {material.name}
                </h3>
                <p className="px-1 text-center text-sm leading-relaxed text-text-secondary">
                  {material.description}
                </p>
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
