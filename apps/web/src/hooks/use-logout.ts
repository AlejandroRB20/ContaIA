'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { logout } from '@/lib/auth-client';
import { useSessionStore } from '@/store/use-session-store';

export function useLogout() {
  const clearSession = useSessionStore((state) => state.clearSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      clearSession();
      queryClient.clear();
    },
  });
}
