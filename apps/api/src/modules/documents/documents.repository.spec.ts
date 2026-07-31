import type { Prisma } from '@contaia/database';

import { TransicionNoConfirmadaError } from '../cfdi/cfdi.errors';

import { DocumentsRepository } from './documents.repository';

const DOCUMENT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const CHECKSUM = 'abc123def456abc123def456abc123def456abc123def456abc123def456abc12345';

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
});
