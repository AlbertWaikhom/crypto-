import { create } from 'zustand';
import { ApiResponse, isAdminRole, PublicUserDto } from '@navrix/types';
import { useUiStore } from '../../store/ui-store';

export type ThemeMode = 'dark' | 'light';

const ADMIN_API_URL = '/api/v1';

interface AdminUiState {
  theme: ThemeMode;
  mobileOpen: boolean;
  accessToken: string | null;
  user: PublicUserDto | null;
  hydrated: boolean;
  toggleTheme: () => void;
  setMobileOpen: (open: boolean) => void;
  setAdminSession: (token: string | null, user: PublicUserDto | null) => void;
  clearAdminSession: () => void;
  hydrate: () => void;
}

export const useAdminStore = create<AdminUiState>((set, get) => ({
  theme: 'dark',
  mobileOpen: false,
  accessToken: null,
  user: null,
  hydrated: false,

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    if (typeof window !== 'undefined') {
      localStorage.setItem('navrix_theme', next);
      localStorage.setItem('navrix_admin_theme', next);
      document.documentElement.setAttribute('data-theme', next);
    }
    useUiStore.getState().setTheme(next);
    set({ theme: next });
  },

  setMobileOpen: (open) => set({ mobileOpen: open }),

  setAdminSession: (token, user) => {
    if (user && !isAdminRole(user.role)) {
      get().clearAdminSession();
      return;
    }
    if (typeof window !== 'undefined') {
      if (token) {
        sessionStorage.setItem('navrix_admin_token', token);
        sessionStorage.setItem('navrix_access_token', token);
      } else {
        sessionStorage.removeItem('navrix_admin_token');
      }

      if (user) {
        const serialized = JSON.stringify(user);
        sessionStorage.setItem('navrix_admin_user', serialized);
        sessionStorage.setItem('navrix_user', serialized);
      } else {
        sessionStorage.removeItem('navrix_admin_user');
      }
    }
    useUiStore.getState().setSession(token, user);
    set({ accessToken: token, user, hydrated: true });
  },

  clearAdminSession: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('navrix_admin_token');
      sessionStorage.removeItem('navrix_admin_user');
      sessionStorage.removeItem('navrix_access_token');
      sessionStorage.removeItem('navrix_user');
    }
    useUiStore.getState().clearSession();
    set({ accessToken: null, user: null });
  },

  hydrate: () => {
    if (typeof window === 'undefined') return;
    const savedTheme =
      (localStorage.getItem('navrix_theme') as ThemeMode) ||
      (localStorage.getItem('navrix_admin_theme') as ThemeMode) ||
      'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    set({ theme: savedTheme });

    const uiState = useUiStore.getState();
    if (uiState.accessToken && uiState.user && isAdminRole(uiState.user.role)) {
      set({
        accessToken: uiState.accessToken,
        user: uiState.user as PublicUserDto,
        hydrated: true,
      });
      return;
    }

    const token =
      sessionStorage.getItem('navrix_access_token') || sessionStorage.getItem('navrix_admin_token');
    const rawUser =
      sessionStorage.getItem('navrix_user') || sessionStorage.getItem('navrix_admin_user');

    let parsed: PublicUserDto | null = null;
    if (rawUser) {
      try {
        const candidate = JSON.parse(rawUser) as PublicUserDto;
        if (isAdminRole(candidate.role)) {
          parsed = candidate;
        }
      } catch {
        parsed = null;
      }
    }

    if (token && parsed) {
      set({
        accessToken: token,
        user: parsed,
        hydrated: true,
      });
      return;
    }

    // Attempt silent session restoration via HttpOnly refresh cookie on same origin (port 3000)
    fetch(`${ADMIN_API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as ApiResponse<{
          accessToken: string;
          user: PublicUserDto;
        }>;
      })
      .then((json) => {
        if (json && json.success && isAdminRole(json.data.user.role)) {
          get().setAdminSession(json.data.accessToken, json.data.user);
        } else {
          set({ accessToken: null, user: null, hydrated: true });
        }
      })
      .catch(() => {
        set({ accessToken: null, user: null, hydrated: true });
      });
  },
}));
