import { CfdiTaxScope, Prisma, type CfdiConcept, type CfdiTax } from '@contaia/database';

import type { ExtractedConcept, ExtractedTax } from './cfdi-aggregate.types';
import { CfdiTaxRepository } from './cfdi-tax.repository';
import { ViolacionDeInvarianteError } from './cfdi.errors';

const CFDI_ID = '55555555-5555-5555-5555-555555555555';
const COMPANY_ID = '11111111-1111-1111-1111-111111111111';

function buildTax(overrides: Partial<ExtractedTax> = {}): ExtractedTax {
  return {
    position: 1,
    type: 'TRANSFER',
    impuesto: '002',
    tipoFactor: 'Tasa',
    tasaOCuota: '0.160000',
    base: '1000.000000',
    importe: '160.000000',
    ...overrides,
  };
}

function buildTaxRow(overrides: Partial<CfdiTax> = {}): CfdiTax {
  return {
    id: 'tax-1',
    companyId: COMPANY_ID,
    cfdiId: CFDI_ID,
    cfdiConceptId: null,
    scope: CfdiTaxScope.CFDI,
    conceptSlot: 0,
    position: 1,
    type: 'TRANSFER',
    impuesto: '002',
    tipoFactor: 'Tasa',
    tasaOCuota: new Prisma.Decimal('0.160000'),
    base: new Prisma.Decimal('1000.000000'),
    importe: new Prisma.Decimal('160.000000'),
    createdAt: new Date('2026-07-01T12:00:00.000Z'),
    updatedAt: new Date('2026-07-01T12:00:00.000Z'),
    ...overrides,
  };
}

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
    cfdiTax: {
      upsert: jest.fn(),
    },
  };
  return { mock, tx: mock as unknown as Prisma.TransactionClient };
}

