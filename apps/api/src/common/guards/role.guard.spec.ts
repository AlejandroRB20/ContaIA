import { RoleName } from '@contaia/database';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';

import { RoleGuard } from './role.guard';

function buildContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('RoleGuard', () => {
  it('permite el acceso si el controlador no declara @Roles(...)', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const guard = new RoleGuard(reflector);

    expect(guard.canActivate(buildContext({}))).toBe(true);
  });

  it('rechaza si el Rol de la Membership no esta en la lista requerida (BR-ROL-001)', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([RoleName.ADMINISTRADOR]),
    } as unknown as Reflector;
    const guard = new RoleGuard(reflector);

    expect(() =>
      guard.canActivate(
        buildContext({
          membership: { roleName: RoleName.AUXILIAR },
          user: { isPlatformAdmin: false },
        }),
      ),
    ).toThrow();
  });

  it('permite el acceso si el Rol de la Membership coincide', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([RoleName.ADMINISTRADOR]),
    } as unknown as Reflector;
    const guard = new RoleGuard(reflector);

    expect(
      guard.canActivate(
        buildContext({
          membership: { roleName: RoleName.ADMINISTRADOR },
          user: { isPlatformAdmin: false },
        }),
      ),
    ).toBe(true);
  });

  it('D-010: rechaza a un Administrador de plataforma sin contexto de Membership, aunque isPlatformAdmin sea true', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([RoleName.ADMINISTRADOR]),
    } as unknown as Reflector;
    const guard = new RoleGuard(reflector);

    expect(() => guard.canActivate(buildContext({ user: { isPlatformAdmin: true } }))).toThrow();
  });

  it('D-010: un Administrador de plataforma con request.membership ya resuelto por CompanyGuard se evalua igual que cualquier Membership', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([RoleName.ADMINISTRADOR]),
    } as unknown as Reflector;
    const guard = new RoleGuard(reflector);

    expect(
      guard.canActivate(
        buildContext({
          membership: { roleName: RoleName.ADMINISTRADOR },
          user: { isPlatformAdmin: true },
        }),
      ),
    ).toBe(true);
  });
});
