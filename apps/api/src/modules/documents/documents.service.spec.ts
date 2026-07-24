import { DocumentStatus, DocumentFileType, type Document } from '@contaia/database';

import { StorageError } from '../storage/storage.errors';
import type { PresignedUrl, StorageAdapter } from '../storage/storage.interface';

import { DocumentStorageUnavailableException } from './documents.errors';
import { DocumentsRepository } from './documents.repository';
import { DocumentsService } from './documents.service';
import type { UploadDocumentDto } from './dto/upload-document.dto';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
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

function buildService(
  overrides: {
    documentsRepository?: Partial<jest.Mocked<DocumentsRepository>>;
    storageAdapter?: Partial<jest.Mocked<StorageAdapter>>;
  } = {},
) {
  const documentsRepository = {
    create: jest.fn().mockResolvedValue(buildDocument()),
    deleteCreatedDocument: jest.fn().mockResolvedValue(undefined),
    ...overrides.documentsRepository,
  } as unknown as jest.Mocked<DocumentsRepository>;

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

  const service = new DocumentsService(documentsRepository, storageAdapter);

  return { service, documentsRepository, storageAdapter };
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
});
