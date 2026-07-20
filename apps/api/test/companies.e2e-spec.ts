import type { INestApplication } from '@nestjs/common';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

/**
 * Prueba de integracion del contrato HTTP de Companies/Organizations
 * (EWO-003) sin PostgreSQL real — mismo alcance que `auth.e2e-spec.ts`
 * (EWO-002): validacion de entrada y rechazo de solicitudes no autenticadas.
 * La logica de negocio (creacion atomica, aislamiento, ownership) ya esta
 * cubierta por pruebas unitarias con repositorios mockeados
 * (companies.service.spec.ts, organizations.service.spec.ts). La prueba
 * de aislamiento multiempresa real (BR-GLB-001, "la mas critica del
 * sistema" segun docs/23_TESTING_AND_QA_PLAN.md seccion 9) requiere
 * PostgreSQL real y queda documentada como limitacion en
 * docs/engineering/EWO-003_COMPANY_REPORT.md mientras Docker no este
 * disponible en este entorno de ejecucion.
 */
jest.mock('@contaia/database', () => ({
  ...jest.requireActual('@contaia/database'),
  checkDatabaseConnection: jest.fn().mockResolvedValue(true),
}));

describe('Companies & Organizations (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/companies sin sesion responde 401 AUTHENTICATION_ERROR', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/companies')
      .send({ name: 'Empresa X', businessActivity: 'Comercio' })
      .expect(401);

    expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('GET /api/v1/companies sin sesion responde 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/companies').expect(401);
  });

  it('GET /api/v1/companies/:companyId sin sesion responde 401', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/companies/00000000-0000-4000-8000-000000000001')
      .expect(401);
  });

  it('PATCH /api/v1/companies/:companyId sin sesion responde 401', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/companies/00000000-0000-4000-8000-000000000001')
      .send({ name: 'Nuevo nombre' })
      .expect(401);
  });

  it('POST /api/v1/organizations sin sesion responde 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .send({ name: 'Despacho X' })
      .expect(401);
  });

  it('GET /api/v1/organizations/:organizationId sin sesion responde 401', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/organizations/00000000-0000-4000-8000-000000000000')
      .expect(401);
  });

  it('PATCH /api/v1/companies/:companyId/fiscal-profile sin sesion responde 401', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/companies/00000000-0000-4000-8000-000000000001/fiscal-profile')
      .send({ taxRegime: '601 - General de Ley Personas Morales' })
      .expect(401);
  });

  it('PATCH /api/v1/companies/:companyId/address sin sesion responde 401', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/companies/00000000-0000-4000-8000-000000000001/address')
      .send({ street: 'Calle Nueva' })
      .expect(401);
  });

  it('PATCH /api/v1/companies/:companyId/settings sin sesion responde 401', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/companies/00000000-0000-4000-8000-000000000001/settings')
      .send({ timeZone: 'America/Cancun' })
      .expect(401);
  });
});
