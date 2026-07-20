import { prisma, MembershipStatus, type Membership, type RoleName } from '@contaia/database';
import { Injectable } from '@nestjs/common';

export type MembershipWithRole = Membership & { role: { name: RoleName } };

@Injectable()
export class MembershipsRepository {
  async findActiveByUserAndCompany(
    userId: string,
    companyId: string,
  ): Promise<MembershipWithRole | null> {
    return prisma.membership.findFirst({
      where: { userId, companyId, membershipStatus: MembershipStatus.ACTIVE, deletedAt: null },
      include: { role: { select: { name: true } } },
    });
  }

  async findById(id: string): Promise<Membership | null> {
    return prisma.membership.findFirst({ where: { id, deletedAt: null } });
  }

  async findAllForUser(userId: string) {
    return prisma.membership.findMany({
      where: { userId, membershipStatus: MembershipStatus.ACTIVE, deletedAt: null },
      include: { company: true, role: true },
    });
  }

  /** API-0016 — historial completo de Membresías de la Empresa (activas y revocadas, BR-USR-003), nunca eliminadas físicamente. */
  async findAllForCompany(companyId: string) {
    return prisma.membership.findMany({
      where: { companyId, deletedAt: null },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        role: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** BR-EMP-001 (invariante permanente): cuenta los propietarios activos, para impedir dejar una Empresa sin ninguno. */
  async countActiveOwners(companyId: string): Promise<number> {
    return prisma.membership.count({
      where: {
        companyId,
        isOwner: true,
        membershipStatus: MembershipStatus.ACTIVE,
        deletedAt: null,
      },
    });
  }

  async create(data: {
    userId: string;
    companyId: string;
    roleId: string;
    isOwner: boolean;
    membershipStatus: MembershipStatus;
    invitedAt?: Date;
    acceptedAt?: Date;
  }): Promise<Membership> {
    return prisma.membership.create({ data });
  }

  async updateRole(id: string, roleId: string, expectedVersion: number): Promise<Membership> {
    const result = await prisma.membership.updateMany({
      where: { id, version: expectedVersion },
      data: { roleId, version: { increment: 1 } },
    });

    if (result.count === 0) {
      throw new Error('VERSION_CONFLICT');
    }

    return prisma.membership.findUniqueOrThrow({ where: { id } });
  }

  async revoke(id: string): Promise<void> {
    await prisma.membership.update({
      where: { id },
      data: { membershipStatus: MembershipStatus.REVOKED },
    });
  }
}
