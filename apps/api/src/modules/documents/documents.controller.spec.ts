import { DocumentStatus, DocumentFileType } from '@contaia/database';
import { HttpStatus } from '@nestjs/common';

import { PERMISSIONS_METADATA_KEY } from '../../common/decorators/permissions.decorator';
import { AuthenticationGuard } from '../../common/guards/authentication.guard';
import { CompanyGuard } from '../../common/guards/company.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import type {
  RequestMembership,
  RequestUser,
} from '../../common/interfaces/request-context.interface';

import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import type { ListDocumentsQueryDto } from './dto/list-documents-query.dto';
import type { UploadDocumentDto } from './dto/upload-document.dto';

// Claves de metadata internas y estables de NestJS 10 (@nestjs/common/constants.js),
// no reexportadas por el barrel publico — se usan como literales para no
// depender de una ruta de import interna del framework.
const GUARDS_METADATA = '__guards__';
const HTTP_CODE_METADATA = '__httpCode__';
const PATH_METADATA = 'path';
const METHOD_METADATA = 'method';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const USER_ID = '22222222-2222-2222-2222-222222222222';

function buildController(
  overrides: { documentsService?: Partial<jest.Mocked<DocumentsService>> } = {},
) {
  const documentsService = {
    initiateUpload: jest.fn().mockResolvedValue({
      documentId: '33333333-3333-3333-3333-333333333333',
      uploadUrl: 'https://minio.local/contaia-documents/some-key?signature=...',
      expiresAt: new Date('2026-01-01T00:05:00.000Z'),
      status: DocumentStatus.PENDING_UPLOAD,
    }),
    listForCompany: jest.fn().mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    }),
    getById: jest.fn().mockResolvedValue({
      id: '44444444-4444-4444-4444-444444444444',
      originalFilename: 'factura.xml',
      fileType: DocumentFileType.XML,
      mimeType: 'application/xml',
      sizeBytes: 2048,
      status: DocumentStatus.PROCESSED,
      rejectionReason: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    }),
    ...overrides.documentsService,
  } as unknown as jest.Mocked<DocumentsService>;

  const controller = new DocumentsController(documentsService);

  return { controller, documentsService };
}

describe('DocumentsController', () => {
  describe('metadata de la ruta initiateUpload', () => {
    const handler = DocumentsController.prototype.initiateUpload;

    it('declara la ruta y el metodo correctos (POST companies/:companyId/documents)', () => {
      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('companies/:companyId/documents');
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(1); // RequestMethod.POST
    });

    it('declara los guards AuthenticationGuard, CompanyGuard y PermissionGuard en ese orden', () => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, handler);
      expect(guards).toEqual([AuthenticationGuard, CompanyGuard, PermissionGuard]);
    });

    it('declara el permiso document.upload', () => {
      const permissions = Reflect.getMetadata(PERMISSIONS_METADATA_KEY, handler);
      expect(permissions).toEqual(['document.upload']);
    });

    it('declara el codigo HTTP 202 Accepted', () => {
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.ACCEPTED);
    });
  });

  describe('initiateUpload — delegacion y forma de la respuesta', () => {
    const membership = { companyId: COMPANY_ID } as RequestMembership;
    const user = { id: USER_ID } as RequestUser;
    const dto: UploadDocumentDto = {
      originalFilename: 'factura.xml',
      mimeType: 'application/xml',
      fileType: DocumentFileType.XML,
    };

    it('delega en DocumentsService.initiateUpload con companyId y userId del contexto, nunca del DTO', async () => {
      const { controller, documentsService } = buildController();

      await controller.initiateUpload(membership, user, dto);

      expect(documentsService.initiateUpload).toHaveBeenCalledWith(COMPANY_ID, USER_ID, dto);
    });

    it('la respuesta solo contiene documentId, uploadUrl, expiresAt y status', async () => {
      const { controller } = buildController();

      const result = await controller.initiateUpload(membership, user, dto);

      expect(Object.keys(result).sort()).toEqual([
        'documentId',
        'expiresAt',
        'status',
        'uploadUrl',
      ]);
      expect(result.status).toBe(DocumentStatus.PENDING_UPLOAD);
    });
  });

  describe('metadata de la ruta list', () => {
    const handler = DocumentsController.prototype.list;

    it('declara la ruta y el metodo correctos (GET companies/:companyId/documents)', () => {
      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('companies/:companyId/documents');
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(0); // RequestMethod.GET
    });

    it('declara los guards AuthenticationGuard, CompanyGuard y PermissionGuard en ese orden', () => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, handler);
      expect(guards).toEqual([AuthenticationGuard, CompanyGuard, PermissionGuard]);
    });

    it('declara el permiso document.read', () => {
      const permissions = Reflect.getMetadata(PERMISSIONS_METADATA_KEY, handler);
      expect(permissions).toEqual(['document.read']);
    });
  });

  describe('list — delegacion y forma de la respuesta', () => {
    const membership = { companyId: COMPANY_ID } as RequestMembership;
    const query = { page: 1, pageSize: 20 } as ListDocumentsQueryDto;

    it('delega en DocumentsService.listForCompany con el companyId del contexto', async () => {
      const { controller, documentsService } = buildController();

      await controller.list(membership, query);

      expect(documentsService.listForCompany).toHaveBeenCalledWith(COMPANY_ID, query);
    });

    it('devuelve exactamente lo que produce el service (items + pagination)', async () => {
      const { controller } = buildController();

      const result = await controller.list(membership, query);

      expect(Object.keys(result).sort()).toEqual(['items', 'pagination']);
    });
  });

  describe('metadata de la ruta getById', () => {
    const handler = DocumentsController.prototype.getById;

    it('declara la ruta y el metodo correctos (GET documents/:documentId)', () => {
      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('documents/:documentId');
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(0); // RequestMethod.GET
    });

    it('declara UNICAMENTE AuthenticationGuard — nunca CompanyGuard (no hay companyId en el path)', () => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, handler);
      expect(guards).toEqual([AuthenticationGuard]);
    });

    it('no declara ningun permiso a nivel de decorador (se resuelve dentro del service)', () => {
      const permissions = Reflect.getMetadata(PERMISSIONS_METADATA_KEY, handler);
      expect(permissions).toBeUndefined();
    });
  });

  describe('getById — delegacion', () => {
    it('delega en DocumentsService.getById con el documentId de la ruta y el userId autenticado', async () => {
      const { controller, documentsService } = buildController();
      const user = { id: USER_ID } as RequestUser;

      await controller.getById('doc-1', user);

      expect(documentsService.getById).toHaveBeenCalledWith('doc-1', USER_ID);
    });
  });
});
