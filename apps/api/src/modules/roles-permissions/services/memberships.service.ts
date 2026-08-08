import type { ServerConfig } from '@contaia/config/server';
import { InvitationStatus, MembershipStatus, RoleName } from '@contaia/database';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { EMAIL_SENDER, type EmailSender } from '../../../common/email/email-sender.interface';
import {
  AUTH_EVENTS,
  InvitationAcceptedEvent,
  InvitationCreatedEvent,
  InvitationDeclinedEvent,
  MembershipRevokedEvent,
  PlatformAdminCompanyAccessDeniedEvent,
  RoleChangedEvent,
} from '../../../common/events/auth.events';
import {
  InsufficientPermissionException,
  InvalidOrExpiredTokenException,
  LastOwnerException,
  MembershipVersionConflictException,
} from '../../../common/exceptions/auth.exceptions';
import { generateOpaqueToken, hashOpaqueToken } from '../../../common/security/token.util';
import { SERVER_CONFIG } from '../../../config/config.module';
import { CompaniesRepository } from '../../companies/repositories/companies.repository';
import { UsersRepository } from '../../users/repositories/users.repository';
import { InvitationsRepository } from '../repositories/invitations.repository';
import { MembershipsRepository } from '../repositories/memberships.repository';
import { RolesRepository } from '../repositories/roles.repository';

interface AuditContext {
  correlationId: string;
  ipAddress?: string;
  deviceInfo?: string;
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

@Injectable()
export class MembershipsService {
  constructor(
    private readonly membershipsRepository: MembershipsRepository,
    private readonly invitationsRepository: InvitationsRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly usersRepository: UsersRepository,
    private readonly companiesRepository: CompaniesRepository,
    private readonly events: EventEmitter2,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
    @Inject(SERVER_CONFIG) private readonly config: ServerConfig,
  ) {}

