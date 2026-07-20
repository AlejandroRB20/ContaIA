'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { login } from '@/lib/auth-client';
import { useSessionStore } from '@/store/use-session-store';

export function useLogin() {
  const setSession = useSessionStore((state) => state.setSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      email,
      password,
      rememberMe,
    }: {
      email: string;
      password: string;
      rememberMe: boolean;
    }) => login(email, password, rememberMe),
    onSuccess: async (data) => {
      if (!data.mfaRequired && !data.mfaEnrollmentRequired) {
        setSession(data.user);
        await queryClient.invalidateQueries({ queryKey: ['session'] });
      }
    },
  });
}
