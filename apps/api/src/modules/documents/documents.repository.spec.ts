import { prisma, type Prisma } from '@contaia/database';

import { TransicionNoConfirmadaError } from '../cfdi/cfdi.errors';

import { DocumentsRepository, type CreateDocumentData } from './documents.repository';

// Mismo patron que jobs.repository.spec.ts/persist-cfdi-aggregate.spec.ts: el
// factory de jest.mock no referencia variables externas (evita el error de
// "out-of-scope variable" del hoisting de ts-jest). markAsProcessed (arriba)
// no usa este mock — recibe su propio `tx` como parametro explicito; los
// metodos de Bloques A/B/C (abajo) usan el cliente `prisma` global.
jest.mock('@contaia/database', () => {
  const actual = jest.requireActual('@contaia/database');
  return {
    ...actual,
    prisma: {
      document: {
        create: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
    },
  };
});

const DOCUMENT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const CHECKSUM = 'abc123def456abc123def456abc123def456abc123def456abc123def456abc12345';

const DOCUMENT_SUMMARY_SELECT = {
  id: true,
  companyId: true,
  originalFilename: true,
  fileType: true,
  mimeType: true,
  sizeBytes: true,
  storageReference: true,
  status: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Mock mínimo del `tx` de la Transacción A (`E5-S2-T06`): únicamente el
 * subconjunto de `Prisma.TransactionClient` que
 * `DocumentsRepository.markAsProcessed` usa. `tx` se pasa al repositorio
 * via `as unknown as Prisma.TransactionClient` (mismo patrón establecido en
 * el proyecto, ver `cfdi.repository.spec.ts`); `mock` conserva el tipo de
 * `jest.Mock` para configurar y asertir cada llamada sin cast adicional.
 */
function buildTx() {
  const mock = {
    document: {
      updateMany: jest.fn(),
    },
  };
  return { mock, tx: mock as unknown as Prisma.TransactionClient };
}

describe('DocumentsRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('markAsProcessed — transición terminal PROCESSING → PROCESSED', () => {
    it('llama a updateMany con where={id, companyId, status:PROCESSING} y data={status:PROCESSED, checksumSha256}', async () => {
      const { mock, tx } = buildTx();
      mock.document.updateMany.mockResolvedValue({ count: 1 });
      const repository = new DocumentsRepository();

      await repository.markAsProcessed(tx, DOCUMENT_ID, COMPANY_ID, CHECKSUM);

      expect(mock.document.updateMany).toHaveBeenCalledWith({
        where: { id: DOCUMENT_ID, companyId: COMPANY_ID, status: 'PROCESSING' },
        data: { status: 'PROCESSED', checksumSha256: CHECKSUM },
      });
    });

    it('retorna sin lanzar cuando count === 1 (transición exitosa)', async () => {
      const { mock, tx } = buildTx();
      mock.document.updateMany.mockResolvedValue({ count: 1 });
      const repository = new DocumentsRepository();

      await expect(
        repository.markAsProcessed(tx, DOCUMENT_ID, COMPANY_ID, CHECKSUM),
      ).resolves.toBeUndefined();
    });

    it('lanza TransicionNoConfirmadaError cuando count === 0 (Document ya cerrado por otro worker)', async () => {
      const { mock, tx } = buildTx();
      mock.document.updateMany.mockResolvedValue({ count: 0 });
      const repository = new DocumentsRepository();

      await expect(
        repository.markAsProcessed(tx, DOCUMENT_ID, COMPANY_ID, CHECKSUM),
      ).rejects.toBeInstanceOf(TransicionNoConfirmadaError);
    });

    it('lanza TransicionNoConfirmadaError cuando count > 1 (aserción explícita: imposible con PK pero detecta WHERE mal construido)', async () => {
      const { mock, tx } = buildTx();
      mock.document.updateMany.mockResolvedValue({ count: 2 });
      const repository = new DocumentsRepository();

      await expect(
        repository.markAsProcessed(tx, DOCUMENT_ID, COMPANY_ID, CHECKSUM),
      ).rejects.toBeInstanceOf(TransicionNoConfirmadaError);
    });

    it('el error incluye el recurso "document" y el count real para diagnóstico', async () => {
      const { mock, tx } = buildTx();
      mock.document.updateMany.mockResolvedValue({ count: 0 });
      const repository = new DocumentsRepository();

      await expect(
        repository.markAsProcessed(tx, DOCUMENT_ID, COMPANY_ID, CHECKSUM),
      ).rejects.toMatchObject({ recurso: 'document', count: 0 });
    });

    it('incluye companyId en el where para garantizar aislamiento multi-tenant (BR-GLB-001)', async () => {
      const { mock, tx } = buildTx();
      mock.document.updateMany.mockResolvedValue({ count: 1 });
      const repository = new DocumentsRepository();

      await repository.markAsProcessed(tx, DOCUMENT_ID, COMPANY_ID, CHECKSUM);

      const callWhere = (
        mock.document.updateMany.mock.calls[0][0] as { where: { companyId: string } }
      ).where;
      expect(callWhere.companyId).toBe(COMPANY_ID);
    });

    it('incluye status:"PROCESSING" en el where — solo puede transicionar un Document que ya está en PROCESSING', async () => {
      const { mock, tx } = buildTx();
      mock.document.updateMany.mockResolvedValue({ count: 1 });
      const repository = new DocumentsRepository();

      await repository.markAsProcessed(tx, DOCUMENT_ID, COMPANY_ID, CHECKSUM);

      const callWhere = (mock.document.updateMany.mock.calls[0][0] as { where: { status: string } })
        .where;
      expect(callWhere.status).toBe('PROCESSING');
    });

    it('persiste checksumSha256 en el mismo updateMany, en la misma operación atómica que la transición', async () => {
      const { mock, tx } = buildTx();
      mock.document.updateMany.mockResolvedValue({ count: 1 });
      const repository = new DocumentsRepository();

      await repository.markAsProcessed(tx, DOCUMENT_ID, COMPANY_ID, CHECKSUM);

      const callData = (
        mock.document.updateMany.mock.calls[0][0] as { data: { checksumSha256: string } }
      ).data;
      expect(callData.checksumSha256).toBe(CHECKSUM);
    });
  });

  describe('aislamiento multi-tenant — intento de acceso cruzado entre empresas (BR-GLB-001, E5-S2-T08)', () => {
    const OTHER_COMPANY_ID = '22222222-2222-2222-2222-222222222222';

    it('markAsProcessed no confirma un Document perteneciente a otra Empresa (count=0, TransicionNoConfirmadaError)', async () => {
      // El Document real pertenece a COMPANY_ID; la llamada usa
      // OTHER_COMPANY_ID — el mock simula que Prisma no encuentra ninguna
      // fila que cumpla el WHERE compuesto (id + companyId equivocado +
      // status=PROCESSING), exactamente el comportamiento real de un
      // updateMany con un companyId que no corresponde al dueño real.
      const { mock, tx } = buildTx();
      mock.document.updateMany.mockResolvedValue({ count: 0 });
      const repository = new DocumentsRepository();

      await expect(
        repository.markAsProcessed(tx, DOCUMENT_ID, OTHER_COMPANY_ID, CHECKSUM),
      ).rejects.toBeInstanceOf(TransicionNoConfirmadaError);

      const callWhere = (
        mock.document.updateMany.mock.calls[0][0] as { where: { companyId: string } }
      ).where;
      expect(callWhere.companyId).toBe(OTHER_COMPANY_ID);
      expect(callWhere.companyId).not.toBe(COMPANY_ID);
    });

    it('markAsProcessed nunca sustituye el companyId de la llamada por otro — el where enviado a Prisma es siempre el real', async () => {
      const { mock, tx } = buildTx();
      mock.document.updateMany.mockResolvedValue({ count: 1 });
      const repository = new DocumentsRepository();

      await repository.markAsProcessed(tx, DOCUMENT_ID, OTHER_COMPANY_ID, CHECKSUM);

      expect(mock.document.updateMany).toHaveBeenCalledWith({
        where: { id: DOCUMENT_ID, companyId: OTHER_COMPANY_ID, status: 'PROCESSING' },
        data: { status: 'PROCESSED', checksumSha256: CHECKSUM },
      });
    });
  });

  describe('create — Bloque A: alta inicial en PENDING_UPLOAD', () => {
    const CREATE_DATA: CreateDocumentData = {
      id: DOCUMENT_ID,
      companyId: COMPANY_ID,
      uploadedByUserId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      originalFilename: 'factura.xml',
      fileType: 'XML',
      mimeType: 'application/xml',
      storageReference: 'documents/aaaaaaaa/factura.xml',
    };

    it('llama a prisma.document.create con status:PENDING_UPLOAD forzado, sin aceptarlo del llamante', async () => {
      const created = { ...CREATE_DATA, status: 'PENDING_UPLOAD' };
      (prisma.document.create as jest.Mock).mockResolvedValue(created);
      const repository = new DocumentsRepository();

      const result = await repository.create(CREATE_DATA);

      expect(prisma.document.create).toHaveBeenCalledWith({
        data: {
          id: CREATE_DATA.id,
          companyId: CREATE_DATA.companyId,
          uploadedByUserId: CREATE_DATA.uploadedByUserId,
          originalFilename: CREATE_DATA.originalFilename,
          fileType: CREATE_DATA.fileType,
          mimeType: CREATE_DATA.mimeType,
          storageReference: CREATE_DATA.storageReference,
          status: 'PENDING_UPLOAD',
        },
      });
      expect(result).toBe(created);
    });

    it('propaga intacto un error de Prisma sin envolverlo ni transformarlo', async () => {
      const prismaError = new Error('connection refused (simulado)');
      (prisma.document.create as jest.Mock).mockRejectedValue(prismaError);
      const repository = new DocumentsRepository();

      await expect(repository.create(CREATE_DATA)).rejects.toBe(prismaError);
    });
  });

  describe('deleteCreatedDocument — compensación tenant-safe (Bloque A)', () => {
    it('llama a deleteMany con where={id, companyId} — nunca solo por id', async () => {
      (prisma.document.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      const repository = new DocumentsRepository();

      await repository.deleteCreatedDocument(DOCUMENT_ID, COMPANY_ID);

      expect(prisma.document.deleteMany).toHaveBeenCalledWith({
        where: { id: DOCUMENT_ID, companyId: COMPANY_ID },
      });
    });

    it('no lanza cuando count===0 (el registro ya no existía) — deleteMany nunca lanza "no encontrado"', async () => {
      (prisma.document.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      const repository = new DocumentsRepository();

      await expect(
        repository.deleteCreatedDocument(DOCUMENT_ID, COMPANY_ID),
      ).resolves.toBeUndefined();
    });
  });

  describe('findManyByCompany — listado paginado tenant-safe (Bloque B)', () => {
    it('llama a findMany con where/select/orderBy/skip/take exactos — companyId siempre obligatorio', async () => {
      const rows = [{ id: DOCUMENT_ID }];
      (prisma.document.findMany as jest.Mock).mockResolvedValue(rows);
      const repository = new DocumentsRepository();

      const result = await repository.findManyByCompany(
        COMPANY_ID,
        { status: 'PROCESSED', fileType: 'XML' },
        { skip: 20, take: 10 },
      );

      expect(prisma.document.findMany).toHaveBeenCalledWith({
        where: { companyId: COMPANY_ID, status: 'PROCESSED', fileType: 'XML' },
        select: DOCUMENT_SUMMARY_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 20,
        take: 10,
      });
      expect(result).toBe(rows);
    });

    it('el orden (createdAt DESC, id DESC) es fijo — el cliente no puede elegir otro (API-0024)', async () => {
      (prisma.document.findMany as jest.Mock).mockResolvedValue([]);
      const repository = new DocumentsRepository();

      await repository.findManyByCompany(COMPANY_ID, {}, { skip: 0, take: 20 });

      const callArgs = (prisma.document.findMany as jest.Mock).mock.calls[0][0] as {
        orderBy: unknown;
      };
      expect(callArgs.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
    });
  });

  describe('countByCompany — conteo tenant-safe para paginación (Bloque B)', () => {
    it('llama a count con el mismo where (companyId + filtros) que findManyByCompany', async () => {
      (prisma.document.count as jest.Mock).mockResolvedValue(42);
      const repository = new DocumentsRepository();

      const result = await repository.countByCompany(COMPANY_ID, {
        status: 'PROCESSED',
        fileType: 'XML',
      });

      expect(prisma.document.count).toHaveBeenCalledWith({
        where: { companyId: COMPANY_ID, status: 'PROCESSED', fileType: 'XML' },
      });
      expect(result).toBe(42);
    });
  });

  describe('findById — resolución de companyId para la ruta plana API-0025 (Bloque B)', () => {
    it('llama a findUnique SIN companyId en el where — contrato deliberado, no un olvido', async () => {
      // Excepción documentada desde E5-S2-T08 (BR-GLB-001): este método existe
      // exclusivamente para que el service descubra el companyId real del
      // Document ANTES de invocar DocumentsAuthorizationService.assertHasPermission
      // — la autorización vive en esa capa superior, no aquí. No se agrega
      // companyId a este where: hacerlo rompería el propio propósito del
      // método (resolver la Empresa cuando el llamante todavía no la conoce).
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(null);
      const repository = new DocumentsRepository();

      await repository.findById(DOCUMENT_ID);

      expect(prisma.document.findUnique).toHaveBeenCalledWith({
        where: { id: DOCUMENT_ID },
        select: DOCUMENT_SUMMARY_SELECT,
      });
    });

    it('retorna null cuando Prisma no encuentra el Document — sin lanzar', async () => {
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(null);
      const repository = new DocumentsRepository();

      await expect(repository.findById(DOCUMENT_ID)).resolves.toBeNull();
    });

    it('retorna el DocumentSummary tal cual cuando Prisma lo encuentra', async () => {
      const found = { id: DOCUMENT_ID, companyId: COMPANY_ID };
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(found);
      const repository = new DocumentsRepository();

      await expect(repository.findById(DOCUMENT_ID)).resolves.toBe(found);
    });
  });

  describe('confirmUpload — transición condicional PENDING_UPLOAD → PROCESSING (Bloque C)', () => {
    it('llama a updateMany (nunca update) con where={id, companyId, status:PENDING_UPLOAD} y data={status:PROCESSING, sizeBytes}', async () => {
      (prisma.document.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      const repository = new DocumentsRepository();

      await repository.confirmUpload(DOCUMENT_ID, COMPANY_ID, 2048);

      expect(prisma.document.updateMany).toHaveBeenCalledWith({
        where: { id: DOCUMENT_ID, companyId: COMPANY_ID, status: 'PENDING_UPLOAD' },
        data: { status: 'PROCESSING', sizeBytes: 2048 },
      });
    });

    it('retorna true cuando count > 0 (transición ganada)', async () => {
      (prisma.document.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      const repository = new DocumentsRepository();

      await expect(repository.confirmUpload(DOCUMENT_ID, COMPANY_ID, 2048)).resolves.toBe(true);
    });

    it('retorna false cuando count === 0 (ya confirmado antes, o carrera perdida) — sin lanzar', async () => {
      (prisma.document.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      const repository = new DocumentsRepository();

      await expect(repository.confirmUpload(DOCUMENT_ID, COMPANY_ID, 2048)).resolves.toBe(false);
    });

    it('propaga intacto un error de Prisma sin envolverlo ni transformarlo', async () => {
      const prismaError = new Error('connection refused (simulado)');
      (prisma.document.updateMany as jest.Mock).mockRejectedValue(prismaError);
      const repository = new DocumentsRepository();

      await expect(repository.confirmUpload(DOCUMENT_ID, COMPANY_ID, 2048)).rejects.toBe(
        prismaError,
      );
    });
  });
});
