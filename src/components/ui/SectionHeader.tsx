import { type FC } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  label?: string;
  title: string;
  description?: string;
  className?: string;
}

export const SectionHeader: FC<SectionHeaderProps> = ({ label, title, description, className }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn('mx-auto mb-9 max-w-2xl text-center sm:mb-12 md:mb-16', className)}
    >
      {label && (
        <span className="text-xs font-medium tracking-wider uppercase text-primary-500 mb-3 block">
          {label}
        </span>
      )}
      <h2 className="mb-3 text-2xl font-bold leading-tight tracking-tight text-text-primary sm:text-3xl md:text-4xl lg:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="text-sm leading-relaxed text-text-secondary sm:text-base md:text-lg">
          {description}
        </p>
      )}
    </motion.div>
  );
};
