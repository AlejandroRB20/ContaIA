/**
 * Contratos de Authentication & Authorization (EWO-002) compartidos entre
 * apps/api y apps/web — reflejan las respuestas reales del backend, nunca
 * campos sensibles (passwordHash, secretos MFA, hashes de token).
 */

export const ROLE_NAMES = [
  'ADMINISTRADOR',
  'CONTADOR',
  'AUXILIAR',
  'SUPERVISOR',
  'AUDITOR',
  'ESTUDIANTE',
] as const;

export type RoleName = (typeof ROLE_NAMES)[number];

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
}

export interface MembershipSummary {
  id: string;
  companyId: string;
  companyName: string;
  role: RoleName;
  isOwner: boolean;
}

export interface UserProfile extends PublicUser {
  phone: string | null;
  avatar: string | null;
  accountStatus: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  isPlatformAdmin: boolean;
  memberships: MembershipSummary[];
}

export interface LoginSuccessData {
  mfaRequired: false;
  mfaEnrollmentRequired: false;
  user: PublicUser;
}

export interface LoginMfaChallengeData {
  mfaRequired: true;
  mfaEnrollmentRequired: false;
  mfaChallengeToken: string;
}

/**
 * BR-AUTH-002: el Usuario tiene un Rol distinto de Estudiante en al menos
 * una Membership activa y todavia no tiene MFA activado — debe completar
 * el enrolamiento ahora para poder tener una sesion real.
 */
export interface LoginMfaEnrollmentRequiredData {
  mfaRequired: false;
  mfaEnrollmentRequired: true;
  mfaChallengeToken: string;
}

export type LoginResponseData =
  LoginSuccessData | LoginMfaChallengeData | LoginMfaEnrollmentRequiredData;

export interface MfaEnrollmentCompleteData {
  mfaRequired: false;
  mfaEnrollmentRequired: false;
  user: PublicUser;
  recoveryCodes: string[];
}

export interface SessionSummary {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
}

export interface RoleCatalogItem {
  id: string;
  name: RoleName;
  description: string;
}

export interface PermissionCatalogItem {
  id: string;
  key: string;
  description: string;
  module: string;
}

export interface MfaSetupData {
  otpAuthUrl: string;
  qrCodeDataUrl: string;
  secret: string;
}

export type InvitationPreviewStatus =
  'PENDING' | 'EXPIRED' | 'ACCEPTED' | 'DECLINED' | 'REVOKED' | 'NOT_FOUND';

export interface InvitationPreview {
  status: InvitationPreviewStatus;
  companyName?: string;
  role?: RoleName;
  invitedByName?: string;
  email?: string;
  hasAccount?: boolean;
}
