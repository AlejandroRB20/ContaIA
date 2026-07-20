import { prisma } from '@contaia/database';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MfaRecoveryCodesRepository {
  async replaceAllForUser(userId: string, codeHashes: string[]): Promise<void> {
    await prisma.$transaction([
      prisma.mfaRecoveryCode.deleteMany({ where: { userId } }),
      prisma.mfaRecoveryCode.createMany({
        data: codeHashes.map((codeHash) => ({ userId, codeHash })),
      }),
    ]);
  }

  async findUnusedByUserAndHash(userId: string, codeHash: string) {
    return prisma.mfaRecoveryCode.findFirst({
      where: { userId, codeHash, usedAt: null },
    });
  }

  async markUsed(id: string): Promise<void> {
    await prisma.mfaRecoveryCode.update({ where: { id }, data: { usedAt: new Date() } });
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await prisma.mfaRecoveryCode.deleteMany({ where: { userId } });
  }
}
