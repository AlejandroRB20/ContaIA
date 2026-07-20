import { checkDatabaseConnection } from '@contaia/database';
import { Test, type TestingModule } from '@nestjs/testing';

import { SERVER_CONFIG } from '../config/config.module';
import { RedisService } from '../redis/redis.service';

import { HealthService } from './health.service';

jest.mock('@contaia/database', () => ({
  checkDatabaseConnection: jest.fn(),
}));

describe('HealthService', () => {
  let service: HealthService;
  let redisPingMock: jest.Mock;

  const buildModule = async (redisEnabled: boolean): Promise<void> => {
    redisPingMock = jest.fn();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: SERVER_CONFIG,
          useValue: {
            APP_VERSION: '0.1.0-test',
            NODE_ENV: 'test',
            REDIS_ENABLED: redisEnabled,
          },
        },
        {
          provide: RedisService,
          useValue: { ping: redisPingMock },
        },
      ],
    }).compile();

    service = moduleRef.get(HealthService);
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getHealth', () => {
    it('siempre reporta ok — no depende de servicios externos', async () => {
      await buildModule(false);

      const result = service.getHealth();

      expect(result.status).toBe('ok');
      expect(result.checks).toEqual([{ status: 'ok', service: 'process' }]);
      expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getReadiness', () => {
    it('reporta "down" si PostgreSQL (critica) no esta disponible', async () => {
      await buildModule(false);
      (checkDatabaseConnection as jest.Mock).mockResolvedValue(false);

      const result = await service.getReadiness();

      expect(result.status).toBe('down');
      expect(result.checks).toContainEqual({
        status: 'down',
        service: 'postgresql',
        critical: true,
      });
    });

    it('reporta "ok" si PostgreSQL esta disponible y Redis esta deshabilitado', async () => {
      await buildModule(false);
      (checkDatabaseConnection as jest.Mock).mockResolvedValue(true);

      const result = await service.getReadiness();

      expect(result.status).toBe('ok');
      expect(result.checks).toHaveLength(1);
    });

    it('reporta "degraded" si PostgreSQL esta ok pero Redis (no critica) falla', async () => {
      await buildModule(true);
      (checkDatabaseConnection as jest.Mock).mockResolvedValue(true);
      redisPingMock.mockResolvedValue(false);

      const result = await service.getReadiness();

      expect(result.status).toBe('degraded');
      expect(result.checks).toContainEqual({ status: 'down', service: 'redis', critical: false });
    });

    it('reporta "ok" si tanto PostgreSQL como Redis estan disponibles', async () => {
      await buildModule(true);
      (checkDatabaseConnection as jest.Mock).mockResolvedValue(true);
      redisPingMock.mockResolvedValue(true);

      const result = await service.getReadiness();

      expect(result.status).toBe('ok');
    });
  });

  describe('getVersion', () => {
    it('devuelve la version y el ambiente configurados', async () => {
      await buildModule(false);

      const result = service.getVersion();

      expect(result.version).toBe('0.1.0-test');
      expect(result.environment).toBe('test');
    });
  });
});
