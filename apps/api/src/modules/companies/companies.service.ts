import { RoleName } from '@contaia/database';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  AUTH_EVENTS,
  CompanyAddressUpdatedEvent,
  CompanyCreatedEvent,
  CompanyFiscalProfileUpdatedEvent,
  CompanySettingsUpdatedEvent,
  CompanyUpdatedEvent,
  OrganizationCreatedEvent,
  type CompanyStateSnapshot,
} from '../../common/events/auth.events';
import {
  CompanyVersionConflictException,
  InsufficientPermissionException,
} from '../../common/exceptions/auth.exceptions';
import { OrganizationsRepository } from '../organizations/repositories/organizations.repository';
import { MembershipsRepository } from '../roles-permissions/repositories/memberships.repository';
import { RolesRepository } from '../roles-permissions/repositories/roles.repository';
import { UsersRepository } from '../users/repositories/users.repository';

import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UpdateFiscalProfileDto } from './dto/update-fiscal-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { CompaniesRepository } from './repositories/companies.repository';

interface AuditContext {
  correlationId: string;
  ipAddress?: string;
  deviceInfo?: string;
}

@Injectable()
export class CompaniesService {
  constructor(
    private readonly companiesRepository: CompaniesRepository,
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly membershipsRepository: MembershipsRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly usersRepository: UsersRepository,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * BR-EMP-001 — el creador recibe Administrador+propietario en la misma
   * transaccion. BR-ORG-001 (Workflow 4, paso 4) — si `dto.organizationId`
   * no se especifica, se agrupa bajo una Organizacion que el usuario ya
   * administra, o se crea una implicita si es su primera Company. El
   * perfil fiscal/domicilio/configuracion se crean vacios en la misma
   * transaccion (ver CompaniesRepository) — se completan despues via los
   * endpoints dedicados.
   */
  async createCompany(userId: string, dto: CreateCompanyDto, context: AuditContext) {
    const administradorRole = await this.rolesRepository.findByName(RoleName.ADMINISTRADOR);
    if (!administradorRole) {
      throw new BadRequestException('Rol Administrador no encontrado en el catálogo.');
    }

    const organization = await this.resolveOrganization(userId, dto.organizationId);

    const result = await this.companiesRepository.createWithOwnerMembership({
      organization,
      name: dto.name,
      tradeName: dto.tradeName,
      businessActivity: dto.businessActivity,
      rfc: dto.rfc,
      ownerUserId: userId,
      administradorRoleId: administradorRole.id,
    });

    if (result.organizationCreated) {
      this.events.emit(
        AUTH_EVENTS.ORGANIZATION_CREATED,
        new OrganizationCreatedEvent(result.organizationId, userId, context),
      );
    }

    this.events.emit(
      AUTH_EVENTS.COMPANY_CREATED,
      new CompanyCreatedEvent(result.company.id, result.organizationId, userId, context),
    );

    return this.toPublicShape(result.company, RoleName.ADMINISTRADOR, true, result.membershipId);
  }

  /** BR-GLB-001/BR-ORG-001 — solo las Company donde el usuario tiene Membresia activa. */
  async listForUser(userId: string) {
    const memberships = await this.membershipsRepository.findAllForUser(userId);

    return memberships.map((membership) => ({
      membershipId: membership.id,
      companyId: membership.company.id,
      organizationId: membership.company.organizationId,
      name: membership.company.name,
      tradeName: membership.company.tradeName,
      businessActivity: membership.company.businessActivity,
      rfc: membership.company.rfc,
      role: membership.role.name,
      isOwner: membership.isOwner,
    }));
  }

  /**
   * Autorizacion (Membresia activa, cualquier rol con `company.read`) ya
   * resuelta por los guards del controlador. Devuelve el agregado completo
   * (datos generales + perfil fiscal + domicilio + configuracion) — se
   * consultan juntos, ver CompaniesRepository.findAggregateById.
   */
  async getCompany(companyId: string) {
    const aggregate = await this.companiesRepository.findAggregateById(companyId);
    if (!aggregate) {
      throw new NotFoundException('Empresa no encontrada.');
    }

    return this.aggregateToPublicShape(aggregate);
  }

  /** BR-EMP-003/BR-CFG-001/002 — autorizacion (solo Administrador) ya resuelta por `@Permissions('company.update')`. */
  async updateCompany(
    companyId: string,
    dto: UpdateCompanyDto,
    expectedVersion: number,
    actorUserId: string,
    context: AuditContext,
  ) {
    const existing = await this.companiesRepository.findById(companyId);
    if (!existing) {
      throw new NotFoundException('Empresa no encontrada.');
    }

    const beforeState: CompanyStateSnapshot = {};
    const afterState: CompanyStateSnapshot = {};
    for (const key of ['name', 'tradeName', 'businessActivity', 'rfc'] as const) {
      if (dto[key] !== undefined) {
        beforeState[key] = existing[key];
        afterState[key] = dto[key];
      }
    }

    let updated;
    try {
      updated = await this.companiesRepository.update(companyId, dto, expectedVersion);
    } catch {
      throw new CompanyVersionConflictException();
    }

    this.events.emit(
      AUTH_EVENTS.COMPANY_UPDATED,
      new CompanyUpdatedEvent(companyId, actorUserId, beforeState, afterState, context),
    );

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      name: updated.name,
      tradeName: updated.tradeName,
      businessActivity: updated.businessActivity,
      rfc: updated.rfc,
      version: updated.version,
    };
  }

