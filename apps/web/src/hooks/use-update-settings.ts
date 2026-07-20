'use client';

import type { UpdateSettingsInput } from '@contaia/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateSettings } from '@/lib/companies-client';

interface UpdateSettingsVariables {
  companyId: string;
  input: UpdateSettingsInput;
  expectedVersion: number;
}

/** EWO-003 sección 5.8 — configuración regional (bloqueo optimista via If-Match sobre `Company.version`). */
export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ companyId, input, expectedVersion }: UpdateSettingsVariables) =>
      updateSettings(companyId, input, expectedVersion),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['companies', variables.companyId] });
    },
  });
}
