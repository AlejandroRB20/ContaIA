import { prisma, InvitationStatus, type Invitation, type RoleName } from '@contaia/database';
import { Injectable } from '@nestjs/common';

export type InvitationWithRelations = Invitation & {
  company: { name: string };
  role: { name: RoleName };
  invitedBy: { firstName: string; lastName: string };
};

@Injectable()
export class InvitationsRepository {
  async create(data: {
    companyId: string;
    email: string;
    roleId: string;
    invitedByUserId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<Invitation> {
    return prisma.invitation.create({ data });
  }

  async findValidByTokenHash(tokenHash: string): Promise<Invitation | null> {
    return prisma.invitation.findFirst({
      where: { tokenHash, status: InvitationStatus.PENDING, expiresAt: { gt: new Date() } },
    });
  }

  /**
   * A diferencia de `findValidByTokenHash`, no filtra por estado ni
   * vigencia — el preview (WF-0004) necesita distinguir "expirada" y "ya
   * aceptada previamente" del caso "no existe", en vez de tratarlos igual.
   */
  async findByTokenHashWithRelations(tokenHash: string): Promise<InvitationWithRelations | null> {
    return prisma.invitation.findFirst({
      where: { tokenHash },
      include: {
        company: { select: { name: true } },
        role: { select: { name: true } },
        invitedBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async findPendingByCompanyAndEmail(companyId: string, email: string): Promise<Invitation | null> {
    return prisma.invitation.findFirst({
      where: { companyId, email, status: InvitationStatus.PENDING },
    });
  }

  async markAccepted(id: string): Promise<void> {
    await prisma.invitation.update({
      where: { id },
      data: { status: InvitationStatus.ACCEPTED, acceptedAt: new Date() },
    });
  }

  async markDeclined(id: string): Promise<void> {
    await prisma.invitation.update({
      where: { id },
      data: { status: InvitationStatus.DECLINED },
    });
  }
}
