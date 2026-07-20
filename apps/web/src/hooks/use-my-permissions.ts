'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { fetchMyPermissions } from '@/lib/roles-client';
import { useSessionStore } from '@/store/use-session-store';

/**
 * Carga los permisos del usuario autenticado en la Empresa activa y los
 * sincroniza con Zustand (docs/19_FRONTEND_IMPLEMENTATION_PLAN.md seccion 6).
 * La clave de caché incluye companyId — al cambiar de Empresa se invalida
 * automáticamente y se recarga (docs/12_FRONTEND_ARCHITECTURE.md seccion 6).
 */
export function useMyPermissions(companyId: string | null) {
  const setPermissions = useSessionStore((state) => state.setPermissions);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['permissions', companyId],
    queryFn: () => fetchMyPermissions(companyId!),
    enabled: companyId !== null,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (query.data) {
      setPermissions(query.data);
    }
  }, [query.data, setPermissions]);

  return { permissions: query.data ?? [], isLoading: query.isLoading, queryClient };
}
