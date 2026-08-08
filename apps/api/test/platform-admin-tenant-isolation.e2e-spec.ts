import { MembershipStatus, RoleName, UserStatus } from '@contaia/database';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { ACCESS_TOKEN_COOKIE } from '../src/common/security/cookie.constants';
import { AuditRepository } from '../src/modules/audit/audit.repository';
import { SessionsRepository } from '../src/modules/authentication/repositories/sessions.repository';
import { CompaniesRepository } from '../src/modules/companies/repositories/companies.repository';
import { MembershipsRepository } from '../src/modules/roles-permissions/repositories/memberships.repository';
import { RolesRepository } from '../src/modules/roles-permissions/repositories/roles.repository';
import { UsersRepository } from '../src/modules/users/repositories/users.repository';

/**
 * D-010 / EWO-SEC-NAV-001 T01 — hallazgo 1 de la auditoria (MEDIO): pruebas
 * HTTP autenticadas, extremo a extremo por la cadena real de guards
 * (`AuthenticationGuard` -> `CompanyGuard` -> `PermissionGuard`/`RoleGuard`),
 * no invocaciones directas al guard ni al metodo del controller.
 *
 * Mismo patron que `auth.e2e-spec.ts`/`companies.e2e-spec.ts`
 * (`Test.createTestingModule({ imports: [AppModule] })` + supertest, sin
 * PostgreSQL real) extendido con `.overrideProvider(...)` — tecnica estandar
 * de `@nestjs/testing`, no una infraestructura E2E paralela — para los
 * repositorios que la autenticacion y la autorizacion consultan
 * (`SessionsRepository`, `UsersRepository`, `MembershipsRepository`,
 * `RolesRepository`, `CompaniesRepository`). Evita escribir en la base de
 * datos compartida de desarrollo mientras mantiene real toda la tuberia
 * HTTP: middleware, guards, pipes, controller, servicio.
 */
jest.mock('@contaia/database', () => ({
  ...jest.requireActual('@contaia/database'),
  checkDatabaseConnection: jest.fn().mockResolvedValue(true),
}));

const TARGET_COMPANY_ID = '00000000-0000-4000-8000-000000000001';
const OTHER_COMPANY_ID = '00000000-0000-4000-8000-000000000002';
const PLATFORM_ADMIN_ID = '00000000-0000-4000-8000-0000000000a1';
const COMPANY_ADMIN_ID = '00000000-0000-4000-8000-0000000000a2';
const TARGET_MEMBERSHIP_ID = '00000000-0000-4000-8000-0000000000b1';

