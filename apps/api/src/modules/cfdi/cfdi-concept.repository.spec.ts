import { Prisma, type CfdiConcept } from '@contaia/database';

import type { ExtractedConcept } from './cfdi-aggregate.types';
import { CfdiConceptRepository } from './cfdi-concept.repository';

const CFDI_ID = '55555555-5555-5555-5555-555555555555';
const COMPANY_ID = '11111111-1111-1111-1111-111111111111';

function buildConcept(overrides: Partial<ExtractedConcept> = {}): ExtractedConcept {
  return {
    position: 1,
    claveProdServ: '01010101',
    noIdentificacion: null,
    cantidad: '1.000000',
    claveUnidad: 'H87',
    unidad: null,
    descripcion: 'Servicio de consultoria',
    valorUnitario: '1000.000000',
    importe: '1000.000000',
    descuento: null,
    objetoImp: '02',
    taxes: [],
    ...overrides,
  };
}

function buildConceptRow(overrides: Partial<CfdiConcept> = {}): CfdiConcept {
  return {
    id: 'concept-1',
    companyId: COMPANY_ID,
    cfdiId: CFDI_ID,
    position: 1,
    claveProdServ: '01010101',
    noIdentificacion: null,
    cantidad: new Prisma.Decimal('1.000000'),
    claveUnidad: 'H87',
    unidad: null,
    descripcion: 'Servicio de consultoria',
    valorUnitario: new Prisma.Decimal('1000.000000'),
    importe: new Prisma.Decimal('1000.000000'),
    descuento: null,
    objetoImp: '02',
    createdAt: new Date('2026-07-01T12:00:00.000Z'),
    updatedAt: new Date('2026-07-01T12:00:00.000Z'),
    ...overrides,
  };
}

/** Mismo patron de mock de `tx` que `cfdi.repository.spec.ts`. */
function buildTx() {
  const mock = {
    cfdiConcept: {
      upsert: jest.fn(),
    },
  };
  return { mock, tx: mock as unknown as Prisma.TransactionClient };
}

