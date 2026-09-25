import { type FC, type ReactNode, memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SelectionCardProps {
  icon?: ReactNode;
  label: string;
  sublabel?: string;
  isSelected: boolean;
  onSelect: () => void;
  className?: string;
}

export const SelectionCard: FC<SelectionCardProps> = memo(({
  icon,
  label,
  sublabel,
  isSelected,
  onSelect,
  className,
}) => {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        'relative flex flex-col items-center justify-center gap-2',
        'rounded-2xl border p-4 sm:p-5 transition-all duration-200 ease-in-out',
        'min-h-[128px] cursor-pointer w-full touch-manipulation',
        isSelected
          ? 'border-primary-500 shadow-glow bg-primary-50 ring-2 ring-primary-500/30'
          : 'border-border-subtle bg-surface shadow-xs hover:shadow-md hover:border-primary-300 hover:bg-primary-50/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        className,
      )}
      aria-pressed={isSelected}
    >
      {icon && <span className="text-3xl sm:text-4xl">{icon}</span>}
      <span className="text-base sm:text-sm font-semibold text-text-primary text-center leading-tight">
        {label}
      </span>
      {sublabel && (
        <span className="text-xs text-text-muted text-center leading-snug">{sublabel}</span>
      )}
      {isSelected && (
        <motion.div
          layoutId="selection-check"
          className="absolute right-3 top-3 w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      )}
    </motion.button>
  );
});

SelectionCard.displayName = 'SelectionCard';
