import { create } from 'zustand';

interface AuthState {
  token: string | null;
  expiresAt: number | null;
  login: (token: string, expiresAt: number) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  expiresAt: null,
  login: (token, expiresAt) => set({ token, expiresAt }),
  logout: () => set({ token: null, expiresAt: null }),
  isAuthenticated: () => {
    const { token, expiresAt } = get();
    return token !== null && expiresAt !== null && Date.now() < expiresAt;
  },
}));