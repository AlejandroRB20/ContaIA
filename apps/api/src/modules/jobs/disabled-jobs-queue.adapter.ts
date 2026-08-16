import type { EnqueueXmlExtractionPayload, JobsQueueAdapter } from './jobs-queue.interface';
import { JobsError } from './jobs.errors';

/**
 * Adapter activo cuando REDIS_ENABLED=false — permite arrancar la
 * aplicacion sin Redis disponible. Nunca construye una `Queue` de BullMQ ni
 * intenta conectarse; cualquier operacion falla de inmediato con un error
 * controlado (JOBS_DISABLED), nunca con un timeout de red (mismo principio
 * que `DisabledStorageAdapter`).
 */
export class DisabledJobsQueueAdapter implements JobsQueueAdapter {
  async enqueueXmlExtraction(_payload: EnqueueXmlExtractionPayload): Promise<void> {
    throw new JobsError(
      'JOBS_DISABLED',
      'El sistema de trabajos en segundo plano esta deshabilitado (REDIS_ENABLED=false).',
    );
  }
}