describe('CfdiConceptRepository', () => {
  describe('upsertMany — un solo concepto', () => {
    it('persiste el concepto con upsert(), mapeando companyId, cfdiId y todos los campos', async () => {
      const { mock, tx } = buildTx();
      const created = buildConceptRow();
      mock.cfdiConcept.upsert.mockResolvedValue(created);
      const concept = buildConcept();
      const repository = new CfdiConceptRepository();

      const result = await repository.upsertMany(tx, CFDI_ID, COMPANY_ID, [concept]);

      expect(mock.cfdiConcept.upsert).toHaveBeenCalledTimes(1);
      expect(mock.cfdiConcept.upsert).toHaveBeenCalledWith({
        where: {
          companyId_cfdiId_position: {
            companyId: COMPANY_ID,
            cfdiId: CFDI_ID,
            position: concept.position,
          },
        },
        create: {
          companyId: COMPANY_ID,
          cfdiId: CFDI_ID,
          position: concept.position,
          claveProdServ: concept.claveProdServ,
          noIdentificacion: concept.noIdentificacion,
          cantidad: concept.cantidad,
          claveUnidad: concept.claveUnidad,
          unidad: concept.unidad,
          descripcion: concept.descripcion,
          valorUnitario: concept.valorUnitario,
          importe: concept.importe,
          descuento: concept.descuento,
          objetoImp: concept.objetoImp,
        },
        update: {
          claveProdServ: concept.claveProdServ,
          noIdentificacion: concept.noIdentificacion,
          cantidad: concept.cantidad,
          claveUnidad: concept.claveUnidad,
          unidad: concept.unidad,
          descripcion: concept.descripcion,
          valorUnitario: concept.valorUnitario,
          importe: concept.importe,
          descuento: concept.descuento,
          objetoImp: concept.objetoImp,
        },
      });
      expect(result).toEqual([created]);
    });

    it('pasa cantidad, valorUnitario e importe como cadenas decimales exactas, sin conversion', async () => {
      const { mock, tx } = buildTx();
      mock.cfdiConcept.upsert.mockResolvedValue(buildConceptRow());
      const concept = buildConcept({
        cantidad: '3.500000',
        valorUnitario: '199.990000',
        importe: '699.965000',
      });
      const repository = new CfdiConceptRepository();

      await repository.upsertMany(tx, CFDI_ID, COMPANY_ID, [concept]);

      const callArgs = mock.cfdiConcept.upsert.mock.calls[0][0] as {
        create: { cantidad: unknown; valorUnitario: unknown; importe: unknown };
      };
      expect(callArgs.create.cantidad).toBe('3.500000');
      expect(callArgs.create.valorUnitario).toBe('199.990000');
      expect(callArgs.create.importe).toBe('699.965000');
    });

    it('mapea noIdentificacion, unidad y descuento como null cuando el concepto no los tiene', async () => {
      const { mock, tx } = buildTx();
      mock.cfdiConcept.upsert.mockResolvedValue(buildConceptRow());
      const concept = buildConcept({ noIdentificacion: null, unidad: null, descuento: null });
      const repository = new CfdiConceptRepository();

      await repository.upsertMany(tx, CFDI_ID, COMPANY_ID, [concept]);

      const callArgs = mock.cfdiConcept.upsert.mock.calls[0][0] as {
        create: { noIdentificacion: unknown; unidad: unknown; descuento: unknown };
      };
      expect(callArgs.create.noIdentificacion).toBeNull();
      expect(callArgs.create.unidad).toBeNull();
      expect(callArgs.create.descuento).toBeNull();
    });

    it('mapea noIdentificacion, unidad y descuento con su valor real cuando el concepto los tiene', async () => {
      const { mock, tx } = buildTx();
      mock.cfdiConcept.upsert.mockResolvedValue(buildConceptRow());
      const concept = buildConcept({
        noIdentificacion: 'SKU-001',
        unidad: 'Hora',
        descuento: '50.000000',
      });
      const repository = new CfdiConceptRepository();

      await repository.upsertMany(tx, CFDI_ID, COMPANY_ID, [concept]);

      const callArgs = mock.cfdiConcept.upsert.mock.calls[0][0] as {
        create: { noIdentificacion: unknown; unidad: unknown; descuento: unknown };
      };
      expect(callArgs.create.noIdentificacion).toBe('SKU-001');
      expect(callArgs.create.unidad).toBe('Hora');
      expect(callArgs.create.descuento).toBe('50.000000');
    });

    it('no incluye escrituras anidadas de impuestos (taxes) en create ni en update', async () => {
      const { mock, tx } = buildTx();
      mock.cfdiConcept.upsert.mockResolvedValue(buildConceptRow());
      const concept = buildConcept();
      const repository = new CfdiConceptRepository();

      await repository.upsertMany(tx, CFDI_ID, COMPANY_ID, [concept]);

      const callArgs = mock.cfdiConcept.upsert.mock.calls[0][0] as {
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      };
      expect(callArgs.create).not.toHaveProperty('taxes');
      expect(callArgs.update).not.toHaveProperty('taxes');
    });
  });

  describe('upsertMany — multiples conceptos', () => {
    it('persiste cada concepto y retorna las filas en el mismo orden de entrada', async () => {
      const { mock, tx } = buildTx();
      const rowA = buildConceptRow({ id: 'concept-a', position: 1 });
      const rowB = buildConceptRow({ id: 'concept-b', position: 2 });
      const rowC = buildConceptRow({ id: 'concept-c', position: 3 });
      mock.cfdiConcept.upsert
        .mockResolvedValueOnce(rowA)
        .mockResolvedValueOnce(rowB)
        .mockResolvedValueOnce(rowC);
      const concepts = [
        buildConcept({ position: 1 }),
        buildConcept({ position: 2 }),
        buildConcept({ position: 3 }),
      ];
      const repository = new CfdiConceptRepository();

      const result = await repository.upsertMany(tx, CFDI_ID, COMPANY_ID, concepts);

      expect(mock.cfdiConcept.upsert).toHaveBeenCalledTimes(3);
      expect(result).toEqual([rowA, rowB, rowC]);
    });

    it('con cero conceptos, no llama a upsert y retorna un arreglo vacio', async () => {
      const { mock, tx } = buildTx();
      const repository = new CfdiConceptRepository();

      const result = await repository.upsertMany(tx, CFDI_ID, COMPANY_ID, []);

      expect(mock.cfdiConcept.upsert).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('propaga intacto un error de Prisma durante el upsert, sin envolverlo ni reemplazarlo', async () => {
      const { mock, tx } = buildTx();
      const prismaError = new Error('P2002: unique constraint violation (simulado)');
      mock.cfdiConcept.upsert.mockRejectedValue(prismaError);
      const concept = buildConcept();
      const repository = new CfdiConceptRepository();

      await expect(repository.upsertMany(tx, CFDI_ID, COMPANY_ID, [concept])).rejects.toBe(
        prismaError,
      );
    });
  });

  describe('aislamiento multi-tenant — intento de acceso cruzado entre empresas (BR-GLB-001, E5-S2-T08)', () => {
    const OTHER_COMPANY_ID = '22222222-2222-2222-2222-222222222222';

    it('el companyId real de la llamada viaja al where compuesto y a create — nunca el de otra Empresa', async () => {
      const { mock, tx } = buildTx();
      mock.cfdiConcept.upsert.mockResolvedValue(buildConceptRow({ companyId: OTHER_COMPANY_ID }));
      const concept = buildConcept();
      const repository = new CfdiConceptRepository();

      await repository.upsertMany(tx, CFDI_ID, OTHER_COMPANY_ID, [concept]);

      const callArgs = mock.cfdiConcept.upsert.mock.calls[0][0] as {
        where: { companyId_cfdiId_position: { companyId: string } };
        create: { companyId: string };
      };
      expect(callArgs.where.companyId_cfdiId_position.companyId).toBe(OTHER_COMPANY_ID);
      expect(callArgs.create.companyId).toBe(OTHER_COMPANY_ID);
      expect(callArgs.where.companyId_cfdiId_position.companyId).not.toBe(COMPANY_ID);
      expect(callArgs.create.companyId).not.toBe(COMPANY_ID);
    });

    it('llamadas independientes para dos Empresas sobre el mismo cfdiId conservan cada una su propio companyId, sin mezclarlos', async () => {
      const { mock, tx } = buildTx();
      mock.cfdiConcept.upsert
        .mockResolvedValueOnce(buildConceptRow({ companyId: COMPANY_ID }))
        .mockResolvedValueOnce(buildConceptRow({ companyId: OTHER_COMPANY_ID }));
      const concept = buildConcept();
      const repository = new CfdiConceptRepository();

      await repository.upsertMany(tx, CFDI_ID, COMPANY_ID, [concept]);
      await repository.upsertMany(tx, CFDI_ID, OTHER_COMPANY_ID, [concept]);

      const [firstCall, secondCall] = mock.cfdiConcept.upsert.mock.calls as Array<
        [{ create: { companyId: string } }]
      >;
      expect(firstCall?.[0].create.companyId).toBe(COMPANY_ID);
      expect(secondCall?.[0].create.companyId).toBe(OTHER_COMPANY_ID);
    });
  });
});
