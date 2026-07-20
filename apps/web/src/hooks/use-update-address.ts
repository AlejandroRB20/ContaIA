'use client';

import type { UpdateAddressInput } from '@contaia/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateAddress } from '@/lib/companies-client';

interface UpdateAddressVariables {
  companyId: string;
  input: UpdateAddressInput;
  expectedVersion: number;
}

/** EWO-003 sección 5.7 — domicilio fiscal (bloqueo optimista via If-Match sobre `Company.version`). */
export function useUpdateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ companyId, input, expectedVersion }: UpdateAddressVariables) =>
      updateAddress(companyId, input, expectedVersion),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['companies', variables.companyId] });
    },
  });
}
