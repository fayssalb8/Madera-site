import { type FC, useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import { getLoginRedirect } from '@/lib/adminRouting';

export const LoginPage: FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  useEffect(() => {
    const redirectTo = getLoginRedirect(Boolean(user));
    if (redirectTo) navigate(redirectTo, { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const { error: err } = await login(email, password, totpCode);
    if (err) setError(err);
  };

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-bg px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-text-primary">Madera Kitchen</h1>
            <p className="text-text-secondary mt-2">CRM - Espace Admin</p>
          </div>

          <div className="bg-surface rounded-2xl border border-border p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-text-primary mb-6">Connexion</h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div role="alert" className="bg-error/10 text-error text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-text-primary mb-1.5">Email</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-text-primary outline-none transition-all focus:border-primary-300 focus:ring-2 focus:ring-primary-500"
                  placeholder="admin@madera-kitchen.dz"
                  required
                  autoComplete="username"
                />
              </div>

              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-text-primary mb-1.5">Mot de passe</label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-text-primary outline-none transition-all focus:border-primary-300 focus:ring-2 focus:ring-primary-500"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>

              <div>
                <label htmlFor="login-totp" className="block text-sm font-medium text-text-primary mb-1.5">
                  Code 2FA <span className="font-normal text-text-muted">(si activé)</span>
                </label>
                <input
                  id="login-totp"
                  type="text"
                  inputMode="numeric"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-text-primary outline-none transition-all focus:border-primary-300 focus:ring-2 focus:ring-primary-500 tracking-widest"
                  placeholder="123456"
                  maxLength={6}
                  autoComplete="one-time-code"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary-500 text-white font-semibold py-3 rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};
