// src/store/authStore.ts
import { create } from 'zustand';
import api from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Org {
  id: string;
  name: string;
  slug: string;
}

interface AuthState {
  user: User | null;
  currentOrg: Org | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  setCurrentOrg: (org: Org) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  currentOrg: null,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    const res = await api.post('/auth/login', { email, password });
    set({
      user: res.data.user,
      currentOrg: res.data.org,
      isLoading: false,
    });
  },

  register: async (data) => {
    set({ isLoading: true });
    const res = await api.post('/auth/register', data);
    set({
      user: res.data.user,
      currentOrg: res.data.org,
      isLoading: false,
    });
  },

  logout: async () => {
    await api.post('/auth/logout');
    set({ user: null, currentOrg: null });
  },

  setCurrentOrg: (org) => set({ currentOrg: org }),
}));