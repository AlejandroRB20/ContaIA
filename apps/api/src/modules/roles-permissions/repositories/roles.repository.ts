import { prisma, RoleName, type Role } from '@contaia/database';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RolesRepository {
  async findByName(name: RoleName): Promise<Role | null> {
    return prisma.role.findUnique({ where: { name } });
  }

  async findById(id: string): Promise<Role | null> {
    return prisma.role.findUnique({ where: { id } });
  }

  async findAll(): Promise<Role[]> {
    return prisma.role.findMany({ orderBy: { name: 'asc' } });
  }

  /** Claves de permiso otorgadas a un Rol, via RolePermission (nunca hardcodeadas). */
  async findPermissionKeysForRole(roleId: string): Promise<string[]> {
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: { select: { key: true } } },
    });

    return rolePermissions.map((rp) => rp.permission.key);
  }

  async findAllPermissions() {
    return prisma.permission.findMany({ orderBy: { key: 'asc' } });
  }
}
