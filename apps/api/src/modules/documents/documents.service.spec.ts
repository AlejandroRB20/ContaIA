import { DocumentStatus, DocumentFileType, type Document } from '@contaia/database';

import { StorageError } from '../storage/storage.errors';
import type { PresignedUrl, StorageAdapter } from '../storage/storage.interface';

import { DocumentsAuthorizationService } from './documents-authorization.service';
import { DocumentNotFoundException, DocumentStorageUnavailableException } from './documents.errors';
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
  } = {},
) {
  const documentsRepository = {
    create: jest.fn().mockResolvedValue(buildDocument()),
    deleteCreatedDocument: jest.fn().mockResolvedValue(undefined),
    findManyByCompany: jest.fn().mockResolvedValue([]),
    countByCompany: jest.fn().mockResolvedValue(0),
    findById: jest.fn().mockResolvedValue(null),
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
    deleteObject: jest.fn(),
    ...overrides.storageAdapter,
  } as unknown as jest.Mocked<StorageAdapter>;

  const service = new DocumentsService(documentsRepository, documentsAuthorization, storageAdapter);

  return { service, documentsRepository, documentsAuthorization, storageAdapter };
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
});
