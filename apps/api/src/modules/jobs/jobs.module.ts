import { loadServerConfig, type ServerConfig } from '@contaia/config/server';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { Module, type DynamicModule, type Provider } from '@nestjs/common';
import type { ConnectionOptions, Queue } from 'bullmq';

import { SERVER_CONFIG } from '../../config/config.module';

import { BullMqJobsQueueAdapter } from './bullmq-jobs-queue.adapter';
import { DisabledJobsQueueAdapter } from './disabled-jobs-queue.adapter';
import {
  JOBS_QUEUE_ADAPTER,
  XML_EXTRACTION_QUEUE_NAME,
  type JobsQueueAdapter,
} from './jobs-queue.interface';
import { JobsRepository } from './jobs.repository';
import { JobsService } from './jobs.service';

/**
 * Reutiliza REDIS_URL (ya validado por @contaia/config, mismo valor que
 * usa RedisService) — ninguna variable de entorno nueva ni fuente de
 * configuracion adicional (Bloque D, seccion 4). `maxRetriesPerRequest:
 * null` es requerido por BullMQ para los comandos bloqueantes de un futuro
 * Worker; inocuo para el Queue productor-only de este bloque.
 */
export function buildBullConnectionOptions(config: ServerConfig): ConnectionOptions {
  return { url: config.REDIS_URL, maxRetriesPerRequest: null };
}

/**
 * `BullModule` solo se importa cuando REDIS_ENABLED=true — evita cualquier
 * intento de conexion real a Redis cuando esta deshabilitado (mismo
 * principio que StorageModule/STORAGE_ENABLED: `DisabledStorageAdapter`
 * nunca construye un cliente S3). `REDIS_ENABLED=false` por defecto en
 * pruebas de integracion (test/env.setup.ts), asi que ningun test abre una
 * conexion real ni queda con handles abiertos.
 */
export function buildJobsQueueImports(redisEnabled: boolean): DynamicModule[] {
  if (!redisEnabled) {
    return [];
  }

  return [
    BullModule.forRootAsync({
      useFactory: (config: ServerConfig) => ({ connection: buildBullConnectionOptions(config) }),
      inject: [SERVER_CONFIG],
    }),
    BullModule.registerQueue({ name: XML_EXTRACTION_QUEUE_NAME }),
  ];
}

/**
 * Selecciona el adapter de cola activo — mismo patron que
 * `createStorageAdapter`/`STORAGE_ADAPTER`. Cuando esta deshabilitado, el
 * provider ni siquiera depende del token de la cola BullMQ (que no existe
 * en ese caso, porque `buildJobsQueueImports` no la registro).
 */
export function buildJobsQueueAdapterProvider(redisEnabled: boolean): Provider {
  if (!redisEnabled) {
    return {
      provide: JOBS_QUEUE_ADAPTER,
      useFactory: (): JobsQueueAdapter => new DisabledJobsQueueAdapter(),
    };
  }

  return {
    provide: JOBS_QUEUE_ADAPTER,
    useFactory: (queue: Queue): JobsQueueAdapter => new BullMqJobsQueueAdapter(queue),
    inject: [getQueueToken(XML_EXTRACTION_QUEUE_NAME)],
  };
}

const redisEnabled = loadServerConfig().REDIS_ENABLED;

/**
 * Bloque D de EWO-005. Productor de Jobs unicamente — SIN consumer/worker
 * (docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md seccion 11 del
 * prompt de este bloque: registrar la cola y el producer, no un consumer
 * todavia; BullMQ permite una `Queue` sin ningun `Worker` consumiendola,
 * los jobs simplemente esperan). Expone unicamente `JobsService` — ningun
 * consumidor debe inyectar `JobsRepository` ni `JOBS_QUEUE_ADAPTER`
 * directamente (inversion de dependencias, mismo principio que
 * StorageModule). No depende de DocumentsModule, CfdiModule ni
 * XmlProcessingModule.
 */
@Module({
  imports: buildJobsQueueImports(redisEnabled),
  providers: [JobsService, JobsRepository, buildJobsQueueAdapterProvider(redisEnabled)],
  exports: [JobsService],
})
export class JobsModule {}
