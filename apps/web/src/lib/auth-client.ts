import type {
  InvitationPreview,
  LoginResponseData,
  MfaEnrollmentCompleteData,
  MfaSetupData,
  UserProfile,
} from '@contaia/types';

import { apiRequest } from './http';

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export async function register(input: RegisterInput): Promise<void> {
  await apiRequest('/auth/register', { method: 'POST', body: input });
}

export async function verifyEmail(token: string): Promise<void> {
  await apiRequest('/auth/verify-email', { method: 'POST', body: { token } });
}

export async function resendVerification(email: string): Promise<void> {
  await apiRequest('/auth/verify-email/resend', { method: 'POST', body: { email } });
}

export async function login(
  email: string,
  password: string,
  rememberMe: boolean,
): Promise<LoginResponseData> {
  return apiRequest<LoginResponseData>('/auth/login', {
    method: 'POST',
    body: { email, password, rememberMe },
  });
}

export async function verifyMfaCode(
  mfaChallengeToken: string,
  code: string,
): Promise<LoginResponseData> {
  return apiRequest<LoginResponseData>('/auth/mfa/verify', {
    method: 'POST',
    body: { mfaChallengeToken, code },
  });
}

export async function verifyMfaRecoveryCode(
  mfaChallengeToken: string,
  recoveryCode: string,
): Promise<LoginResponseData> {
  return apiRequest<LoginResponseData>('/auth/mfa/recovery-codes/verify', {
    method: 'POST',
    body: { mfaChallengeToken, recoveryCode },
  });
}

export async function logout(): Promise<void> {
  await apiRequest('/auth/logout', { method: 'POST' });
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiRequest('/auth/password-reset/request', { method: 'POST', body: { email } });
}

export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  await apiRequest('/auth/password-reset/confirm', {
    method: 'POST',
    body: { token, newPassword },
  });
}

export async function beginMfaEnrollment(mfaChallengeToken: string): Promise<MfaSetupData> {
  return apiRequest<MfaSetupData>('/auth/mfa/enrollment/setup', {
    method: 'POST',
    body: { mfaChallengeToken },
  });
}

export async function completeMfaEnrollment(
  mfaChallengeToken: string,
  code: string,
): Promise<MfaEnrollmentCompleteData> {
  return apiRequest<MfaEnrollmentCompleteData>('/auth/mfa/enrollment/enable', {
    method: 'POST',
    body: { mfaChallengeToken, code },
  });
}

export async function fetchCurrentUser(): Promise<UserProfile> {
  return apiRequest<UserProfile>('/users/me');
}

export async function fetchInvitationPreview(token: string): Promise<InvitationPreview> {
  return apiRequest<InvitationPreview>(`/invitations/${encodeURIComponent(token)}`);
}

export async function acceptInvitation(token: string): Promise<void> {
  await apiRequest(`/invitations/${encodeURIComponent(token)}/accept`, { method: 'POST' });
}

export async function declineInvitation(token: string): Promise<void> {
  await apiRequest(`/invitations/${encodeURIComponent(token)}/decline`, { method: 'POST' });
}
