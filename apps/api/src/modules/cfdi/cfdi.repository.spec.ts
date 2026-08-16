import { Prisma, type Cfdi } from '@contaia/database';

import type { ExtractedCfdiAggregate } from './cfdi-aggregate.types';
import { ViolacionDeInvarianteError } from './cfdi.errors';
import { CfdiRepository } from './cfdi.repository';

const DOCUMENT_ID = '44444444-4444-4444-4444-444444444444';
const COMPANY_ID = '11111111-1111-1111-1111-111111111111';

function buildAggregate(overrides: Partial<ExtractedCfdiAggregate> = {}): ExtractedCfdiAggregate {
  return {
    folioFiscal: 'a3f1e2b4-1111-1111-1111-111111111111',
    rfcEmisor: 'AAA010101AAA',
    rfcReceptor: 'BBB020202BBB',
    issuedAtLocal: '2026-07-01T12:00:00',
    subtotal: '1000.000000',
    total: '1160.000000',
    currency: 'MXN',
    tipoComprobante: 'I',
    ambiguousFields: [],
    concepts: [],
    cfdiTaxes: [],
    ...overrides,
  };
}

function buildCfdiRow(overrides: Partial<Cfdi> = {}): Cfdi {
  return {
    id: 'cfdi-1',
    companyId: COMPANY_ID,
    documentId: DOCUMENT_ID,
    folioFiscal: 'a3f1e2b4-1111-1111-1111-111111111111',
    rfcEmisor: 'AAA010101AAA',
    rfcReceptor: 'BBB020202BBB',
    issuedAtLocal: '2026-07-01T12:00:00',
    subtotal: new Prisma.Decimal('1000.000000'),
    total: new Prisma.Decimal('1160.000000'),
    currency: 'MXN',
    tipoComprobante: 'I',
    ambiguousFields: [],
    createdAt: new Date('2026-07-01T12:00:00.000Z'),
    updatedAt: new Date('2026-07-01T12:00:00.000Z'),
    ...overrides,
  };
}

/**
 * Mock minimo del `tx` de la Transaccion A (`E5-S2-T06`): unicamente el
 * subconjunto de `Prisma.TransactionClient` que `CfdiRepository.create()`
 * usa. `tx` se pasa al repositorio via `as unknown as Prisma.TransactionClient`
 * (mismo patron ya establecido en el proyecto para mocks de interfaces
 * grandes, ver `authentication.guard.spec.ts`); `mock` conserva el tipo de
 * `jest.Mock` para configurar y aserta cada llamada sin cast adicional.
 */
function buildTx() {
  const mock = {
    cfdi: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
  };
  return { mock, tx: mock as unknown as Prisma.TransactionClient };
}

