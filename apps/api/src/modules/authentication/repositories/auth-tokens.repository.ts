import { prisma, type EmailVerification, type PasswordReset } from '@contaia/database';
import { Injectable } from '@nestjs/common';

/**
 * Tokens de un solo uso de verificacion de correo y reset de contraseña —
 * estructuralmente identicos (tokenHash, expiresAt, usedAt), agrupados en
 * un repositorio por pertenecer al mismo flujo de soporte de Authentication.
 */
@Injectable()
export class AuthTokensRepository {
  async createEmailVerification(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<EmailVerification> {
    return prisma.emailVerification.create({ data: { userId, tokenHash, expiresAt } });
  }

  async findValidEmailVerification(tokenHash: string): Promise<EmailVerification | null> {
    return prisma.emailVerification.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  async markEmailVerificationUsed(id: string): Promise<void> {
    await prisma.emailVerification.update({ where: { id }, data: { usedAt: new Date() } });
  }

  async createPasswordReset(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<PasswordReset> {
    return prisma.passwordReset.create({ data: { userId, tokenHash, expiresAt } });
  }

  async findValidPasswordReset(tokenHash: string): Promise<PasswordReset | null> {
    return prisma.passwordReset.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  async markPasswordResetUsed(id: string): Promise<void> {
    await prisma.passwordReset.update({ where: { id }, data: { usedAt: new Date() } });
  }
}
