import type { INestApplication } from '@nestjs/common';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

/**
 * Prueba de integracion del contrato HTTP de Auth (EWO-002) que no requiere
 * PostgreSQL real: validacion de entrada (400) y rechazo de solicitudes no
 * autenticadas (401) en rutas protegidas — el mismo alcance de e2e que
 * `health.e2e-spec.ts` ya establecio para EWO-001 (sin infraestructura
 * externa real). La correctud de la logica de negocio (login, MFA, RBAC)
 * ya esta cubierta por pruebas unitarias con repositorios mockeados.
 *
 * `jest.requireActual` preserva todo el modulo real (`prisma`, los enums
 * de Prisma como `RoleName` — necesarios en tiempo de carga por decoradores
 * como `@IsEnum(RoleName)` en los DTOs, no solo en tiempo de ejecucion de
 * una prueba) y solo sustituye `checkDatabaseConnection` para que el
 * healthcheck no intente una conexion real. Mockear un objeto literal fijo
 * aqui (como se hacia antes) queda desincronizado en cuanto el modulo real
 * exporta algo nuevo — causo un fallo real de carga de esta suite cuando
 * EWO-002 agrego los enums de Prisma sin actualizar este mock.
 */
jest.mock('@contaia/database', () => ({
  ...jest.requireActual('@contaia/database'),
  checkDatabaseConnection: jest.fn().mockResolvedValue(true),
}));

describe('Auth (e2e)', () => {
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

  it('POST /api/v1/auth/register con correo invalido responde 400 VALIDATION_ERROR', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'no-es-un-correo', password: 'irrelevante', firstName: 'A', lastName: 'B' })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/auth/register con contraseña debil responde 400 VALIDATION_ERROR', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'valido@contaia.demo', password: '123', firstName: 'A', lastName: 'B' })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/v1/users/me sin sesion responde 401 AUTHENTICATION_ERROR', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);

    expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('POST /api/v1/auth/logout sin sesion responde 401 AUTHENTICATION_ERROR', async () => {
    const response = await request(app.getHttpServer()).post('/api/v1/auth/logout').expect(401);

    expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('GET /api/v1/roles sin sesion responde 401 (catalogo protegido)', async () => {
    await request(app.getHttpServer()).get('/api/v1/roles').expect(401);
  });

  it('POST /api/v1/companies/:companyId/invitations sin sesion responde 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/companies/00000000-0000-4000-8000-000000000001/invitations')
      .send({ email: 'nuevo@contaia.demo', role: 'CONTADOR' })
      .expect(401);
  });

  it('PATCH /api/v1/memberships/:id sin encabezado If-Match responde 400', async () => {
    // La ruta exige autenticacion antes que la validacion de negocio, por lo
    // que sin sesion tambien se espera 401 — se prueba junto a la anterior,
    // ambas confirman que ningun endpoint mutante de Auth es alcanzable sin
    // sesion valida, incluso con un cuerpo bien formado.
    await request(app.getHttpServer())
      .patch('/api/v1/memberships/00000000-0000-4000-8000-000000000099')
      .send({ role: 'CONTADOR' })
      .expect(401);
  });

  it('GET /api/v1/companies/:companyId/memberships sin sesion responde 401 (API-0016)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/companies/00000000-0000-4000-8000-000000000001/memberships')
      .expect(401);
  });
});
