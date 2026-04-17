// src/app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from "@/store/authStore";
import { usePathname } from "next/navigation";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: 1,
      },
    },
  }));
  
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const user = useAuthStore((state) => state.user);
  const currentOrg = useAuthStore((state) => state.currentOrg);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const pathname = usePathname();
  const previousIdentityRef = useRef("");
  
  // 🔥 Only fetch on mount and when NOT on auth pages
  useEffect(() => {
    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
    
    if (!isAuthPage) {
      fetchMe();
    }
  }, [fetchMe, pathname]);

  useEffect(() => {
    const identityKey = isAuthenticated
      ? `${user?.id ?? "anonymous"}:${currentOrg?.id ?? "no-org"}`
      : "signed-out";

    if (previousIdentityRef.current && previousIdentityRef.current !== identityKey) {
      queryClient.clear();
    }

    previousIdentityRef.current = identityKey;
  }, [currentOrg?.id, isAuthenticated, queryClient, user?.id]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors closeButton position="top-right" />
    </QueryClientProvider>
  );
}