  /** EWO-003 seccion 5.7 — autorizacion (`company.fiscal.update`) ya resuelta por el controlador. */
  async updateFiscalProfile(
    companyId: string,
    dto: UpdateFiscalProfileDto,
    expectedVersion: number,
    actorUserId: string,
    context: AuditContext,
  ) {
    const existing = await this.companiesRepository.findAggregateById(companyId);
    if (!existing) {
      throw new NotFoundException('Empresa no encontrada.');
    }

    const beforeState: CompanyStateSnapshot = {};
    const afterState: CompanyStateSnapshot = {};
    if (dto.taxRegime !== undefined) {
      beforeState.taxRegime = existing.fiscalProfile?.taxRegime ?? null;
      afterState.taxRegime = dto.taxRegime;
    }

    let updated;
    try {
      updated = await this.companiesRepository.updateFiscalProfile(companyId, dto, expectedVersion);
    } catch {
      throw new CompanyVersionConflictException();
    }

    this.events.emit(
      AUTH_EVENTS.COMPANY_FISCAL_PROFILE_UPDATED,
      new CompanyFiscalProfileUpdatedEvent(
        companyId,
        actorUserId,
        beforeState,
        afterState,
        context,
      ),
    );

    return { taxRegime: updated.taxRegime };
  }

  /** EWO-003 seccion 5.7 — autorizacion (`company.fiscal.update`, domicilio fiscal) ya resuelta por el controlador. */
  async updateAddress(
    companyId: string,
    dto: UpdateAddressDto,
    expectedVersion: number,
    actorUserId: string,
    context: AuditContext,
  ) {
    const existing = await this.companiesRepository.findAggregateById(companyId);
    if (!existing) {
      throw new NotFoundException('Empresa no encontrada.');
    }

    const beforeState: CompanyStateSnapshot = {};
    const afterState: CompanyStateSnapshot = {};
    for (const key of [
      'street',
      'exteriorNumber',
      'interiorNumber',
      'neighborhood',
      'municipality',
      'state',
      'postalCode',
      'country',
    ] as const) {
      if (dto[key] !== undefined) {
        beforeState[key] = existing.address?.[key] ?? null;
        afterState[key] = dto[key] ?? null;
      }
    }

    let updated;
    try {
      updated = await this.companiesRepository.updateAddress(companyId, dto, expectedVersion);
    } catch {
      throw new CompanyVersionConflictException();
    }

    this.events.emit(
      AUTH_EVENTS.COMPANY_ADDRESS_UPDATED,
      new CompanyAddressUpdatedEvent(companyId, actorUserId, beforeState, afterState, context),
    );

    return {
      street: updated.street,
      exteriorNumber: updated.exteriorNumber,
      interiorNumber: updated.interiorNumber,
      neighborhood: updated.neighborhood,
      municipality: updated.municipality,
      state: updated.state,
      postalCode: updated.postalCode,
      country: updated.country,
    };
  }

