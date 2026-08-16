import type { Queue } from 'bullmq';

import { BullMqJobsQueueAdapter } from './bullmq-jobs-queue.adapter';
import { XML_EXTRACTION_JOB_NAME } from './jobs-queue.interface';

const PAYLOAD = {
  jobId: '11111111-1111-1111-1111-111111111111',
  documentId: '22222222-2222-2222-2222-222222222222',
  companyId: '33333333-3333-3333-3333-333333333333',
};

const DEFAULT_CONFIG = { attempts: 3, backoffDelayMs: 5000 };

function buildAdapter(add: jest.Mock, config = DEFAULT_CONFIG) {
  const queue = { add } as unknown as Queue;
  return new BullMqJobsQueueAdapter(queue, config);
}

describe('BullMqJobsQueueAdapter', () => {
  describe('enqueueXmlExtraction', () => {
    it('encola con el nombre de job, jobId determinista y payload minimo', async () => {
      const add = jest.fn().mockResolvedValue(undefined);
      const adapter = buildAdapter(add);

      await adapter.enqueueXmlExtraction(PAYLOAD);

      expect(add).toHaveBeenCalledWith(
        XML_EXTRACTION_JOB_NAME,
        PAYLOAD,
        expect.objectContaining({ jobId: PAYLOAD.jobId }),
      );
    });

    it('configura attempts y backoff exponencial a partir de la configuracion central (JOBS_ATTEMPTS/JOBS_BACKOFF_DELAY_MS)', async () => {
      const add = jest.fn().mockResolvedValue(undefined);
      const adapter = buildAdapter(add);

      await adapter.enqueueXmlExtraction(PAYLOAD);

      const options = add.mock.calls[0]![2];
      expect(options.attempts).toBe(3);
      expect(options.backoff).toEqual({ type: 'exponential', delay: 5000 });
    });

    it('nunca declara un default propio: un valor distinto de configuracion cambia lo que se encola', async () => {
      const add = jest.fn().mockResolvedValue(undefined);
      const adapter = buildAdapter(add, { attempts: 7, backoffDelayMs: 12345 });

      await adapter.enqueueXmlExtraction(PAYLOAD);

      const options = add.mock.calls[0]![2];
      expect(options.attempts).toBe(7);
      expect(options.backoff).toEqual({ type: 'exponential', delay: 12345 });
    });

    it('el payload enviado a BullMQ nunca incluye mas campos que jobId/documentId/companyId', async () => {
      const add = jest.fn().mockResolvedValue(undefined);
      const adapter = buildAdapter(add);

      await adapter.enqueueXmlExtraction(PAYLOAD);

      const sentPayload = add.mock.calls[0]![1];
      expect(Object.keys(sentPayload).sort()).toEqual(['companyId', 'documentId', 'jobId']);
    });

    it('normaliza cualquier error de BullMQ/Redis a JOBS_OPERATION_FAILED sin filtrar el detalle crudo', async () => {
      const add = jest.fn().mockRejectedValue(new Error('connect ETIMEDOUT 127.0.0.1:6379'));
      const adapter = buildAdapter(add);

      const error = await adapter.enqueueXmlExtraction(PAYLOAD).catch((caught: unknown) => caught);

      expect(error).toMatchObject({ code: 'JOBS_OPERATION_FAILED' });
      expect((error as Error).message).not.toContain('6379');
      expect((error as Error).message).not.toContain('ETIMEDOUT');
    });
  });
});
