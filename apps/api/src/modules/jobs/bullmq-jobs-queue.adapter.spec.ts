import type { Queue } from 'bullmq';

import { BullMqJobsQueueAdapter } from './bullmq-jobs-queue.adapter';
import { XML_EXTRACTION_JOB_NAME } from './jobs-queue.interface';

const PAYLOAD = {
  jobId: '11111111-1111-1111-1111-111111111111',
  documentId: '22222222-2222-2222-2222-222222222222',
  companyId: '33333333-3333-3333-3333-333333333333',
};

function buildAdapter(add: jest.Mock) {
  const queue = { add } as unknown as Queue;
  return new BullMqJobsQueueAdapter(queue);
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

    it('configura attempts: 3 y backoff exponencial', async () => {
      const add = jest.fn().mockResolvedValue(undefined);
      const adapter = buildAdapter(add);

      await adapter.enqueueXmlExtraction(PAYLOAD);

      const options = add.mock.calls[0]![2];
      expect(options.attempts).toBe(3);
      expect(options.backoff).toEqual({ type: 'exponential', delay: 1000 });
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
