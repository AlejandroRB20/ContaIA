import { prisma, Prisma, JobStatus, JobType } from '@contaia/database';

import { JobsRepository } from './jobs.repository';

// Mismo patron que s3-storage.adapter.spec.ts: el factory de jest.mock no
// referencia variables externas (evita el error de "out-of-scope variable"
// del hoisting de ts-jest) — crea sus propios jest.fn() y se configuran
// despues del import.
jest.mock('@contaia/database', () => {
  const actual = jest.requireActual('@contaia/database');
  return {
    ...actual,
    prisma: {
      job: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
    },
  };
});

const JOB_ID = '978c6de1-ccbe-51ed-b0a3-e14453ca5cb7';
const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const DOCUMENT_ID = '44444444-4444-4444-4444-444444444444';

const CREATE_DATA = {
  id: JOB_ID,
  companyId: COMPANY_ID,
  documentId: DOCUMENT_ID,
  type: JobType.XML_EXTRACTION,
};

function buildJobRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: JOB_ID,
    companyId: COMPANY_ID,
    documentId: DOCUMENT_ID,
    type: JobType.XML_EXTRACTION,
    status: JobStatus.QUEUED,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function uniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError(
    'Unique constraint failed on the fields: (`id`)',
    {
      code: 'P2002',
      clientVersion: 'test',
    },
  );
}

describe('JobsRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findOrCreateQueued — creacion', () => {
    it('crea el Job en estado QUEUED con el id determinista provisto', async () => {
      const created = buildJobRow();
      (prisma.job.create as jest.Mock).mockResolvedValue(created);
      const repository = new JobsRepository();

      const result = await repository.findOrCreateQueued(CREATE_DATA);

      expect(prisma.job.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: JOB_ID,
            companyId: COMPANY_ID,
            documentId: DOCUMENT_ID,
            type: JobType.XML_EXTRACTION,
            status: JobStatus.QUEUED,
          }),
        }),
      );
      expect(result).toEqual(created);
    });

    it('nunca consulta primero (create-then-catch, no find-first-then-create)', async () => {
      (prisma.job.create as jest.Mock).mockResolvedValue(buildJobRow());
      const repository = new JobsRepository();

      await repository.findOrCreateQueued(CREATE_DATA);

      expect(prisma.job.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('findOrCreateQueued — recuperacion ante colision (creacion concurrente / confirmacion repetida)', () => {
    it('ante P2002 (id ya existe), recupera y devuelve el Job existente en vez de fallar', async () => {
      const existing = buildJobRow();
      (prisma.job.create as jest.Mock).mockRejectedValue(uniqueConstraintError());
      (prisma.job.findUnique as jest.Mock).mockResolvedValue(existing);
      const repository = new JobsRepository();

      const result = await repository.findOrCreateQueued(CREATE_DATA);

      expect(prisma.job.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: JOB_ID } }),
      );
      expect(result).toEqual(existing);
    });

    it('dos llamadas concurrentes con el mismo (companyId, documentId, type) nunca producen dos Jobs distintos', async () => {
      const winner = buildJobRow();
      (prisma.job.create as jest.Mock)
        .mockResolvedValueOnce(winner)
        .mockRejectedValueOnce(uniqueConstraintError());
      (prisma.job.findUnique as jest.Mock).mockResolvedValue(winner);
      const repository = new JobsRepository();

      const [first, second] = await Promise.all([
        repository.findOrCreateQueued(CREATE_DATA),
        repository.findOrCreateQueued(CREATE_DATA),
      ]);

      expect(first.id).toBe(winner.id);
      expect(second.id).toBe(winner.id);
    });

    it('propaga cualquier otro error de Prisma sin tratarlo como colision', async () => {
      const dbError = new Error('connection refused');
      (prisma.job.create as jest.Mock).mockRejectedValue(dbError);
      const repository = new JobsRepository();

      await expect(repository.findOrCreateQueued(CREATE_DATA)).rejects.toThrow(
        'connection refused',
      );
      expect(prisma.job.findUnique).not.toHaveBeenCalled();
    });

    it('si la colision P2002 ocurre pero el Job no aparece al recuperarlo, relanza el error original', async () => {
      const collisionError = uniqueConstraintError();
      (prisma.job.create as jest.Mock).mockRejectedValue(collisionError);
      (prisma.job.findUnique as jest.Mock).mockResolvedValue(null);
      const repository = new JobsRepository();

      await expect(repository.findOrCreateQueued(CREATE_DATA)).rejects.toBe(collisionError);
    });
  });
});
