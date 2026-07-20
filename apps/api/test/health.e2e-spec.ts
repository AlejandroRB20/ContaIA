import type { INestApplication } from '@nestjs/common';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { correlationIdMiddleware } from '../src/common/middleware/correlation-id.middleware';

// Prueba de integracion (docs/23_TESTING_AND_QA_PLAN.md seccion 3: "End-to-End").
// PostgreSQL se simula (nunca se requiere una base de datos real para esta
// suite, coherente con no depender de infraestructura externa no
// disponible en todo entorno de CI) — la conectividad real se verifica en
// health.service.spec.ts con ambas ramas (arriba/abajo) ya cubiertas.
//
// `jest.requireActual` preserva todo el modulo real (`prisma`, los enums de
// Prisma como `RoleName` — necesarios en tiempo de carga por decoradores
// como `@IsEnum(RoleName)` en los DTOs de otros modulos que `AppModule`
// tambien arranca aqui) y solo sustituye `checkDatabaseConnection`. Mockear
// un objeto literal fijo (como se hacia antes) queda desincronizado en
// cuanto el modulo real exporta algo nuevo.
jest.mock('@contaia/database', () => ({
  ...jest.requireActual('@contaia/database'),
  checkDatabaseConnection: jest.fn().mockResolvedValue(true),
}));

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= 'postgresql://contaia:contaia_dev_only@localhost:5432/contaia';
    // Redis no esta disponible en todo entorno de ejecucion de pruebas — se
    // deshabilita explicitamente para que esta suite sea determinista y no
    // dependa de un servicio externo real (Redis es una comprobacion no
    // critica, docs/20_BACKEND_IMPLEMENTATION_PLAN.md seccion 5).
    process.env.REDIS_ENABLED = 'false';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(correlationIdMiddleware);
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

  it('GET /api/v1/health responde 200 con el sobre estandar de docs/08_API_DESIGN.md', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    expect(response.body.data.status).toBe('ok');
    expect(response.body.meta.correlationId).toBeDefined();
    expect(response.headers['x-correlation-id']).toBeDefined();
  });

  it('GET /api/v1/health/readiness responde 200 cuando PostgreSQL esta disponible', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health/readiness').expect(200);

    expect(response.body.data.status).toBe('ok');
    expect(response.body.data.checks).toContainEqual({
      status: 'ok',
      service: 'postgresql',
      critical: true,
    });
  });

  it('GET /api/v1/version responde 200 con la version configurada', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/version').expect(200);

    expect(response.body.data.version).toBeDefined();
    expect(response.body.data.environment).toBeDefined();
  });

  it('una ruta inexistente responde con el sobre de error estandar, sin exponer detalle tecnico', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/no-existe').expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.error.correlationId).toBeDefined();
  });
});
