import { JobStatus, JobType } from '@contaia/database';

import { buildDeterministicJobId } from './job-id.util';
import type { JobsQueueAdapter } from './jobs-queue.interface';
import { JobsError } from './jobs.errors';
import type { JobSummary } from './jobs.repository';
import { JobsRepository } from './jobs.repository';
import { JobsService } from './jobs.service';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const DOCUMENT_ID = '44444444-4444-4444-4444-444444444444';
const DETERMINISTIC_JOB_ID = buildDeterministicJobId(
  COMPANY_ID,
  DOCUMENT_ID,
  JobType.XML_EXTRACTION,
);

function buildJobSummary(overrides: Partial<JobSummary> = {}): JobSummary {
  return {
    id: DETERMINISTIC_JOB_ID,
    companyId: COMPANY_ID,
    documentId: DOCUMENT_ID,
    type: JobType.XML_EXTRACTION,
    status: JobStatus.QUEUED,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function buildService(
  overrides: {
    jobsRepository?: Partial<jest.Mocked<JobsRepository>>;
    jobsQueueAdapter?: Partial<jest.Mocked<JobsQueueAdapter>>;
  } = {},
) {
  const jobsRepository = {
    findOrCreateQueued: jest.fn().mockResolvedValue(buildJobSummary()),
    ...overrides.jobsRepository,
  } as unknown as jest.Mocked<JobsRepository>;

  const jobsQueueAdapter = {
    enqueueXmlExtraction: jest.fn().mockResolvedValue(undefined),
    ...overrides.jobsQueueAdapter,
  } as unknown as jest.Mocked<JobsQueueAdapter>;

  const service = new JobsService(jobsRepository, jobsQueueAdapter);

  return { service, jobsRepository, jobsQueueAdapter };
}

describe('JobsService', () => {
  describe('ensureXmlExtractionJob — flujo exitoso', () => {
    it('calcula el id determinista a partir de companyId + documentId + XML_EXTRACTION', async () => {
      const { service, jobsRepository } = buildService();

      await service.ensureXmlExtractionJob(COMPANY_ID, DOCUMENT_ID);

      expect(jobsRepository.findOrCreateQueued).toHaveBeenCalledWith({
        id: DETERMINISTIC_JOB_ID,
        companyId: COMPANY_ID,
        documentId: DOCUMENT_ID,
        type: JobType.XML_EXTRACTION,
      });
    });

    it('encola usando el id del Job persistido (nunca uno nuevo)', async () => {
      const persisted = buildJobSummary({ id: 'otro-id-recuperado' });
      const { service, jobsQueueAdapter } = buildService({
        jobsRepository: { findOrCreateQueued: jest.fn().mockResolvedValue(persisted) },
      });

      await service.ensureXmlExtractionJob(COMPANY_ID, DOCUMENT_ID);

      expect(jobsQueueAdapter.enqueueXmlExtraction).toHaveBeenCalledWith({
        jobId: 'otro-id-recuperado',
        documentId: DOCUMENT_ID,
        companyId: COMPANY_ID,
      });
    });

    it('el payload encolado nunca incluye datos ajenos a jobId/documentId/companyId', async () => {
      const { service, jobsQueueAdapter } = buildService();

      await service.ensureXmlExtractionJob(COMPANY_ID, DOCUMENT_ID);

      const payload = jobsQueueAdapter.enqueueXmlExtraction.mock.calls[0]![0];
      expect(Object.keys(payload).sort()).toEqual(['companyId', 'documentId', 'jobId']);
    });

    it('primero persiste, despues encola (nunca encola sin haber persistido)', async () => {
      const callOrder: string[] = [];
      const { service } = buildService({
        jobsRepository: {
          findOrCreateQueued: jest.fn().mockImplementation(async () => {
            callOrder.push('persist');
            return buildJobSummary();
          }),
        },
        jobsQueueAdapter: {
          enqueueXmlExtraction: jest.fn().mockImplementation(async () => {
            callOrder.push('enqueue');
          }),
        },
      });

      await service.ensureXmlExtractionJob(COMPANY_ID, DOCUMENT_ID);

      expect(callOrder).toEqual(['persist', 'enqueue']);
    });
  });

  describe('ensureXmlExtractionJob — fallos', () => {
    it('normaliza un fallo de persistencia a JobsError(JOBS_OPERATION_FAILED) sin filtrar el error crudo', async () => {
      const { service, jobsQueueAdapter } = buildService({
        jobsRepository: {
          findOrCreateQueued: jest.fn().mockRejectedValue(new Error('connection refused 5432')),
        },
      });

      const error = await service
        .ensureXmlExtractionJob(COMPANY_ID, DOCUMENT_ID)
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(JobsError);
      expect((error as JobsError).code).toBe('JOBS_OPERATION_FAILED');
      expect((error as JobsError).message).not.toContain('5432');
      expect(jobsQueueAdapter.enqueueXmlExtraction).not.toHaveBeenCalled();
    });

    it('propaga tal cual el JobsError lanzado por el adapter de cola (sin reenvolverlo)', async () => {
      const queueError = new JobsError('JOBS_DISABLED', 'deshabilitado');
      const { service } = buildService({
        jobsQueueAdapter: { enqueueXmlExtraction: jest.fn().mockRejectedValue(queueError) },
      });

      const error = await service
        .ensureXmlExtractionJob(COMPANY_ID, DOCUMENT_ID)
        .catch((caught: unknown) => caught);

      expect(error).toBe(queueError);
    });
  });
});
