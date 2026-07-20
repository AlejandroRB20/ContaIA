'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchCompanies } from '@/lib/companies-client';

/** UI-0005/UI-0010 — listado de Empresas del usuario autenticado. */
export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
  });
}
