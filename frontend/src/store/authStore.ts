import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: async (email: string, _password: string) => {
    set({ isLoading: true });
    await new Promise((r) => setTimeout(r, 1000));
    set({
      user: { id: '1', name: 'Ajinkya', email, role: 'admin' },
      isAuthenticated: true,
      isLoading: false,
    });
    return true;
  },
  signup: async (name: string, email: string, _password: string) => {
    set({ isLoading: true });
    await new Promise((r) => setTimeout(r, 1000));
    set({
      user: { id: '1', name, email, role: 'admin' },
      isAuthenticated: true,
      isLoading: false,
    });
    return true;
  },
  logout: () => set({ user: null, isAuthenticated: false }),
}));
