import { prisma, Prisma } from '@contaia/database';
import { Logger } from '@nestjs/common';
import { UnrecoverableError } from 'bullmq';

import type { DocumentsRepository } from '../documents/documents.repository';
import type { JobsRepository } from '../jobs/jobs.repository';

import type { ExtractedCfdiAggregate } from './cfdi-aggregate.types';
import type { CfdiConceptRepository } from './cfdi-concept.repository';
import type { CfdiTaxRepository } from './cfdi-tax.repository';
import {
  AgregadoNoVerificadoError,
  TransicionNoConfirmadaError,
  ViolacionDeInvarianteError,
} from './cfdi.errors';
import type { CfdiRepository } from './cfdi.repository';
import { PersistCfdiAggregateService } from './persist-cfdi-aggregate';

// Mismo patron que jobs.repository.spec.ts: el factory de jest.mock no
// referencia variables externas (evita el error de "out-of-scope variable"
// del hoisting de ts-jest) — crea sus propios jest.fn() y se configuran
// despues del import.
jest.mock('@contaia/database', () => {
  const actual = jest.requireActual('@contaia/database');
  return {
    ...actual,
    prisma: {
      $transaction: jest.fn(),
    },
  };
});

const DOCUMENT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const JOB_ID = '978c6de1-ccbe-51ed-b0a3-e14453ca5cb7';
const CFDI_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const CONCEPT_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const CHECKSUM = 'abc123def456abc123def456abc123def456abc123def456abc123def456abc12345';

const AGGREGATE: ExtractedCfdiAggregate = {
  folioFiscal: 'FOLIO-1',
  rfcEmisor: 'AAA010101AAA',
  rfcReceptor: 'BBB020202BBB',
  issuedAt: new Date('2026-01-01T00:00:00.000Z'),
  subtotal: '100.00',
  total: '116.00',
  currency: 'MXN',
  tipoComprobante: 'I',
  ambiguousFields: [],
  concepts: [
    {
      position: 1,
      claveProdServ: '01010101',
      noIdentificacion: null,
      cantidad: '1',
      claveUnidad: 'H87',
      unidad: null,
      descripcion: 'Concepto 1',
      valorUnitario: '100.00',
      importe: '100.00',
      descuento: null,
      objetoImp: '02',
      taxes: [
        {
          position: 1,
          type: 'TRANSFER',
          impuesto: '002',
          tipoFactor: 'Tasa',
          tasaOCuota: '0.160000',
          base: '100.00',
          importe: '16.00',
        },
      ],
    },
  ],
  cfdiTaxes: [],
};

const CREATED_CFDI = { id: CFDI_ID, documentId: DOCUMENT_ID, companyId: COMPANY_ID };
const CREATED_CONCEPT = { id: CONCEPT_ID, cfdiId: CFDI_ID, companyId: COMPANY_ID, position: 1 };
const CREATED_CONCEPT_TAX = {
  id: 'tax-1',
  cfdiId: CFDI_ID,
  companyId: COMPANY_ID,
  conceptSlot: 1,
  position: 1,
};

/** Mock minimo del `tx` de la Transacción A — mismo patrón que documents.repository.spec.ts/jobs.repository.spec.ts. */
function buildTx() {
  const mock = {
    cfdiConcept: { findMany: jest.fn() },
    cfdiTax: { findMany: jest.fn() },
  };
  return { mock, tx: mock as unknown as Prisma.TransactionClient };
}

function buildRepos() {
  const cfdiRepository = { create: jest.fn() } as unknown as CfdiRepository;
  const cfdiConceptRepository = { upsertMany: jest.fn() } as unknown as CfdiConceptRepository;
  const cfdiTaxRepository = {
    upsertComprobanteTaxes: jest.fn(),
    upsertConceptTaxes: jest.fn(),
  } as unknown as CfdiTaxRepository;
  const documentsRepository = { markAsProcessed: jest.fn() } as unknown as DocumentsRepository;
  const jobsRepository = { markAsCompleted: jest.fn() } as unknown as JobsRepository;
  return {
    cfdiRepository,
    cfdiConceptRepository,
    cfdiTaxRepository,
    documentsRepository,
    jobsRepository,
  };
}

