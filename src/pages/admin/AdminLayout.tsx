import { type FC, useState } from 'react';
import { Navigate, Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { getAdminIndexRedirect } from '@/lib/adminRouting';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Leads', path: '/admin/leads' },
  { label: 'Médias', path: '/admin/media' },
  { label: 'Compte', path: '/admin/users' },
];

export const AdminLayout: FC = () => {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const initialized = useAuthStore((s) => s.initialized);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close the mobile menu whenever navigation happens — adjusted during
  // render so it also covers back/forward navigation.
  const [prevPathname, setPrevPathname] = useState(location.pathname);
  if (prevPathname !== location.pathname) {
    setPrevPathname(location.pathname);
    setIsMobileMenuOpen(false);
  }

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-text-muted">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={getAdminIndexRedirect(false)} replace />;
  }

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen bg-bg">
        <header className="bg-surface border-b border-border sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-6 min-w-0">
                <Link to="/" className="text-lg font-bold text-text-primary shrink-0">
                  Madera Kitchen
                </Link>
                <nav aria-label="Navigation administration" className="hidden sm:flex items-center gap-1">
                  {NAV_ITEMS.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      aria-current={location.pathname === item.path ? 'page' : undefined}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        location.pathname === item.path
                          ? 'bg-primary-50 text-primary-600'
                          : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-text-secondary hidden md:block truncate max-w-[200px]">
                  {profile?.full_name || profile?.email}
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-primary-50 text-primary-600 font-medium">
                  {profile?.role === 'admin' ? 'Admin' : 'Agent'}
                </span>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="hidden sm:block text-sm text-text-secondary hover:text-error transition-colors cursor-pointer"
                >
                  Déconnexion
                </button>
                {/* Mobile menu toggle */}
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-label={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
                  aria-expanded={isMobileMenuOpen}
                  aria-controls="admin-mobile-menu"
                  className="sm:hidden flex h-10 w-10 items-center justify-center rounded-lg border border-border text-text-secondary hover:text-text-primary cursor-pointer focus-visible:outline-2 focus-visible:outline-primary-500"
                >
                  <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {isMobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile navigation */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.nav
                id="admin-mobile-menu"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                aria-label="Navigation administration"
                className="sm:hidden overflow-hidden border-t border-border bg-surface"
              >
                <div className="px-4 py-3 space-y-1">
                  {NAV_ITEMS.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      aria-current={location.pathname === item.path ? 'page' : undefined}
                      className={cn(
                        'block px-4 py-3 rounded-xl text-base font-medium transition-colors',
                        location.pathname === item.path
                          ? 'bg-primary-50 text-primary-600'
                          : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="block w-full text-left px-4 py-3 rounded-xl text-base font-medium text-error hover:bg-error/10 transition-colors cursor-pointer"
                  >
                    Déconnexion
                  </button>
                </div>
              </motion.nav>
            )}
          </AnimatePresence>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </main>
      </div>
    </>
  );
};
