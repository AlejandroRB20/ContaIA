'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { fetchCurrentUser } from '@/lib/auth-client';
import { ApiError } from '@/lib/http';
import { useSessionStore } from '@/store/use-session-store';

/**
 * Fuente de verdad de la sesion actual — sincroniza el resultado con
 * `useSessionStore` (docs/19_FRONTEND_IMPLEMENTATION_PLAN.md seccion 6).
 */
export function useSession() {
  const setSession = useSessionStore((state) => state.setSession);
  const clearSession = useSessionStore((state) => state.clearSession);

  const query = useQuery({
    queryKey: ['session', 'me'],
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (query.data) {
      const firstMembership = query.data.memberships[0];
      setSession(query.data, firstMembership?.companyId ?? null);
    } else if (query.isError && query.error instanceof ApiError) {
      clearSession();
    }
  }, [query.data, query.isError, query.error, setSession, clearSession]);

  return query;
}
