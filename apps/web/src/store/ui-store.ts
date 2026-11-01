import { create } from 'zustand';
import { PublicUserDto } from '@navrix/types';

export type ThemeMode = 'dark' | 'light';

interface UiState {
  theme: ThemeMode;
  mobileNavOpen: boolean;
  accessToken: string | null;
  user: PublicUserDto | null;
  hydrated: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setMobileNavOpen: (open: boolean) => void;
  setSession: (accessToken: string | null, user: PublicUserDto | null) => void;
  clearSession: () => void;
  hydrate: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: 'dark',
  mobileNavOpen: false,
  accessToken: null,
  user: null,
  hydrated: false,

  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('navrix_theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
    }
    set({ theme });
  },

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },

  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),

  setSession: (accessToken, user) => {
    if (typeof window !== 'undefined') {
      if (accessToken) {
        sessionStorage.setItem('navrix_access_token', accessToken);
      } else {
        sessionStorage.removeItem('navrix_access_token');
      }
      if (user) {
        sessionStorage.setItem('navrix_user', JSON.stringify(user));
      } else {
        sessionStorage.removeItem('navrix_user');
      }
    }
    set({ accessToken, user });
  },

  clearSession: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('navrix_access_token');
      sessionStorage.removeItem('navrix_user');
    }
    set({ accessToken: null, user: null });
  },

  hydrate: () => {
    if (typeof window === 'undefined') return;
    const savedTheme =
      (localStorage.getItem('navrix_theme') as ThemeMode) || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const savedToken = sessionStorage.getItem('navrix_access_token');
    const savedUserRaw = sessionStorage.getItem('navrix_user');
    let parsedUser: PublicUserDto | null = null;
    if (savedUserRaw) {
      try {
        parsedUser = JSON.parse(savedUserRaw) as PublicUserDto;
      } catch {
        parsedUser = null;
      }
    }
    set({
      theme: savedTheme,
      accessToken: savedToken,
      user: parsedUser,
      hydrated: true,
    });
  },
}));

