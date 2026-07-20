import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';

import type { RolesRepository } from '../../modules/roles-permissions/repositories/roles.repository';

import { PermissionGuard } from './permission.guard';

function buildContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('PermissionGuard (EWO-002: "No hardcodear permisos")', () => {
  it('permite el acceso si el controlador no declara @Permissions(...)', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const rolesRepository = {} as jest.Mocked<RolesRepository>;
    const guard = new PermissionGuard(reflector, rolesRepository);

    await expect(guard.canActivate(buildContext({}))).resolves.toBe(true);
  });

  it('rechaza si el Rol no tiene todas las claves de permiso requeridas', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['users.invite', 'users.remove']),
    } as unknown as Reflector;
    const rolesRepository = {
      findPermissionKeysForRole: jest.fn().mockResolvedValue(['users.invite']),
    } as unknown as jest.Mocked<RolesRepository>;
    const guard = new PermissionGuard(reflector, rolesRepository);

    await expect(
      guard.canActivate(
        buildContext({ membership: { roleId: 'role-1' }, user: { isPlatformAdmin: false } }),
      ),
    ).rejects.toThrow();
  });

  it('permite el acceso si el Rol tiene todas las claves requeridas', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['users.invite']),
    } as unknown as Reflector;
    const rolesRepository = {
      findPermissionKeysForRole: jest.fn().mockResolvedValue(['users.invite', 'users.remove']),
    } as unknown as jest.Mocked<RolesRepository>;
    const guard = new PermissionGuard(reflector, rolesRepository);

    await expect(
      guard.canActivate(
        buildContext({ membership: { roleId: 'role-1' }, user: { isPlatformAdmin: false } }),
      ),
    ).resolves.toBe(true);
  });

  it('un Administrador de plataforma satisface cualquier @Permissions(...)', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['users.invite']),
    } as unknown as Reflector;
    const rolesRepository = {
      findPermissionKeysForRole: jest.fn(),
    } as unknown as jest.Mocked<RolesRepository>;
    const guard = new PermissionGuard(reflector, rolesRepository);

    await expect(
      guard.canActivate(buildContext({ user: { isPlatformAdmin: true } })),
    ).resolves.toBe(true);
    expect(rolesRepository.findPermissionKeysForRole).not.toHaveBeenCalled();
  });
});
