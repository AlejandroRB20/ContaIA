'use client';

import type { UpdateFiscalProfileInput } from '@contaia/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateFiscalProfile } from '@/lib/companies-client';

interface UpdateFiscalProfileVariables {
  companyId: string;
  input: UpdateFiscalProfileInput;
  expectedVersion: number;
}

/** EWO-003 sección 5.7 — perfil fiscal (bloqueo optimista via If-Match sobre `Company.version`). */
export function useUpdateFiscalProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ companyId, input, expectedVersion }: UpdateFiscalProfileVariables) =>
      updateFiscalProfile(companyId, input, expectedVersion),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['companies', variables.companyId] });
    },
  });
}
