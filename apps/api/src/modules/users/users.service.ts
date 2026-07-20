import { Injectable, NotFoundException } from '@nestjs/common';

import { MembershipsRepository } from '../roles-permissions/repositories/memberships.repository';

import type { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersRepository } from './repositories/users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly membershipsRepository: MembershipsRepository,
  ) {}

  async getMe(userId: string) {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const memberships = await this.membershipsRepository.findAllForUser(userId);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatar: user.avatar,
      accountStatus: user.accountStatus,
      emailVerified: user.emailVerified,
      isPlatformAdmin: user.isPlatformAdmin,
      mfaEnabled: user.mfaEnabled,
      memberships: memberships.map((membership) => ({
        id: membership.id,
        companyId: membership.companyId,
        companyName: membership.company.name,
        role: membership.role.name,
        isOwner: membership.isOwner,
      })),
    };
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    const user = await this.usersRepository.updateProfile(userId, dto);
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatar: user.avatar,
    };
  }
}
