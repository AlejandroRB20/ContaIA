'use client';

import { useMutation } from '@tanstack/react-query';

import { register, type RegisterInput } from '@/lib/auth-client';

export function useRegister() {
  return useMutation({
    mutationFn: (input: RegisterInput) => register(input),
  });
}
