import {
  prisma,
  MembershipStatus,
  type Company,
  type CompanyAddress,
  type CompanyFiscalProfile,
  type CompanySettings,
  type Prisma,
} from '@contaia/database';
import { Injectable } from '@nestjs/common';

export interface CreateCompanyWithOwnerData {
  organization: { existingId: string } | { newName: string };
  name: string;
  tradeName?: string;
  businessActivity: string;
  rfc?: string;
  ownerUserId: string;
  administradorRoleId: string;
}

export interface CreateCompanyWithOwnerResult {
  company: Company;
  membershipId: string;
  organizationId: string;
  organizationCreated: boolean;
}

export interface CompanyAggregate {
  company: Company;
  fiscalProfile: CompanyFiscalProfile | null;
  address: CompanyAddress | null;
  settings: CompanySettings | null;
}

@Injectable()
export class CompaniesRepository {
  async findById(id: string): Promise<Company | null> {
    return prisma.company.findFirst({ where: { id, deletedAt: null } });
  }

  /** Agregado completo (BR-CFG-002: la configuracion de Empresa se consulta y edita como un todo). */
  async findAggregateById(id: string): Promise<CompanyAggregate | null> {
    const company = await prisma.company.findFirst({
      where: { id, deletedAt: null },
      include: { fiscalProfile: true, address: true, settings: true },
    });
    if (!company) {
      return null;
    }

    const { fiscalProfile, address, settings, ...rest } = company;
    return { company: rest, fiscalProfile, address, settings };
  }

  /**
   * BR-EMP-001 — Company + Membership Administrador propietario en la
   * misma transaccion. Si `organization` trae `newName`, la Organizacion
   * implicita (BR-ORG-001) tambien se crea dentro de la misma transaccion,
   * para nunca dejar una Organizacion huerfana ante un fallo parcial
   * (docs/21_DATABASE_MIGRATION_PLAN.md seccion 7). El perfil fiscal,
   * domicilio y configuracion regional se crean vacios/por defecto en la
   * misma transaccion — Company es el aggregate root (docs/07_SOFTWARE_
   * ARCHITECTURE.md seccion 5) y estos tres nunca deben quedar ausentes.
   */
  async createWithOwnerMembership(
    data: CreateCompanyWithOwnerData,
  ): Promise<CreateCompanyWithOwnerResult> {
    return prisma.$transaction(async (tx) => {
      let organizationId: string;
      let organizationCreated = false;

      if ('existingId' in data.organization) {
        organizationId = data.organization.existingId;
      } else {
        const organization = await tx.organization.create({
          data: { name: data.organization.newName },
        });
        organizationId = organization.id;
        organizationCreated = true;
      }

      const company = await tx.company.create({
        data: {
          organizationId,
          name: data.name,
          tradeName: data.tradeName,
          businessActivity: data.businessActivity,
          rfc: data.rfc,
        },
      });

      await tx.companyFiscalProfile.create({ data: { companyId: company.id } });
      await tx.companyAddress.create({ data: { companyId: company.id } });
      await tx.companySettings.create({ data: { companyId: company.id } });

      const membership = await tx.membership.create({
        data: {
          userId: data.ownerUserId,
          companyId: company.id,
          roleId: data.administradorRoleId,
          isOwner: true,
          membershipStatus: MembershipStatus.ACTIVE,
          acceptedAt: new Date(),
        },
      });

      return { company, membershipId: membership.id, organizationId, organizationCreated };
    });
  }

  /** BR-EMP-003/BR-CFG-002 — bloqueo optimista via `version` (mismo patron que Membership). */
  async update(
    id: string,
    data: Partial<Pick<Company, 'name' | 'tradeName' | 'businessActivity' | 'rfc'>>,
    expectedVersion: number,
  ): Promise<Company> {
    const result = await prisma.company.updateMany({
      where: { id, version: expectedVersion, deletedAt: null },
      data: { ...data, version: { increment: 1 } },
    });

    if (result.count === 0) {
      throw new Error('VERSION_CONFLICT');
    }

    return prisma.company.findUniqueOrThrow({ where: { id } });
  }

  /**
   * Actualiza un sub-recurso del agregado (perfil fiscal, domicilio o
   * configuracion) e incrementa `Company.version` en la misma transaccion
   * — el bloqueo optimista vive en el aggregate root, no en cada tabla
   * hija (docs/07_SOFTWARE_ARCHITECTURE.md seccion 5).
   */
  private async updateSubResource<T>(
    companyId: string,
    expectedVersion: number,
    apply: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return prisma.$transaction(async (tx) => {
      const versionBump = await tx.company.updateMany({
        where: { id: companyId, version: expectedVersion, deletedAt: null },
        data: { version: { increment: 1 } },
      });

      if (versionBump.count === 0) {
        throw new Error('VERSION_CONFLICT');
      }

      return apply(tx);
    });
  }

  async updateFiscalProfile(
    companyId: string,
    data: Partial<Pick<CompanyFiscalProfile, 'taxRegime'>>,
    expectedVersion: number,
  ): Promise<CompanyFiscalProfile> {
    return this.updateSubResource(companyId, expectedVersion, (tx) =>
      tx.companyFiscalProfile.update({ where: { companyId }, data }),
    );
  }

  async updateAddress(
    companyId: string,
    data: Partial<
      Pick<
        CompanyAddress,
        | 'street'
        | 'exteriorNumber'
        | 'interiorNumber'
        | 'neighborhood'
        | 'municipality'
        | 'state'
        | 'postalCode'
        | 'country'
      >
    >,
    expectedVersion: number,
  ): Promise<CompanyAddress> {
    return this.updateSubResource(companyId, expectedVersion, (tx) =>
      tx.companyAddress.update({ where: { companyId }, data }),
    );
  }

  async updateSettings(
    companyId: string,
    data: Partial<Pick<CompanySettings, 'timeZone' | 'baseCurrency' | 'language' | 'country'>>,
    expectedVersion: number,
  ): Promise<CompanySettings> {
    return this.updateSubResource(companyId, expectedVersion, (tx) =>
      tx.companySettings.update({ where: { companyId }, data }),
    );
  }
}
