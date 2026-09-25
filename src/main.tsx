import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { MotionConfig } from 'framer-motion';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import './index.css';
import App from './App';

const rootFallback = (
  <div className="flex min-h-screen items-center justify-center bg-bg p-4">
    <div className="max-w-md text-center">
      <h1 className="mb-4 text-2xl font-bold text-text-primary">Une erreur est survenue</h1>
      <p className="mb-6 text-text-secondary">L'application a rencontré un problème inattendu.</p>
      <button
        onClick={() => window.location.reload()}
        className="cursor-pointer rounded-xl bg-primary-500 px-6 py-3 text-white transition-colors hover:bg-primary-600"
      >
        Rafraîchir la page
      </button>
    </div>
  </div>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallback={rootFallback}>
      {/* reducedMotion="user" disables transform/layout animations for visitors
          with "reduce motion" enabled in their OS accessibility settings. */}
      <MotionConfig reducedMotion="user">
        <HelmetProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </HelmetProvider>
      </MotionConfig>
    </ErrorBoundary>
  </StrictMode>
);

