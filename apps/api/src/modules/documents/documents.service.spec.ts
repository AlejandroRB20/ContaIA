import { DocumentStatus, DocumentFileType, type Document } from '@contaia/database';

import { JobsError } from '../jobs/jobs.errors';
import { JobsService } from '../jobs/jobs.service';
import { StorageError } from '../storage/storage.errors';
import type { PresignedUrl, StorageAdapter } from '../storage/storage.interface';

import { DocumentsAuthorizationService } from './documents-authorization.service';
import {
  DocumentNotFoundException,
  DocumentProcessingUnavailableException,
  DocumentStorageUnavailableException,
  DocumentUploadNotVerifiedException,
} from './documents.errors';
import type { DocumentSummary } from './documents.repository';
import { DocumentsRepository } from './documents.repository';
import { DocumentsService } from './documents.service';
import type { ListDocumentsQueryDto } from './dto/list-documents-query.dto';
import type { UploadDocumentDto } from './dto/upload-document.dto';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_COMPANY_ID = '99999999-9999-9999-9999-999999999999';
const USER_ID = '22222222-2222-2222-2222-222222222222';

const DTO: UploadDocumentDto = {
  originalFilename: 'factura-enero.xml',
  mimeType: 'application/xml',
  fileType: DocumentFileType.XML,
};

function buildDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: '33333333-3333-3333-3333-333333333333',
    companyId: COMPANY_ID,
    uploadedByUserId: USER_ID,
    originalFilename: DTO.originalFilename,
    fileType: DTO.fileType,
    mimeType: DTO.mimeType,
    sizeBytes: null,
    storageReference: `companies/${COMPANY_ID}/documents/33333333-3333-3333-3333-333333333333`,
    checksumSha256: null,
    status: DocumentStatus.PENDING_UPLOAD,
    rejectionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildSummary(overrides: Partial<DocumentSummary> = {}): DocumentSummary {
  return {
    id: '44444444-4444-4444-4444-444444444444',
    companyId: COMPANY_ID,
    originalFilename: 'factura-enero.xml',
    fileType: DocumentFileType.XML,
    mimeType: 'application/xml',
    sizeBytes: 2048,
    storageReference: `companies/${COMPANY_ID}/documents/44444444-4444-4444-4444-444444444444`,
    status: DocumentStatus.PROCESSED,
    rejectionReason: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function buildQuery(overrides: Partial<ListDocumentsQueryDto> = {}): ListDocumentsQueryDto {
  return { page: 1, pageSize: 20, ...overrides } as ListDocumentsQueryDto;
}

function buildService(
  overrides: {
    documentsRepository?: Partial<jest.Mocked<DocumentsRepository>>;
    documentsAuthorization?: Partial<jest.Mocked<DocumentsAuthorizationService>>;
    storageAdapter?: Partial<jest.Mocked<StorageAdapter>>;
    jobsService?: Partial<jest.Mocked<JobsService>>;
  } = {},
) {
  const documentsRepository = {
    create: jest.fn().mockResolvedValue(buildDocument()),
    deleteCreatedDocument: jest.fn().mockResolvedValue(undefined),
    findManyByCompany: jest.fn().mockResolvedValue([]),
    countByCompany: jest.fn().mockResolvedValue(0),
    findById: jest.fn().mockResolvedValue(null),
    confirmUpload: jest.fn().mockResolvedValue(true),
    ...overrides.documentsRepository,
  } as unknown as jest.Mocked<DocumentsRepository>;

  const documentsAuthorization = {
    assertHasPermission: jest.fn().mockResolvedValue(undefined),
    ...overrides.documentsAuthorization,
  } as unknown as jest.Mocked<DocumentsAuthorizationService>;

  const storageAdapter = {
    getPresignedUploadUrl: jest.fn().mockResolvedValue({
      url: 'https://minio.local/contaia-documents/some-key?signature=...',
      expiresAt: new Date('2026-01-01T00:05:00.000Z'),
    } satisfies PresignedUrl),
    getPresignedDownloadUrl: jest.fn(),
    exists: jest.fn(),
    getMetadata: jest
      .fn()
      .mockResolvedValue({ sizeBytes: 2048, contentType: 'application/xml', etag: '"abc"' }),
    deleteObject: jest.fn(),
    ...overrides.storageAdapter,
  } as unknown as jest.Mocked<StorageAdapter>;

  const jobsService = {
    ensureXmlExtractionJob: jest.fn().mockResolvedValue(undefined),
    ...overrides.jobsService,
  } as unknown as jest.Mocked<JobsService>;

  const service = new DocumentsService(
    documentsRepository,
    documentsAuthorization,
    storageAdapter,
    jobsService,
  );

  return { service, documentsRepository, documentsAuthorization, storageAdapter, jobsService };
}

describe('DocumentsService', () => {
  describe('initiateUpload — creacion exitosa', () => {
    it('usa el companyId y userId provistos por el llamador (nunca del DTO)', async () => {
      const { service, documentsRepository } = buildService();

      await service.initiateUpload(COMPANY_ID, USER_ID, DTO);

      expect(documentsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: COMPANY_ID, uploadedByUserId: USER_ID }),
      );
    });

    it('crea el documento en estado PENDING_UPLOAD', async () => {
      const { service, documentsRepository } = buildService();

      await service.initiateUpload(COMPANY_ID, USER_ID, DTO);

      // El repository fija PENDING_UPLOAD internamente; aqui verificamos
      // que el service no intenta sobreescribir el estado.
      const callArg = documentsRepository.create.mock.calls[0]![0];
      expect(callArg).not.toHaveProperty('status');
    });

    it('genera una key con aislamiento por empresa y sin el nombre original', async () => {
      const { service, documentsRepository } = buildService();

      await service.initiateUpload(COMPANY_ID, USER_ID, DTO);

      const callArg = documentsRepository.create.mock.calls[0]![0];
      expect(callArg.storageReference).toContain(`companies/${COMPANY_ID}/documents/`);
      expect(callArg.storageReference).not.toContain('factura-enero');
      expect(callArg.storageReference.startsWith('/')).toBe(false);
      expect(callArg.storageReference).not.toContain('..');
    });

    it('pasa mimeType como contentType al StorageAdapter', async () => {
      const { service, storageAdapter } = buildService();

      await service.initiateUpload(COMPANY_ID, USER_ID, DTO);

      expect(storageAdapter.getPresignedUploadUrl).toHaveBeenCalledWith(
        expect.any(String),
        DTO.mimeType,
      );
    });

    it('devuelve documentId, uploadUrl, expiresAt y status — nunca storageReference', async () => {
      const { service } = buildService();

      const result = await service.initiateUpload(COMPANY_ID, USER_ID, DTO);

      expect(result).toEqual({
        documentId: expect.any(String),
        uploadUrl: 'https://minio.local/contaia-documents/some-key?signature=...',
        expiresAt: new Date('2026-01-01T00:05:00.000Z'),
        status: DocumentStatus.PENDING_UPLOAD,
      });
      expect(result).not.toHaveProperty('storageReference');
    });
  });

  describe('seguridad — nombres de archivo hostiles no alteran la key', () => {
    const hostileFilenames = [
      '../../secret.xml',
      'C:\\temp\\file.xml',
      '../../../etc/passwd',
      'nombre con espacios y ñ/raro?.xml',
      '<script>alert(1)</script>.xml',
    ];

    it.each(hostileFilenames)(
      'originalFilename="%s" no aparece en la key generada',
      async (filename) => {
        const { service, documentsRepository } = buildService();

        await service.initiateUpload(COMPANY_ID, USER_ID, { ...DTO, originalFilename: filename });

        const callArg = documentsRepository.create.mock.calls[0]![0];
        expect(callArg.storageReference).toBe(`companies/${COMPANY_ID}/documents/${callArg.id}`);
        expect(callArg.storageReference).not.toContain('..');
        expect(callArg.storageReference).not.toContain('secret');
        expect(callArg.storageReference).not.toContain('passwd');
        expect(callArg.storageReference).not.toContain('\\');
        expect(callArg.storageReference).not.toContain('<script>');
      },
    );
  });

  describe('storage deshabilitado', () => {
    it('traduce STORAGE_DISABLED a DocumentStorageUnavailableException, sin exponer el error crudo', async () => {
      const { service } = buildService({
        storageAdapter: {
          getPresignedUploadUrl: jest
            .fn()
            .mockRejectedValue(
              new StorageError('STORAGE_DISABLED', 'El almacenamiento esta deshabilitado.'),
            ),
        },
      });

      await expect(service.initiateUpload(COMPANY_ID, USER_ID, DTO)).rejects.toBeInstanceOf(
        DocumentStorageUnavailableException,
      );
    });

    it('ejecuta la compensacion (elimina el documento recien creado)', async () => {
      const { service, documentsRepository } = buildService({
        storageAdapter: {
          getPresignedUploadUrl: jest
            .fn()
            .mockRejectedValue(
              new StorageError('STORAGE_DISABLED', 'El almacenamiento esta deshabilitado.'),
            ),
        },
      });

      await expect(service.initiateUpload(COMPANY_ID, USER_ID, DTO)).rejects.toThrow();

      expect(documentsRepository.deleteCreatedDocument).toHaveBeenCalledWith(
        expect.any(String),
        COMPANY_ID,
      );
    });
  });

  describe('error de storage (STORAGE_OPERATION_FAILED)', () => {
    it('traduce el error, ejecuta compensacion y no filtra secretos ni URL parcial', async () => {
      const { service, documentsRepository } = buildService({
        storageAdapter: {
          getPresignedUploadUrl: jest
            .fn()
            .mockRejectedValue(
              new StorageError('STORAGE_OPERATION_FAILED', 'No fue posible generar la URL.'),
            ),
        },
      });

      let caught: unknown;
      try {
        await service.initiateUpload(COMPANY_ID, USER_ID, DTO);
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(DocumentStorageUnavailableException);
      const message = (caught as Error).message;
      expect(message).not.toContain('http');
      expect(message).not.toMatch(/access|secret/i);
      expect(documentsRepository.deleteCreatedDocument).toHaveBeenCalledTimes(1);
    });

    it('no deja continuar la respuesta (la promesa se rechaza, no resuelve parcialmente)', async () => {
      const { service } = buildService({
        storageAdapter: {
          getPresignedUploadUrl: jest
            .fn()
            .mockRejectedValue(new StorageError('STORAGE_OPERATION_FAILED', 'boom')),
        },
      });

      await expect(service.initiateUpload(COMPANY_ID, USER_ID, DTO)).rejects.toBeDefined();
    });
  });

  describe('compensacion', () => {
    it('usa id y companyId del documento recien creado (tenant-safe)', async () => {
      const created = buildDocument({ id: 'doc-especifico' });
      const { service, documentsRepository } = buildService({
        documentsRepository: { create: jest.fn().mockResolvedValue(created) },
        storageAdapter: {
          getPresignedUploadUrl: jest
            .fn()
            .mockRejectedValue(new StorageError('STORAGE_OPERATION_FAILED', 'boom')),
        },
      });

      await expect(service.initiateUpload(COMPANY_ID, USER_ID, DTO)).rejects.toThrow();

      expect(documentsRepository.deleteCreatedDocument).toHaveBeenCalledWith(
        'doc-especifico',
        COMPANY_ID,
      );
    });

    it('no llama deleteObject() del StorageAdapter (nunca se subio nada)', async () => {
      const { service, storageAdapter } = buildService({
        storageAdapter: {
          getPresignedUploadUrl: jest
            .fn()
            .mockRejectedValue(new StorageError('STORAGE_OPERATION_FAILED', 'boom')),
        },
      });

      await expect(service.initiateUpload(COMPANY_ID, USER_ID, DTO)).rejects.toThrow();

      expect(storageAdapter.deleteObject).not.toHaveBeenCalled();
    });

    it('si la compensacion tambien falla, conserva el error de storage como respuesta', async () => {
      const { service } = buildService({
        documentsRepository: {
          deleteCreatedDocument: jest.fn().mockRejectedValue(new Error('DB connection lost')),
        },
        storageAdapter: {
          getPresignedUploadUrl: jest
            .fn()
            .mockRejectedValue(new StorageError('STORAGE_OPERATION_FAILED', 'boom')),
        },
      });

      await expect(service.initiateUpload(COMPANY_ID, USER_ID, DTO)).rejects.toBeInstanceOf(
        DocumentStorageUnavailableException,
      );
    });
  });

  describe('listForCompany — operacion exitosa', () => {
    it('usa el companyId del contexto para listar y contar', async () => {
      const { service, documentsRepository } = buildService();

      await service.listForCompany(COMPANY_ID, buildQuery());

      expect(documentsRepository.findManyByCompany).toHaveBeenCalledWith(
        COMPANY_ID,
        expect.anything(),
        expect.anything(),
      );
      expect(documentsRepository.countByCompany).toHaveBeenCalledWith(
        COMPANY_ID,
        expect.anything(),
      );
    });

    it('nunca pasa el companyId de otra empresa al repository', async () => {
      const { service, documentsRepository } = buildService();

      await service.listForCompany(COMPANY_ID, buildQuery());

      expect(documentsRepository.findManyByCompany).not.toHaveBeenCalledWith(
        OTHER_COMPANY_ID,
        expect.anything(),
        expect.anything(),
      );
    });

    it('aplica paginacion: page=2, pageSize=10 -> skip=10, take=10', async () => {
      const { service, documentsRepository } = buildService();

      await service.listForCompany(COMPANY_ID, buildQuery({ page: 2, pageSize: 10 }));

      expect(documentsRepository.findManyByCompany).toHaveBeenCalledWith(
        COMPANY_ID,
        expect.anything(),
        {
          skip: 10,
          take: 10,
        },
      );
    });

    it('pasa los filtros status/fileType al repository', async () => {
      const { service, documentsRepository } = buildService();

      await service.listForCompany(
        COMPANY_ID,
        buildQuery({ status: DocumentStatus.PROCESSED, fileType: DocumentFileType.XML }),
      );

      expect(documentsRepository.findManyByCompany).toHaveBeenCalledWith(
        COMPANY_ID,
        { status: DocumentStatus.PROCESSED, fileType: DocumentFileType.XML },
        expect.anything(),
      );
      expect(documentsRepository.countByCompany).toHaveBeenCalledWith(COMPANY_ID, {
        status: DocumentStatus.PROCESSED,
        fileType: DocumentFileType.XML,
      });
    });

    it('mapea los items sin exponer storageReference ni companyId', async () => {
      const { service } = buildService({
        documentsRepository: {
          findManyByCompany: jest.fn().mockResolvedValue([buildSummary()]),
          countByCompany: jest.fn().mockResolvedValue(1),
        },
      });

      const result = await service.listForCompany(COMPANY_ID, buildQuery());

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).not.toHaveProperty('storageReference');
      expect(result.items[0]).not.toHaveProperty('companyId');
      expect(Object.keys(result.items[0]!).sort()).toEqual(
        [
          'createdAt',
          'fileType',
          'id',
          'mimeType',
          'originalFilename',
          'rejectionReason',
          'sizeBytes',
          'status',
          'updatedAt',
        ].sort(),
      );
    });
  });

  describe('listForCompany — paginacion', () => {
    it('calcula totalPages correctamente (45 documentos, pageSize 20 -> 3 paginas)', async () => {
      const { service } = buildService({
        documentsRepository: {
          findManyByCompany: jest.fn().mockResolvedValue([]),
          countByCompany: jest.fn().mockResolvedValue(45),
        },
      });

      const result = await service.listForCompany(
        COMPANY_ID,
        buildQuery({ page: 1, pageSize: 20 }),
      );

      expect(result.pagination).toEqual({ page: 1, pageSize: 20, total: 45, totalPages: 3 });
    });

    it('respuesta vacia: total=0 -> items=[] y totalPages=0', async () => {
      const { service } = buildService({
        documentsRepository: {
          findManyByCompany: jest.fn().mockResolvedValue([]),
          countByCompany: jest.fn().mockResolvedValue(0),
        },
      });

      const result = await service.listForCompany(COMPANY_ID, buildQuery());

      expect(result.items).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });
  });

  describe('getById — autorizado', () => {
    it('devuelve el Documento cuando existe y la autorizacion pasa', async () => {
      const summary = buildSummary();
      const { service } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
      });

      const result = await service.getById(summary.id, USER_ID);

      expect(result.id).toBe(summary.id);
      expect(result.status).toBe(summary.status);
    });

    it('verifica la autorizacion con el companyId real del documento encontrado y el permiso document.read', async () => {
      const summary = buildSummary({ companyId: OTHER_COMPANY_ID });
      const { service, documentsAuthorization } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
      });

      await service.getById(summary.id, USER_ID);

      expect(documentsAuthorization.assertHasPermission).toHaveBeenCalledWith(
        USER_ID,
        OTHER_COMPANY_ID,
        'document.read',
      );
    });

    it('la respuesta no expone storageReference, companyId, Membership ni permisos', async () => {
      const summary = buildSummary();
      const { service } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
      });

      const result = await service.getById(summary.id, USER_ID);

      expect(result).not.toHaveProperty('storageReference');
      expect(result).not.toHaveProperty('companyId');
      expect(result).not.toHaveProperty('membership');
      expect(result).not.toHaveProperty('permissions');
    });
  });

  describe('getById — no autorizado (documento de otra empresa o sin permiso)', () => {
    it('propaga el error de autorizacion sin devolver el documento', async () => {
      const summary = buildSummary();
      const { service } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
        documentsAuthorization: {
          assertHasPermission: jest.fn().mockRejectedValue(new DocumentNotFoundException()),
        },
      });

      await expect(service.getById(summary.id, USER_ID)).rejects.toBeInstanceOf(
        DocumentNotFoundException,
      );
    });
  });

  describe('getById — documento inexistente', () => {
    it('lanza DocumentNotFoundException sin consultar autorizacion', async () => {
      const { service, documentsAuthorization } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(null) },
      });

      await expect(service.getById('no-existe', USER_ID)).rejects.toBeInstanceOf(
        DocumentNotFoundException,
      );
      expect(documentsAuthorization.assertHasPermission).not.toHaveBeenCalled();
    });

    it('el mensaje de "no encontrado" y "no autorizado" son identicos (no filtra existencia)', async () => {
      const { service: notFoundService } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(null) },
      });
      const { service: unauthorizedService } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(buildSummary()) },
        documentsAuthorization: {
          assertHasPermission: jest.fn().mockRejectedValue(new DocumentNotFoundException()),
        },
      });

      const [notFoundError, unauthorizedError] = await Promise.all([
        notFoundService.getById('x', USER_ID).catch((e) => e),
        unauthorizedService.getById('y', USER_ID).catch((e) => e),
      ]);

      expect((notFoundError as Error).message).toBe((unauthorizedError as Error).message);
    });
  });

  describe('confirmUpload — documento inexistente', () => {
    it('lanza DocumentNotFoundException sin consultar autorizacion ni Storage', async () => {
      const { service, documentsAuthorization, storageAdapter } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(null) },
      });

      await expect(service.confirmUpload('no-existe', USER_ID)).rejects.toBeInstanceOf(
        DocumentNotFoundException,
      );
      expect(documentsAuthorization.assertHasPermission).not.toHaveBeenCalled();
      expect(storageAdapter.getMetadata).not.toHaveBeenCalled();
    });
  });

  describe('confirmUpload — autorizacion', () => {
    it('verifica con el permiso document.upload (misma operacion que iniciar la carga)', async () => {
      const summary = buildSummary({ status: DocumentStatus.PENDING_UPLOAD });
      const { service, documentsAuthorization } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
      });

      await service.confirmUpload(summary.id, USER_ID);

      expect(documentsAuthorization.assertHasPermission).toHaveBeenCalledWith(
        USER_ID,
        summary.companyId,
        'document.upload',
      );
    });

    it('actor sin Membership (incluye administrador de plataforma sin Membership propia): propaga el error y no consulta Storage', async () => {
      const summary = buildSummary({ status: DocumentStatus.PENDING_UPLOAD });
      const { service, storageAdapter } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
        documentsAuthorization: {
          assertHasPermission: jest.fn().mockRejectedValue(new DocumentNotFoundException()),
        },
      });

      await expect(service.confirmUpload(summary.id, USER_ID)).rejects.toBeInstanceOf(
        DocumentNotFoundException,
      );
      expect(storageAdapter.getMetadata).not.toHaveBeenCalled();
    });

    it('actor sin el permiso document.upload: propaga el error y no consulta Storage', async () => {
      const summary = buildSummary({ status: DocumentStatus.PENDING_UPLOAD });
      const { service, storageAdapter } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
        documentsAuthorization: {
          assertHasPermission: jest.fn().mockRejectedValue(new DocumentNotFoundException()),
        },
      });

      await expect(service.confirmUpload(summary.id, USER_ID)).rejects.toBeInstanceOf(
        DocumentNotFoundException,
      );
      expect(storageAdapter.getMetadata).not.toHaveBeenCalled();
    });

    it('documento de otra empresa devuelve el mismo error que uno inexistente', async () => {
      const summaryOtherCompany = buildSummary({
        companyId: OTHER_COMPANY_ID,
        status: DocumentStatus.PENDING_UPLOAD,
      });
      const { service: unauthorizedService } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summaryOtherCompany) },
        documentsAuthorization: {
          assertHasPermission: jest.fn().mockRejectedValue(new DocumentNotFoundException()),
        },
      });
      const { service: notFoundService } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(null) },
      });

      const [unauthorizedError, notFoundError] = await Promise.all([
        unauthorizedService.confirmUpload('doc-otra-empresa', USER_ID).catch((e) => e),
        notFoundService.confirmUpload('doc-inexistente', USER_ID).catch((e) => e),
      ]);

      expect(unauthorizedError).toBeInstanceOf(DocumentNotFoundException);
      expect(notFoundError).toBeInstanceOf(DocumentNotFoundException);
      expect((unauthorizedError as Error).message).toBe((notFoundError as Error).message);
    });
  });

  describe('confirmUpload — estado invalido / ya confirmado (idempotente)', () => {
    it('si el documento ya esta en PROCESSING, devuelve el estado actual sin consultar Storage', async () => {
      const summary = buildSummary({ status: DocumentStatus.PROCESSING, sizeBytes: 4096 });
      const { service, storageAdapter, documentsRepository } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
      });

      const result = await service.confirmUpload(summary.id, USER_ID);

      expect(result.status).toBe(DocumentStatus.PROCESSING);
      expect(result.sizeBytes).toBe(4096);
      expect(storageAdapter.getMetadata).not.toHaveBeenCalled();
      expect(documentsRepository.confirmUpload).not.toHaveBeenCalled();
    });

    it('confirmacion repetida (llamar dos veces) no falla y no repite efectos', async () => {
      const pending = buildSummary({ status: DocumentStatus.PENDING_UPLOAD });
      const confirmed = buildSummary({ status: DocumentStatus.PROCESSING, sizeBytes: 2048 });
      const findById = jest.fn().mockResolvedValueOnce(pending).mockResolvedValue(confirmed);
      const { service, storageAdapter } = buildService({
        documentsRepository: { findById },
      });

      const first = await service.confirmUpload(pending.id, USER_ID);
      const second = await service.confirmUpload(pending.id, USER_ID);

      expect(first.status).toBe(DocumentStatus.PROCESSING);
      expect(second.status).toBe(DocumentStatus.PROCESSING);
      expect(storageAdapter.getMetadata).toHaveBeenCalledTimes(1); // solo en la primera, no en la idempotente
    });

    it('si el documento ya esta en PROCESSED (aguas abajo de una carga ya verificada), devuelve el estado actual sin consultar Storage', async () => {
      const summary = buildSummary({ status: DocumentStatus.PROCESSED });
      const { service, storageAdapter, documentsRepository } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
      });

      const result = await service.confirmUpload(summary.id, USER_ID);

      expect(result.status).toBe(DocumentStatus.PROCESSED);
      expect(storageAdapter.getMetadata).not.toHaveBeenCalled();
      expect(documentsRepository.confirmUpload).not.toHaveBeenCalled();
    });
  });

  describe('confirmUpload — estados incompatibles (REJECTED)', () => {
    it('si el documento ya esta REJECTED, lanza DocumentUploadNotVerifiedException (nunca lo trata como exito) y no consulta Storage', async () => {
      const summary = buildSummary({
        status: DocumentStatus.REJECTED,
        rejectionReason: 'XML mal formado',
      });
      const { service, storageAdapter, documentsRepository } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
      });

      await expect(service.confirmUpload(summary.id, USER_ID)).rejects.toBeInstanceOf(
        DocumentUploadNotVerifiedException,
      );
      expect(storageAdapter.getMetadata).not.toHaveBeenCalled();
      expect(documentsRepository.confirmUpload).not.toHaveBeenCalled();
    });

    it('el mensaje publico de REJECTED no revela informacion tenant ni el motivo de rechazo', async () => {
      const summary = buildSummary({
        status: DocumentStatus.REJECTED,
        rejectionReason: 'XML mal formado',
      });
      const { service } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
      });

      let caught: unknown;
      try {
        await service.confirmUpload(summary.id, USER_ID);
      } catch (error) {
        caught = error;
      }

      const message = (caught as Error).message;
      expect(message).not.toContain('XML mal formado');
      expect(message).not.toContain(summary.companyId);
    });
  });

  describe('confirmUpload — verificacion de Storage', () => {
    it('objeto inexistente en Storage (getMetadata devuelve null): lanza DocumentUploadNotVerifiedException y no transiciona', async () => {
      const summary = buildSummary({ status: DocumentStatus.PENDING_UPLOAD });
      const { service, documentsRepository } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
        storageAdapter: { getMetadata: jest.fn().mockResolvedValue(null) },
      });

      await expect(service.confirmUpload(summary.id, USER_ID)).rejects.toBeInstanceOf(
        DocumentUploadNotVerifiedException,
      );
      expect(documentsRepository.confirmUpload).not.toHaveBeenCalled();
    });

    it('archivo vacio (sizeBytes=0): lanza DocumentUploadNotVerifiedException y no transiciona', async () => {
      const summary = buildSummary({ status: DocumentStatus.PENDING_UPLOAD });
      const { service, documentsRepository } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
        storageAdapter: {
          getMetadata: jest
            .fn()
            .mockResolvedValue({ sizeBytes: 0, contentType: 'application/xml', etag: null }),
        },
      });

      await expect(service.confirmUpload(summary.id, USER_ID)).rejects.toBeInstanceOf(
        DocumentUploadNotVerifiedException,
      );
      expect(documentsRepository.confirmUpload).not.toHaveBeenCalled();
    });

    it('content type de Storage inconsistente con el declarado: lanza DocumentUploadNotVerifiedException', async () => {
      const summary = buildSummary({
        status: DocumentStatus.PENDING_UPLOAD,
        mimeType: 'application/xml',
      });
      const { service, documentsRepository } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
        storageAdapter: {
          getMetadata: jest
            .fn()
            .mockResolvedValue({ sizeBytes: 1024, contentType: 'application/pdf', etag: null }),
        },
      });

      await expect(service.confirmUpload(summary.id, USER_ID)).rejects.toBeInstanceOf(
        DocumentUploadNotVerifiedException,
      );
      expect(documentsRepository.confirmUpload).not.toHaveBeenCalled();
    });

    it('content type con distinta capitalizacion no se trata como inconsistente (comparacion normalizada)', async () => {
      const summary = buildSummary({
        status: DocumentStatus.PENDING_UPLOAD,
        mimeType: 'application/xml',
      });
      const { service, documentsRepository } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
        storageAdapter: {
          getMetadata: jest
            .fn()
            .mockResolvedValue({ sizeBytes: 1024, contentType: 'APPLICATION/XML', etag: null }),
        },
      });

      await expect(service.confirmUpload(summary.id, USER_ID)).resolves.toBeDefined();
      expect(documentsRepository.confirmUpload).toHaveBeenCalled();
    });

    it('content type con espacios alrededor no se trata como inconsistente (comparacion normalizada)', async () => {
      const summary = buildSummary({
        status: DocumentStatus.PENDING_UPLOAD,
        mimeType: 'application/xml',
      });
      const { service, documentsRepository } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
        storageAdapter: {
          getMetadata: jest
            .fn()
            .mockResolvedValue({ sizeBytes: 1024, contentType: '  application/xml  ', etag: null }),
        },
      });

      await expect(service.confirmUpload(summary.id, USER_ID)).resolves.toBeDefined();
      expect(documentsRepository.confirmUpload).toHaveBeenCalled();
    });

    it('content type con parametro charset no se trata como inconsistente (solo se compara el tipo MIME principal)', async () => {
      const summary = buildSummary({
        status: DocumentStatus.PENDING_UPLOAD,
        mimeType: 'application/xml',
      });
      const { service, documentsRepository } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
        storageAdapter: {
          getMetadata: jest.fn().mockResolvedValue({
            sizeBytes: 1024,
            contentType: 'application/xml; charset=utf-8',
            etag: null,
          }),
        },
      });

      await expect(service.confirmUpload(summary.id, USER_ID)).resolves.toBeDefined();
      expect(documentsRepository.confirmUpload).toHaveBeenCalled();
    });

    it('content type de un MIME completamente distinto (con o sin charset) SI se rechaza — sin coincidencia parcial', async () => {
      const summary = buildSummary({
        status: DocumentStatus.PENDING_UPLOAD,
        mimeType: 'application/xml',
      });
      const { service, documentsRepository } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
        storageAdapter: {
          getMetadata: jest.fn().mockResolvedValue({
            sizeBytes: 1024,
            contentType: 'application/pdf; charset=utf-8',
            etag: null,
          }),
        },
      });

      await expect(service.confirmUpload(summary.id, USER_ID)).rejects.toBeInstanceOf(
        DocumentUploadNotVerifiedException,
      );
      expect(documentsRepository.confirmUpload).not.toHaveBeenCalled();
    });

    it('content type ausente en la metadata de Storage no bloquea la confirmacion (no todo backend lo reporta)', async () => {
      const summary = buildSummary({ status: DocumentStatus.PENDING_UPLOAD });
      const { service } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
        storageAdapter: {
          getMetadata: jest
            .fn()
            .mockResolvedValue({ sizeBytes: 1024, contentType: null, etag: null }),
        },
      });

      await expect(service.confirmUpload(summary.id, USER_ID)).resolves.toBeDefined();
    });

    it('metadata valida: transiciona correctamente con el tamaño real reportado por Storage', async () => {
      const summary = buildSummary({ status: DocumentStatus.PENDING_UPLOAD });
      const { service, documentsRepository } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
        storageAdapter: {
          getMetadata: jest
            .fn()
            .mockResolvedValue({ sizeBytes: 5000, contentType: 'application/xml', etag: '"x"' }),
        },
      });

      await service.confirmUpload(summary.id, USER_ID);

      expect(documentsRepository.confirmUpload).toHaveBeenCalledWith(
        summary.id,
        summary.companyId,
        5000,
      );
    });

    it('error del proveedor de Storage: traduce a DocumentStorageUnavailableException y no transiciona', async () => {
      const summary = buildSummary({ status: DocumentStatus.PENDING_UPLOAD });
      const { service, documentsRepository } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
        storageAdapter: {
          getMetadata: jest
            .fn()
            .mockRejectedValue(new StorageError('STORAGE_OPERATION_FAILED', 'boom')),
        },
      });

      await expect(service.confirmUpload(summary.id, USER_ID)).rejects.toBeInstanceOf(
        DocumentStorageUnavailableException,
      );
      expect(documentsRepository.confirmUpload).not.toHaveBeenCalled();
    });
  });

  describe('confirmUpload — transicion y concurrencia', () => {
    it('transicion exitosa: llama al repository con (id, companyId, sizeBytes) y devuelve el documento actualizado', async () => {
      const summary = buildSummary({ status: DocumentStatus.PENDING_UPLOAD });
      const confirmedSummary = buildSummary({ status: DocumentStatus.PROCESSING, sizeBytes: 3000 });
      const findById = jest
        .fn()
        .mockResolvedValueOnce(summary)
        .mockResolvedValueOnce(confirmedSummary);
      const { service, documentsRepository } = buildService({
        documentsRepository: {
          findById,
          confirmUpload: jest.fn().mockResolvedValue(true),
        },
        storageAdapter: {
          getMetadata: jest
            .fn()
            .mockResolvedValue({ sizeBytes: 3000, contentType: 'application/xml', etag: null }),
        },
      });

      const result = await service.confirmUpload(summary.id, USER_ID);

      expect(documentsRepository.confirmUpload).toHaveBeenCalledWith(
        summary.id,
        summary.companyId,
        3000,
      );
      expect(result.status).toBe(DocumentStatus.PROCESSING);
      expect(result.sizeBytes).toBe(3000);
    });

    it('confirmacion concurrente: si pierde la carrera (count=0), re-consulta y devuelve el estado actual sin fallar', async () => {
      const summary = buildSummary({ status: DocumentStatus.PENDING_UPLOAD });
      const winnerState = buildSummary({ status: DocumentStatus.PROCESSING, sizeBytes: 999 });
      const findById = jest.fn().mockResolvedValueOnce(summary).mockResolvedValueOnce(winnerState);
      const { service } = buildService({
        documentsRepository: {
          findById,
          confirmUpload: jest.fn().mockResolvedValue(false), // perdio la carrera
        },
      });

      const result = await service.confirmUpload(summary.id, USER_ID);

      expect(result.status).toBe(DocumentStatus.PROCESSING);
      expect(result.sizeBytes).toBe(999);
    });

    it('confirmacion concurrente que termina en REJECTED (estado incompatible): devuelve conflicto, no exito', async () => {
      const summary = buildSummary({ status: DocumentStatus.PENDING_UPLOAD });
      const rejectedState = buildSummary({
        status: DocumentStatus.REJECTED,
        rejectionReason: 'XML invalido',
      });
      const findById = jest
        .fn()
        .mockResolvedValueOnce(summary)
        .mockResolvedValueOnce(rejectedState);
      const { service } = buildService({
        documentsRepository: {
          findById,
          confirmUpload: jest.fn().mockResolvedValue(false), // perdio la carrera
        },
      });

      await expect(service.confirmUpload(summary.id, USER_ID)).rejects.toBeInstanceOf(
        DocumentUploadNotVerifiedException,
      );
    });
  });

  describe('confirmUpload — respuesta segura', () => {
    it('no expone storageReference, companyId, Membership ni permisos', async () => {
      const summary = buildSummary({ status: DocumentStatus.PENDING_UPLOAD });
      const { service } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
      });

      const result = await service.confirmUpload(summary.id, USER_ID);

      expect(result).not.toHaveProperty('storageReference');
      expect(result).not.toHaveProperty('companyId');
      expect(result).not.toHaveProperty('membership');
      expect(result).not.toHaveProperty('permissions');
    });

    it('no acepta ni usa un storage key/companyId suministrado por el cliente (la firma del metodo no lo permite)', async () => {
      const summary = buildSummary({ status: DocumentStatus.PENDING_UPLOAD });
      const { service, storageAdapter } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
      });

      await service.confirmUpload(summary.id, USER_ID);

      // getMetadata siempre se llama con el storageReference PERSISTIDO
      // (del documento cargado por id), nunca con un valor que pudiera
      // haber llegado por parametro adicional del llamador.
      expect(storageAdapter.getMetadata).toHaveBeenCalledWith(summary.storageReference);
    });
  });

  describe('confirmUpload — Bloque D: asegurar el Job de extraccion XML', () => {
    it('primera confirmacion (PENDING_UPLOAD -> PROCESSING): asegura el Job despues de transicionar', async () => {
      const pending = buildSummary({ status: DocumentStatus.PENDING_UPLOAD });
      const confirmed = buildSummary({ status: DocumentStatus.PROCESSING, sizeBytes: 3000 });
      const findById = jest.fn().mockResolvedValueOnce(pending).mockResolvedValueOnce(confirmed);
      const { service, jobsService } = buildService({
        documentsRepository: { findById, confirmUpload: jest.fn().mockResolvedValue(true) },
        storageAdapter: {
          getMetadata: jest
            .fn()
            .mockResolvedValue({ sizeBytes: 3000, contentType: 'application/xml', etag: null }),
        },
      });

      await service.confirmUpload(pending.id, USER_ID);

      expect(jobsService.ensureXmlExtractionJob).toHaveBeenCalledWith(
        confirmed.companyId,
        confirmed.id,
      );
      expect(jobsService.ensureXmlExtractionJob).toHaveBeenCalledTimes(1);
    });

    it('documento ya en PROCESSING: asegura (crea/recupera/reencola) el Job sin volver a consultar Storage', async () => {
      const summary = buildSummary({ status: DocumentStatus.PROCESSING, sizeBytes: 4096 });
      const { service, jobsService, storageAdapter } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
      });

      const result = await service.confirmUpload(summary.id, USER_ID);

      expect(jobsService.ensureXmlExtractionJob).toHaveBeenCalledWith(
        summary.companyId,
        summary.id,
      );
      expect(storageAdapter.getMetadata).not.toHaveBeenCalled();
      expect(result.status).toBe(DocumentStatus.PROCESSING);
    });

    it('PROCESSING repara la ausencia del Job (mismo llamado que la confirmacion normal; JobsService decide crear o recuperar)', async () => {
      const summary = buildSummary({ status: DocumentStatus.PROCESSING });
      const { service, jobsService } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
      });

      await service.confirmUpload(summary.id, USER_ID);

      // DocumentsService no distingue "reparar" de "asegurar" — siempre
      // delega la idempotencia a JobsService.ensureXmlExtractionJob.
      expect(jobsService.ensureXmlExtractionJob).toHaveBeenCalledTimes(1);
    });

    it('documento en PROCESSED: NO toca Jobs (la extraccion ya termino)', async () => {
      const summary = buildSummary({ status: DocumentStatus.PROCESSED });
      const { service, jobsService } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
      });

      await service.confirmUpload(summary.id, USER_ID);

      expect(jobsService.ensureXmlExtractionJob).not.toHaveBeenCalled();
    });

    it('documento REJECTED: NO toca Jobs (conflicto, nunca se asegura un Job para una carga rechazada)', async () => {
      const summary = buildSummary({ status: DocumentStatus.REJECTED, rejectionReason: 'motivo' });
      const { service, jobsService } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
      });

      await expect(service.confirmUpload(summary.id, USER_ID)).rejects.toBeInstanceOf(
        DocumentUploadNotVerifiedException,
      );
      expect(jobsService.ensureXmlExtractionJob).not.toHaveBeenCalled();
    });

    it('la autorizacion ocurre antes que cualquier operacion de Jobs', async () => {
      const summary = buildSummary({ status: DocumentStatus.PENDING_UPLOAD });
      const callOrder: string[] = [];
      const { service } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
        documentsAuthorization: {
          assertHasPermission: jest.fn().mockImplementation(async () => {
            callOrder.push('authorize');
          }),
        },
        jobsService: {
          ensureXmlExtractionJob: jest.fn().mockImplementation(async () => {
            callOrder.push('jobs');
          }),
        },
      });

      await service.confirmUpload(summary.id, USER_ID);

      expect(callOrder).toEqual(['authorize', 'jobs']);
    });

    it('actor sin Membership/permiso: nunca llega a tocar JobsService', async () => {
      const summary = buildSummary({ status: DocumentStatus.PENDING_UPLOAD });
      const { service, jobsService } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
        documentsAuthorization: {
          assertHasPermission: jest.fn().mockRejectedValue(new DocumentNotFoundException()),
        },
      });

      await expect(service.confirmUpload(summary.id, USER_ID)).rejects.toBeInstanceOf(
        DocumentNotFoundException,
      );
      expect(jobsService.ensureXmlExtractionJob).not.toHaveBeenCalled();
    });

    it('documento de otro tenant (via race hacia PROCESSING) tambien pasa por autorizacion antes de tocar Jobs', async () => {
      const summary = buildSummary({
        companyId: OTHER_COMPANY_ID,
        status: DocumentStatus.PROCESSING,
      });
      const { service, documentsAuthorization, jobsService } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
      });

      await service.confirmUpload(summary.id, USER_ID);

      expect(documentsAuthorization.assertHasPermission).toHaveBeenCalledWith(
        USER_ID,
        OTHER_COMPANY_ID,
        'document.upload',
      );
      expect(jobsService.ensureXmlExtractionJob).toHaveBeenCalledWith(OTHER_COMPANY_ID, summary.id);
    });

    it('carrera concurrente que termina en PROCESSING (perdedora): asegura el Job igual que la ganadora — un solo Job logico', async () => {
      const pending = buildSummary({ status: DocumentStatus.PENDING_UPLOAD });
      const winnerState = buildSummary({ status: DocumentStatus.PROCESSING, sizeBytes: 999 });
      const findById = jest.fn().mockResolvedValueOnce(pending).mockResolvedValueOnce(winnerState);
      const { service, jobsService } = buildService({
        documentsRepository: {
          findById,
          confirmUpload: jest.fn().mockResolvedValue(false), // perdio la carrera
        },
      });

      await service.confirmUpload(pending.id, USER_ID);

      // El id determinista garantiza que esta llamada y la de la solicitud
      // ganadora apuntan al mismo Job logico — no hace falta simular la
      // otra solicitud para verificarlo, JobsService lo garantiza.
      expect(jobsService.ensureXmlExtractionJob).toHaveBeenCalledWith(
        winnerState.companyId,
        winnerState.id,
      );
    });

    it('fallo al asegurar el Job (JobsError): traduce a DocumentProcessingUnavailableException, sin filtrar el error crudo', async () => {
      const pending = buildSummary({ status: DocumentStatus.PENDING_UPLOAD });
      const confirmed = buildSummary({ status: DocumentStatus.PROCESSING });
      const findById = jest.fn().mockResolvedValueOnce(pending).mockResolvedValueOnce(confirmed);
      const { service } = buildService({
        documentsRepository: { findById, confirmUpload: jest.fn().mockResolvedValue(true) },
        jobsService: {
          ensureXmlExtractionJob: jest
            .fn()
            .mockRejectedValue(new JobsError('JOBS_OPERATION_FAILED', 'detalle interno de BullMQ')),
        },
      });

      const error = await service
        .confirmUpload(pending.id, USER_ID)
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(DocumentProcessingUnavailableException);
      expect((error as Error).message).not.toContain('BullMQ');
    });

    it('el Documento NO revierte a PENDING_UPLOAD cuando falla el aseguramiento del Job (no hay rollback automatico)', async () => {
      const pending = buildSummary({ status: DocumentStatus.PENDING_UPLOAD });
      const confirmed = buildSummary({ status: DocumentStatus.PROCESSING });
      const findById = jest.fn().mockResolvedValueOnce(pending).mockResolvedValueOnce(confirmed);
      const confirmUploadMock = jest.fn().mockResolvedValue(true);
      const { service } = buildService({
        documentsRepository: { findById, confirmUpload: confirmUploadMock },
        jobsService: {
          ensureXmlExtractionJob: jest.fn().mockRejectedValue(new JobsError('JOBS_DISABLED', 'x')),
        },
      });

      await expect(service.confirmUpload(pending.id, USER_ID)).rejects.toBeInstanceOf(
        DocumentProcessingUnavailableException,
      );
      // La transicion atomica ya se ejecuto (una sola vez) antes del fallo
      // de Jobs — no se llama de nuevo para "deshacerla".
      expect(confirmUploadMock).toHaveBeenCalledTimes(1);
    });

    it('la respuesta publica nunca incluye jobId, nombre de cola ni ningun dato de Jobs', async () => {
      const summary = buildSummary({ status: DocumentStatus.PENDING_UPLOAD });
      const { service } = buildService({
        documentsRepository: { findById: jest.fn().mockResolvedValue(summary) },
      });

      const result = await service.confirmUpload(summary.id, USER_ID);

      expect(result).not.toHaveProperty('jobId');
      expect(result).not.toHaveProperty('job');
      expect(result).not.toHaveProperty('queueName');
    });
  });
});
