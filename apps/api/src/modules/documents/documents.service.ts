import { randomUUID } from 'node:crypto';

import { DocumentStatus, type DocumentFileType } from '@contaia/database';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { JobsError } from '../jobs/jobs.errors';
import { JobsService } from '../jobs/jobs.service';
import { StorageError } from '../storage/storage.errors';
import {
  STORAGE_ADAPTER,
  type ObjectMetadata,
  type StorageAdapter,
} from '../storage/storage.interface';

import { DocumentsAuthorizationService } from './documents-authorization.service';
import {
  DocumentNotFoundException,
  DocumentProcessingUnavailableException,
  DocumentStorageUnavailableException,
  DocumentUploadNotVerifiedException,
} from './documents.errors';
import type { DocumentListFilters, DocumentSummary } from './documents.repository';
import { DocumentsRepository } from './documents.repository';
import type { ListDocumentsQueryDto } from './dto/list-documents-query.dto';
import type { UploadDocumentDto } from './dto/upload-document.dto';

const DOCUMENT_READ_PERMISSION = 'document.read';
/**
 * confirm-upload es la continuacion del mismo flujo iniciado con
 * document.upload (docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md
 * seccion 4.1, paso 3) — no existe un permiso separado para "confirmar"
 * en el catalogo (packages/database/prisma/seed.ts); se reutiliza el
 * mismo permiso que gate-ea el paso 1 de la misma operacion.
 */
const DOCUMENT_CONFIRM_PERMISSION = 'document.upload';

/**
 * Comparacion segura y minima de tipos MIME (Bloque C, seccion 5): el SDK
 * de AWS documenta `ContentType` unicamente como "a standard MIME type
 * describing the format of the object data", sin garantizar ausencia de
 * parametros (`; charset=utf-8`) ni una capitalizacion especifica — no hay
 * ninguna fuente normativa del proyecto que exija igualdad exacta. Se
 * normaliza a minusculas, sin espacios, y se compara solo el tipo MIME
 * principal (la porcion antes del primer `;`) — nunca coincidencia
 * parcial (`includes`/`startsWith`).
 */
function normalizeMimeType(value: string): string {
  const [mainType] = value.split(';');
  return (mainType ?? '').trim().toLowerCase();
}

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
 * Bloques A, B, C y D de EWO-005 (docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md).
 * `initiateUpload` (Bloque A): inicia la carga devolviendo una URL
 * prefirmada. `listForCompany`/`getById` (Bloque B): listado paginado y
 * consulta individual, ambos tenant-safe. `confirmUpload` (Bloque C + D):
 * verifica el objeto en Storage, transiciona PENDING_UPLOAD -> PROCESSING,
 * y asegura (crea o recupera, encola) el Job de extraccion XML — nunca
 * procesa el XML en si (fuera de alcance de este bloque; el Job queda
 * preparado para que un worker futuro lo consuma). `companyId`/
 * `uploadedByUserId` siempre llegan ya resueltos por el controlador (via
 * `@Company()`/`@CurrentUser()`) — este servicio nunca los toma del body ni
 * del query.
 */
