import { type FC, useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, type Variants } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useWizardStore } from '@/store/wizardStore';
import { useScrollLock } from '@/hooks';
import { business } from '@/lib/business';

interface NavLinkItem {
  label: string;
  /** Hash target on the home page (e.g. '#materiaux') or a route path. */
  target: string;
  isHash: boolean;
}

const NAV_LINKS: NavLinkItem[] = [
  { label: 'Accueil', target: '#accueil', isHash: true },
  { label: 'Nos Matériaux', target: '#materiaux', isHash: true },
  { label: 'Processus', target: '#processus', isHash: true },
  { label: 'Réalisations', target: '/realisations', isHash: false },
];

export const Navbar: FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { scrollYProgress } = useScroll();

  const openWizard = useWizardStore((s) => s.openWizard);
  const location = useLocation();

  useScrollLock(isMobileOpen);

  // Close the mobile menu whenever navigation happens — adjusted during
  // render so back/forward navigation is covered too.
  const [prevLocation, setPrevLocation] = useState(location);
  if (prevLocation !== location) {
    setPrevLocation(location);
    setIsMobileOpen(false);
  }

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to the section after client-side navigation to '/#section'.
  // React Router does not do this automatically.
  useEffect(() => {
    if (!location.hash) return;
    // Wait for the home page sections to render before measuring.
    const frame = requestAnimationFrame(() => {
      document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(frame);
  }, [location]);

  const isDark = isScrolled || location.pathname !== '/' || Boolean(location.hash);

  const mobileMenuVars: Variants = {
    initial: { opacity: 0, x: '100%' },
    animate: {
      opacity: 1, x: 0,
      transition: { type: 'spring', damping: 25, stiffness: 200, staggerChildren: 0.08, delayChildren: 0.1 }
    },
    exit: { opacity: 0, x: '100%', transition: { staggerChildren: 0.05, staggerDirection: -1 } }
  };

  const mobileItemVars: Variants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 }
  };

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 right-0 h-[3px] z-[60] bg-primary-600 origin-left"
        style={{ scaleX: scrollYProgress }}
        aria-hidden="true"
      />

      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          'px-4 sm:px-6 lg:px-8',
          isDark ? 'glass' : 'bg-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between sm:h-20 md:h-24">
          <Link to="/" aria-label="Madera Kitchen — retour à l'accueil" className="flex items-center gap-2">
            <img src={business.logoPath} alt="" className="h-14 w-auto object-contain sm:h-16 md:h-20" />
          </Link>

          <nav aria-label="Navigation principale" className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.target}
                to={link.isHash ? `/${link.target}` : link.target}
                className="text-sm font-medium text-text-secondary hover:text-primary-500 transition-colors cursor-pointer"
              >
                {link.label}
              </Link>
            ))}
            <Button size="sm" onClick={openWizard}>
              Obtenir un Devis
            </Button>
          </nav>

          <button
            type="button"
            className="md:hidden relative z-[70] flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-full border border-border bg-surface/80 cursor-pointer focus-visible:outline-2 focus-visible:outline-primary-500"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-label={isMobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={isMobileOpen}
            aria-controls="mobile-menu"
          >
            <motion.span
              animate={isMobileOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
              className="block w-6 h-0.5 bg-text-primary"
            />
            <motion.span
              animate={isMobileOpen ? { opacity: 0 } : { opacity: 1 }}
              className="block w-6 h-0.5 bg-text-primary"
            />
            <motion.span
              animate={isMobileOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
              className="block w-6 h-0.5 bg-text-primary"
            />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            id="mobile-menu"
            variants={mobileMenuVars}
            initial="initial"
            animate="animate"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navigation"
            className="fixed inset-0 z-[65] flex flex-col gap-5 overflow-y-auto bg-surface px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-24 sm:px-8 sm:pt-28"
          >
            <motion.button
              variants={mobileItemVars}
              type="button"
              onClick={() => setIsMobileOpen(false)}
              autoFocus
              className="absolute top-4 right-4 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-border text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-primary-500"
              aria-label="Fermer le menu"
            >
              <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>

            {NAV_LINKS.map((link) => (
              <motion.div key={link.target} variants={mobileItemVars}>
                <Link
                  to={link.isHash ? `/${link.target}` : link.target}
                  className="block text-xl font-semibold text-text-primary"
                >
                  {link.label}
                </Link>
              </motion.div>
            ))}

            <motion.div variants={mobileItemVars} className="mt-auto pt-8">
              <Button size="lg" className="w-full" onClick={() => { setIsMobileOpen(false); openWizard(); }}>
                Obtenir un Devis Gratuit
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
