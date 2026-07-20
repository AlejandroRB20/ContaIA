import type { ServerConfig } from '@contaia/config/server';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

import { SERVER_CONFIG } from '../config/config.module';

/**
 * Comprobacion de disponibilidad de Redis — no critica en EWO-001
 * (docs/20_BACKEND_IMPLEMENTATION_PLAN.md seccion 5: "la disponibilidad de
 * Redis puede aparecer como una comprobacion no critica cuando el servicio
 * este habilitado"). Sin uso funcional de colas (BullMQ) todavia — solo
 * verifica conectividad real mediante PING.
 */
@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(SERVER_CONFIG) private readonly config: ServerConfig) {}

  async ping(): Promise<boolean> {
    if (!this.config.REDIS_ENABLED) {
      return false;
    }

    const client = new Redis(this.config.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
      retryStrategy: () => null,
    });

    // Evita que un error de socket no controlado se propague como una
    // excepcion no manejada del proceso — Redis es opcional en esta fase.
    client.on('error', () => undefined);

    try {
      await client.connect();
      const result = await client.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.warn(
        `No fue posible conectar a Redis para la comprobacion de disponibilidad: ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      );
      return false;
    } finally {
      client.disconnect();
    }
  }
}
