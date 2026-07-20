'use client';

import { useMutation } from '@tanstack/react-query';

import { resendVerification, verifyEmail } from '@/lib/auth-client';

export function useVerifyEmail() {
  return useMutation({ mutationFn: (token: string) => verifyEmail(token) });
}

export function useResendVerification() {
  return useMutation({ mutationFn: (email: string) => resendVerification(email) });
}
