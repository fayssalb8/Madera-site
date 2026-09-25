import { create } from 'zustand';
import type { Profile } from '@/types/crm';
import { authApi, type AuthUser } from '@/lib/api';

interface AuthState {
  user: AuthUser | null;
  profile: Profile | null;
  isLoading: boolean;
  initialized: boolean;
}

interface AuthActions {
  login: (email: string, password: string, totpCode?: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

// Registered once at module load — clears session state when any API call
// receives a 401 (see `apiFetch` in lib/api.ts).
if (typeof window !== 'undefined') {
  window.addEventListener('auth:unauthorized', () => {
    useAuthStore.setState({ user: null, profile: null });
  });
}

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  profile: null,
  isLoading: false,
  initialized: false,

  checkSession: async () => {
    try {
      const { user } = await authApi.me();
      set({
        user,
        profile: toProfile(user),
        initialized: true,
      });
    } catch {
      set({ user: null, profile: null, initialized: true });
    }
  },

  login: async (email: string, password: string, totpCode?: string) => {
    set({ isLoading: true });
    try {
      const { user } = await authApi.login(email, password, totpCode);
      set({
        user,
        profile: toProfile(user),
        isLoading: false,
      });
      return { error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur de connexion';
      set({ isLoading: false });
      return { error: msg };
    }
  },

  logout: async () => {
    await authApi.logout().catch(() => null);
    set({ user: null, profile: null });
  },
}));

function toProfile(user: AuthUser): Profile {
  return {
    id: user.sub,
    email: user.email,
    full_name: user.name,
    role: 'admin',
    phone: null,
    created_at: '',
    updated_at: '',
  };
}
