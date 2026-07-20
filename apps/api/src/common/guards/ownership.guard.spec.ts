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

  it('un Administrador de plataforma no requiere isOwner', () => {
    expect(guard.canActivate(buildContext({ user: { isPlatformAdmin: true } }))).toBe(true);
  });
});
