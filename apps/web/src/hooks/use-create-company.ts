'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createCompany } from '@/lib/companies-client';

/** UI-0006 — creación de Empresa (BR-EMP-001). Invalida el listado para reflejar la nueva Empresa. */
export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCompany,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
      void queryClient.invalidateQueries({ queryKey: ['session', 'me'] });
    },
  });
}