describe('CfdiRepository', () => {
  describe('create — cabecera nueva', () => {
    it('crea el Cfdi con create() cuando no existe cabecera previa, mapeando el encabezado del agregado', async () => {
      const { mock, tx } = buildTx();
      mock.cfdi.findUnique.mockResolvedValue(null);
      const created = buildCfdiRow();
      mock.cfdi.create.mockResolvedValue(created);
      const aggregate = buildAggregate();
      const repository = new CfdiRepository();

      const result = await repository.create(tx, DOCUMENT_ID, COMPANY_ID, aggregate);

      expect(mock.cfdi.findUnique).toHaveBeenCalledWith({
        where: { documentId_companyId: { documentId: DOCUMENT_ID, companyId: COMPANY_ID } },
      });
      expect(mock.cfdi.create).toHaveBeenCalledWith({
        data: {
          companyId: COMPANY_ID,
          documentId: DOCUMENT_ID,
          folioFiscal: aggregate.folioFiscal,
          rfcEmisor: aggregate.rfcEmisor,
          rfcReceptor: aggregate.rfcReceptor,
          issuedAtLocal: aggregate.issuedAtLocal,
          subtotal: aggregate.subtotal,
          total: aggregate.total,
          currency: aggregate.currency,
          tipoComprobante: aggregate.tipoComprobante,
          ambiguousFields: [],
        },
      });
      expect(result).toBe(created);
    });

    it('nunca llama a upsert sobre Cfdi (criterio 59, D-007) — falla si alguien reintroduce upsert({update:{}})', async () => {
      const { mock, tx } = buildTx();
      mock.cfdi.findUnique.mockResolvedValue(null);
      mock.cfdi.create.mockResolvedValue(buildCfdiRow());
      const repository = new CfdiRepository();

      await repository.create(tx, DOCUMENT_ID, COMPANY_ID, buildAggregate());

      expect(mock.cfdi.upsert).not.toHaveBeenCalled();
    });

    it('copia ambiguousFields en un arreglo mutable nuevo, sin alias con el agregado de entrada', async () => {
      const { mock, tx } = buildTx();
      mock.cfdi.findUnique.mockResolvedValue(null);
      mock.cfdi.create.mockResolvedValue(buildCfdiRow());
      const aggregate = buildAggregate({ ambiguousFields: ['rfcReceptor'] });
      const repository = new CfdiRepository();

      await repository.create(tx, DOCUMENT_ID, COMPANY_ID, aggregate);

      const callArgs = mock.cfdi.create.mock.calls[0][0] as {
        data: { ambiguousFields: string[] };
      };
      expect(callArgs.data.ambiguousFields).toEqual(['rfcReceptor']);
      expect(callArgs.data.ambiguousFields).not.toBe(aggregate.ambiguousFields);
    });
  });

  /**
   * `E5-S3-T06`/D-009: el atributo `Fecha` del CFDI es hora local del lugar de
   * expedicion, sin offset. El repositorio debe entregarlo a Prisma como el
   * mismo string que recibio, sin convertirlo a `Date` ni normalizarlo — de lo
   * contrario el instante persistido dependeria de la zona horaria del proceso.
   */
  describe('create — issuedAtLocal se persiste como texto exacto (D-009)', () => {
    async function capturarDataPersistida(
      aggregate: ExtractedCfdiAggregate,
    ): Promise<Record<string, unknown>> {
      const { mock, tx } = buildTx();
      mock.cfdi.findUnique.mockResolvedValue(null);
      mock.cfdi.create.mockResolvedValue(buildCfdiRow());
      await new CfdiRepository().create(tx, DOCUMENT_ID, COMPANY_ID, aggregate);
      return (mock.cfdi.create.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    }

    it('entrega a Prisma exactamente el mismo string recibido, sin conversion a Date', async () => {
      const aggregate = buildAggregate({ issuedAtLocal: '2026-07-15T10:30:00' });

      const data = await capturarDataPersistida(aggregate);

      expect(data['issuedAtLocal']).toBe('2026-07-15T10:30:00');
      expect(typeof data['issuedAtLocal']).toBe('string');
      expect(data['issuedAtLocal']).not.toBeInstanceOf(Date);
    });

    it('no agrega sufijo Z ni ningun offset de zona horaria', async () => {
      const data = await capturarDataPersistida(
        buildAggregate({ issuedAtLocal: '2026-07-15T10:30:00' }),
      );

      expect(data['issuedAtLocal']).not.toMatch(/Z$/);
      expect(data['issuedAtLocal']).not.toMatch(/[+-]\d{2}:\d{2}$/);
    });

    it.each([
      ['medianoche', '2026-01-01T00:00:00'],
      ['fin de anio', '2026-12-31T23:59:59'],
      ['horario de verano ambiguo', '2026-10-25T01:30:00'],
      ['salto de horario inexistente', '2026-04-05T02:30:00'],
    ])(
      'conserva el valor intacto para %s, sin depender de la zona horaria del proceso',
      async (_caso, valor) => {
        const data = await capturarDataPersistida(buildAggregate({ issuedAtLocal: valor }));

        // Igualdad exacta de string: si el repositorio interpretara el valor
        // como instante, estos casos (ambiguos o inexistentes en zonas con
        // horario de verano) cambiarian segun el TZ del proceso. Se comprueba
        // por igualdad textual, sin manipular process.env.TZ.
        expect(data['issuedAtLocal']).toBe(valor);
      },
    );

    it('no aplica trim ni normaliza el valor recibido', async () => {
      const data = await capturarDataPersistida(
        buildAggregate({ issuedAtLocal: ' 2026-07-15T10:30:00 ' }),
      );

      expect(data['issuedAtLocal']).toBe(' 2026-07-15T10:30:00 ');
    });

    it('no persiste ningun campo llamado issuedAt (el contrato ya no lo define)', async () => {
      const data = await capturarDataPersistida(buildAggregate());

      expect(Object.keys(data)).not.toContain('issuedAt');
      expect(Object.keys(data)).toContain('issuedAtLocal');
    });
  });

  describe('create — guarda de invariante (Cfdi preexistente + Document en PROCESSING)', () => {
    it('lanza ViolacionDeInvarianteError y nunca llama a create ni a upsert cuando ya existe una cabecera', async () => {
      const { mock, tx } = buildTx();
      mock.cfdi.findUnique.mockResolvedValue(buildCfdiRow({ id: 'cfdi-existente' }));
      const repository = new CfdiRepository();

      await expect(
        repository.create(tx, DOCUMENT_ID, COMPANY_ID, buildAggregate()),
      ).rejects.toBeInstanceOf(ViolacionDeInvarianteError);

      expect(mock.cfdi.create).not.toHaveBeenCalled();
      expect(mock.cfdi.upsert).not.toHaveBeenCalled();
    });

    it('la razon del error identifica exactamente el estado imposible detectado', async () => {
      const { mock, tx } = buildTx();
      mock.cfdi.findUnique.mockResolvedValue(buildCfdiRow({ id: 'cfdi-existente' }));
      const repository = new CfdiRepository();

      await expect(
        repository.create(tx, DOCUMENT_ID, COMPANY_ID, buildAggregate()),
      ).rejects.toMatchObject({ razon: 'cfdi_preexistente_con_document_processing' });
    });

    it('el resultado del findUnique de guarda nunca se usa para continuar el flujo normal', async () => {
      // Cfdi "existente" deliberadamente vacio: si el repositorio intentara
      // leer alguno de sus campos para decidir el flujo (en vez de solo
      // comprobar su existencia y lanzar), fallaria aqui mismo con un error
      // de acceso a propiedad, no con ViolacionDeInvarianteError.
      const { mock, tx } = buildTx();
      mock.cfdi.findUnique.mockResolvedValue({} as Cfdi);
      const repository = new CfdiRepository();

      await expect(
        repository.create(tx, DOCUMENT_ID, COMPANY_ID, buildAggregate()),
      ).rejects.toBeInstanceOf(ViolacionDeInvarianteError);
    });
  });

  describe('aislamiento multi-tenant — intento de acceso cruzado entre empresas (BR-GLB-001, E5-S2-T08)', () => {
    const OTHER_COMPANY_ID = '22222222-2222-2222-2222-222222222222';

    it('un Cfdi existente de la Empresa A no bloquea ni se reutiliza al crear el mismo documentId para la Empresa B', async () => {
      const { mock, tx } = buildTx();
      // El mock simula el comportamiento real de Prisma: la guarda de
      // invariante consulta por la clave compuesta (documentId, companyId) —
      // para companyId=B no hay fila (el Cfdi existente pertenece a A), así
      // que el flujo continúa a create() con los datos de B, sin tocar ni
      // leer el Cfdi de A.
      mock.cfdi.findUnique.mockResolvedValue(null);
      const createdForOtherCompany = buildCfdiRow({
        id: 'cfdi-empresa-b',
        companyId: OTHER_COMPANY_ID,
      });
      mock.cfdi.create.mockResolvedValue(createdForOtherCompany);
      const repository = new CfdiRepository();

      const result = await repository.create(tx, DOCUMENT_ID, OTHER_COMPANY_ID, buildAggregate());

      expect(mock.cfdi.findUnique).toHaveBeenCalledWith({
        where: {
          documentId_companyId: { documentId: DOCUMENT_ID, companyId: OTHER_COMPANY_ID },
        },
      });
      const createArgs = mock.cfdi.create.mock.calls[0][0] as { data: { companyId: string } };
      expect(createArgs.data.companyId).toBe(OTHER_COMPANY_ID);
      expect(createArgs.data.companyId).not.toBe(COMPANY_ID);
      expect(result).toBe(createdForOtherCompany);
    });

    it('la guarda de invariante de la Empresa B nunca lanza por un Cfdi que solo existe para la Empresa A (companyId real enviado a Prisma, nunca sustituido)', async () => {
      const { mock, tx } = buildTx();
      mock.cfdi.findUnique.mockResolvedValue(null);
      mock.cfdi.create.mockResolvedValue(buildCfdiRow({ companyId: OTHER_COMPANY_ID }));
      const repository = new CfdiRepository();

      await repository.create(tx, DOCUMENT_ID, OTHER_COMPANY_ID, buildAggregate());

      const findArgs = mock.cfdi.findUnique.mock.calls[0][0] as {
        where: { documentId_companyId: { companyId: string } };
      };
      expect(findArgs.where.documentId_companyId.companyId).toBe(OTHER_COMPANY_ID);
    });
  });
});
