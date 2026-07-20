import type { ServerConfig } from '@contaia/config/server';
import { checkDatabaseConnection } from '@contaia/database';
import type {
  HealthResponseData,
  ReadinessCheckResult,
  ReadinessResponseData,
  ServiceStatus,
  VersionResponseData,
} from '@contaia/types';
import { Inject, Injectable } from '@nestjs/common';

import { SERVER_CONFIG } from '../config/config.module';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class HealthService {
  private readonly processStartedAt = Date.now();

  constructor(
    @Inject(SERVER_CONFIG) private readonly config: ServerConfig,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Liveness: el proceso esta vivo. Nunca depende de servicios externos
   * (docs/20_BACKEND_IMPLEMENTATION_PLAN.md seccion 5) — para eso existe
   * readiness.
   */
  getHealth(): HealthResponseData {
    return {
      status: 'ok',
      uptimeSeconds: Math.floor((Date.now() - this.processStartedAt) / 1000),
      checks: [{ status: 'ok', service: 'process' }],
    };
  }

  /**
   * Readiness: disponibilidad real de dependencias. PostgreSQL es critica —
   * si falla, el servicio completo se reporta como no listo. Redis es no
   * critica cuando esta habilitada (docs/20_BACKEND_IMPLEMENTATION_PLAN.md
   * seccion 5).
   */
  async getReadiness(): Promise<ReadinessResponseData> {
    const checks: ReadinessCheckResult[] = [];

    const isDatabaseUp = await checkDatabaseConnection();
    checks.push({
      status: isDatabaseUp ? 'ok' : 'down',
      service: 'postgresql',
      critical: true,
    });

    if (this.config.REDIS_ENABLED) {
      const isRedisUp = await this.redisService.ping();
      checks.push({
        status: isRedisUp ? 'ok' : 'down',
        service: 'redis',
        critical: false,
      });
    }

    return {
      status: this.resolveOverallStatus(checks),
      checks,
    };
  }

  getVersion(): VersionResponseData {
    return {
      version: this.config.APP_VERSION,
      environment: this.config.NODE_ENV,
      gitCommit: process.env.GIT_COMMIT_SHA ?? null,
    };
  }

  private resolveOverallStatus(checks: ReadinessCheckResult[]): ServiceStatus {
    const hasCriticalFailure = checks.some((check) => check.critical && check.status === 'down');
    if (hasCriticalFailure) {
      return 'down';
    }

    const hasNonCriticalFailure = checks.some(
      (check) => !check.critical && check.status === 'down',
    );
    return hasNonCriticalFailure ? 'degraded' : 'ok';
  }
}
