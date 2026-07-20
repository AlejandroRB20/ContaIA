'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { beginMfaEnrollment, completeMfaEnrollment } from '@/lib/auth-client';
import { useSessionStore } from '@/store/use-session-store';

/** BR-AUTH-002 — enrolamiento forzoso de MFA antes de establecer sesion. */
export function useMfaEnrollment() {
  const setSession = useSessionStore((state) => state.setSession);
  const queryClient = useQueryClient();

  const beginEnrollment = useMutation({
    mutationFn: (mfaChallengeToken: string) => beginMfaEnrollment(mfaChallengeToken),
  });

  const completeEnrollment = useMutation({
    mutationFn: ({ mfaChallengeToken, code }: { mfaChallengeToken: string; code: string }) =>
      completeMfaEnrollment(mfaChallengeToken, code),
    onSuccess: async (data) => {
      setSession(data.user);
      await queryClient.invalidateQueries({ queryKey: ['session'] });
    },
  });

  return { beginEnrollment, completeEnrollment };
}
