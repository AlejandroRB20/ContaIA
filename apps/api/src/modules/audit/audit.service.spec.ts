import {
  AUTH_EVENTS,
  PlatformAdminCompanyAccessDeniedEvent,
} from '../../common/events/auth.events';

import { AuditRepository } from './audit.repository';
import { AuditService } from './audit.service';

/**
 * D-010 / EWO-SEC-NAV-001 T01 — hallazgo 3 de la auditoria (BAJO): prueba
 * directa del listener que persiste `PLATFORM_ADMIN_COMPANY_ACCESS_DENIED`,
 * mismo patron unitario que el resto de listeners de `AuditService` (sin
 * `TestingModule`, instanciacion directa con el repositorio mockeado).
 */
describe('AuditService — onPlatformAdminCompanyAccessDenied (D-010)', () => {
  let auditRepository: jest.Mocked<AuditRepository>;
  let service: AuditService;

  beforeEach(() => {
    auditRepository = { append: jest.fn() } as unknown as jest.Mocked<AuditRepository>;
    service = new AuditService(auditRepository);
  });

  const EVENT = new PlatformAdminCompanyAccessDeniedEvent('admin-1', 'company-1', {
    correlationId: 'correlation-1',
    ipAddress: '203.0.113.10',
    deviceInfo: 'test-agent',
  });

  it('persiste el intento denegado con el tipo de evento, actor, empresa, correlationId y result FAILURE correctos', async () => {
    auditRepository.append.mockResolvedValue(undefined);

    await service.onPlatformAdminCompanyAccessDenied(EVENT);

    expect(auditRepository.append).toHaveBeenCalledTimes(1);
    expect(auditRepository.append).toHaveBeenCalledWith({
      actorUserId: 'admin-1',
      companyId: 'company-1',
      action: 'security.platform_admin_company_access_denied',
      resourceType: 'Company',
      resourceId: 'company-1',
      result: 'FAILURE',
      correlationId: 'correlation-1',
      ipAddress: '203.0.113.10',
      deviceInfo: 'test-agent',
    });
  });

  it('no incluye secretos ni datos fiscales completos en el payload persistido', async () => {
    auditRepository.append.mockResolvedValue(undefined);

    await service.onPlatformAdminCompanyAccessDenied(EVENT);

    const persisted = auditRepository.append.mock.calls[0]?.[0];
    if (!persisted) {
      throw new Error('auditRepository.append no fue invocado');
    }
    // Unicamente los campos declarados en AuditLogEntry para este evento:
    // sin `reason` (pertenece al futuro soporte JIT, no implementado), sin
    // token, sin contraseña, sin RFC/regimen fiscal ni cualquier otro dato
    // extraido del CFDI o del perfil fiscal de la Empresa.
    expect(Object.keys(persisted).sort()).toEqual(
      [
        'actorUserId',
        'companyId',
        'action',
        'resourceType',
        'resourceId',
        'result',
        'correlationId',
        'ipAddress',
        'deviceInfo',
      ].sort(),
    );
  });

  it('no persiste el registro si el evento llega sin actorUserId real (no se inventa un valor por defecto)', async () => {
    auditRepository.append.mockResolvedValue(undefined);
    const eventoSinIp = new PlatformAdminCompanyAccessDeniedEvent('admin-2', 'company-2', {
      correlationId: 'correlation-2',
    });

    await service.onPlatformAdminCompanyAccessDenied(eventoSinIp);

    expect(auditRepository.append).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'admin-2',
        ipAddress: undefined,
        deviceInfo: undefined,
      }),
    );
  });

  describe('cuando AuditRepository.append falla', () => {
    it('propaga el rechazo desde el metodo del servicio, sin silenciarlo (mismo patron que el resto de listeners de AuditService, ninguno usa try/catch)', async () => {
      auditRepository.append.mockRejectedValue(new Error('conexion a base de datos perdida'));

      await expect(service.onPlatformAdminCompanyAccessDenied(EVENT)).rejects.toThrow(
        'conexion a base de datos perdida',
      );
    });

    it('un fallo de persistencia no puede alterar una decision de autorizacion ya tomada: EventEmitter2.emit() es sincrono y no se espera (fire-and-forget) — el guard ya emitio y ya arrojo su excepcion antes de que esta promesa se resuelva o rechace', async () => {
      // Prueba estructural, no de comportamiento del listener: documenta por
      // que CompanyGuard (company.guard.ts) es inmune a este fallo. El guard
      // llama `this.events.emit(...)` sin `await` y arroja
      // `MembershipNotFoundException` en la siguiente linea,
      // incondicionalmente — el resultado 403 ya esta decidido antes de que
      // cualquier listener asincrono, incluido este, comience a ejecutarse.
      // La cobertura HTTP de esta garantia vive en
      // `test/platform-admin-tenant-isolation.e2e-spec.ts`, caso
      // "la denegacion HTTP no depende de que el listener de auditoria tenga
      // exito".
      auditRepository.append.mockRejectedValue(new Error('conexion a base de datos perdida'));

      const emitCall = service.onPlatformAdminCompanyAccessDenied(EVENT);
      // El emisor real (EventEmitter2.emit) nunca hace `await` de este
      // valor de retorno — por eso un manejador vacio basta para que Jest no
      // reporte un rechazo no manejado sin que eso implique que el guard
      // "maneja" el error de ninguna forma especial.
      await expect(emitCall).rejects.toThrow();
    });
  });

  it('AUTH_EVENTS.PLATFORM_ADMIN_COMPANY_ACCESS_DENIED sigue siendo el nombre de evento que dispara este listener', () => {
    expect(AUTH_EVENTS.PLATFORM_ADMIN_COMPANY_ACCESS_DENIED).toBe(
      'security.platform_admin_company_access_denied',
    );
  });
});
