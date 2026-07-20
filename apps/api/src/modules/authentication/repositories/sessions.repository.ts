import { prisma, type Session } from '@contaia/database';
import { Injectable } from '@nestjs/common';

export interface CreateSessionData {
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
  rotatedFromId?: string;
}

@Injectable()
export class SessionsRepository {
  async create(data: CreateSessionData): Promise<Session> {
    return prisma.session.create({ data });
  }

  /** Solo sesiones vigentes: no revocadas y no expiradas. */
  async findActiveById(id: string): Promise<Session | null> {
    return prisma.session.findFirst({
      where: { id, revokedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  async findActiveByRefreshTokenHash(refreshTokenHash: string): Promise<Session | null> {
    return prisma.session.findFirst({
      where: { refreshTokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  async findActiveByUserId(userId: string): Promise<Session[]> {
    return prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  async touchLastUsed(id: string): Promise<void> {
    await prisma.session.update({ where: { id }, data: { lastUsedAt: new Date() } });
  }

  async revoke(id: string): Promise<void> {
    await prisma.session.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
