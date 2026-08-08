import type { ExecutionContext } from '@nestjs/common';

import { OwnershipGuard } from './ownership.guard';

function buildContext(request: Record<string, unknown>): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
}

describe('OwnershipGuard', () => {
  const guard = new OwnershipGuard();

  it('rechaza si la Membership no es propietaria', () => {
    expect(() =>
      guard.canActivate(
        buildContext({ membership: { isOwner: false }, user: { isPlatformAdmin: false } }),
      ),
    ).toThrow();
  });

  it('permite el acceso si la Membership es propietaria', () => {
    expect(
      guard.canActivate(
        buildContext({ membership: { isOwner: true }, user: { isPlatformAdmin: false } }),
      ),
    ).toBe(true);
  });

  it('D-010: rechaza a un Administrador de plataforma sin contexto de Membership, aunque isPlatformAdmin sea true', () => {
    expect(() => guard.canActivate(buildContext({ user: { isPlatformAdmin: true } }))).toThrow();
  });

  it('D-010: un Administrador de plataforma con request.membership ya resuelto por CompanyGuard se evalua igual que cualquier Membership', () => {
    expect(
      guard.canActivate(
        buildContext({ membership: { isOwner: true }, user: { isPlatformAdmin: true } }),
      ),
    ).toBe(true);
  });
});
