import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { WhatsAppFAB } from '@/components/layout/WhatsAppFAB';
import { useWizardStore } from '@/store/wizardStore';

const WizardShell = lazy(() => import('@/components/wizard/WizardShell').then((module) => ({ default: module.WizardShell })));

export const RootLayout = () => {
  const isWizardOpen = useWizardStore((s) => s.isOpen);

  return (
    <>
      {/* First focusable element: skip navigation for keyboard users */}
      <a href="#contenu" className="skip-link">
        Aller au contenu principal
      </a>

      <Navbar />

      {/* Page Content — skip-link target for every route */}
      <div id="contenu" className="min-h-screen">
        <Outlet />
      </div>

      <Footer />
      <WhatsAppFAB />

      {/* Wizard Modal */}
      {isWizardOpen && (
        <Suspense fallback={null}>
          <WizardShell />
        </Suspense>
      )}
    </>
  );
};
