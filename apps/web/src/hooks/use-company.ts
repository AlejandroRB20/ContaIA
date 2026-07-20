'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchCompany } from '@/lib/companies-client';

/**
 * UI-0011 — detalle de una Empresa. La clave de consulta incluye
 * `companyId` (docs/12_FRONTEND_ARCHITECTURE.md sección 5: nunca compartir
 * caché entre Empresas).
 */
export function useCompany(companyId: string | undefined) {
  return useQuery({
    queryKey: ['companies', companyId],
    queryFn: () => fetchCompany(companyId as string),
    enabled: Boolean(companyId),
  });
}
