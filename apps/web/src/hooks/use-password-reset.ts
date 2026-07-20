'use client';

import { useMutation } from '@tanstack/react-query';

import { confirmPasswordReset, requestPasswordReset } from '@/lib/auth-client';

export function useRequestPasswordReset() {
  return useMutation({ mutationFn: (email: string) => requestPasswordReset(email) });
}

export function useConfirmPasswordReset() {
  return useMutation({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) =>
      confirmPasswordReset(token, newPassword),
  });
}
