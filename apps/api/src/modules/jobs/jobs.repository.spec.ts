import { prisma, Prisma, JobStatus, JobType } from '@contaia/database';

import { TransicionNoConfirmadaError } from '../cfdi/cfdi.errors';

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
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
    },
  };
});

/**
 * Mock minimo del `tx` de la Transaccion A (`E5-S2-T06`): mismo patron
 * establecido en `documents.repository.spec.ts` para
 * `DocumentsRepository.markAsProcessed`.
 */
function buildTx() {
  const mock = {
    job: {
      updateMany: jest.fn(),
    },
  };
  return { mock, tx: mock as unknown as Prisma.TransactionClient };
}

const JOB_ID = '978c6de1-ccbe-51ed-b0a3-e14453ca5cb7';
const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_COMPANY_ID = '22222222-2222-2222-2222-222222222222';
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
        expect.objectContaining({ where: { id: JOB_ID, companyId: COMPANY_ID } }),
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

  describe('findById — tenant-safe', () => {
    it('consulta por id y companyId en el mismo where', async () => {
      const job = buildJobRow();
      (prisma.job.findFirst as jest.Mock).mockResolvedValue(job);
      const repository = new JobsRepository();

      await repository.findById(JOB_ID, COMPANY_ID);

      expect(prisma.job.findFirst).toHaveBeenCalledWith({
        where: { id: JOB_ID, companyId: COMPANY_ID },
      });
    });

    it('retorna el resultado de Prisma tal cual', async () => {
      const job = buildJobRow();
      (prisma.job.findFirst as jest.Mock).mockResolvedValue(job);
      const repository = new JobsRepository();

      const result = await repository.findById(JOB_ID, COMPANY_ID);

      expect(result).toEqual(job);
    });

    it('nunca devuelve un Job de otra Empresa (aislamiento tenant-safe, BR-GLB-001)', async () => {
      // El mock simula el comportamiento real de Prisma: un companyId que no
      // coincide con el Job de ese id hace que `findFirst` no encuentre fila.
      (prisma.job.findFirst as jest.Mock).mockResolvedValue(null);
      const repository = new JobsRepository();

      const result = await repository.findById(JOB_ID, '99999999-9999-9999-9999-999999999999');

      expect(result).toBeNull();
      expect(prisma.job.findFirst).toHaveBeenCalledWith({
        where: { id: JOB_ID, companyId: '99999999-9999-9999-9999-999999999999' },
      });
    });

    it('propaga errores de Prisma sin capturarlos', async () => {
      const dbError = new Error('connection refused');
      (prisma.job.findFirst as jest.Mock).mockRejectedValue(dbError);
      const repository = new JobsRepository();

      await expect(repository.findById(JOB_ID, COMPANY_ID)).rejects.toThrow('connection refused');
    });
  });

  describe('markAsProcessing — reclamo inicial QUEUED|PROCESSING → PROCESSING', () => {
    it('usa updateMany (nunca update) con where={id, companyId, status IN [QUEUED, PROCESSING]}', async () => {
      (prisma.job.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      const repository = new JobsRepository();

      await repository.markAsProcessing(JOB_ID, COMPANY_ID);

      expect(prisma.job.updateMany).toHaveBeenCalledWith({
        where: { id: JOB_ID, companyId: COMPANY_ID, status: { in: ['QUEUED', 'PROCESSING'] } },
        data: { status: 'PROCESSING' },
      });
    });

    it('actualiza el status a PROCESSING', async () => {
      (prisma.job.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      const repository = new JobsRepository();

      await repository.markAsProcessing(JOB_ID, COMPANY_ID);

      const call = (prisma.job.updateMany as jest.Mock).mock.calls[0][0] as {
        data: { status: string };
      };
      expect(call.data.status).toBe('PROCESSING');
    });

    it('nunca lanza por count !== 1 — ningún criterio ni gate del Addendum lo exige para esta transición (solo para el cierre)', async () => {
      (prisma.job.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      const repository = new JobsRepository();

      await expect(repository.markAsProcessing(JOB_ID, COMPANY_ID)).resolves.toBe(0);
    });

    it('retorna el count real de Prisma para que la llamante decida, sin interpretarlo', async () => {
      (prisma.job.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      const repository = new JobsRepository();

      await expect(repository.markAsProcessing(JOB_ID, COMPANY_ID)).resolves.toBe(1);
    });

    it('nunca lanza por count > 1 y retorna el count real (H-T05-01: caso teóricamente imposible con PK, pero la política es no lanzar nunca aquí)', async () => {
      (prisma.job.updateMany as jest.Mock).mockResolvedValue({ count: 2 });
      const repository = new JobsRepository();

      await expect(repository.markAsProcessing(JOB_ID, COMPANY_ID)).resolves.toBe(2);
      expect(prisma.job.updateMany).toHaveBeenCalledWith({
        where: { id: JOB_ID, companyId: COMPANY_ID, status: { in: ['QUEUED', 'PROCESSING'] } },
        data: { status: 'PROCESSING' },
      });
    });

    it('propaga errores de Prisma sin capturarlos', async () => {
      const dbError = new Error('connection refused');
      (prisma.job.updateMany as jest.Mock).mockRejectedValue(dbError);
      const repository = new JobsRepository();

      await expect(repository.markAsProcessing(JOB_ID, COMPANY_ID)).rejects.toThrow(
        'connection refused',
      );
    });
  });

  describe('markAsCompleted — cierre exitoso QUEUED|PROCESSING → COMPLETED (Transacción A, E5-S2-T06)', () => {
    const RESULT_PAYLOAD = {
      resourceType: 'cfdi',
      resourceId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    };

    it('usa updateMany (nunca update) con where={id, companyId, status IN [QUEUED, PROCESSING]}', async () => {
      const { mock, tx } = buildTx();
      mock.job.updateMany.mockResolvedValue({ count: 1 });
      const repository = new JobsRepository();

      await repository.markAsCompleted(tx, JOB_ID, COMPANY_ID, RESULT_PAYLOAD);

      expect(mock.job.updateMany).toHaveBeenCalledWith({
        where: { id: JOB_ID, companyId: COMPANY_ID, status: { in: ['QUEUED', 'PROCESSING'] } },
        data: { status: 'COMPLETED', result: RESULT_PAYLOAD },
      });
    });

    it('actualiza status a COMPLETED y persiste result en la misma operación atómica', async () => {
      const { mock, tx } = buildTx();
      mock.job.updateMany.mockResolvedValue({ count: 1 });
      const repository = new JobsRepository();

      await repository.markAsCompleted(tx, JOB_ID, COMPANY_ID, RESULT_PAYLOAD);

      const call = mock.job.updateMany.mock.calls[0][0] as {
        data: { status: string; result: unknown };
      };
      expect(call.data.status).toBe('COMPLETED');
      expect(call.data.result).toEqual(RESULT_PAYLOAD);
    });

    it('retorna sin lanzar cuando count === 1', async () => {
      const { mock, tx } = buildTx();
      mock.job.updateMany.mockResolvedValue({ count: 1 });
      const repository = new JobsRepository();

      await expect(
        repository.markAsCompleted(tx, JOB_ID, COMPANY_ID, RESULT_PAYLOAD),
      ).resolves.toBeUndefined();
    });

    it('lanza TransicionNoConfirmadaError cuando count === 0 (otro worker ya cerró el Job)', async () => {
      const { mock, tx } = buildTx();
      mock.job.updateMany.mockResolvedValue({ count: 0 });
      const repository = new JobsRepository();

      await expect(
        repository.markAsCompleted(tx, JOB_ID, COMPANY_ID, RESULT_PAYLOAD),
      ).rejects.toBeInstanceOf(TransicionNoConfirmadaError);
    });

    it('lanza TransicionNoConfirmadaError cuando count > 1 (aserción explícita: imposible con PK pero detecta WHERE mal construido)', async () => {
      const { mock, tx } = buildTx();
      mock.job.updateMany.mockResolvedValue({ count: 2 });
      const repository = new JobsRepository();

      await expect(
        repository.markAsCompleted(tx, JOB_ID, COMPANY_ID, RESULT_PAYLOAD),
      ).rejects.toBeInstanceOf(TransicionNoConfirmadaError);
    });

    it('el error contiene recurso="job" y el count real para diagnóstico', async () => {
      const { mock, tx } = buildTx();
      mock.job.updateMany.mockResolvedValue({ count: 0 });
      const repository = new JobsRepository();

      await expect(
        repository.markAsCompleted(tx, JOB_ID, COMPANY_ID, RESULT_PAYLOAD),
      ).rejects.toMatchObject({ recurso: 'job', count: 0 });
    });

    it('no captura errores de Prisma — deben propagarse para permitir rollback total de la Transacción A', async () => {
      const { mock, tx } = buildTx();
      const dbError = new Error('connection refused');
      mock.job.updateMany.mockRejectedValue(dbError);
      const repository = new JobsRepository();

      await expect(
        repository.markAsCompleted(tx, JOB_ID, COMPANY_ID, RESULT_PAYLOAD),
      ).rejects.toThrow('connection refused');
    });
  });

  describe('markAsFailed — cierre por fallo QUEUED|PROCESSING → FAILED (Transacción C, idempotente)', () => {
    const ERROR_MESSAGE = 'PROCESSING_FAILED';

    it('usa updateMany (nunca update) con where={id, companyId, status IN [QUEUED, PROCESSING]}', async () => {
      (prisma.job.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      const repository = new JobsRepository();

      await repository.markAsFailed(JOB_ID, COMPANY_ID, ERROR_MESSAGE);

      expect(prisma.job.updateMany).toHaveBeenCalledWith({
        where: { id: JOB_ID, companyId: COMPANY_ID, status: { in: ['QUEUED', 'PROCESSING'] } },
        data: { status: 'FAILED', error: ERROR_MESSAGE },
      });
    });

    it('actualiza status a FAILED y persiste error', async () => {
      (prisma.job.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      const repository = new JobsRepository();

      await repository.markAsFailed(JOB_ID, COMPANY_ID, ERROR_MESSAGE);

      const call = (prisma.job.updateMany as jest.Mock).mock.calls[0][0] as {
        data: { status: string; error: string };
      };
      expect(call.data.status).toBe('FAILED');
      expect(call.data.error).toBe(ERROR_MESSAGE);
    });

    it('nunca lanza por count === 0 — no-op válido documentado (AD-4.2): la Transacción C puede ejecutarse dos veces (processor + handler terminal) y la segunda no debe fallar', async () => {
      (prisma.job.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      const repository = new JobsRepository();

      await expect(repository.markAsFailed(JOB_ID, COMPANY_ID, ERROR_MESSAGE)).resolves.toBe(0);
    });

    it('retorna el count real de Prisma para que la llamante lo registre si lo necesita', async () => {
      (prisma.job.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      const repository = new JobsRepository();

      await expect(repository.markAsFailed(JOB_ID, COMPANY_ID, ERROR_MESSAGE)).resolves.toBe(1);
    });

    it('nunca lanza por count > 1 y retorna el count real (H-T05-01: caso teóricamente imposible con PK, pero la política es no lanzar nunca aquí)', async () => {
      (prisma.job.updateMany as jest.Mock).mockResolvedValue({ count: 2 });
      const repository = new JobsRepository();

      await expect(repository.markAsFailed(JOB_ID, COMPANY_ID, ERROR_MESSAGE)).resolves.toBe(2);
      expect(prisma.job.updateMany).toHaveBeenCalledWith({
        where: { id: JOB_ID, companyId: COMPANY_ID, status: { in: ['QUEUED', 'PROCESSING'] } },
        data: { status: 'FAILED', error: ERROR_MESSAGE },
      });
    });

    it('propaga errores de Prisma sin capturarlos', async () => {
      const dbError = new Error('connection refused');
      (prisma.job.updateMany as jest.Mock).mockRejectedValue(dbError);
      const repository = new JobsRepository();

      await expect(repository.markAsFailed(JOB_ID, COMPANY_ID, ERROR_MESSAGE)).rejects.toThrow(
        'connection refused',
      );
    });
  });

  describe('aislamiento multi-tenant — intento de acceso cruzado entre empresas (BR-GLB-001, E5-S2-T08)', () => {
    it('findOrCreateQueued: la recuperación ante P2002 filtra por companyId — el Job de la Empresa A nunca se devuelve a una llamada de la Empresa B', async () => {
      (prisma.job.create as jest.Mock).mockRejectedValue(uniqueConstraintError());
      // El mock simula el comportamiento real de Prisma: el `id` determinista
      // colisionó (P2002), pero el `findUnique` filtrado por companyId=B no
      // encuentra ninguna fila porque el Job existente pertenece a la
      // Empresa A — nunca se "recupera" un Job ajeno.
      (prisma.job.findUnique as jest.Mock).mockResolvedValue(null);
      const repository = new JobsRepository();
      const dataForOtherCompany = { ...CREATE_DATA, companyId: OTHER_COMPANY_ID };

      const collisionError = uniqueConstraintError();
      (prisma.job.create as jest.Mock).mockRejectedValue(collisionError);

      await expect(repository.findOrCreateQueued(dataForOtherCompany)).rejects.toBe(collisionError);
      expect(prisma.job.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: JOB_ID, companyId: OTHER_COMPANY_ID } }),
      );
    });

    it('findById: el where.companyId enviado a Prisma es siempre el de la llamada, nunca el de otra Empresa', async () => {
      (prisma.job.findFirst as jest.Mock).mockResolvedValue(null);
      const repository = new JobsRepository();

      await repository.findById(JOB_ID, OTHER_COMPANY_ID);

      const call = (prisma.job.findFirst as jest.Mock).mock.calls[0][0] as {
        where: { companyId: string };
      };
      expect(call.where.companyId).toBe(OTHER_COMPANY_ID);
      expect(call.where.companyId).not.toBe(COMPANY_ID);
    });

    it('markAsProcessing: un Job de la Empresa A no transiciona al consultarlo con companyId de la Empresa B (count=0, sin lanzar)', async () => {
      // El Job real pertenece a COMPANY_ID; la llamada usa OTHER_COMPANY_ID —
      // el mock simula que Prisma no encuentra ninguna fila que cumpla ambas
      // condiciones del WHERE compuesto (id + companyId equivocado).
      (prisma.job.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      const repository = new JobsRepository();

      const result = await repository.markAsProcessing(JOB_ID, OTHER_COMPANY_ID);

      expect(result).toBe(0);
      expect(prisma.job.updateMany).toHaveBeenCalledWith({
        where: {
          id: JOB_ID,
          companyId: OTHER_COMPANY_ID,
          status: { in: ['QUEUED', 'PROCESSING'] },
        },
        data: { status: 'PROCESSING' },
      });
    });

    it('markAsCompleted: no confirma (ni lanza como éxito) un Job de la Empresa A usando el companyId de la Empresa B — lanza TransicionNoConfirmadaError', async () => {
      const { mock, tx } = buildTx();
      mock.job.updateMany.mockResolvedValue({ count: 0 });
      const repository = new JobsRepository();
      const resultPayload = {
        resourceType: 'cfdi',
        resourceId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      };

      await expect(
        repository.markAsCompleted(tx, JOB_ID, OTHER_COMPANY_ID, resultPayload),
      ).rejects.toBeInstanceOf(TransicionNoConfirmadaError);
      expect(mock.job.updateMany).toHaveBeenCalledWith({
        where: {
          id: JOB_ID,
          companyId: OTHER_COMPANY_ID,
          status: { in: ['QUEUED', 'PROCESSING'] },
        },
        data: { status: 'COMPLETED', result: resultPayload },
      });
    });

    it('markAsFailed: un Job de la Empresa A no se marca FAILED al invocarlo con companyId de la Empresa B (count=0, no-op sin lanzar)', async () => {
      (prisma.job.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      const repository = new JobsRepository();

      const result = await repository.markAsFailed(JOB_ID, OTHER_COMPANY_ID, 'PROCESSING_FAILED');

      expect(result).toBe(0);
      expect(prisma.job.updateMany).toHaveBeenCalledWith({
        where: {
          id: JOB_ID,
          companyId: OTHER_COMPANY_ID,
          status: { in: ['QUEUED', 'PROCESSING'] },
        },
        data: { status: 'FAILED', error: 'PROCESSING_FAILED' },
      });
    });
  });
});
