import { randomUUID } from 'node:crypto';

import type { DocumentStatus } from '@contaia/database';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { StorageError } from '../storage/storage.errors';
import { STORAGE_ADAPTER, type StorageAdapter } from '../storage/storage.interface';

import { DocumentStorageUnavailableException } from './documents.errors';
import { DocumentsRepository } from './documents.repository';
import type { UploadDocumentDto } from './dto/upload-document.dto';

export interface InitiateUploadResult {
  documentId: string;
  uploadUrl: string;
  expiresAt: Date;
  status: DocumentStatus;
}

/**
 * Bloque A de EWO-005 (docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md).
 * Unico caso de uso: iniciar la carga de un Documento devolviendo una URL
 * prefirmada. `companyId`/`uploadedByUserId` siempre llegan ya resueltos
 * por el controlador (via `@Company()`/`@CurrentUser()`) — este servicio
 * nunca los toma del body.
 */
@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly documentsRepository: DocumentsRepository,
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
