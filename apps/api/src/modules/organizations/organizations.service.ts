import type { OrganizationDetail } from '@contaia/types';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { AUTH_EVENTS, OrganizationCreatedEvent } from '../../common/events/auth.events';
import { MembershipsRepository } from '../roles-permissions/repositories/memberships.repository';

import { OrganizationsRepository } from './repositories/organizations.repository';

interface AuditContext {
  correlationId: string;
  ipAddress?: string;
  deviceInfo?: string;
}

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly membershipsRepository: MembershipsRepository,
    private readonly events: EventEmitter2,
  ) {}

  /** API-0009 — cualquier usuario autenticado puede crear una Organizacion (BR-ORG-001). */
  async createOrganization(name: string, actorUserId: string, context: AuditContext) {
    const organization = await this.organizationsRepository.create({ name });

    this.events.emit(
      AUTH_EVENTS.ORGANIZATION_CREATED,
      new OrganizationCreatedEvent(organization.id, actorUserId, context),
    );

    return { id: organization.id, name: organization.name };
  }

  /**
   * API-0010 — visible solo para quien tiene Membresia activa en al menos
   * una Company de la Organizacion; solo se listan las Company a las que
   * el propio usuario tiene acceso, nunca todas las de la Organizacion
   * (BR-ORG-002, BR-GLB-001: el aislamiento por Company se sostiene tambien
   * dentro de una misma Organizacion).
   */
  async getOrganization(
    organizationId: string,
    requestingUserId: string,
  ): Promise<OrganizationDetail> {
    const organization = await this.organizationsRepository.findById(organizationId);
    if (!organization) {
      throw new NotFoundException('Organización no encontrada.');
    }

    const memberships = await this.membershipsRepository.findAllForUser(requestingUserId);
    const companies: OrganizationDetail['companies'] = memberships
      .filter((membership) => membership.company.organizationId === organizationId)
      .map((membership) => ({
        id: membership.company.id,
        name: membership.company.name,
        role: membership.role.name,
        isOwner: membership.isOwner,
      }));

    if (companies.length === 0) {
      throw new ForbiddenException('No tienes acceso a esta organización.');
    }

    return { id: organization.id, name: organization.name, companies };
  }
}
