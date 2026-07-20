import { Injectable } from '@nestjs/common';

import { RolesRepository } from '../repositories/roles.repository';

@Injectable()
export class RolesService {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async listRoles() {
    const roles = await this.rolesRepository.findAll();
    return roles.map((role) => ({ id: role.id, name: role.name, description: role.description }));
  }

  async listPermissions() {
    const permissions = await this.rolesRepository.findAllPermissions();
    return permissions.map((permission) => ({
      id: permission.id,
      key: permission.key,
      description: permission.description,
      module: permission.module,
    }));
  }

  async getPermissionKeysForRole(roleId: string): Promise<string[]> {
    return this.rolesRepository.findPermissionKeysForRole(roleId);
  }
}
