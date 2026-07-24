export type JobsErrorCode = 'JOBS_DISABLED' | 'JOBS_CONFIGURATION_ERROR' | 'JOBS_OPERATION_FAILED';

/**
 * Error de dominio de JobsModule. `code` es lo unico que un consumidor
 * (DocumentsService) debe inspeccionar para decidir como reaccionar — el
 * mensaje nunca envuelve el error crudo de BullMQ/Redis/Prisma (nombre de
 * cola, jobId, connection string), mismo principio que `StorageError`
 * (BR-SEC-003, docs/11_SECURITY_ARCHITECTURE.md seccion 29).
 */
export class JobsError extends Error {
  constructor(
    public readonly code: JobsErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'JobsError';
  }
}
