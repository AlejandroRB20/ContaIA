import { JobType } from '@contaia/database';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { buildDeterministicJobId } from './job-id.util';
import { JOBS_QUEUE_ADAPTER, type JobsQueueAdapter } from './jobs-queue.interface';
import { JobsError } from './jobs.errors';
import type { JobSummary } from './jobs.repository';
import { JobsRepository } from './jobs.repository';

/**
 * Bloque D de EWO-005. Unico metodo publico: `ensureXmlExtractionJob`,
 * llamado por `DocumentsService.confirmUpload` despues de autorizar al
 * actor y (si aplica) transicionar el Documento — nunca antes. Solo
 * soporta `JobType.XML_EXTRACTION` (Bloque D, seccion 5: "no conviertas
 * JobsModule en un modulo generico excesivamente abstracto"). No lanza
 * excepciones HTTP: solo `JobsError` (mismo principio que
 * `StorageAdapter`/`StorageError`) — la traduccion a una excepcion publica
 * es responsabilidad de `DocumentsService`.
 */
@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly jobsRepository: JobsRepository,
    @Inject(JOBS_QUEUE_ADAPTER) private readonly jobsQueueAdapter: JobsQueueAdapter,
  ) {}

  /**
   * Crea o recupera (idempotente, id determinista) el Job persistente de
   * extraccion XML para un Documento, y lo encola (tambien idempotente,
   * mismo `jobId`). Seguro de llamar repetidamente para el mismo Documento
   * — tanto en la primera confirmacion como en una reparacion posterior
   * (Documento en PROCESSING sin Job encolado).
   */
  async ensureXmlExtractionJob(companyId: string, documentId: string): Promise<void> {
    const jobId = buildDeterministicJobId(companyId, documentId, JobType.XML_EXTRACTION);

    let job: JobSummary;
    try {
      job = await this.jobsRepository.findOrCreateQueued({
        id: jobId,
        companyId,
        documentId,
        type: JobType.XML_EXTRACTION,
      });
    } catch (error) {
      const name = error instanceof Error ? error.name : 'UnknownError';
      this.logger.error(
        `No fue posible persistir el Job de extraccion XML (documentId=${documentId}, error=${name}).`,
      );
      throw new JobsError(
        'JOBS_OPERATION_FAILED',
        'No fue posible registrar el trabajo de procesamiento.',
      );
    }

    // `enqueueXmlExtraction` ya lanza JobsError con el codigo especifico
    // correspondiente (JOBS_DISABLED / JOBS_OPERATION_FAILED) — se deja
    // propagar tal cual, sin reenvolverlo, para no perder esa granularidad.
    await this.jobsQueueAdapter.enqueueXmlExtraction({
      jobId: job.id,
      documentId: job.documentId,
      companyId: job.companyId,
    });
  }
}