describe('D-010 — Platform Admin y tenant isolation (integracion HTTP, T01)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let sessionsRepository: jest.Mocked<SessionsRepository>;
  let usersRepository: jest.Mocked<UsersRepository>;
  let membershipsRepository: jest.Mocked<MembershipsRepository>;
  let companiesRepository: jest.Mocked<CompaniesRepository>;
  let rolesRepository: jest.Mocked<RolesRepository>;
  let auditRepository: jest.Mocked<AuditRepository>;

  beforeAll(async () => {
    sessionsRepository = {
      findActiveById: jest.fn(),
    } as unknown as jest.Mocked<SessionsRepository>;
    usersRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;
    membershipsRepository = {
      findActiveByUserAndCompany: jest.fn(),
      findById: jest.fn(),
      findAllForCompany: jest.fn(),
      updateRole: jest.fn(),
      revoke: jest.fn(),
    } as unknown as jest.Mocked<MembershipsRepository>;
    companiesRepository = {
      findAggregateById: jest.fn(),
      updateFiscalProfile: jest.fn(),
      updateAddress: jest.fn(),
      updateSettings: jest.fn(),
    } as unknown as jest.Mocked<CompaniesRepository>;
    rolesRepository = {
      findPermissionKeysForRole: jest.fn(),
    } as unknown as jest.Mocked<RolesRepository>;
    auditRepository = {
      append: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuditRepository>;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SessionsRepository)
      .useValue(sessionsRepository)
      .overrideProvider(UsersRepository)
      .useValue(usersRepository)
      .overrideProvider(MembershipsRepository)
      .useValue(membershipsRepository)
      .overrideProvider(CompaniesRepository)
      .useValue(companiesRepository)
      .overrideProvider(RolesRepository)
      .useValue(rolesRepository)
      .overrideProvider(AuditRepository)
      .useValue(auditRepository)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();

    jwtService = moduleFixture.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  async function authCookie(userId: string, sessionId: string): Promise<string> {
    const token = await jwtService.signAsync({ sub: userId, sid: sessionId });
    return `${ACCESS_TOKEN_COOKIE}=${token}`;
  }

  function mockAuthenticatedActor(userId: string, sessionId: string, isPlatformAdmin: boolean) {
    sessionsRepository.findActiveById.mockResolvedValue({ id: sessionId, userId } as never);
    usersRepository.findById.mockResolvedValue({
      id: userId,
      email: 'actor@contaia.demo',
      isPlatformAdmin,
      accountStatus: UserStatus.ACTIVE,
    } as never);
  }

  const ADMINISTRADOR_MEMBERSHIP = {
    id: 'membership-admin',
    companyId: TARGET_COMPANY_ID,
    roleId: 'role-admin',
    isOwner: true,
    membershipStatus: MembershipStatus.ACTIVE,
    role: { name: RoleName.ADMINISTRADOR },
  };

  describe('Platform Admin sin Membership — los seis endpoints confirmados responden 403', () => {
    it('PATCH /v1/companies/:companyId/fiscal-profile', async () => {
      mockAuthenticatedActor(PLATFORM_ADMIN_ID, 'session-1', true);
      membershipsRepository.findActiveByUserAndCompany.mockResolvedValue(null);
      const cookie = await authCookie(PLATFORM_ADMIN_ID, 'session-1');

      await request(app.getHttpServer())
        .patch(`/api/v1/companies/${TARGET_COMPANY_ID}/fiscal-profile`)
        .set('Cookie', cookie)
        .send({ taxRegime: '601 - General de Ley Personas Morales' })
        .expect(403);

      expect(companiesRepository.updateFiscalProfile).not.toHaveBeenCalled();
    });

    it('PATCH /v1/companies/:companyId/address', async () => {
      mockAuthenticatedActor(PLATFORM_ADMIN_ID, 'session-2', true);
      membershipsRepository.findActiveByUserAndCompany.mockResolvedValue(null);
      const cookie = await authCookie(PLATFORM_ADMIN_ID, 'session-2');

      await request(app.getHttpServer())
        .patch(`/api/v1/companies/${TARGET_COMPANY_ID}/address`)
        .set('Cookie', cookie)
        .send({ street: 'Calle Nueva' })
        .expect(403);

      expect(companiesRepository.updateAddress).not.toHaveBeenCalled();
    });

    it('PATCH /v1/companies/:companyId/settings', async () => {
      mockAuthenticatedActor(PLATFORM_ADMIN_ID, 'session-3', true);
      membershipsRepository.findActiveByUserAndCompany.mockResolvedValue(null);
      const cookie = await authCookie(PLATFORM_ADMIN_ID, 'session-3');

      await request(app.getHttpServer())
        .patch(`/api/v1/companies/${TARGET_COMPANY_ID}/settings`)
        .set('Cookie', cookie)
        .send({ timeZone: 'America/Cancun' })
        .expect(403);

      expect(companiesRepository.updateSettings).not.toHaveBeenCalled();
    });

    it('GET /v1/companies/:companyId/memberships', async () => {
      mockAuthenticatedActor(PLATFORM_ADMIN_ID, 'session-4', true);
      membershipsRepository.findActiveByUserAndCompany.mockResolvedValue(null);
      const cookie = await authCookie(PLATFORM_ADMIN_ID, 'session-4');

      await request(app.getHttpServer())
        .get(`/api/v1/companies/${TARGET_COMPANY_ID}/memberships`)
        .set('Cookie', cookie)
        .expect(403);

      expect(membershipsRepository.findAllForCompany).not.toHaveBeenCalled();
    });

    it('PATCH /v1/memberships/:membershipId — la Membership objetivo pertenece a una empresa donde el actor no tiene Membership', async () => {
      mockAuthenticatedActor(PLATFORM_ADMIN_ID, 'session-5', true);
      membershipsRepository.findById.mockResolvedValue({
        id: TARGET_MEMBERSHIP_ID,
        userId: 'other-user',
        companyId: OTHER_COMPANY_ID,
        roleId: 'role-old',
      } as never);
      membershipsRepository.findActiveByUserAndCompany.mockResolvedValue(null);
      const cookie = await authCookie(PLATFORM_ADMIN_ID, 'session-5');

      await request(app.getHttpServer())
        .patch(`/api/v1/memberships/${TARGET_MEMBERSHIP_ID}`)
        .set('Cookie', cookie)
        .set('If-Match', '1')
        .send({ role: RoleName.AUXILIAR })
        .expect(403);

      // El companyId nunca lo elige el cliente: se resuelve del propio
      // recurso objetivo — el membershipId opaco no permite omitir esa
      // resolucion.
      expect(membershipsRepository.findActiveByUserAndCompany).toHaveBeenCalledWith(
        PLATFORM_ADMIN_ID,
        OTHER_COMPANY_ID,
      );
      expect(membershipsRepository.updateRole).not.toHaveBeenCalled();
    });

    it('DELETE /v1/memberships/:membershipId — la Membership objetivo pertenece a una empresa donde el actor no tiene Membership', async () => {
      mockAuthenticatedActor(PLATFORM_ADMIN_ID, 'session-6', true);
      membershipsRepository.findById.mockResolvedValue({
        id: TARGET_MEMBERSHIP_ID,
        userId: 'other-user',
        companyId: OTHER_COMPANY_ID,
        isOwner: false,
      } as never);
      membershipsRepository.findActiveByUserAndCompany.mockResolvedValue(null);
      const cookie = await authCookie(PLATFORM_ADMIN_ID, 'session-6');

      await request(app.getHttpServer())
        .delete(`/api/v1/memberships/${TARGET_MEMBERSHIP_ID}`)
        .set('Cookie', cookie)
        .expect(403);

      expect(membershipsRepository.findActiveByUserAndCompany).toHaveBeenCalledWith(
        PLATFORM_ADMIN_ID,
        OTHER_COMPANY_ID,
      );
      expect(membershipsRepository.revoke).not.toHaveBeenCalled();
    });

    it('la denegacion HTTP no depende de que el listener de auditoria tenga exito (hallazgo 3)', async () => {
      // EventEmitter2.emit() en CompanyGuard nunca se espera (fire-and-forget):
      // el 403 ya esta decidido en la linea siguiente al emit(), sin importar
      // si AuditRepository.append() falla. Ver audit.service.spec.ts para la
      // prueba directa del listener.
      mockAuthenticatedActor(PLATFORM_ADMIN_ID, 'session-audit-failure', true);
      membershipsRepository.findActiveByUserAndCompany.mockResolvedValue(null);
      auditRepository.append.mockRejectedValueOnce(new Error('conexion a base de datos perdida'));
      const cookie = await authCookie(PLATFORM_ADMIN_ID, 'session-audit-failure');

      await request(app.getHttpServer())
        .patch(`/api/v1/companies/${TARGET_COMPANY_ID}/fiscal-profile`)
        .set('Cookie', cookie)
        .send({ taxRegime: '601 - General de Ley Personas Morales' })
        .expect(403);

      expect(companiesRepository.updateFiscalProfile).not.toHaveBeenCalled();
    });
  });

  describe('Casos positivos — la autorizacion sigue la Membership real, no el booleano isPlatformAdmin', () => {
    it('un Administrador de Empresa con Membership activa SI puede actualizar el perfil fiscal', async () => {
      mockAuthenticatedActor(COMPANY_ADMIN_ID, 'session-7', false);
      membershipsRepository.findActiveByUserAndCompany.mockResolvedValue(
        ADMINISTRADOR_MEMBERSHIP as never,
      );
      rolesRepository.findPermissionKeysForRole.mockResolvedValue(['company.fiscal.update']);
      companiesRepository.findAggregateById.mockResolvedValue({
        company: { id: TARGET_COMPANY_ID },
        fiscalProfile: { taxRegime: null },
        address: null,
        settings: null,
      } as never);
      companiesRepository.updateFiscalProfile.mockResolvedValue({
        taxRegime: '601 - General de Ley Personas Morales',
      } as never);
      const cookie = await authCookie(COMPANY_ADMIN_ID, 'session-7');

      await request(app.getHttpServer())
        .patch(`/api/v1/companies/${TARGET_COMPANY_ID}/fiscal-profile`)
        .set('Cookie', cookie)
        .set('If-Match', '1')
        .send({ taxRegime: '601 - General de Ley Personas Morales' })
        .expect(200);

      expect(companiesRepository.updateFiscalProfile).toHaveBeenCalled();
    });

    it('un Platform Admin que TAMBIEN sostiene Membership ADMINISTRADOR activa en esa empresa es autorizado por su Membership, no por isPlatformAdmin', async () => {
      mockAuthenticatedActor(PLATFORM_ADMIN_ID, 'session-8', true);
      membershipsRepository.findActiveByUserAndCompany.mockResolvedValue({
        ...ADMINISTRADOR_MEMBERSHIP,
        id: 'membership-dual',
        isOwner: false,
      } as never);
      rolesRepository.findPermissionKeysForRole.mockResolvedValue(['company.fiscal.update']);
      companiesRepository.findAggregateById.mockResolvedValue({
        company: { id: TARGET_COMPANY_ID },
        fiscalProfile: { taxRegime: null },
        address: null,
        settings: null,
      } as never);
      companiesRepository.updateFiscalProfile.mockResolvedValue({
        taxRegime: '601 - General de Ley Personas Morales',
      } as never);
      const cookie = await authCookie(PLATFORM_ADMIN_ID, 'session-8');

      await request(app.getHttpServer())
        .patch(`/api/v1/companies/${TARGET_COMPANY_ID}/fiscal-profile`)
        .set('Cookie', cookie)
        .set('If-Match', '1')
        .send({ taxRegime: '601 - General de Ley Personas Morales' })
        .expect(200);

      expect(companiesRepository.updateFiscalProfile).toHaveBeenCalled();
    });

    it('un Administrador de Empresa con Membership activa SI puede listar las Membresias de su Empresa', async () => {
      mockAuthenticatedActor(COMPANY_ADMIN_ID, 'session-9', false);
      membershipsRepository.findActiveByUserAndCompany.mockResolvedValue(
        ADMINISTRADOR_MEMBERSHIP as never,
      );
      membershipsRepository.findAllForCompany.mockResolvedValue([]);
      const cookie = await authCookie(COMPANY_ADMIN_ID, 'session-9');

      await request(app.getHttpServer())
        .get(`/api/v1/companies/${TARGET_COMPANY_ID}/memberships`)
        .set('Cookie', cookie)
        .expect(200);

      expect(membershipsRepository.findAllForCompany).toHaveBeenCalledWith(TARGET_COMPANY_ID);
    });
  });
});
