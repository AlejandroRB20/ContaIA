'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { verifyMfaCode, verifyMfaRecoveryCode } from '@/lib/auth-client';
import { useSessionStore } from '@/store/use-session-store';

export function useMfaChallenge() {
  const setSession = useSessionStore((state) => state.setSession);
  const queryClient = useQueryClient();

  const verifyCode = useMutation({
    mutationFn: ({ mfaChallengeToken, code }: { mfaChallengeToken: string; code: string }) =>
      verifyMfaCode(mfaChallengeToken, code),
    onSuccess: async (data) => {
      if (!data.mfaRequired && !data.mfaEnrollmentRequired) {
        setSession(data.user);
        await queryClient.invalidateQueries({ queryKey: ['session'] });
      }
    },
  });

  const verifyRecoveryCode = useMutation({
    mutationFn: ({
      mfaChallengeToken,
      recoveryCode,
    }: {
      mfaChallengeToken: string;
      recoveryCode: string;
    }) => verifyMfaRecoveryCode(mfaChallengeToken, recoveryCode),
    onSuccess: async (data) => {
      if (!data.mfaRequired && !data.mfaEnrollmentRequired) {
        setSession(data.user);
        await queryClient.invalidateQueries({ queryKey: ['session'] });
      }
    },
  });

  return { verifyCode, verifyRecoveryCode };
}
