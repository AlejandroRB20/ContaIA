import { DisabledJobsQueueAdapter } from './disabled-jobs-queue.adapter';

describe('DisabledJobsQueueAdapter', () => {
  it('enqueueXmlExtraction falla con JOBS_DISABLED (nunca intenta conectarse)', async () => {
    const adapter = new DisabledJobsQueueAdapter();

    await expect(
      adapter.enqueueXmlExtraction({
        jobId: '11111111-1111-1111-1111-111111111111',
        documentId: '22222222-2222-2222-2222-222222222222',
        companyId: '33333333-3333-3333-3333-333333333333',
      }),
    ).rejects.toMatchObject({ code: 'JOBS_DISABLED' });
  });
});