@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly documentsRepository: DocumentsRepository,
    private readonly documentsAuthorization: DocumentsAuthorizationService,
    @Inject(STORAGE_ADAPTER) private readonly storageAdapter: StorageAdapter,
    private readonly jobsService: JobsService,
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

  /**
   * Bloques C + D — confirm-upload (ruta plana, sin `companyId` en el
   * path, mismo patron de `getById`). Flujo: cargar -> autorizar ->
   * validar estado -> verificar Storage -> transicion atomica -> asegurar
   * el Job de extraccion -> mapear respuesta. Nunca confia en datos del
   * cliente: el body de esta operacion esta deliberadamente vacio (el
   * controlador no declara ningun DTO de entrada) — tamaño y content type
   * se toman EXCLUSIVAMENTE de Storage. Jamas se toca JobsService antes de
   * que `assertHasPermission` haya resuelto (Bloque D, seccion 7).
   */
  async confirmUpload(documentId: string, actorUserId: string): Promise<DocumentSummaryResult> {
    const document = await this.documentsRepository.findById(documentId);
    if (!document) {
      throw new DocumentNotFoundException();
    }

    await this.documentsAuthorization.assertHasPermission(
      actorUserId,
      document.companyId,
      DOCUMENT_CONFIRM_PERMISSION,
    );

    if (document.status !== DocumentStatus.PENDING_UPLOAD) {
      return this.resolveNonPendingConfirmation(document);
    }

    const metadata = await this.verifyUploadedObject(document);

    const transitioned = await this.documentsRepository.confirmUpload(
      document.id,
      document.companyId,
      metadata.sizeBytes,
    );
    if (transitioned) {
      const confirmed = await this.documentsRepository.findById(document.id);
      if (!confirmed) {
        throw new DocumentNotFoundException();
      }
      // El Documento ya quedo en PROCESSING de forma irreversible (Bloque
      // D, seccion 8: "no reviertas automaticamente el documento a
      // PENDING_UPLOAD") — si esto falla, el cliente ve un 503 seguro y
      // reintentable; una confirmacion posterior repara el Job faltante
      // via la rama PROCESSING de `resolveNonPendingConfirmation`.
      await this.ensureXmlExtractionJob(confirmed);
      return this.toSummaryResult(confirmed);
    }

    // Perdimos la carrera contra una confirmacion concurrente — el
    // documento ya no esta en PENDING_UPLOAD. Se re-consulta y se clasifica
    // igual que cualquier otro estado no pendiente (idempotente si es
    // PROCESSING/PROCESSED, conflicto si termino en REJECTED).
    this.logger.warn(
      `Confirmacion de carga para el Documento ${document.id} perdio la carrera contra otra solicitud concurrente.`,
    );
    const current = await this.documentsRepository.findById(document.id);
    if (!current) {
      throw new DocumentNotFoundException();
    }
    return this.resolveNonPendingConfirmation(current);
  }

  /**
   * El documento ya no esta en PENDING_UPLOAD — por una confirmacion
   * propia previa, ajena, o una carrera concurrente perdida. `PROCESSING`
   * y `PROCESSED` son estados aguas abajo de una carga ya verificada
   * exitosamente (docs/09_DATABASE_DESIGN.md: PENDING_UPLOAD -> PROCESSING
   * -> PROCESSED | REJECTED) — la pregunta que confirm-upload responde
   * ("¿la carga se verifico correctamente?") ya es afirmativa para ambos,
   * asi que se devuelven idempotentemente sin error. `PROCESSING`
   * ADEMAS asegura el Job (Bloque D, seccion 12): repara el caso
   * "Documento en PROCESSING, Job persistente o encolado ausente" (fallo
   * parcial de una confirmacion anterior) — nunca vuelve a tocar Storage,
   * solo Jobs. `PROCESSED` no toca Jobs en absoluto (la extraccion ya
   * termino). `REJECTED` es un resultado terminal NEGATIVO (BR-XML-001,
   * formato invalido detectado en una etapa posterior) — tratarlo como
   * confirmacion exitosa seria enganoso; se rechaza con el mismo conflicto
   * publico y generico que cualquier otra verificacion fallida (Bloque C,
   * seccion 2), y tampoco toca Jobs.
   */
  private async resolveNonPendingConfirmation(
    document: DocumentSummary,
  ): Promise<DocumentSummaryResult> {
    if (document.status === DocumentStatus.REJECTED) {
      throw new DocumentUploadNotVerifiedException();
    }
    if (document.status === DocumentStatus.PROCESSING) {
      await this.ensureXmlExtractionJob(document);
    }
    return this.toSummaryResult(document);
  }

  /**
   * Traduce cualquier `JobsError` (persistencia o encolado fallidos) a una
   * excepcion publica segura — nunca expone queue name, jobId de BullMQ,
   * codigo de Prisma ni el error crudo (Bloque D, seccion 13).
   */
  private async ensureXmlExtractionJob(document: DocumentSummary): Promise<void> {
    try {
      await this.jobsService.ensureXmlExtractionJob(document.companyId, document.id);
    } catch (error) {
      const code = error instanceof JobsError ? error.code : 'UNKNOWN';
      this.logger.error(
        `No fue posible asegurar el Job de extraccion XML para el Documento ${document.id} (jobsErrorCode=${code}).`,
      );
      throw new DocumentProcessingUnavailableException();
    }
  }

  /**
   * Verifica el objeto en Storage antes de confirmar — nunca confia en
   * tamaño/content type enviados por el cliente (no existen: el body de
   * confirm-upload esta vacio). Solo usa el contrato publico de
   * `StorageAdapter` (`getMetadata`, HEAD) — nunca el SDK de AWS, el
   * cliente MinIO, el bucket ni credenciales directamente.
   */
  private async verifyUploadedObject(document: DocumentSummary): Promise<ObjectMetadata> {
    let metadata: ObjectMetadata | null;
    try {
      metadata = await this.storageAdapter.getMetadata(document.storageReference);
    } catch (error) {
      throw this.translateStorageError(error);
    }

    if (!metadata) {
      this.logger.warn(
        `Confirmacion fallida para el Documento ${document.id}: objeto ausente en Storage.`,
      );
      throw new DocumentUploadNotVerifiedException();
    }

    if (metadata.sizeBytes <= 0) {
      this.logger.warn(
        `Confirmacion fallida para el Documento ${document.id}: tamaño reportado por Storage invalido (${metadata.sizeBytes}).`,
      );
      throw new DocumentUploadNotVerifiedException();
    }

    // Sin whitelist de MIME types ni limite de tamaño aprobados todavia
    // (docs/08_API_DESIGN.md seccion 14.9, docs/11_SECURITY_ARCHITECTURE.md
    // seccion 16 — "pendiente de validacion", mismo hallazgo de Bloque A/B).
    // La unica validacion de consistencia posible hoy es contra lo
    // declarado al iniciar la carga, no contra una regla externa inexistente.
    // Comparacion normalizada, no exacta: el SDK de AWS solo documenta
    // `HeadObjectOutput.ContentType` como "A standard MIME type describing
    // the format of the object data" (sin garantia sobre parametros como
    // `charset`) y no existe ninguna fuente normativa del proyecto que
    // exija igualdad exacta — se aplica la comparacion segura minima
    // (minusculas, sin espacios, solo el tipo MIME principal antes de `;`).
    if (
      metadata.contentType &&
      normalizeMimeType(metadata.contentType) !== normalizeMimeType(document.mimeType)
    ) {
      this.logger.warn(
        `Confirmacion fallida para el Documento ${document.id}: content type de Storage no coincide con el declarado al iniciar la carga.`,
      );
      throw new DocumentUploadNotVerifiedException();
    }

    return metadata;
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
