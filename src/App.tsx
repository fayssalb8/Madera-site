import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import { RootLayout } from '@/components/layout/RootLayout';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { useAuthStore } from '@/store/authStore';
import { useWizardStore } from '@/store/wizardStore';
import { getAdminIndexRedirect } from '@/lib/adminRouting';

const MaterialPage = lazy(() => import('@/pages/MaterialPage').then((module) => ({ default: module.MaterialPage })));
const PortfolioPage = lazy(() => import('@/pages/PortfolioPage').then((module) => ({ default: module.PortfolioPage })));
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout').then((module) => ({ default: module.AdminLayout })));
const LoginPage = lazy(() => import('@/pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const LeadsPage = lazy(() => import('@/pages/admin/LeadsPage').then((module) => ({ default: module.LeadsPage })));
const LeadDetailPage = lazy(() => import('@/pages/admin/LeadDetailPage').then((module) => ({ default: module.LeadDetailPage })));
const UsersPage = lazy(() => import('@/pages/admin/UsersPage').then((module) => ({ default: module.UsersPage })));
const MediaPage = lazy(() => import('@/pages/admin/MediaPage').then((module) => ({ default: module.MediaPage })));

function WizardAutoOpen() {
  const openWizard = useWizardStore((s) => s.openWizard);

  useEffect(() => {
    openWizard();
  }, [openWizard]);

  return null;
}

function AdminIndexRedirect() {
  const user = useAuthStore((s) => s.user);

  return <Navigate to={getAdminIndexRedirect(Boolean(user))} replace />;
}

const pageFallback = (
  <div className="min-h-screen bg-bg pt-24">
    <div className="mx-auto h-1 w-24 overflow-hidden rounded-full bg-primary-100">
      <div className="h-full w-1/2 animate-pulse rounded-full bg-primary-500" />
    </div>
  </div>
);

function App() {
  const checkSession = useAuthStore((s) => s.checkSession);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  if (!initialized) return null;

  return (
    <Suspense fallback={pageFallback}>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/devis" element={<><WizardAutoOpen /><HomePage /></>} />
          <Route path="/materiaux/:id" element={<MaterialPage />} />
          <Route path="/realisations" element={<PortfolioPage />} />
        </Route>

        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminIndexRedirect />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="leads/:id" element={<LeadDetailPage />} />
          <Route path="media" element={<MediaPage />} />
          <Route path="users" element={<UsersPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;
