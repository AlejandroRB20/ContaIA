/**
 * Reexporta explicitamente los tipos y enums generados por Prisma que los
 * consumidores (apps/api) necesitan sin importar directamente desde
 * `generated/client` (detalle de implementacion interno de este paquete).
 */
export type { Prisma } from '../generated/client/index.js';

export type {
  User,
  Organization,
  Company,
  CompanyFiscalProfile,
  CompanyAddress,
  CompanySettings,
  Role,
  Permission,
  RolePermission,
  Membership,
  Session,
  PasswordReset,
  EmailVerification,
  Invitation,
  MfaRecoveryCode,
  AuditLog,
  Document,
} from '../generated/client/index.js';

export {
  UserStatus,
  CompanyStatus,
  MembershipStatus,
  InvitationStatus,
  RoleName,
  DocumentStatus,
  DocumentFileType,
} from '../generated/client/index.js';
