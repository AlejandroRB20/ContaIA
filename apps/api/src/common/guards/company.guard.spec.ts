import { MembershipStatus, RoleName } from '@contaia/database';
import type { ExecutionContext } from '@nestjs/common';

import type { MembershipsRepository } from '../../modules/roles-permissions/repositories/memberships.repository';

import { CompanyGuard } from './company.guard';

function buildContext(request: Record<string, unknown>): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
}

describe('CompanyGuard', () => {
  let membershipsRepository: jest.Mocked<MembershipsRepository>;
  let guard: CompanyGuard;

  beforeEach(() => {
    membershipsRepository = {
      findActiveByUserAndCompany: jest.fn(),
    } as unknown as jest.Mocked<MembershipsRepository>;
    guard = new CompanyGuard(membershipsRepository);
  });

  it('rechaza si no hay usuario autenticado en la solicitud', async () => {
    await expect(
      guard.canActivate(buildContext({ params: { companyId: 'company-1' } })),
    ).rejects.toThrow();
  });

  it('rechaza si la ruta no trae companyId', async () => {
    await expect(
      guard.canActivate(buildContext({ params: {}, user: { id: 'user-1' } })),
    ).rejects.toThrow();
  });

  it('permite el acceso sin Membership a un Administrador de plataforma', async () => {
    const request = {
      params: { companyId: 'company-1' },
      user: { id: 'user-1', isPlatformAdmin: true },
    };

    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
    expect(membershipsRepository.findActiveByUserAndCompany).not.toHaveBeenCalled();
  });

  it('rechaza si el usuario no tiene una Membership activa en esa empresa', async () => {
    membershipsRepository.findActiveByUserAndCompany.mockResolvedValue(null);
    const request = {
      params: { companyId: 'company-1' },
      user: { id: 'user-1', isPlatformAdmin: false },
    };

    await expect(guard.canActivate(buildContext(request))).rejects.toThrow();
  });

  it('adjunta request.membership cuando la Membership es valida', async () => {
    membershipsRepository.findActiveByUserAndCompany.mockResolvedValue({
      id: 'membership-1',
      companyId: 'company-1',
      roleId: 'role-1',
      isOwner: true,
      membershipStatus: MembershipStatus.ACTIVE,
      role: { name: RoleName.ADMINISTRADOR },
    } as never);

    const request: Record<string, unknown> = {
      params: { companyId: 'company-1' },
      user: { id: 'user-1', isPlatformAdmin: false },
    };

    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
    expect(request.membership).toEqual({
      id: 'membership-1',
      companyId: 'company-1',
      roleId: 'role-1',
      roleName: RoleName.ADMINISTRADOR,
      isOwner: true,
    });
  });
});
