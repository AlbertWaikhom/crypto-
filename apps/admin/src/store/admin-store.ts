import { create } from 'zustand';
import { isAdminRole, PublicUserDto } from '@navrix/types';

export type ThemeMode = 'dark' | 'light';

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
      localStorage.setItem('navrix_admin_theme', next);
      document.documentElement.setAttribute('data-theme', next);
    }
    set({ theme: next });
  },

  setMobileOpen: (open) => set({ mobileOpen: open }),

  setAdminSession: (token, user) => {
    if (user && !isAdminRole(user.role)) {
      get().clearAdminSession();
      return;
    }
    if (typeof window !== 'undefined') {
      if (token) sessionStorage.setItem('navrix_admin_token', token);
      else sessionStorage.removeItem('navrix_admin_token');

      if (user) sessionStorage.setItem('navrix_admin_user', JSON.stringify(user));
      else sessionStorage.removeItem('navrix_admin_user');
    }
    set({ accessToken: token, user });
  },

  clearAdminSession: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('navrix_admin_token');
      sessionStorage.removeItem('navrix_admin_user');
    }
    set({ accessToken: null, user: null });
  },

  hydrate: () => {
    if (typeof window === 'undefined') return;
    const savedTheme =
      (localStorage.getItem('navrix_admin_theme') as ThemeMode) || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const token = sessionStorage.getItem('navrix_admin_token');
    const rawUser = sessionStorage.getItem('navrix_admin_user');
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
    set({
      theme: savedTheme,
      accessToken: parsed ? token : null,
      user: parsed,
      hydrated: true,
    });
  },
}));

