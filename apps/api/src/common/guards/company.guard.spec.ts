import { MembershipStatus, RoleName } from '@contaia/database';
import type { ExecutionContext } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';

import type { MembershipsRepository } from '../../modules/roles-permissions/repositories/memberships.repository';
import { AUTH_EVENTS } from '../events/auth.events';

import { CompanyGuard } from './company.guard';

function buildRequest(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    correlationId: 'test-correlation-id',
    ip: '203.0.113.10',
    header: jest.fn().mockReturnValue('test-agent'),
    ...overrides,
  };
}

function buildContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('CompanyGuard', () => {
  let membershipsRepository: jest.Mocked<MembershipsRepository>;
  let events: jest.Mocked<EventEmitter2>;
  let guard: CompanyGuard;

  beforeEach(() => {
    membershipsRepository = {
      findActiveByUserAndCompany: jest.fn(),
    } as unknown as jest.Mocked<MembershipsRepository>;
    events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;
    guard = new CompanyGuard(membershipsRepository, events);
  });

  it('rechaza si no hay usuario autenticado en la solicitud', async () => {
    await expect(
      guard.canActivate(buildContext(buildRequest({ params: { companyId: 'company-1' } }))),
    ).rejects.toThrow();
  });

  it('rechaza si la ruta no trae companyId', async () => {
    await expect(
      guard.canActivate(buildContext(buildRequest({ params: {}, user: { id: 'user-1' } }))),
    ).rejects.toThrow();
  });

  it('rechaza si el usuario no tiene una Membership activa en esa empresa', async () => {
    membershipsRepository.findActiveByUserAndCompany.mockResolvedValue(null);
    const request = buildRequest({
      params: { companyId: 'company-1' },
      user: { id: 'user-1', isPlatformAdmin: false },
    });

    await expect(guard.canActivate(buildContext(request))).rejects.toThrow();
    expect(events.emit).not.toHaveBeenCalled();
  });

  describe('D-010 — Platform Admin sin Membership', () => {
    it('deniega con 403 en vez de otorgar bypass', async () => {
      membershipsRepository.findActiveByUserAndCompany.mockResolvedValue(null);
      const request = buildRequest({
        params: { companyId: 'company-1' },
        user: { id: 'admin-1', isPlatformAdmin: true },
      });

      await expect(guard.canActivate(buildContext(request))).rejects.toThrow();
      expect(request.membership).toBeUndefined();
    });

    it('registra el intento denegado para auditoria, sin inventar un contexto de soporte', async () => {
      membershipsRepository.findActiveByUserAndCompany.mockResolvedValue(null);
      const request = buildRequest({
        params: { companyId: 'company-1' },
        user: { id: 'admin-1', isPlatformAdmin: true },
      });

      await expect(guard.canActivate(buildContext(request))).rejects.toThrow();

      expect(events.emit).toHaveBeenCalledTimes(1);
      const [eventName, payload] = events.emit.mock.calls[0] as [string, Record<string, unknown>];
      expect(eventName).toBe(AUTH_EVENTS.PLATFORM_ADMIN_COMPANY_ACCESS_DENIED);
      expect(payload).toMatchObject({
        actorUserId: 'admin-1',
        companyId: 'company-1',
        context: { correlationId: 'test-correlation-id', ipAddress: '203.0.113.10' },
      });
      expect(payload).not.toHaveProperty('reason');
    });

    it('no registra el intento si el usuario denegado no es Platform Admin', async () => {
      membershipsRepository.findActiveByUserAndCompany.mockResolvedValue(null);
      const request = buildRequest({
        params: { companyId: 'company-1' },
        user: { id: 'user-1', isPlatformAdmin: false },
      });

      await expect(guard.canActivate(buildContext(request))).rejects.toThrow();
      expect(events.emit).not.toHaveBeenCalled();
    });
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

    const request = buildRequest({
      params: { companyId: 'company-1' },
      user: { id: 'user-1', isPlatformAdmin: false },
    });

    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
    expect(request.membership).toEqual({
      id: 'membership-1',
      companyId: 'company-1',
      roleId: 'role-1',
      roleName: RoleName.ADMINISTRADOR,
      isOwner: true,
    });
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('adjunta request.membership a un Platform Admin que SI sostiene Membership activa en esa empresa', async () => {
    membershipsRepository.findActiveByUserAndCompany.mockResolvedValue({
      id: 'membership-1',
      companyId: 'company-1',
      roleId: 'role-1',
      isOwner: false,
      membershipStatus: MembershipStatus.ACTIVE,
      role: { name: RoleName.CONTADOR },
    } as never);

    const request = buildRequest({
      params: { companyId: 'company-1' },
      user: { id: 'admin-1', isPlatformAdmin: true },
    });

    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
    expect(request.membership).toEqual({
      id: 'membership-1',
      companyId: 'company-1',
      roleId: 'role-1',
      roleName: RoleName.CONTADOR,
      isOwner: false,
    });
  });

  describe('regresion estructural — un endpoint nuevo sin @Company() nace protegido', () => {
    it('deniega a un Platform Admin sin Membership aunque el handler nunca invoque @Company()/extractMembership()', async () => {
      // Representa un controlador company-scoped futuro que solo declara
      // `@UseGuards(CompanyGuard, ...)` y jamas lee `@Company()` en su
      // handler (por ejemplo, porque no necesita los datos de la Membership
      // dentro del cuerpo del metodo). Si la proteccion dependiera del
      // decorador, este handler quedaria expuesto exactamente como los seis
      // endpoints confirmados por la auditoria. La proteccion debe venir
      // del guard, nunca ejecutado el codigo del handler en este escenario.
      class NuevoControladorCompanyScoped {
        async handlerSinCompanyDecorator(): Promise<{ ok: true }> {
          return { ok: true };
        }
      }

      membershipsRepository.findActiveByUserAndCompany.mockResolvedValue(null);
      const request = buildRequest({
        params: { companyId: 'company-1' },
        user: { id: 'admin-1', isPlatformAdmin: true },
      });
      const context = {
        switchToHttp: () => ({ getRequest: () => request }),
        getHandler: () => NuevoControladorCompanyScoped.prototype.handlerSinCompanyDecorator,
        getClass: () => NuevoControladorCompanyScoped,
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(context)).rejects.toThrow();
      expect(request.membership).toBeUndefined();
    });
  });
});
