'use client';

import type { UpdateCompanyInput } from '@contaia/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateCompany } from '@/lib/companies-client';

interface UpdateCompanyVariables {
  companyId: string;
  input: UpdateCompanyInput;
  expectedVersion: number;
}

/** UI-0011 — actualizar datos generales de la Empresa (BR-EMP-003, bloqueo optimista via If-Match). */
export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ companyId, input, expectedVersion }: UpdateCompanyVariables) =>
      updateCompany(companyId, input, expectedVersion),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['companies', variables.companyId] });
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}
