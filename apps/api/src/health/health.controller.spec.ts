import { Test, type TestingModule } from '@nestjs/testing';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  const healthServiceMock = {
    getHealth: jest.fn(),
    getReadiness: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: healthServiceMock }],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GET /health delega en HealthService.getHealth', () => {
    healthServiceMock.getHealth.mockReturnValue({ status: 'ok', uptimeSeconds: 1, checks: [] });

    const result = controller.getHealth();

    expect(healthServiceMock.getHealth).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ status: 'ok', uptimeSeconds: 1, checks: [] });
  });

  it('GET /health/readiness delega en HealthService.getReadiness', async () => {
    healthServiceMock.getReadiness.mockResolvedValue({ status: 'ok', checks: [] });

    const result = await controller.getReadiness();

    expect(healthServiceMock.getReadiness).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ status: 'ok', checks: [] });
  });
});