/** Configura los cinco repositorios mock para que el camino feliz complete sin lanzar. */
function mockHappyPath(
  repos: ReturnType<typeof buildRepos>,
  txMock: ReturnType<typeof buildTx>['mock'],
) {
  (repos.cfdiRepository.create as jest.Mock).mockResolvedValue(CREATED_CFDI);
  (repos.cfdiConceptRepository.upsertMany as jest.Mock).mockResolvedValue([CREATED_CONCEPT]);
  (repos.cfdiTaxRepository.upsertComprobanteTaxes as jest.Mock).mockResolvedValue([]);
  (repos.cfdiTaxRepository.upsertConceptTaxes as jest.Mock).mockResolvedValue([
    CREATED_CONCEPT_TAX,
  ]);
  txMock.cfdiConcept.findMany.mockResolvedValue([{ position: 1 }]);
  txMock.cfdiTax.findMany.mockResolvedValue([{ conceptSlot: 1, position: 1 }]);
  (repos.documentsRepository.markAsProcessed as jest.Mock).mockResolvedValue(undefined);
  (repos.jobsRepository.markAsCompleted as jest.Mock).mockResolvedValue(undefined);
}

function buildService(repos: ReturnType<typeof buildRepos>) {
  return new PersistCfdiAggregateService(
    repos.cfdiRepository,
    repos.cfdiConceptRepository,
    repos.cfdiTaxRepository,
    repos.documentsRepository,
    repos.jobsRepository,
  );
}

