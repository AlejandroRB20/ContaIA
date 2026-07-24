/**
 * Reexporta explicitamente los tipos y enums generados por Prisma que los
 * consumidores (apps/api) necesitan sin importar directamente desde
 * `generated/client` (detalle de implementacion interno de este paquete).
 */
// Exportacion de valor (no `export type`): Bloque D de EWO-005 necesita
// `Prisma.PrismaClientKnownRequestError` en tiempo de ejecucion (deteccion
// de P2002, violacion de constraint unico) — un `export type` no expone el
// namespace como valor. Sigue sirviendo tambien como tipo (ej.
// `Prisma.JobWhereInput`), sin romper ningun uso existente.
export { Prisma } from '../generated/client/index.js';

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
  Job,
} from '../generated/client/index.js';

export {
  UserStatus,
  CompanyStatus,
  MembershipStatus,
  InvitationStatus,
  RoleName,
  DocumentStatus,
  DocumentFileType,
  JobStatus,
  JobType,
} from '../generated/client/index.js';