  /** BR-USR-001: rol explicito obligatorio, sin acceso hasta aceptar. */
  async inviteUser(
    companyId: string,
    email: string,
    role: RoleName,
    invitedByUserId: string,
    context: AuditContext,
  ): Promise<void> {
    const company = await this.companiesRepository.findById(companyId);
    if (!company) {
      throw new NotFoundException('Empresa no encontrada.');
    }

    const roleRecord = await this.rolesRepository.findByName(role);
    if (!roleRecord) {
      throw new BadRequestException('Rol invalido.');
    }

    const existingPending = await this.invitationsRepository.findPendingByCompanyAndEmail(
      companyId,
      email,
    );
    if (existingPending) {
      throw new BadRequestException('Ya existe una invitacion pendiente para este correo.');
    }

    const token = generateOpaqueToken();
    const tokenHash = hashOpaqueToken(token);
    const expiresAt = new Date(
      Date.now() + this.config.INVITATION_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    const invitation = await this.invitationsRepository.create({
      companyId,
      email,
      roleId: roleRecord.id,
      invitedByUserId,
      tokenHash,
      expiresAt,
    });

    await this.emailSender.send({
      to: email,
      subject: `Invitación a colaborar en ${company.name} (ContaIA)`,
      body: `Te invitaron con el rol ${role}. Usa este token para aceptar (vence en ${this.config.INVITATION_TOKEN_TTL_DAYS} días): ${token}`,
    });

    this.events.emit(
      AUTH_EVENTS.INVITATION_CREATED,
      new InvitationCreatedEvent(invitation.id, companyId, invitedByUserId, context),
    );
  }

  /**
   * Publico (sin sesion) — WF-0004 muestra Empresa/Rol/quien invita antes de
   * pedir registro o login (docs/16_WIREFRAMES_SPECIFICATION.md seccion 10).
   * Nunca lanza excepcion: cada estado (expirada, ya aceptada, etc.) es una
   * respuesta valida que la interfaz debe representar, no un error.
   */
  async previewInvitation(token: string): Promise<InvitationPreview> {
    const tokenHash = hashOpaqueToken(token);
    const invitation = await this.invitationsRepository.findByTokenHashWithRelations(tokenHash);

    if (!invitation) {
      return { status: 'NOT_FOUND' };
    }

    const existingUser = await this.usersRepository.findByEmail(invitation.email);

    const base = {
      companyName: invitation.company.name,
      role: invitation.role.name,
      invitedByName: `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`,
      email: invitation.email,
      hasAccount: existingUser !== null,
    };

    if (invitation.status === InvitationStatus.ACCEPTED) {
      return { status: 'ACCEPTED', ...base };
    }
    if (invitation.status === InvitationStatus.DECLINED) {
      return { status: 'DECLINED', ...base };
    }
    if (invitation.status === InvitationStatus.REVOKED) {
      return { status: 'REVOKED', ...base };
    }
    if (invitation.status !== InvitationStatus.PENDING || invitation.expiresAt <= new Date()) {
      return { status: 'EXPIRED', ...base };
    }

    return { status: 'PENDING', ...base };
  }

  async acceptInvitation(token: string, userId: string, context: AuditContext): Promise<void> {
    const tokenHash = hashOpaqueToken(token);
    const invitation = await this.invitationsRepository.findValidByTokenHash(tokenHash);
    if (!invitation) {
      throw new InvalidOrExpiredTokenException();
    }

    const user = await this.usersRepository.findById(userId);
    if (!user || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new InvalidOrExpiredTokenException();
    }

    const existingMembership = await this.membershipsRepository.findActiveByUserAndCompany(
      userId,
      invitation.companyId,
    );
    if (!existingMembership) {
      await this.membershipsRepository.create({
        userId,
        companyId: invitation.companyId,
        roleId: invitation.roleId,
        isOwner: false,
        membershipStatus: MembershipStatus.ACTIVE,
        invitedAt: invitation.createdAt,
        acceptedAt: new Date(),
      });
    }

    await this.invitationsRepository.markAccepted(invitation.id);

    this.events.emit(
      AUTH_EVENTS.INVITATION_ACCEPTED,
      new InvitationAcceptedEvent(invitation.id, invitation.companyId, userId, context),
    );
  }

  /** WF-0004, accion secundaria "Rechazar" — no crea Membership. */
  async declineInvitation(token: string, userId: string, context: AuditContext): Promise<void> {
    const tokenHash = hashOpaqueToken(token);
    const invitation = await this.invitationsRepository.findValidByTokenHash(tokenHash);
    if (!invitation) {
      throw new InvalidOrExpiredTokenException();
    }

    const user = await this.usersRepository.findById(userId);
    if (!user || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new InvalidOrExpiredTokenException();
    }

    await this.invitationsRepository.markDeclined(invitation.id);

    this.events.emit(
      AUTH_EVENTS.INVITATION_DECLINED,
      new InvitationDeclinedEvent(invitation.id, invitation.companyId, userId, context),
    );
  }

  /**
   * API-0016 — historial de Membresías de la Empresa (activas y revocadas).
   * Autorizacion (Rol Administrador o Supervisor) ya resuelta por
   * `RoleGuard`/`@Roles(...)` en el controlador.
   */
  async listMembersForCompany(companyId: string) {
    const memberships = await this.membershipsRepository.findAllForCompany(companyId);

    return memberships.map((membership) => ({
      membershipId: membership.id,
      userId: membership.userId,
      firstName: membership.user.firstName,
      lastName: membership.user.lastName,
      email: membership.user.email,
      role: membership.role.name,
      isOwner: membership.isOwner,
      membershipStatus: membership.membershipStatus,
    }));
  }

  /** BR-PERM-002: solo un Administrador de esa empresa, nunca el propio rol. */
  async updateRole(
    membershipId: string,
    newRole: RoleName,
    expectedVersion: number,
    actorUserId: string,
    context: AuditContext,
  ): Promise<void> {
    const target = await this.membershipsRepository.findById(membershipId);
    if (!target) {
      throw new NotFoundException('Membresia no encontrada.');
    }

    if (target.userId === actorUserId) {
      throw new InsufficientPermissionException();
    }

    await this.assertActorIsCompanyAdmin(actorUserId, target.companyId, context);

    const newRoleRecord = await this.rolesRepository.findByName(newRole);
    if (!newRoleRecord) {
      throw new BadRequestException('Rol invalido.');
    }

    try {
      await this.membershipsRepository.updateRole(membershipId, newRoleRecord.id, expectedVersion);
    } catch {
      throw new MembershipVersionConflictException();
    }

    this.events.emit(
      AUTH_EVENTS.ROLE_CHANGED,
      new RoleChangedEvent(
        membershipId,
        target.companyId,
        actorUserId,
        target.roleId,
        newRoleRecord.id,
        context,
      ),
    );
  }

  async revoke(membershipId: string, actorUserId: string, context: AuditContext): Promise<void> {
    const target = await this.membershipsRepository.findById(membershipId);
    if (!target) {
      throw new NotFoundException('Membresia no encontrada.');
    }

    if (target.userId === actorUserId) {
      throw new InsufficientPermissionException();
    }

    await this.assertActorIsCompanyAdmin(actorUserId, target.companyId, context);

    if (target.isOwner) {
      const activeOwners = await this.membershipsRepository.countActiveOwners(target.companyId);
      if (activeOwners <= 1) {
        throw new LastOwnerException();
      }
    }

    await this.membershipsRepository.revoke(membershipId);

    this.events.emit(
      AUTH_EVENTS.MEMBERSHIP_REVOKED,
      new MembershipRevokedEvent(membershipId, target.companyId, actorUserId, context),
    );
  }

  /**
   * D-010 — fail-closed: exige Membership `ADMINISTRADOR` activa en la
   * Empresa propietaria del recurso, resuelta arriba a partir del propio
   * `target` (nunca del `membershipId` opaco por si solo). Sin bypass por
   * `isPlatformAdmin` — un Administrador de plataforma sin esa Membership
   * es denegado igual que cualquier otro actor sin ella, y el intento queda
   * registrado (`PLATFORM_ADMIN_COMPANY_ACCESS_DENIED`) para distinguirlo en
   * auditoria de una denegacion ordinaria.
   */
  private async assertActorIsCompanyAdmin(
    actorUserId: string,
    companyId: string,
    context: AuditContext,
  ): Promise<void> {
    const actorMembership = await this.membershipsRepository.findActiveByUserAndCompany(
      actorUserId,
      companyId,
    );

    if (actorMembership && actorMembership.role.name === RoleName.ADMINISTRADOR) {
      return;
    }

    const actor = await this.usersRepository.findById(actorUserId);
    if (actor?.isPlatformAdmin) {
      this.events.emit(
        AUTH_EVENTS.PLATFORM_ADMIN_COMPANY_ACCESS_DENIED,
        new PlatformAdminCompanyAccessDeniedEvent(actorUserId, companyId, context),
      );
    }

    throw new InsufficientPermissionException();
  }
}
