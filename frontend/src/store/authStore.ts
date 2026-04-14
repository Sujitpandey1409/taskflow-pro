import { create } from "zustand";
import api from "@/lib/api";
import type { RegisterFormData } from "@/validations/auth";

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
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterFormData) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setCurrentOrg: (org: Org) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  currentOrg: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (email, password) => {
    set({ isLoading: true });

    try {
      const res = await api.post("/auth/login", { email, password });

      set({
        user: res.data.user,
        currentOrg: res.data.org,
        isAuthenticated: true,
      });
    } catch (error) {
      set({ isAuthenticated: false });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (data) => {
    set({ isLoading: true });

    try {
      const res = await api.post("/auth/register", data);

      set({
        user: res.data.user,
        currentOrg: res.data.org,
        isAuthenticated: true,
      });
    } catch (error) {
      set({ isAuthenticated: false });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMe: async () => {
    try {
      const res = await api.get("/auth/me");
      set({
        user: res.data.user,
        currentOrg: res.data.org,
        isAuthenticated: true,
      });
    } catch {
      set({
        user: null,
        currentOrg: null,
        isAuthenticated: false,
      });
    }
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      set({
        user: null,
        currentOrg: null,
        isAuthenticated: false,
      });
    }
  },

  setCurrentOrg: (org) => set({ currentOrg: org }),
}));
