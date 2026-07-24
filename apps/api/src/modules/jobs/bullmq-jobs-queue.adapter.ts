import { Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';

import {
  XML_EXTRACTION_JOB_NAME,
  type EnqueueXmlExtractionPayload,
  type JobsQueueAdapter,
} from './jobs-queue.interface';
import { JobsError } from './jobs.errors';

/**
 * Configuracion tecnica provisional (Bloque D, seccion 9): el plan
 * (docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md §2.1) solo especifica
 * "3 reintentos y backoff exponencial", sin el retraso base — se elige un
 * valor conservador y explicito (1000 ms), documentado como deuda tecnica,
 * no como regla fiscal o de negocio.
 */
const ATTEMPTS = 3;
const BACKOFF_DELAY_MS = 1000;

/**
 * Implementacion real de JobsQueueAdapter contra BullMQ (Bloque D). Recibe
 * la `Queue` ya construida (via `@nestjs/bullmq`, `BullModule`) en vez de
 * crear la suya propia — a diferencia de S3StorageAdapter (que si crea su
 * propio cliente), BullMQ administra el ciclo de vida de la conexion
 * (incluido el cierre ordenado en `onApplicationShutdown`) y no debe
 * duplicarse. Nunca importa Prisma, DocumentsModule ni procesa el job —
 * solo lo encola.
 */
export class BullMqJobsQueueAdapter implements JobsQueueAdapter {
  private readonly logger = new Logger(BullMqJobsQueueAdapter.name);

  constructor(private readonly queue: Queue) {}

  async enqueueXmlExtraction(payload: EnqueueXmlExtractionPayload): Promise<void> {
    try {
      await this.queue.add(XML_EXTRACTION_JOB_NAME, payload, {
        jobId: payload.jobId,
        attempts: ATTEMPTS,
        backoff: { type: 'exponential', delay: BACKOFF_DELAY_MS },
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
