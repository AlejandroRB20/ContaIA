import { prisma, UserStatus, type User } from '@contaia/database';
import { Injectable } from '@nestjs/common';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

@Injectable()
export class UsersRepository {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findFirst({ where: { id, deletedAt: null } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({ where: { email, deletedAt: null } });
  }

  async create(data: CreateUserData): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        accountStatus: UserStatus.PENDING_VERIFICATION,
      },
    });
  }

  async markEmailVerified(userId: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true, emailVerifiedAt: new Date(), accountStatus: UserStatus.ACTIVE },
    });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<User> {
    return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  async updateProfile(
    userId: string,
    data: Partial<Pick<User, 'firstName' | 'lastName' | 'phone' | 'avatar'>>,
  ): Promise<User> {
    return prisma.user.update({ where: { id: userId }, data });
  }

  async setMfaSecret(userId: string, mfaSecretEncrypted: string): Promise<User> {
    return prisma.user.update({ where: { id: userId }, data: { mfaSecretEncrypted } });
  }

  async enableMfa(userId: string): Promise<User> {
    return prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
  }

  async disableMfa(userId: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecretEncrypted: null },
    });
  }
}
