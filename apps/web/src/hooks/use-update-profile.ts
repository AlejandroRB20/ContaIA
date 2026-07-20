'use client';

import type { UpdateProfileInput } from '@contaia/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateProfile } from '@/lib/auth-client';

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => updateProfile(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['session', 'me'] });
    },
  });
}
