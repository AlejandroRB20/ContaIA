'use client';

import { useQuery, useMutation } from '@tanstack/react-query';

import { acceptInvitation, declineInvitation, fetchInvitationPreview } from '@/lib/auth-client';

export function useInvitationPreview(token: string) {
  return useQuery({
    queryKey: ['invitation', token],
    queryFn: () => fetchInvitationPreview(token),
    retry: false,
  });
}

export function useAcceptInvitation() {
  return useMutation({ mutationFn: (token: string) => acceptInvitation(token) });
}

export function useDeclineInvitation() {
  return useMutation({ mutationFn: (token: string) => declineInvitation(token) });
}
