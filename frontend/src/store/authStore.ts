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
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setCurrentOrg: (org: Org) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  currentOrg: null,
  isLoading: false,

  // ✅ LOGIN 
  login: async (email, password) => {
    set({ isLoading: true });

    try {
      const res = await api.post('/auth/login', { email, password });

      set({
        user: res.data.user,
        currentOrg: res.data.org,
      });
    } catch (error) {
      // rethrow so UI can handle it
      throw error;
    } finally {
      // ALWAYS reset loading
      set({ isLoading: false });
    }
  },

  // ✅ REGISTER 
  register: async (data) => {
    set({ isLoading: true });

    try {
      const res = await api.post('/auth/register', data);

      set({
        user: res.data.user,
        currentOrg: res.data.org,
      });
    } catch (error) {
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // ✅ NEW: FETCH CURRENT USER FROM COOKIE
  fetchMe: async () => {
    try {
      const res = await api.get("/auth/me");
      set({
        user: res.data.user,
        currentOrg: res.data.org,
      });
    } catch {
      // not logged in or token expired
      set({ user: null, currentOrg: null });
    }
  },

  // ✅ LOGOUT (SAFE)
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      // even if logout API fails, clear local state
      set({ user: null, currentOrg: null });
    }
  },

  // ✅ SET CURRENT ORG
  setCurrentOrg: (org) => set({ currentOrg: org }),
}));
