import { Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';

import {
  XML_EXTRACTION_JOB_NAME,
  type EnqueueXmlExtractionPayload,
  type JobsQueueAdapter,
} from './jobs-queue.interface';
import { JobsError } from './jobs.errors';

/** Unicamente lo que el adapter necesita de la configuracion central (Addendum §10.3, `E5-S4-T09`). */
export interface BullMqJobsQueueAdapterConfig {
  readonly attempts: number;
  readonly backoffDelayMs: number;
}

/**
 * Implementacion real de JobsQueueAdapter contra BullMQ (Bloque D). Recibe
 * la `Queue` ya construida (via `@nestjs/bullmq`, `BullModule`) en vez de
 * crear la suya propia — a diferencia de S3StorageAdapter (que si crea su
 * propio cliente), BullMQ administra el ciclo de vida de la conexion
 * (incluido el cierre ordenado en `onApplicationShutdown`) y no debe
 * duplicarse. Nunca importa Prisma, DocumentsModule ni procesa el job —
 * solo lo encola.
 *
 * `attempts`/`backoffDelayMs` provienen de `JOBS_ATTEMPTS`/
 * `JOBS_BACKOFF_DELAY_MS` (Addendum §10.3, `E5-S4-T09`) — ya no son
 * constantes locales: este adapter no declara ningun default propio, la
 * configuracion central es la unica fuente. El tipo de backoff
 * (`'exponential'`) es una decision arquitectonica fija (Addendum §10.3,
 * nota sobre el peor caso de backoff), no una variable de entorno.
 */
export class BullMqJobsQueueAdapter implements JobsQueueAdapter {
  private readonly logger = new Logger(BullMqJobsQueueAdapter.name);

  constructor(
    private readonly queue: Queue,
    private readonly config: BullMqJobsQueueAdapterConfig,
  ) {}

  async enqueueXmlExtraction(payload: EnqueueXmlExtractionPayload): Promise<void> {
    try {
      await this.queue.add(XML_EXTRACTION_JOB_NAME, payload, {
        jobId: payload.jobId,
        attempts: this.config.attempts,
        backoff: { type: 'exponential', delay: this.config.backoffDelayMs },
      });
    } catch (error) {
      const name = error instanceof Error ? error.name : 'UnknownError';
      this.logger.error(`No fue posible encolar el Job de extraccion XML (error=${name}).`);
      throw new JobsError(
        'JOBS_OPERATION_FAILED',
        'No fue posible encolar el trabajo de procesamiento.',
      );
    }
  }
}
