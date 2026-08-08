/**
 * Eventos de dominio de Auth, emitidos via @nestjs/event-emitter y
 * consumidos por AuditService (EWO-002 seccion Auditoria). Alcance de
 * EWO-002: eventos en proceso dentro del monolito — no implementan todavia
 * el patron completo de docs/07_SOFTWARE_ARCHITECTURE.md AD-06 (Registro de
 * Trazabilidad como bus de eventos entre modulos), ver brain/DECISIONS.md.
 */

export const AUTH_EVENTS = {
  USER_REGISTERED: 'auth.user_registered',
  USER_LOGGED_IN: 'auth.user_logged_in',
  LOGIN_FAILED: 'auth.login_failed',
  EMAIL_VERIFIED: 'auth.email_verified',
  PASSWORD_CHANGED: 'auth.password_changed',
  PASSWORD_RESET_REQUESTED: 'auth.password_reset_requested',
  SESSION_REVOKED: 'auth.session_revoked',
  MFA_ENABLED: 'auth.mfa_enabled',
  MFA_DISABLED: 'auth.mfa_disabled',
  ROLE_CHANGED: 'auth.role_changed',
  MEMBERSHIP_REVOKED: 'auth.membership_revoked',
  INVITATION_CREATED: 'auth.invitation_created',
  INVITATION_ACCEPTED: 'auth.invitation_accepted',
  INVITATION_DECLINED: 'auth.invitation_declined',
  ORGANIZATION_CREATED: 'organizations.organization_created',
  COMPANY_CREATED: 'companies.company_created',
  COMPANY_UPDATED: 'companies.company_updated',
  COMPANY_FISCAL_PROFILE_UPDATED: 'companies.fiscal_profile_updated',
  COMPANY_ADDRESS_UPDATED: 'companies.address_updated',
  COMPANY_SETTINGS_UPDATED: 'companies.settings_updated',
  PLATFORM_ADMIN_COMPANY_ACCESS_DENIED: 'security.platform_admin_company_access_denied',
} as const;

interface BaseAuditContext {
  correlationId: string;
  ipAddress?: string;
  deviceInfo?: string;
}

export class UserRegisteredEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly context: BaseAuditContext,
  ) {}
}

export class UserLoggedInEvent {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly context: BaseAuditContext,
  ) {}
}

export class LoginFailedEvent {
  constructor(
    public readonly email: string,
    public readonly reason: string,
    public readonly context: BaseAuditContext,
  ) {}
}

export class EmailVerifiedEvent {
  constructor(
    public readonly userId: string,
    public readonly context: BaseAuditContext,
  ) {}
}

export class PasswordChangedEvent {
  constructor(
    public readonly userId: string,
    public readonly context: BaseAuditContext,
  ) {}
}

export class PasswordResetRequestedEvent {
  constructor(
    public readonly email: string,
    public readonly context: BaseAuditContext,
  ) {}
}

export class SessionRevokedEvent {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly reason: string,
    public readonly context: BaseAuditContext,
  ) {}
}

export class MfaEnabledEvent {
  constructor(
    public readonly userId: string,
    public readonly context: BaseAuditContext,
  ) {}
}

export class MfaDisabledEvent {
  constructor(
    public readonly userId: string,
    public readonly context: BaseAuditContext,
  ) {}
}

export class RoleChangedEvent {
  constructor(
    public readonly membershipId: string,
    public readonly companyId: string,
    public readonly actorUserId: string,
    public readonly beforeRoleId: string,
    public readonly afterRoleId: string,
    public readonly context: BaseAuditContext,
  ) {}
}

export class MembershipRevokedEvent {
  constructor(
    public readonly membershipId: string,
    public readonly companyId: string,
    public readonly actorUserId: string,
    public readonly context: BaseAuditContext,
  ) {}
}

export class InvitationCreatedEvent {
  constructor(
    public readonly invitationId: string,
    public readonly companyId: string,
    public readonly invitedByUserId: string,
    public readonly context: BaseAuditContext,
  ) {}
}

export class InvitationAcceptedEvent {
  constructor(
    public readonly invitationId: string,
    public readonly companyId: string,
    public readonly userId: string,
    public readonly context: BaseAuditContext,
  ) {}
}

export class InvitationDeclinedEvent {
  constructor(
    public readonly invitationId: string,
    public readonly companyId: string,
    public readonly userId: string,
    public readonly context: BaseAuditContext,
  ) {}
}

/** EWO-003 — BR-ORG-001. Emitido tanto por creacion explicita (API-0009) como implicita (creacion de la primera Company de un usuario). */
export class OrganizationCreatedEvent {
  constructor(
    public readonly organizationId: string,
    public readonly actorUserId: string,
    public readonly context: BaseAuditContext,
  ) {}
}

/** EWO-003 — BR-EMP-001: creacion atomica de Company + Membership Administrador propietario. */
export class CompanyCreatedEvent {
  constructor(
    public readonly companyId: string,
    public readonly organizationId: string,
    public readonly actorUserId: string,
    public readonly context: BaseAuditContext,
  ) {}
}

export type CompanyStateSnapshot = Record<string, string | null>;

/** EWO-003 — BR-CFG-002: cambios de configuracion de empresa quedan trazados con valor anterior. */
export class CompanyUpdatedEvent {
  constructor(
    public readonly companyId: string,
    public readonly actorUserId: string,
    public readonly beforeState: CompanyStateSnapshot,
    public readonly afterState: CompanyStateSnapshot,
    public readonly context: BaseAuditContext,
  ) {}
}

/** EWO-003 seccion 5.7/10 — BR-CFG-002 aplicado al perfil fiscal (sub-recurso del agregado Company). */
export class CompanyFiscalProfileUpdatedEvent {
  constructor(
    public readonly companyId: string,
    public readonly actorUserId: string,
    public readonly beforeState: CompanyStateSnapshot,
    public readonly afterState: CompanyStateSnapshot,
    public readonly context: BaseAuditContext,
  ) {}
}

/** EWO-003 seccion 5.7/10 — BR-CFG-002 aplicado al domicilio fiscal (sub-recurso del agregado Company). */
export class CompanyAddressUpdatedEvent {
  constructor(
    public readonly companyId: string,
    public readonly actorUserId: string,
    public readonly beforeState: CompanyStateSnapshot,
    public readonly afterState: CompanyStateSnapshot,
    public readonly context: BaseAuditContext,
  ) {}
}

/** EWO-003 seccion 5.8/10 — BR-CFG-002 aplicado a la configuracion regional (sub-recurso del agregado Company). */
export class CompanySettingsUpdatedEvent {
  constructor(
    public readonly companyId: string,
    public readonly actorUserId: string,
    public readonly beforeState: CompanyStateSnapshot,
    public readonly afterState: CompanyStateSnapshot,
    public readonly context: BaseAuditContext,
  ) {}
}

/**
 * D-010 — todo intento de un Administrador de plataforma sin Membership
 * contra una ruta o servicio company-scoped se registra, sea denegado por
 * `CompanyGuard` o por `MembershipsService.assertActorIsCompanyAdmin`. No
 * implica motivo registrado ni contexto de soporte JIT (API-0053 aun no
 * existe) — es exclusivamente el registro del intento denegado.
 */
export class PlatformAdminCompanyAccessDeniedEvent {
  constructor(
    public readonly actorUserId: string,
    public readonly companyId: string,
    public readonly context: BaseAuditContext,
  ) {}
}
