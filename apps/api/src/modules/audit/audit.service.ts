import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import {
  AUTH_EVENTS,
  type CompanyAddressUpdatedEvent,
  type CompanyCreatedEvent,
  type CompanyFiscalProfileUpdatedEvent,
  type CompanySettingsUpdatedEvent,
  type CompanyUpdatedEvent,
  type EmailVerifiedEvent,
  type InvitationAcceptedEvent,
  type InvitationCreatedEvent,
  type InvitationDeclinedEvent,
  type LoginFailedEvent,
  type MembershipRevokedEvent,
  type MfaDisabledEvent,
  type MfaEnabledEvent,
  type OrganizationCreatedEvent,
  type PasswordChangedEvent,
  type PasswordResetRequestedEvent,
  type RoleChangedEvent,
  type SessionRevokedEvent,
  type UserLoggedInEvent,
  type UserRegisteredEvent,
} from '../../common/events/auth.events';

import { AuditRepository } from './audit.repository';

/**
 * Escucha los eventos de dominio de Auth (EventEmitter2, en proceso) y
 * escribe el Registro de Trazabilidad (BR-TRZ-001/002) — nunca expone
 * update/delete (append-only aplicado en `AuditRepository`).
 */
@Injectable()
export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  @OnEvent(AUTH_EVENTS.USER_REGISTERED)
  async onUserRegistered(event: UserRegisteredEvent): Promise<void> {
    await this.auditRepository.append({
      actorUserId: event.userId,
      action: 'auth.register',
      resourceType: 'User',
      resourceId: event.userId,
      result: 'SUCCESS',
      correlationId: event.context.correlationId,
      ipAddress: event.context.ipAddress,
      deviceInfo: event.context.deviceInfo,
    });
  }

  @OnEvent(AUTH_EVENTS.USER_LOGGED_IN)
  async onUserLoggedIn(event: UserLoggedInEvent): Promise<void> {
    await this.auditRepository.append({
      actorUserId: event.userId,
      action: 'auth.login',
      resourceType: 'Session',
      resourceId: event.sessionId,
      result: 'SUCCESS',
      correlationId: event.context.correlationId,
      ipAddress: event.context.ipAddress,
      deviceInfo: event.context.deviceInfo,
    });
  }

  @OnEvent(AUTH_EVENTS.LOGIN_FAILED)
  async onLoginFailed(event: LoginFailedEvent): Promise<void> {
    await this.auditRepository.append({
      action: 'auth.login',
      resourceType: 'User',
      result: 'FAILURE',
      reason: event.reason,
      correlationId: event.context.correlationId,
      ipAddress: event.context.ipAddress,
      deviceInfo: event.context.deviceInfo,
    });
  }

  @OnEvent(AUTH_EVENTS.EMAIL_VERIFIED)
  async onEmailVerified(event: EmailVerifiedEvent): Promise<void> {
    await this.auditRepository.append({
      actorUserId: event.userId,
      action: 'auth.email_verified',
      resourceType: 'User',
      resourceId: event.userId,
      result: 'SUCCESS',
      correlationId: event.context.correlationId,
      ipAddress: event.context.ipAddress,
      deviceInfo: event.context.deviceInfo,
    });
  }

  @OnEvent(AUTH_EVENTS.PASSWORD_CHANGED)
  async onPasswordChanged(event: PasswordChangedEvent): Promise<void> {
    await this.auditRepository.append({
      actorUserId: event.userId,
      action: 'auth.password_changed',
      resourceType: 'User',
      resourceId: event.userId,
      result: 'SUCCESS',
      correlationId: event.context.correlationId,
      ipAddress: event.context.ipAddress,
      deviceInfo: event.context.deviceInfo,
    });
  }

  @OnEvent(AUTH_EVENTS.PASSWORD_RESET_REQUESTED)
  async onPasswordResetRequested(event: PasswordResetRequestedEvent): Promise<void> {
    await this.auditRepository.append({
      action: 'auth.password_reset_requested',
      resourceType: 'User',
      result: 'SUCCESS',
      correlationId: event.context.correlationId,
      ipAddress: event.context.ipAddress,
      deviceInfo: event.context.deviceInfo,
    });
  }

  @OnEvent(AUTH_EVENTS.SESSION_REVOKED)
  async onSessionRevoked(event: SessionRevokedEvent): Promise<void> {
    await this.auditRepository.append({
      actorUserId: event.userId,
      action: 'auth.session_revoked',
      resourceType: 'Session',
      resourceId: event.sessionId === 'ALL' ? null : event.sessionId,
      result: 'SUCCESS',
      reason: event.reason,
      correlationId: event.context.correlationId,
      ipAddress: event.context.ipAddress,
      deviceInfo: event.context.deviceInfo,
    });
  }

  @OnEvent(AUTH_EVENTS.ROLE_CHANGED)
  async onRoleChanged(event: RoleChangedEvent): Promise<void> {
    await this.auditRepository.append({
      actorUserId: event.actorUserId,
      companyId: event.companyId,
      action: 'roles.role_changed',
      resourceType: 'Membership',
      resourceId: event.membershipId,
      result: 'SUCCESS',
      beforeState: { roleId: event.beforeRoleId },
      afterState: { roleId: event.afterRoleId },
      correlationId: event.context.correlationId,
      ipAddress: event.context.ipAddress,
      deviceInfo: event.context.deviceInfo,
    });
  }

  @OnEvent(AUTH_EVENTS.MEMBERSHIP_REVOKED)
  async onMembershipRevoked(event: MembershipRevokedEvent): Promise<void> {
    await this.auditRepository.append({
      actorUserId: event.actorUserId,
      companyId: event.companyId,
      action: 'roles.membership_revoked',
      resourceType: 'Membership',
      resourceId: event.membershipId,
      result: 'SUCCESS',
      correlationId: event.context.correlationId,
      ipAddress: event.context.ipAddress,
      deviceInfo: event.context.deviceInfo,
    });
  }

  @OnEvent(AUTH_EVENTS.INVITATION_CREATED)
  async onInvitationCreated(event: InvitationCreatedEvent): Promise<void> {
    await this.auditRepository.append({
      actorUserId: event.invitedByUserId,
      companyId: event.companyId,
      action: 'roles.invitation_created',
      resourceType: 'Invitation',
      resourceId: event.invitationId,
      result: 'SUCCESS',
      correlationId: event.context.correlationId,
      ipAddress: event.context.ipAddress,
      deviceInfo: event.context.deviceInfo,
    });
  }

  @OnEvent(AUTH_EVENTS.INVITATION_ACCEPTED)
  async onInvitationAccepted(event: InvitationAcceptedEvent): Promise<void> {
    await this.auditRepository.append({
      actorUserId: event.userId,
      companyId: event.companyId,
      action: 'roles.invitation_accepted',
      resourceType: 'Invitation',
      resourceId: event.invitationId,
      result: 'SUCCESS',
      correlationId: event.context.correlationId,
      ipAddress: event.context.ipAddress,
      deviceInfo: event.context.deviceInfo,
    });
  }

  @OnEvent(AUTH_EVENTS.INVITATION_DECLINED)
  async onInvitationDeclined(event: InvitationDeclinedEvent): Promise<void> {
    await this.auditRepository.append({
      actorUserId: event.userId,
      companyId: event.companyId,
      action: 'roles.invitation_declined',
      resourceType: 'Invitation',
      resourceId: event.invitationId,
      result: 'SUCCESS',
      correlationId: event.context.correlationId,
      ipAddress: event.context.ipAddress,
      deviceInfo: event.context.deviceInfo,
    });
  }

  @OnEvent(AUTH_EVENTS.ORGANIZATION_CREATED)
  async onOrganizationCreated(event: OrganizationCreatedEvent): Promise<void> {
    await this.auditRepository.append({
      actorUserId: event.actorUserId,
      action: 'organizations.created',
      resourceType: 'Organization',
      resourceId: event.organizationId,
      result: 'SUCCESS',
      correlationId: event.context.correlationId,
      ipAddress: event.context.ipAddress,
      deviceInfo: event.context.deviceInfo,
    });
  }

  @OnEvent(AUTH_EVENTS.COMPANY_CREATED)
  async onCompanyCreated(event: CompanyCreatedEvent): Promise<void> {
    await this.auditRepository.append({
      actorUserId: event.actorUserId,
      companyId: event.companyId,
      action: 'companies.created',
      resourceType: 'Company',
      resourceId: event.companyId,
      result: 'SUCCESS',
      afterState: { organizationId: event.organizationId },
      correlationId: event.context.correlationId,
      ipAddress: event.context.ipAddress,
      deviceInfo: event.context.deviceInfo,
    });
  }

  @OnEvent(AUTH_EVENTS.COMPANY_UPDATED)
  async onCompanyUpdated(event: CompanyUpdatedEvent): Promise<void> {
    await this.auditRepository.append({
      actorUserId: event.actorUserId,
      companyId: event.companyId,
      action: 'companies.updated',
      resourceType: 'Company',
      resourceId: event.companyId,
      result: 'SUCCESS',
      beforeState: event.beforeState,
      afterState: event.afterState,
      correlationId: event.context.correlationId,
      ipAddress: event.context.ipAddress,
      deviceInfo: event.context.deviceInfo,
    });
  }

  @OnEvent(AUTH_EVENTS.COMPANY_FISCAL_PROFILE_UPDATED)
  async onCompanyFiscalProfileUpdated(event: CompanyFiscalProfileUpdatedEvent): Promise<void> {
    await this.auditRepository.append({
      actorUserId: event.actorUserId,
      companyId: event.companyId,
      action: 'companies.fiscal_profile_updated',
      resourceType: 'CompanyFiscalProfile',
      resourceId: event.companyId,
      result: 'SUCCESS',
      beforeState: event.beforeState,
      afterState: event.afterState,
      correlationId: event.context.correlationId,
      ipAddress: event.context.ipAddress,
      deviceInfo: event.context.deviceInfo,
    });
  }

  @OnEvent(AUTH_EVENTS.COMPANY_ADDRESS_UPDATED)
  async onCompanyAddressUpdated(event: CompanyAddressUpdatedEvent): Promise<void> {
    await this.auditRepository.append({
      actorUserId: event.actorUserId,
      companyId: event.companyId,
      action: 'companies.address_updated',
      resourceType: 'CompanyAddress',
      resourceId: event.companyId,
      result: 'SUCCESS',
      beforeState: event.beforeState,
      afterState: event.afterState,
      correlationId: event.context.correlationId,
      ipAddress: event.context.ipAddress,
      deviceInfo: event.context.deviceInfo,
    });
  }

  @OnEvent(AUTH_EVENTS.COMPANY_SETTINGS_UPDATED)
  async onCompanySettingsUpdated(event: CompanySettingsUpdatedEvent): Promise<void> {
    await this.auditRepository.append({
      actorUserId: event.actorUserId,
      companyId: event.companyId,
      action: 'companies.settings_updated',
      resourceType: 'CompanySettings',
      resourceId: event.companyId,
      result: 'SUCCESS',
      beforeState: event.beforeState,
      afterState: event.afterState,
      correlationId: event.context.correlationId,
      ipAddress: event.context.ipAddress,
      deviceInfo: event.context.deviceInfo,
    });
  }

  @OnEvent(AUTH_EVENTS.MFA_ENABLED)
  async onMfaEnabled(event: MfaEnabledEvent): Promise<void> {
    await this.auditRepository.append({
      actorUserId: event.userId,
      action: 'auth.mfa_enabled',
      resourceType: 'User',
      resourceId: event.userId,
      result: 'SUCCESS',
      correlationId: event.context.correlationId,
      ipAddress: event.context.ipAddress,
      deviceInfo: event.context.deviceInfo,
    });
  }

  @OnEvent(AUTH_EVENTS.MFA_DISABLED)
  async onMfaDisabled(event: MfaDisabledEvent): Promise<void> {
    await this.auditRepository.append({
      actorUserId: event.userId,
      action: 'auth.mfa_disabled',
      resourceType: 'User',
      resourceId: event.userId,
      result: 'SUCCESS',
      correlationId: event.context.correlationId,
      ipAddress: event.context.ipAddress,
      deviceInfo: event.context.deviceInfo,
    });
  }
}
