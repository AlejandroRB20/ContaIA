import { prisma, type Organization } from '@contaia/database';
import { Injectable } from '@nestjs/common';

/**
 * Alcance minimo de EWO-003 (BR-ORG-001/002, docs/08_API_DESIGN.md
 * seccion 9.2, API-0009/API-0010) — sin administracion completa
 * (editar, eliminar, transferir Company entre Organization), ver
 * docs/engineering/EWO-003_COMPANY_REPORT.md.
 */
@Injectable()
export class OrganizationsRepository {
  async findById(id: string): Promise<Organization | null> {
    return prisma.organization.findFirst({ where: { id, deletedAt: null } });
  }

  async create(data: { name: string }): Promise<Organization> {
    return prisma.organization.create({ data });
  }
}
