import { type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export const UsersPage: FC = () => {
  const profile = useAuthStore((s) => s.profile);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Compte</h1>
        <p className="text-text-secondary text-sm mt-1">
          Informations de connexion à l'administration
        </p>
      </div>

      <div className="bg-surface rounded-xl border border-border p-6 space-y-4">
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wider">Nom</p>
          <p className="text-sm font-medium text-text-primary mt-0.5">
            {profile?.full_name ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wider">Email</p>
          <p className="text-sm font-medium text-text-primary mt-0.5">{profile?.email}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wider">Rôle</p>
          <p className="text-sm font-medium text-text-primary mt-0.5 capitalize">
            {profile?.role}
          </p>
        </div>

        <div className="border-t border-border pt-4 mt-4">
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
            <p className="text-sm text-blue-800 font-medium">Authentification par variable d'environnement</p>
            <p className="text-sm text-blue-700 mt-1">
              L'accès administrateur est contrôlé par les variables{' '}
              <code className="rounded bg-blue-100 px-1 py-0.5 text-xs">ADMIN_EMAIL</code> et{' '}
              <code className="rounded bg-blue-100 px-1 py-0.5 text-xs">ADMIN_PASSWORD</code>{' '}
              définies dans votre fichier <code className="rounded bg-blue-100 px-1 py-0.5 text-xs">.env</code>.
              Modifiez-les et redémarrez le serveur pour changer les identifiants.
            </p>
          </div>
        </div>

        <div className="border-t border-border pt-4 mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-text-secondary hover:text-error hover:border-error/40 transition-colors cursor-pointer"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
};
