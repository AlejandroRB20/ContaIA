import { randomUUID } from 'node:crypto';

import type { DocumentFileType, DocumentStatus } from '@contaia/database';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { StorageError } from '../storage/storage.errors';
import { STORAGE_ADAPTER, type StorageAdapter } from '../storage/storage.interface';

import { DocumentsAuthorizationService } from './documents-authorization.service';
import { DocumentNotFoundException, DocumentStorageUnavailableException } from './documents.errors';
import type { DocumentListFilters, DocumentSummary } from './documents.repository';
import { DocumentsRepository } from './documents.repository';
import type { ListDocumentsQueryDto } from './dto/list-documents-query.dto';
import type { UploadDocumentDto } from './dto/upload-document.dto';

const DOCUMENT_READ_PERMISSION = 'document.read';

export interface InitiateUploadResult {
  documentId: string;
  uploadUrl: string;
  expiresAt: Date;
  status: DocumentStatus;
}

export interface DocumentSummaryResult {
  id: string;
  originalFilename: string;
  fileType: DocumentFileType;
  mimeType: string;
  sizeBytes: number | null;
  status: DocumentStatus;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationResult {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedDocumentsResult {
  items: DocumentSummaryResult[];
  pagination: PaginationResult;
}

/**
 * Bloques A y B de EWO-005 (docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md).
 * `initiateUpload` (Bloque A): inicia la carga devolviendo una URL
 * prefirmada. `listForCompany`/`getById` (Bloque B): listado paginado y
 * consulta individual, ambos tenant-safe. `companyId`/`uploadedByUserId`
 * siempre llegan ya resueltos por el controlador (via
 * `@Company()`/`@CurrentUser()`) — este servicio nunca los toma del body
 * ni del query.
 */
@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly documentsRepository: DocumentsRepository,
    private readonly documentsAuthorization: DocumentsAuthorizationService,
    @Inject(STORAGE_ADAPTER) private readonly storageAdapter: StorageAdapter,
  ) {}

  async initiateUpload(
    companyId: string,
    uploadedByUserId: string,
    dto: UploadDocumentDto,
  ): Promise<InitiateUploadResult> {
    const documentId = randomUUID();
    const storageReference = this.buildObjectKey(companyId, documentId);

    const document = await this.documentsRepository.create({
      id: documentId,
      companyId,
      uploadedByUserId,
      originalFilename: dto.originalFilename,
      fileType: dto.fileType,
      mimeType: dto.mimeType,
      storageReference,
    });

    try {
      const presigned = await this.storageAdapter.getPresignedUploadUrl(
        storageReference,
        dto.mimeType,
      );

      return {
        documentId: document.id,
        uploadUrl: presigned.url,
        expiresAt: presigned.expiresAt,
        status: document.status,
      };
    } catch (error) {
      await this.compensateFailedCreate(document.id, companyId);
      throw this.translateStorageError(error);
    }
  }

  /**
   * API-0024 — listado tenant-safe y paginado. `companyId` llega ya
   * resuelto por el controlador (via `@Company()`), nunca del query.
   * Filtros limitados a `status`/`fileType`; orden fijo aplicado por el
   * repository (`createdAt DESC, id DESC`).
   */
  async listForCompany(
    companyId: string,
    query: ListDocumentsQueryDto,
  ): Promise<PaginatedDocumentsResult> {
    const filters: DocumentListFilters = { status: query.status, fileType: query.fileType };
    const skip = (query.page - 1) * query.pageSize;

    const [items, total] = await Promise.all([
      this.documentsRepository.findManyByCompany(companyId, filters, {
        skip,
        take: query.pageSize,
      }),
      this.documentsRepository.countByCompany(companyId, filters),
    ]);

    return {
      items: items.map((document) => this.toSummaryResult(document)),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  /**
   * API-0025 — ruta plana (`GET /documents/{documentId}`, sin `companyId`
   * en el path). Carga el Documento por id UNICAMENTE para descubrir su
   * `companyId`; ningun campo se devuelve al llamador hasta que
   * `DocumentsAuthorizationService.assertHasPermission` confirma Membership
   * activa + `document.read` en esa Empresa. Documento inexistente y
   * documento existente-pero-no-autorizado devuelven el mismo
   * `DocumentNotFoundException` (404) — nunca se filtra la existencia de
   * un Documento de otra Empresa.
   */
  async getById(documentId: string, actorUserId: string): Promise<DocumentSummaryResult> {
    const document = await this.documentsRepository.findById(documentId);
    if (!document) {
      throw new DocumentNotFoundException();
    }

    await this.documentsAuthorization.assertHasPermission(
      actorUserId,
      document.companyId,
      DOCUMENT_READ_PERMISSION,
    );

    return this.toSummaryResult(document);
  }

  private toSummaryResult(document: DocumentSummary): DocumentSummaryResult {
    return {
      id: document.id,
      originalFilename: document.originalFilename,
      fileType: document.fileType,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      status: document.status,
      rejectionReason: document.rejectionReason,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  /**
   * `companyId` y `documentId` son ambos generados/resueltos en el
   * servidor — nunca se deriva de `originalFilename`, MIME type,
   * contenido, RFC, correo o nombre de la Empresa (docs/11_SECURITY_
   * ARCHITECTURE.md seccion 16: "Rutas de almacenamiento generadas por el
   * sistema, nunca derivadas del nombre proporcionado por el Usuario").
   */
  private buildObjectKey(companyId: string, documentId: string): string {
    return `companies/${companyId}/documents/${documentId}`;
  }

  /**
   * Compensacion: el registro Document se creo, pero la URL prefirmada
   * nunca se genero, asi que el cliente no tiene forma de subir nada —
   * el registro quedaria huerfano en PENDING_UPLOAD para siempre. Se
   * elimina UNICAMENTE ese registro (tenant-safe, via id+companyId). No se
   * llama `deleteObject()` de Storage: nunca se llego a solicitar el
   * objeto en el almacenamiento. Si la compensacion tambien falla, se
   * registra internamente (sin secretos) y se conserva el error de storage
   * original como respuesta al cliente — nunca se sustituye por el fallo
   * de la compensacion.
   */
  private async compensateFailedCreate(documentId: string, companyId: string): Promise<void> {
    try {
      await this.documentsRepository.deleteCreatedDocument(documentId, companyId);
    } catch (compensationError) {
      const name = compensationError instanceof Error ? compensationError.name : 'UnknownError';
      this.logger.error(
        `Fallo la compensacion (eliminar el Documento ${documentId} tras un error de storage): ${name}.`,
      );
    }
  }

  private translateStorageError(error: unknown): DocumentStorageUnavailableException {
    const code = error instanceof StorageError ? error.code : 'UNKNOWN';
    this.logger.error(
      `No fue posible generar la URL prefirmada de carga (storageErrorCode=${code}).`,
    );
    return new DocumentStorageUnavailableException();
  }
}