  /** EWO-003 seccion 5.8 — autorizacion (`company.settings.update`) ya resuelta por el controlador. */
  async updateSettings(
    companyId: string,
    dto: UpdateSettingsDto,
    expectedVersion: number,
    actorUserId: string,
    context: AuditContext,
  ) {
    const existing = await this.companiesRepository.findAggregateById(companyId);
    if (!existing) {
      throw new NotFoundException('Empresa no encontrada.');
    }

    const beforeState: CompanyStateSnapshot = {};
    const afterState: CompanyStateSnapshot = {};
    for (const key of ['timeZone', 'baseCurrency', 'language', 'country'] as const) {
      if (dto[key] !== undefined) {
        beforeState[key] = existing.settings?.[key] ?? null;
        afterState[key] = dto[key] ?? null;
      }
    }

    let updated;
    try {
      updated = await this.companiesRepository.updateSettings(companyId, dto, expectedVersion);
    } catch {
      throw new CompanyVersionConflictException();
    }

    this.events.emit(
      AUTH_EVENTS.COMPANY_SETTINGS_UPDATED,
      new CompanySettingsUpdatedEvent(companyId, actorUserId, beforeState, afterState, context),
    );

    return {
      timeZone: updated.timeZone,
      baseCurrency: updated.baseCurrency,
      language: updated.language,
      country: updated.country,
    };
  }

  private async resolveOrganization(
    userId: string,
    requestedOrganizationId: string | undefined,
  ): Promise<{ existingId: string } | { newName: string }> {
    if (requestedOrganizationId) {
      const organization = await this.organizationsRepository.findById(requestedOrganizationId);
      if (!organization) {
        throw new NotFoundException('Organización no encontrada.');
      }

      const memberships = await this.membershipsRepository.findAllForUser(userId);
      const administersThisOrganization = memberships.some(
        (membership) =>
          membership.company.organizationId === requestedOrganizationId &&
          membership.role.name === RoleName.ADMINISTRADOR,
      );
      if (!administersThisOrganization) {
        throw new InsufficientPermissionException();
      }

      return { existingId: requestedOrganizationId };
    }

    const memberships = await this.membershipsRepository.findAllForUser(userId);
    const existingAdminMembership = memberships.find(
      (membership) => membership.role.name === RoleName.ADMINISTRADOR,
    );
    if (existingAdminMembership) {
      return { existingId: existingAdminMembership.company.organizationId };
    }

    const user = await this.usersRepository.findById(userId);
    const implicitName = user ? `${user.firstName} ${user.lastName}` : 'Organización';
    return { newName: implicitName };
  }

  private toPublicShape(
    company: {
      id: string;
      organizationId: string;
      name: string;
      tradeName: string | null;
      businessActivity: string;
      rfc: string | null;
    },
    role: RoleName,
    isOwner: boolean,
    membershipId: string,
  ) {
    return {
      id: company.id,
      organizationId: company.organizationId,
      name: company.name,
      tradeName: company.tradeName,
      businessActivity: company.businessActivity,
      rfc: company.rfc,
      membershipId,
      role,
      isOwner,
    };
  }

  private aggregateToPublicShape(
    aggregate: Awaited<ReturnType<CompaniesRepository['findAggregateById']>>,
  ) {
    if (!aggregate) {
      throw new NotFoundException('Empresa no encontrada.');
    }

    const { company, fiscalProfile, address, settings } = aggregate;

    return {
      id: company.id,
      organizationId: company.organizationId,
      name: company.name,
      tradeName: company.tradeName,
      businessActivity: company.businessActivity,
      rfc: company.rfc,
      version: company.version,
      fiscalProfile: fiscalProfile ? { taxRegime: fiscalProfile.taxRegime } : null,
      address: address
        ? {
            street: address.street,
            exteriorNumber: address.exteriorNumber,
            interiorNumber: address.interiorNumber,
            neighborhood: address.neighborhood,
            municipality: address.municipality,
            state: address.state,
            postalCode: address.postalCode,
            country: address.country,
          }
        : null,
      settings: settings
        ? {
            timeZone: settings.timeZone,
            baseCurrency: settings.baseCurrency,
            language: settings.language,
            country: settings.country,
          }
        : null,
    };
  }
}