describe('PersistCfdiAggregateService', () => {
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('caso feliz — Transacción A completa', () => {
    it('usa prisma.$transaction en forma interactiva (una función, nunca la forma de arreglo)', async () => {
      const { mock: txMock, tx } = buildTx();
      (prisma.$transaction as jest.Mock).mockImplementation(
        (cb: (tx: Prisma.TransactionClient) => unknown) => cb(tx),
      );
      const repos = buildRepos();
      mockHappyPath(repos, txMock);

      await buildService(repos).persist({
        documentId: DOCUMENT_ID,
        companyId: COMPANY_ID,
        jobId: JOB_ID,
        checksumSha256: CHECKSUM,
        aggregate: AGGREGATE,
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    });

    it('pasa exactamente el mismo TransactionClient a los cinco repositorios — nunca el cliente global', async () => {
      const { mock: txMock, tx } = buildTx();
      (prisma.$transaction as jest.Mock).mockImplementation(
        (cb: (tx: Prisma.TransactionClient) => unknown) => cb(tx),
      );
      const repos = buildRepos();
      mockHappyPath(repos, txMock);

      await buildService(repos).persist({
        documentId: DOCUMENT_ID,
        companyId: COMPANY_ID,
        jobId: JOB_ID,
        checksumSha256: CHECKSUM,
        aggregate: AGGREGATE,
      });

      expect((repos.cfdiRepository.create as jest.Mock).mock.calls[0][0]).toBe(tx);
      expect((repos.cfdiConceptRepository.upsertMany as jest.Mock).mock.calls[0][0]).toBe(tx);
      expect((repos.cfdiTaxRepository.upsertComprobanteTaxes as jest.Mock).mock.calls[0][0]).toBe(
        tx,
      );
      expect((repos.cfdiTaxRepository.upsertConceptTaxes as jest.Mock).mock.calls[0][0]).toBe(tx);
      expect((repos.documentsRepository.markAsProcessed as jest.Mock).mock.calls[0][0]).toBe(tx);
      expect((repos.jobsRepository.markAsCompleted as jest.Mock).mock.calls[0][0]).toBe(tx);
    });

    it('respeta el orden exacto de AD-10.1.2: create → conceptos → impuestos comprobante → impuestos concepto → verificación → markAsProcessed → markAsCompleted', async () => {
      const { mock: txMock, tx } = buildTx();
      (prisma.$transaction as jest.Mock).mockImplementation(
        (cb: (tx: Prisma.TransactionClient) => unknown) => cb(tx),
      );
      const repos = buildRepos();
      mockHappyPath(repos, txMock);

      await buildService(repos).persist({
        documentId: DOCUMENT_ID,
        companyId: COMPANY_ID,
        jobId: JOB_ID,
        checksumSha256: CHECKSUM,
        aggregate: AGGREGATE,
      });

      const callOrder = [
        (repos.cfdiRepository.create as jest.Mock).mock.invocationCallOrder[0],
        (repos.cfdiConceptRepository.upsertMany as jest.Mock).mock.invocationCallOrder[0],
        (repos.cfdiTaxRepository.upsertComprobanteTaxes as jest.Mock).mock.invocationCallOrder[0],
        (repos.cfdiTaxRepository.upsertConceptTaxes as jest.Mock).mock.invocationCallOrder[0],
        txMock.cfdiConcept.findMany.mock.invocationCallOrder[0],
        txMock.cfdiTax.findMany.mock.invocationCallOrder[0],
        (repos.documentsRepository.markAsProcessed as jest.Mock).mock.invocationCallOrder[0],
        (repos.jobsRepository.markAsCompleted as jest.Mock).mock.invocationCallOrder[0],
      ];

      expect(callOrder).toEqual([...callOrder].sort((a, b) => (a ?? 0) - (b ?? 0)));
    });

    it('llama a cada repositorio con los argumentos exactos del pseudocódigo AD-10.1.2', async () => {
      const { mock: txMock, tx } = buildTx();
      (prisma.$transaction as jest.Mock).mockImplementation(
        (cb: (tx: Prisma.TransactionClient) => unknown) => cb(tx),
      );
      const repos = buildRepos();
      mockHappyPath(repos, txMock);

      await buildService(repos).persist({
        documentId: DOCUMENT_ID,
        companyId: COMPANY_ID,
        jobId: JOB_ID,
        checksumSha256: CHECKSUM,
        aggregate: AGGREGATE,
      });

      expect(repos.cfdiRepository.create).toHaveBeenCalledWith(
        tx,
        DOCUMENT_ID,
        COMPANY_ID,
        AGGREGATE,
      );
      expect(repos.cfdiConceptRepository.upsertMany).toHaveBeenCalledWith(
        tx,
        CFDI_ID,
        COMPANY_ID,
        AGGREGATE.concepts,
      );
      expect(repos.cfdiTaxRepository.upsertComprobanteTaxes).toHaveBeenCalledWith(
        tx,
        CFDI_ID,
        COMPANY_ID,
        AGGREGATE.cfdiTaxes,
      );
      expect(repos.cfdiTaxRepository.upsertConceptTaxes).toHaveBeenCalledWith(
        tx,
        CFDI_ID,
        COMPANY_ID,
        AGGREGATE.concepts,
        [CREATED_CONCEPT],
      );
      expect(repos.documentsRepository.markAsProcessed).toHaveBeenCalledWith(
        tx,
        DOCUMENT_ID,
        COMPANY_ID,
        CHECKSUM,
      );
      expect(repos.jobsRepository.markAsCompleted).toHaveBeenCalledWith(tx, JOB_ID, COMPANY_ID, {
        resourceType: 'cfdi',
        resourceId: CFDI_ID,
        documentId: DOCUMENT_ID,
      });
    });

    it('retorna el agregado (cfdiId, documentId, companyId) tras el único commit', async () => {
      const { mock: txMock, tx } = buildTx();
      (prisma.$transaction as jest.Mock).mockImplementation(
        (cb: (tx: Prisma.TransactionClient) => unknown) => cb(tx),
      );
      const repos = buildRepos();
      mockHappyPath(repos, txMock);

      const result = await buildService(repos).persist({
        documentId: DOCUMENT_ID,
        companyId: COMPANY_ID,
        jobId: JOB_ID,
        checksumSha256: CHECKSUM,
        aggregate: AGGREGATE,
      });

      expect(result).toEqual({ cfdiId: CFDI_ID, documentId: DOCUMENT_ID, companyId: COMPANY_ID });
    });
  });

  describe('rollback — cualquier excepción intermedia propaga sin capturarse', () => {
    it('guarda de invariante: ViolacionDeInvarianteError de CfdiRepository.create propaga; ningún otro repositorio se invoca', async () => {
      const { tx } = buildTx();
      (prisma.$transaction as jest.Mock).mockImplementation(
        (cb: (tx: Prisma.TransactionClient) => unknown) => cb(tx),
      );
      const repos = buildRepos();
      const invarianteError = Object.assign(
        new Error('cfdi_preexistente_con_document_processing'),
        {
          name: 'ViolacionDeInvarianteError',
        },
      );
      (repos.cfdiRepository.create as jest.Mock).mockRejectedValue(invarianteError);

      await expect(
        buildService(repos).persist({
          documentId: DOCUMENT_ID,
          companyId: COMPANY_ID,
          jobId: JOB_ID,
          checksumSha256: CHECKSUM,
          aggregate: AGGREGATE,
        }),
      ).rejects.toBe(invarianteError);

      expect(repos.cfdiConceptRepository.upsertMany).not.toHaveBeenCalled();
      expect(repos.cfdiTaxRepository.upsertComprobanteTaxes).not.toHaveBeenCalled();
      expect(repos.documentsRepository.markAsProcessed).not.toHaveBeenCalled();
      expect(repos.jobsRepository.markAsCompleted).not.toHaveBeenCalled();
    });

    it('create Cfdi: un P2002 (colisión de restricción única) propaga sin capturarse', async () => {
      const { tx } = buildTx();
      (prisma.$transaction as jest.Mock).mockImplementation(
        (cb: (tx: Prisma.TransactionClient) => unknown) => cb(tx),
      );
      const repos = buildRepos();
      const p2002 = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
      (repos.cfdiRepository.create as jest.Mock).mockRejectedValue(p2002);

      await expect(
        buildService(repos).persist({
          documentId: DOCUMENT_ID,
          companyId: COMPANY_ID,
          jobId: JOB_ID,
          checksumSha256: CHECKSUM,
          aggregate: AGGREGATE,
        }),
      ).rejects.toBe(p2002);

      expect(repos.cfdiConceptRepository.upsertMany).not.toHaveBeenCalled();
      expect(repos.documentsRepository.markAsProcessed).not.toHaveBeenCalled();
      expect(repos.jobsRepository.markAsCompleted).not.toHaveBeenCalled();
    });

    it('persistencia de conceptos: error de CfdiConceptRepository.upsertMany propaga; ni impuestos ni transiciones terminales se invocan', async () => {
      const { tx } = buildTx();
      (prisma.$transaction as jest.Mock).mockImplementation(
        (cb: (tx: Prisma.TransactionClient) => unknown) => cb(tx),
      );
      const repos = buildRepos();
      (repos.cfdiRepository.create as jest.Mock).mockResolvedValue(CREATED_CFDI);
      const conceptError = new Error('connection refused');
      (repos.cfdiConceptRepository.upsertMany as jest.Mock).mockRejectedValue(conceptError);

      await expect(
        buildService(repos).persist({
          documentId: DOCUMENT_ID,
          companyId: COMPANY_ID,
          jobId: JOB_ID,
          checksumSha256: CHECKSUM,
          aggregate: AGGREGATE,
        }),
      ).rejects.toBe(conceptError);

      expect(repos.cfdiTaxRepository.upsertComprobanteTaxes).not.toHaveBeenCalled();
      expect(repos.documentsRepository.markAsProcessed).not.toHaveBeenCalled();
      expect(repos.jobsRepository.markAsCompleted).not.toHaveBeenCalled();
    });

    it('persistencia de impuestos: error de CfdiTaxRepository.upsertConceptTaxes propaga; markAsProcessed/markAsCompleted nunca se invocan', async () => {
      const { tx } = buildTx();
      (prisma.$transaction as jest.Mock).mockImplementation(
        (cb: (tx: Prisma.TransactionClient) => unknown) => cb(tx),
      );
      const repos = buildRepos();
      (repos.cfdiRepository.create as jest.Mock).mockResolvedValue(CREATED_CFDI);
      (repos.cfdiConceptRepository.upsertMany as jest.Mock).mockResolvedValue([CREATED_CONCEPT]);
      (repos.cfdiTaxRepository.upsertComprobanteTaxes as jest.Mock).mockResolvedValue([]);
      const taxError = Object.assign(new Error('concept_tax_correspondence_mismatch'), {
        name: 'ViolacionDeInvarianteError',
      });
      (repos.cfdiTaxRepository.upsertConceptTaxes as jest.Mock).mockRejectedValue(taxError);

      await expect(
        buildService(repos).persist({
          documentId: DOCUMENT_ID,
          companyId: COMPANY_ID,
          jobId: JOB_ID,
          checksumSha256: CHECKSUM,
          aggregate: AGGREGATE,
        }),
      ).rejects.toBe(taxError);

      expect(repos.documentsRepository.markAsProcessed).not.toHaveBeenCalled();
      expect(repos.jobsRepository.markAsCompleted).not.toHaveBeenCalled();
    });

    it('verificación estructural (AD-10.1): un conteo de hijos releído distinto del esperado lanza AgregadoNoVerificadoError antes de tocar Document/Job', async () => {
      const { mock: txMock, tx } = buildTx();
      (prisma.$transaction as jest.Mock).mockImplementation(
        (cb: (tx: Prisma.TransactionClient) => unknown) => cb(tx),
      );
      const repos = buildRepos();
      (repos.cfdiRepository.create as jest.Mock).mockResolvedValue(CREATED_CFDI);
      (repos.cfdiConceptRepository.upsertMany as jest.Mock).mockResolvedValue([CREATED_CONCEPT]);
      (repos.cfdiTaxRepository.upsertComprobanteTaxes as jest.Mock).mockResolvedValue([]);
      (repos.cfdiTaxRepository.upsertConceptTaxes as jest.Mock).mockResolvedValue([
        CREATED_CONCEPT_TAX,
      ]);
      // Releída: 0 conceptos persistidos, pero el agregado esperaba 1 — divergencia real.
      txMock.cfdiConcept.findMany.mockResolvedValue([]);
      txMock.cfdiTax.findMany.mockResolvedValue([]);

      await expect(
        buildService(repos).persist({
          documentId: DOCUMENT_ID,
          companyId: COMPANY_ID,
          jobId: JOB_ID,
          checksumSha256: CHECKSUM,
          aggregate: AGGREGATE,
        }),
      ).rejects.toBeInstanceOf(AgregadoNoVerificadoError);

      expect(repos.documentsRepository.markAsProcessed).not.toHaveBeenCalled();
      expect(repos.jobsRepository.markAsCompleted).not.toHaveBeenCalled();
    });

    it("markAsProcessed: TransicionNoConfirmadaError('document', count) propaga; markAsCompleted nunca se invoca", async () => {
      const { mock: txMock, tx } = buildTx();
      (prisma.$transaction as jest.Mock).mockImplementation(
        (cb: (tx: Prisma.TransactionClient) => unknown) => cb(tx),
      );
      const repos = buildRepos();
      (repos.cfdiRepository.create as jest.Mock).mockResolvedValue(CREATED_CFDI);
      (repos.cfdiConceptRepository.upsertMany as jest.Mock).mockResolvedValue([CREATED_CONCEPT]);
      (repos.cfdiTaxRepository.upsertComprobanteTaxes as jest.Mock).mockResolvedValue([]);
      (repos.cfdiTaxRepository.upsertConceptTaxes as jest.Mock).mockResolvedValue([
        CREATED_CONCEPT_TAX,
      ]);
      txMock.cfdiConcept.findMany.mockResolvedValue([{ position: 1 }]);
      txMock.cfdiTax.findMany.mockResolvedValue([{ conceptSlot: 1, position: 1 }]);
      const documentError = new TransicionNoConfirmadaError('document', 0);
      (repos.documentsRepository.markAsProcessed as jest.Mock).mockRejectedValue(documentError);

      await expect(
        buildService(repos).persist({
          documentId: DOCUMENT_ID,
          companyId: COMPANY_ID,
          jobId: JOB_ID,
          checksumSha256: CHECKSUM,
          aggregate: AGGREGATE,
        }),
      ).rejects.toBe(documentError);

      expect(repos.jobsRepository.markAsCompleted).not.toHaveBeenCalled();
    });

    it('verificación estructural (AD-10.1, verificación 7): un impuesto global (conceptSlot=0) releído con position=2 cuando se esperaba un único impuesto (position=1) lanza AgregadoNoVerificadoError antes de tocar Document/Job', async () => {
      const { mock: txMock, tx } = buildTx();
      (prisma.$transaction as jest.Mock).mockImplementation(
        (cb: (tx: Prisma.TransactionClient) => unknown) => cb(tx),
      );
      const repos = buildRepos();
      const aggregateConUnImpuestoGlobal: ExtractedCfdiAggregate = {
        ...AGGREGATE,
        cfdiTaxes: [
          {
            position: 1,
            type: 'TRANSFER',
            impuesto: '002',
            tipoFactor: 'Tasa',
            tasaOCuota: '0.160000',
            base: '100.00',
            importe: '16.00',
          },
        ],
      };
      (repos.cfdiRepository.create as jest.Mock).mockResolvedValue(CREATED_CFDI);
      (repos.cfdiConceptRepository.upsertMany as jest.Mock).mockResolvedValue([CREATED_CONCEPT]);
      (repos.cfdiTaxRepository.upsertComprobanteTaxes as jest.Mock).mockResolvedValue([]);
      (repos.cfdiTaxRepository.upsertConceptTaxes as jest.Mock).mockResolvedValue([
        CREATED_CONCEPT_TAX,
      ]);
      txMock.cfdiConcept.findMany.mockResolvedValue([{ position: 1 }]);
      // Releída: el conteo coincide (1 impuesto global), pero su position es 2,
      // no 1 — hueco en {1} y fuera de rango. El conteo por sí solo no lo detecta.
      txMock.cfdiTax.findMany.mockResolvedValue([
        { conceptSlot: 0, position: 2 },
        { conceptSlot: 1, position: 1 },
      ]);

      await expect(
        buildService(repos).persist({
          documentId: DOCUMENT_ID,
          companyId: COMPANY_ID,
          jobId: JOB_ID,
          checksumSha256: CHECKSUM,
          aggregate: aggregateConUnImpuestoGlobal,
        }),
      ).rejects.toBeInstanceOf(AgregadoNoVerificadoError);

      expect(repos.documentsRepository.markAsProcessed).not.toHaveBeenCalled();
      expect(repos.jobsRepository.markAsCompleted).not.toHaveBeenCalled();
    });

    it("markAsCompleted: TransicionNoConfirmadaError('job', count) propaga (el Document ya quedó PROCESSED dentro de la tx, pero la tx entera revierte igual)", async () => {
      const { mock: txMock, tx } = buildTx();
      (prisma.$transaction as jest.Mock).mockImplementation(
        (cb: (tx: Prisma.TransactionClient) => unknown) => cb(tx),
      );
      const repos = buildRepos();
      mockHappyPath(repos, txMock);
      const jobError = new TransicionNoConfirmadaError('job', 0);
      (repos.jobsRepository.markAsCompleted as jest.Mock).mockRejectedValue(jobError);

      await expect(
        buildService(repos).persist({
          documentId: DOCUMENT_ID,
          companyId: COMPANY_ID,
          jobId: JOB_ID,
          checksumSha256: CHECKSUM,
          aggregate: AGGREGATE,
        }),
      ).rejects.toBe(jobError);
    });
  });

  describe('clasificación de errores (E5-S2-T09/T10) — instancias reales de cada rama de logTransactionFailure', () => {
    it('ViolacionDeInvarianteError real: nivel error, evento failed.invariant, identidad preservada, sin log de commit', async () => {
      const { tx } = buildTx();
      (prisma.$transaction as jest.Mock).mockImplementation(
        (cb: (tx: Prisma.TransactionClient) => unknown) => cb(tx),
      );
      const repos = buildRepos();
      const invarianteError = new ViolacionDeInvarianteError(
        'cfdi_preexistente_con_document_processing',
      );
      (repos.cfdiRepository.create as jest.Mock).mockRejectedValue(invarianteError);

      await expect(
        buildService(repos).persist({
          documentId: DOCUMENT_ID,
          companyId: COMPANY_ID,
          jobId: JOB_ID,
          checksumSha256: CHECKSUM,
          aggregate: AGGREGATE,
        }),
      ).rejects.toBe(invarianteError);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('cfdi.persistence.transaction.failed.invariant'),
      );
      expect(errorSpy.mock.calls[0]?.[0]).toEqual(
        expect.stringContaining('razon=cfdi_preexistente_con_document_processing'),
      );
      expect(warnSpy).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('committed'));
      expect(invarianteError.name).toBe('ViolacionDeInvarianteError');
      expect(invarianteError.razon).toBe('cfdi_preexistente_con_document_processing');
    });

    it('Prisma.PrismaClientKnownRequestError real (P2002): nivel warn, evento failed.recoverable, identidad preservada, sin log de commit, sin depender de meta.target', async () => {
      const { tx } = buildTx();
      (prisma.$transaction as jest.Mock).mockImplementation(
        (cb: (tx: Prisma.TransactionClient) => unknown) => cb(tx),
      );
      const repos = buildRepos();
      const p2002 = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`companyId`,`folioFiscal`)',
        { code: 'P2002', clientVersion: 'test' },
      );
      (repos.cfdiRepository.create as jest.Mock).mockRejectedValue(p2002);

      await expect(
        buildService(repos).persist({
          documentId: DOCUMENT_ID,
          companyId: COMPANY_ID,
          jobId: JOB_ID,
          checksumSha256: CHECKSUM,
          aggregate: AGGREGATE,
        }),
      ).rejects.toBe(p2002);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('cfdi.persistence.transaction.failed.recoverable'),
      );
      expect(warnSpy.mock.calls[0]?.[0]).toEqual(expect.stringContaining('code=P2002'));
      expect(errorSpy).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('committed'));
      expect(p2002.code).toBe('P2002');
    });

    it('UnrecoverableError real de bullmq: nivel error, evento failed.unrecoverable, identidad preservada, sin log de commit (rama defensiva)', async () => {
      const { mock: txMock, tx } = buildTx();
      (prisma.$transaction as jest.Mock).mockImplementation(
        (cb: (tx: Prisma.TransactionClient) => unknown) => cb(tx),
      );
      const repos = buildRepos();
      mockHappyPath(repos, txMock);
      const unrecoverable = new UnrecoverableError('error permanente simulado');
      (repos.jobsRepository.markAsCompleted as jest.Mock).mockRejectedValue(unrecoverable);

      await expect(
        buildService(repos).persist({
          documentId: DOCUMENT_ID,
          companyId: COMPANY_ID,
          jobId: JOB_ID,
          checksumSha256: CHECKSUM,
          aggregate: AGGREGATE,
        }),
      ).rejects.toBe(unrecoverable);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('cfdi.persistence.transaction.failed.unrecoverable'),
      );
      expect(warnSpy).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('committed'));
      expect(unrecoverable).toBeInstanceOf(UnrecoverableError);
    });
  });

  describe('verificaciones estructurales restantes (E5-S2-T10) — cfdi_tax_count, concept_tax_count, concept_tax_positions', () => {
    it('cfdi_tax_count: releer 0 impuestos de comprobante cuando el agregado esperaba 1 lanza AgregadoNoVerificadoError antes de tocar Document/Job', async () => {
      const { mock: txMock, tx } = buildTx();
      (prisma.$transaction as jest.Mock).mockImplementation(
        (cb: (tx: Prisma.TransactionClient) => unknown) => cb(tx),
      );
      const repos = buildRepos();
      const aggregateConUnImpuestoGlobal: ExtractedCfdiAggregate = {
        ...AGGREGATE,
        cfdiTaxes: [
          {
            position: 1,
            type: 'TRANSFER',
            impuesto: '002',
            tipoFactor: 'Tasa',
            tasaOCuota: '0.160000',
            base: '100.00',
            importe: '16.00',
          },
        ],
      };
      (repos.cfdiRepository.create as jest.Mock).mockResolvedValue(CREATED_CFDI);
      (repos.cfdiConceptRepository.upsertMany as jest.Mock).mockResolvedValue([CREATED_CONCEPT]);
      (repos.cfdiTaxRepository.upsertComprobanteTaxes as jest.Mock).mockResolvedValue([]);
      (repos.cfdiTaxRepository.upsertConceptTaxes as jest.Mock).mockResolvedValue([
        CREATED_CONCEPT_TAX,
      ]);
      txMock.cfdiConcept.findMany.mockResolvedValue([{ position: 1 }]);
      // Releída: cero impuestos con conceptSlot=0 (comprobante), pero el
      // agregado esperaba 1 — solo queda el impuesto de concepto.
      txMock.cfdiTax.findMany.mockResolvedValue([{ conceptSlot: 1, position: 1 }]);

      await expect(
        buildService(repos).persist({
          documentId: DOCUMENT_ID,
          companyId: COMPANY_ID,
          jobId: JOB_ID,
          checksumSha256: CHECKSUM,
          aggregate: aggregateConUnImpuestoGlobal,
        }),
      ).rejects.toMatchObject({ verificacion: 'cfdi_tax_count' });

      expect(repos.documentsRepository.markAsProcessed).not.toHaveBeenCalled();
      expect(repos.jobsRepository.markAsCompleted).not.toHaveBeenCalled();
    });

    it('concept_tax_count: releer 0 impuestos para un concepto que esperaba 1 lanza AgregadoNoVerificadoError antes de tocar Document/Job', async () => {
      const { mock: txMock, tx } = buildTx();
      (prisma.$transaction as jest.Mock).mockImplementation(
        (cb: (tx: Prisma.TransactionClient) => unknown) => cb(tx),
      );
      const repos = buildRepos();
      (repos.cfdiRepository.create as jest.Mock).mockResolvedValue(CREATED_CFDI);
      (repos.cfdiConceptRepository.upsertMany as jest.Mock).mockResolvedValue([CREATED_CONCEPT]);
      (repos.cfdiTaxRepository.upsertComprobanteTaxes as jest.Mock).mockResolvedValue([]);
      (repos.cfdiTaxRepository.upsertConceptTaxes as jest.Mock).mockResolvedValue([
        CREATED_CONCEPT_TAX,
      ]);
      txMock.cfdiConcept.findMany.mockResolvedValue([{ position: 1 }]);
      // Releída: ningún impuesto con conceptSlot=1 (el concepto de position=1),
      // pero AGGREGATE.concepts[0].taxes tiene exactamente 1 — sin impuestos
      // de comprobante tampoco, así que cfdi_tax_count (0 esperados=0) pasa.
      txMock.cfdiTax.findMany.mockResolvedValue([]);

      await expect(
        buildService(repos).persist({
          documentId: DOCUMENT_ID,
          companyId: COMPANY_ID,
          jobId: JOB_ID,
          checksumSha256: CHECKSUM,
          aggregate: AGGREGATE,
        }),
      ).rejects.toMatchObject({ verificacion: 'concept_tax_count' });

      expect(repos.documentsRepository.markAsProcessed).not.toHaveBeenCalled();
      expect(repos.jobsRepository.markAsCompleted).not.toHaveBeenCalled();
    });

    it('concept_tax_positions: releer el impuesto del concepto con position=2 cuando se esperaba position=1 lanza AgregadoNoVerificadoError antes de tocar Document/Job', async () => {
      const { mock: txMock, tx } = buildTx();
      (prisma.$transaction as jest.Mock).mockImplementation(
        (cb: (tx: Prisma.TransactionClient) => unknown) => cb(tx),
      );
      const repos = buildRepos();
      (repos.cfdiRepository.create as jest.Mock).mockResolvedValue(CREATED_CFDI);
      (repos.cfdiConceptRepository.upsertMany as jest.Mock).mockResolvedValue([CREATED_CONCEPT]);
      (repos.cfdiTaxRepository.upsertComprobanteTaxes as jest.Mock).mockResolvedValue([]);
      (repos.cfdiTaxRepository.upsertConceptTaxes as jest.Mock).mockResolvedValue([
        CREATED_CONCEPT_TAX,
      ]);
      txMock.cfdiConcept.findMany.mockResolvedValue([{ position: 1 }]);
      // Releída: el conteo coincide (1 impuesto con conceptSlot=1), pero su
      // position es 2, no 1 — hueco en {1} y fuera de rango. El conteo por sí
      // solo no lo detecta.
      txMock.cfdiTax.findMany.mockResolvedValue([{ conceptSlot: 1, position: 2 }]);

      await expect(
        buildService(repos).persist({
          documentId: DOCUMENT_ID,
          companyId: COMPANY_ID,
          jobId: JOB_ID,
          checksumSha256: CHECKSUM,
          aggregate: AGGREGATE,
        }),
      ).rejects.toMatchObject({ verificacion: 'concept_tax_positions' });

      expect(repos.documentsRepository.markAsProcessed).not.toHaveBeenCalled();
      expect(repos.jobsRepository.markAsCompleted).not.toHaveBeenCalled();
    });
  });
});