describe('CfdiTaxRepository', () => {
  describe('upsertComprobanteTaxes — impuestos de nivel comprobante', () => {
    it('persiste con scope CFDI, conceptSlot 0 y cfdiConceptId null, sin recibirlos del agregado', async () => {
      const { mock, tx } = buildTx();
      const created = buildTaxRow();
      mock.cfdiTax.upsert.mockResolvedValue(created);
      const tax = buildTax();
      const repository = new CfdiTaxRepository();

      const result = await repository.upsertComprobanteTaxes(tx, CFDI_ID, COMPANY_ID, [tax]);

      expect(mock.cfdiTax.upsert).toHaveBeenCalledWith({
        where: {
          companyId_cfdiId_conceptSlot_position: {
            companyId: COMPANY_ID,
            cfdiId: CFDI_ID,
            conceptSlot: 0,
            position: tax.position,
          },
        },
        create: {
          companyId: COMPANY_ID,
          cfdiId: CFDI_ID,
          cfdiConceptId: null,
          scope: CfdiTaxScope.CFDI,
          conceptSlot: 0,
          position: tax.position,
          type: tax.type,
          impuesto: tax.impuesto,
          tipoFactor: tax.tipoFactor,
          tasaOCuota: tax.tasaOCuota,
          base: tax.base,
          importe: tax.importe,
        },
        update: {
          cfdiConceptId: null,
          scope: CfdiTaxScope.CFDI,
          type: tax.type,
          impuesto: tax.impuesto,
          tipoFactor: tax.tipoFactor,
          tasaOCuota: tax.tasaOCuota,
          base: tax.base,
          importe: tax.importe,
        },
      });
      expect(result).toEqual([created]);
    });

    it('pasa tasaOCuota, base e importe como cadenas decimales exactas cuando estan presentes', async () => {
      const { mock, tx } = buildTx();
      mock.cfdiTax.upsert.mockResolvedValue(buildTaxRow());
      const tax = buildTax({ tasaOCuota: '0.080000', base: '500.000000', importe: '40.000000' });
      const repository = new CfdiTaxRepository();

      await repository.upsertComprobanteTaxes(tx, CFDI_ID, COMPANY_ID, [tax]);

      const callArgs = mock.cfdiTax.upsert.mock.calls[0][0] as {
        create: { tasaOCuota: unknown; base: unknown; importe: unknown };
      };
      expect(callArgs.create.tasaOCuota).toBe('0.080000');
      expect(callArgs.create.base).toBe('500.000000');
      expect(callArgs.create.importe).toBe('40.000000');
    });

    it('mapea tasaOCuota, base e importe como null cuando tipoFactor es Exento', async () => {
      const { mock, tx } = buildTx();
      mock.cfdiTax.upsert.mockResolvedValue(buildTaxRow());
      const tax = buildTax({
        tipoFactor: 'Exento',
        tasaOCuota: null,
        base: null,
        importe: null,
      });
      const repository = new CfdiTaxRepository();

      await repository.upsertComprobanteTaxes(tx, CFDI_ID, COMPANY_ID, [tax]);

      const callArgs = mock.cfdiTax.upsert.mock.calls[0][0] as {
        create: { tasaOCuota: unknown; base: unknown; importe: unknown };
      };
      expect(callArgs.create.tasaOCuota).toBeNull();
      expect(callArgs.create.base).toBeNull();
      expect(callArgs.create.importe).toBeNull();
    });

    it('mapea el enum type (TRANSFER/WITHHOLDING) sin transformarlo', async () => {
      const { mock, tx } = buildTx();
      mock.cfdiTax.upsert.mockResolvedValue(buildTaxRow({ type: 'WITHHOLDING' }));
      const tax = buildTax({ type: 'WITHHOLDING' });
      const repository = new CfdiTaxRepository();

      await repository.upsertComprobanteTaxes(tx, CFDI_ID, COMPANY_ID, [tax]);

      const callArgs = mock.cfdiTax.upsert.mock.calls[0][0] as { create: { type: unknown } };
      expect(callArgs.create.type).toBe('WITHHOLDING');
    });

    it('persiste multiples impuestos de comprobante y retorna las filas en el mismo orden de entrada', async () => {
      const { mock, tx } = buildTx();
      const rowA = buildTaxRow({ id: 'tax-a', position: 1 });
      const rowB = buildTaxRow({ id: 'tax-b', position: 2 });
      mock.cfdiTax.upsert.mockResolvedValueOnce(rowA).mockResolvedValueOnce(rowB);
      const taxes = [buildTax({ position: 1 }), buildTax({ position: 2 })];
      const repository = new CfdiTaxRepository();

      const result = await repository.upsertComprobanteTaxes(tx, CFDI_ID, COMPANY_ID, taxes);

      expect(mock.cfdiTax.upsert).toHaveBeenCalledTimes(2);
      expect(result).toEqual([rowA, rowB]);
    });
  });

  describe('upsertConceptTaxes — impuestos de nivel concepto', () => {
    it('deriva scope CONCEPT y conceptSlot de concept.position, y cfdiConceptId del CfdiConcept creado', async () => {
      const { mock, tx } = buildTx();
      const createdTax = buildTaxRow({ scope: CfdiTaxScope.CONCEPT, conceptSlot: 3 });
      mock.cfdiTax.upsert.mockResolvedValue(createdTax);
      const tax = buildTax({ position: 1 });
      const concept = buildConcept({ position: 3, taxes: [tax] });
      const createdConcept = buildConceptRow({ id: 'concept-real-id', position: 3 });
      const repository = new CfdiTaxRepository();

      const result = await repository.upsertConceptTaxes(
        tx,
        CFDI_ID,
        COMPANY_ID,
        [concept],
        [createdConcept],
      );

      expect(mock.cfdiTax.upsert).toHaveBeenCalledWith({
        where: {
          companyId_cfdiId_conceptSlot_position: {
            companyId: COMPANY_ID,
            cfdiId: CFDI_ID,
            conceptSlot: 3,
            position: tax.position,
          },
        },
        create: {
          companyId: COMPANY_ID,
          cfdiId: CFDI_ID,
          cfdiConceptId: 'concept-real-id',
          scope: CfdiTaxScope.CONCEPT,
          conceptSlot: 3,
          position: tax.position,
          type: tax.type,
          impuesto: tax.impuesto,
          tipoFactor: tax.tipoFactor,
          tasaOCuota: tax.tasaOCuota,
          base: tax.base,
          importe: tax.importe,
        },
        update: {
          cfdiConceptId: 'concept-real-id',
          scope: CfdiTaxScope.CONCEPT,
          type: tax.type,
          impuesto: tax.impuesto,
          tipoFactor: tax.tipoFactor,
          tasaOCuota: tax.tasaOCuota,
          base: tax.base,
          importe: tax.importe,
        },
      });
      expect(result).toEqual([createdTax]);
    });

    it('con varios conceptos, cada uno con varios impuestos, usa el conceptSlot y cfdiConceptId correctos de CADA concepto (posiciones reiniciadas por contenedor)', async () => {
      const { mock, tx } = buildTx();
      mock.cfdiTax.upsert.mockResolvedValue(buildTaxRow());
      const conceptA = buildConcept({
        position: 1,
        taxes: [buildTax({ position: 1 }), buildTax({ position: 2 })],
      });
      const conceptB = buildConcept({
        position: 2,
        taxes: [buildTax({ position: 1 })],
      });
      const createdConceptA = buildConceptRow({ id: 'concept-a-id', position: 1 });
      const createdConceptB = buildConceptRow({ id: 'concept-b-id', position: 2 });
      const repository = new CfdiTaxRepository();

      await repository.upsertConceptTaxes(
        tx,
        CFDI_ID,
        COMPANY_ID,
        [conceptA, conceptB],
        [createdConceptA, createdConceptB],
      );

      expect(mock.cfdiTax.upsert).toHaveBeenCalledTimes(3);
      type UpsertCall = [
        { create: { conceptSlot: number; position: number; cfdiConceptId: string } },
      ];
      const [first, second, third] = mock.cfdiTax.upsert.mock.calls as UpsertCall[];
      if (!first || !second || !third) {
        throw new Error('Se esperaban exactamente 3 llamadas a cfdiTax.upsert.');
      }
      // Los dos impuestos del concepto A comparten conceptSlot=1 (position del concepto A)
      // y reinician su propia posicion 1..n; el impuesto del concepto B tiene
      // conceptSlot=2 y su posicion vuelve a empezar en 1 dentro de su propio contenedor.
      expect(first[0].create).toMatchObject({
        conceptSlot: 1,
        position: 1,
        cfdiConceptId: 'concept-a-id',
      });
      expect(second[0].create).toMatchObject({
        conceptSlot: 1,
        position: 2,
        cfdiConceptId: 'concept-a-id',
      });
      expect(third[0].create).toMatchObject({
        conceptSlot: 2,
        position: 1,
        cfdiConceptId: 'concept-b-id',
      });
    });

    it('lanza ViolacionDeInvarianteError y no llama a upsert si concepts y createdConcepts tienen longitudes distintas', async () => {
      const { mock, tx } = buildTx();
      const concept = buildConcept({ position: 1, taxes: [buildTax()] });
      const repository = new CfdiTaxRepository();

      await expect(
        repository.upsertConceptTaxes(tx, CFDI_ID, COMPANY_ID, [concept], []),
      ).rejects.toBeInstanceOf(ViolacionDeInvarianteError);
      await expect(
        repository.upsertConceptTaxes(tx, CFDI_ID, COMPANY_ID, [concept], []),
      ).rejects.toThrow(/misma longitud/);

      expect(mock.cfdiTax.upsert).not.toHaveBeenCalled();
    });

    it('lanza ViolacionDeInvarianteError y no llama a upsert cuando createdConcepts trae las posiciones invertidas respecto a concepts (H-T03-01)', async () => {
      const { mock, tx } = buildTx();
      const conceptA = buildConcept({ position: 1, taxes: [buildTax()] });
      const conceptB = buildConcept({ position: 2, taxes: [buildTax()] });
      // Misma longitud (2) que concepts, pero en orden invertido: el indice 0
      // trae el concepto real de position=2 y el indice 1 trae el de
      // position=1 — exactamente el defecto que H-T03-01 exige rechazar.
      const createdConceptPosition2 = buildConceptRow({ id: 'concept-2', position: 2 });
      const createdConceptPosition1 = buildConceptRow({ id: 'concept-1', position: 1 });
      const repository = new CfdiTaxRepository();

      await expect(
        repository.upsertConceptTaxes(
          tx,
          CFDI_ID,
          COMPANY_ID,
          [conceptA, conceptB],
          [createdConceptPosition2, createdConceptPosition1],
        ),
      ).rejects.toBeInstanceOf(ViolacionDeInvarianteError);
      await expect(
        repository.upsertConceptTaxes(
          tx,
          CFDI_ID,
          COMPANY_ID,
          [conceptA, conceptB],
          [createdConceptPosition2, createdConceptPosition1],
        ),
      ).rejects.toThrow(/createdConcepts\[0\].*position=2.*concepts\[0\].*position=1/s);

      expect(mock.cfdiTax.upsert).not.toHaveBeenCalled();
    });

    it('rechaza sin ejecutar ningun upsert cuando solo el ultimo par diverge, aunque los anteriores si correspondan', async () => {
      // source positions: [1, 2] — persisted positions: [1, 3]. El primer
      // par (1,1) por si solo seria valido, pero la validacion completa debe
      // agotarse ANTES de la primera escritura: cero upserts, ni siquiera el
      // del primer concepto.
      const { mock, tx } = buildTx();
      const conceptA = buildConcept({ position: 1, taxes: [buildTax()] });
      const conceptB = buildConcept({ position: 2, taxes: [buildTax()] });
      const createdConceptA = buildConceptRow({ id: 'concept-a', position: 1 });
      const createdConceptWrong = buildConceptRow({ id: 'concept-wrong', position: 3 });
      const repository = new CfdiTaxRepository();

      await expect(
        repository.upsertConceptTaxes(
          tx,
          CFDI_ID,
          COMPANY_ID,
          [conceptA, conceptB],
          [createdConceptA, createdConceptWrong],
        ),
      ).rejects.toBeInstanceOf(ViolacionDeInvarianteError);

      expect(mock.cfdiTax.upsert).not.toHaveBeenCalled();
    });

    it('propaga intacto un error de Prisma durante el upsert de impuestos de concepto, sin envolverlo ni reemplazarlo', async () => {
      const { mock, tx } = buildTx();
      const prismaError = new Error('P2002: unique constraint violation (simulado)');
      mock.cfdiTax.upsert.mockRejectedValue(prismaError);
      const tax = buildTax({ position: 1 });
      const concept = buildConcept({ position: 1, taxes: [tax] });
      const createdConcept = buildConceptRow({ id: 'concept-1', position: 1 });
      const repository = new CfdiTaxRepository();

      await expect(
        repository.upsertConceptTaxes(tx, CFDI_ID, COMPANY_ID, [concept], [createdConcept]),
      ).rejects.toBe(prismaError);
    });

    it('con un concepto sin impuestos, no llama a upsert para ese concepto', async () => {
      const { mock, tx } = buildTx();
      const concept = buildConcept({ position: 1, taxes: [] });
      const createdConcept = buildConceptRow({ id: 'concept-sin-impuestos', position: 1 });
      const repository = new CfdiTaxRepository();

      const result = await repository.upsertConceptTaxes(
        tx,
        CFDI_ID,
        COMPANY_ID,
        [concept],
        [createdConcept],
      );

      expect(mock.cfdiTax.upsert).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('aislamiento multi-tenant — intento de acceso cruzado entre empresas (BR-GLB-001, E5-S2-T08)', () => {
    const OTHER_COMPANY_ID = '22222222-2222-2222-2222-222222222222';

    it('upsertComprobanteTaxes: el companyId real de la llamada viaja al where compuesto y a create — nunca el de otra Empresa', async () => {
      const { mock, tx } = buildTx();
      mock.cfdiTax.upsert.mockResolvedValue(buildTaxRow({ companyId: OTHER_COMPANY_ID }));
      const tax = buildTax();
      const repository = new CfdiTaxRepository();

      await repository.upsertComprobanteTaxes(tx, CFDI_ID, OTHER_COMPANY_ID, [tax]);

      const callArgs = mock.cfdiTax.upsert.mock.calls[0][0] as {
        where: { companyId_cfdiId_conceptSlot_position: { companyId: string } };
        create: { companyId: string };
      };
      expect(callArgs.where.companyId_cfdiId_conceptSlot_position.companyId).toBe(OTHER_COMPANY_ID);
      expect(callArgs.create.companyId).toBe(OTHER_COMPANY_ID);
      expect(callArgs.create.companyId).not.toBe(COMPANY_ID);
    });

    it('upsertConceptTaxes: el companyId real de la llamada viaja al where compuesto y a create — nunca el de otra Empresa', async () => {
      const { mock, tx } = buildTx();
      mock.cfdiTax.upsert.mockResolvedValue(buildTaxRow({ companyId: OTHER_COMPANY_ID }));
      const tax = buildTax({ position: 1 });
      const concept = buildConcept({ position: 1, taxes: [tax] });
      const createdConcept = buildConceptRow({
        id: 'concept-empresa-b',
        companyId: OTHER_COMPANY_ID,
        position: 1,
      });
      const repository = new CfdiTaxRepository();

      await repository.upsertConceptTaxes(
        tx,
        CFDI_ID,
        OTHER_COMPANY_ID,
        [concept],
        [createdConcept],
      );

      const callArgs = mock.cfdiTax.upsert.mock.calls[0][0] as {
        where: { companyId_cfdiId_conceptSlot_position: { companyId: string } };
        create: { companyId: string; cfdiConceptId: string };
      };
      expect(callArgs.where.companyId_cfdiId_conceptSlot_position.companyId).toBe(OTHER_COMPANY_ID);
      expect(callArgs.create.companyId).toBe(OTHER_COMPANY_ID);
      // cfdiConceptId proviene del CfdiConcept ya persistido para ESA Empresa
      // en esta misma transacción — nunca de un concepto de otra Empresa.
      expect(callArgs.create.cfdiConceptId).toBe('concept-empresa-b');
    });
  });
});
