import {
  prisma,
  DocumentStatus,
  type Document,
  type DocumentFileType,
  type Prisma,
} from '@contaia/database';
import { Injectable } from '@nestjs/common';

import { TransicionNoConfirmadaError } from '../cfdi/cfdi.errors';

export interface CreateDocumentData {
  id: string;
  companyId: string;
  uploadedByUserId: string;
  originalFilename: string;
  fileType: DocumentFileType;
  mimeType: string;
  storageReference: string;
}

export interface DocumentListFilters {
  status?: DocumentStatus;
  fileType?: DocumentFileType;
}

/**
 * Representacion interna de un Documento — nunca `checksumSha256` ni
 * `uploadedByUserId`. `companyId` y `storageReference` SI se incluyen (a
 * diferencia del DTO de respuesta publico): el service los necesita para
 * autorizar la ruta plana `GET /documents/{documentId}` y para verificar
 * el objeto en Storage al confirmar la carga (Bloque C), respectivamente.
 * Ninguno de los dos llega jamas a un DTO de respuesta —
 * `DocumentsService.toSummaryResult()` los excluye explicitamente al mapear.
 */
export interface DocumentSummary {
  id: string;
  companyId: string;
  originalFilename: string;
  fileType: DocumentFileType;
  mimeType: string;
  sizeBytes: number | null;
  storageReference: string;
  status: DocumentStatus;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const DOCUMENT_SUMMARY_SELECT = {
  id: true,
  companyId: true,
  originalFilename: true,
  fileType: true,
  mimeType: true,
  sizeBytes: true,
  storageReference: true,
  status: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Bloques A, B, C de EWO-005 y Bloque E (T04). Bloque A: crear el Documento
 * inicial y compensar (eliminar) el registro recien creado si la generacion
 * de la URL prefirmada falla despues del insert. Bloque B: listar
 * (tenant-safe, paginado) y consultar por id (sin filtro de companyId — el
 * service lo usa para resolver la Empresa antes de autorizar, nunca para
 * devolver datos directamente). Bloque C: transicion condicional
 * PENDING_UPLOAD -> PROCESSING al confirmar la carga. Bloque E (T04):
 * transicion terminal condicional PROCESSING -> PROCESSED dentro de la
 * Transaccion A unica de D-007, usando el `tx` externo y `count !== 1`
 * como arbiter de exclusion (AD-10.1.2). Descargar y eliminar documentos
 * existentes quedan para bloques posteriores.
 */
@Injectable()
export class DocumentsRepository {
  async create(data: CreateDocumentData): Promise<Document> {
    return prisma.document.create({
      data: {
        id: data.id,
        companyId: data.companyId,
        uploadedByUserId: data.uploadedByUserId,
        originalFilename: data.originalFilename,
        fileType: data.fileType,
        mimeType: data.mimeType,
        storageReference: data.storageReference,
        status: DocumentStatus.PENDING_UPLOAD,
      },
    });
  }

  /**
   * Compensacion tenant-safe: restringida por (id, companyId), nunca solo
   * por `id`. `deleteMany` no lanza si el registro ya no existe (0 filas
   * afectadas) — la llamante decide si eso amerita log, sin que esta capa
   * imponga una excepcion por "no encontrado".
   */
  async deleteCreatedDocument(id: string, companyId: string): Promise<void> {
    await prisma.document.deleteMany({ where: { id, companyId } });
  }

  /**
   * Tenant-safe por construccion: `companyId` es obligatorio, nunca
   * opcional. Orden fijo (`createdAt DESC, id DESC`, desempate
   * determinista) — el cliente no puede elegir otro (API-0024).
   */
  async findManyByCompany(
    companyId: string,
    filters: DocumentListFilters,
    pagination: { skip: number; take: number },
  ): Promise<DocumentSummary[]> {
    return prisma.document.findMany({
      where: { companyId, status: filters.status, fileType: filters.fileType },
      select: DOCUMENT_SUMMARY_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
    });
  }

  async countByCompany(companyId: string, filters: DocumentListFilters): Promise<number> {
    return prisma.document.count({
      where: { companyId, status: filters.status, fileType: filters.fileType },
    });
  }

  /**
   * Sin filtro de `companyId`: usada por el service unicamente para
   * descubrir a que Empresa pertenece el Documento antes de autorizar
   * (API-0025, ruta plana). Ningun dato de este resultado debe llegar al
   * cliente sin que `DocumentsAuthorizationService.assertHasPermission`
   * haya pasado primero.
   */
  async findById(id: string): Promise<DocumentSummary | null> {
    return prisma.document.findUnique({
      where: { id },
      select: DOCUMENT_SUMMARY_SELECT,
    });
  }

  /**
   * Transicion condicional PENDING_UPLOAD -> PROCESSING, atomica via WHERE
   * (id, companyId, status=PENDING_UPLOAD) — evita condiciones de carrera
   * entre confirmaciones simultaneas: si dos solicitudes llegan a la vez,
   * solo una puede ganar la transicion (Prisma/PostgreSQL serializan el
   * UPDATE). Devuelve `false` cuando el documento ya no estaba en
   * PENDING_UPLOAD en el momento del update (perdida de carrera, o ya
   * confirmado por una solicitud anterior) — la llamante decide como
   * proceder (normalmente: re-consultar y tratarlo como idempotente, nunca
   * lanzar un error de "no encontrado" solo por esto).
   */
  async confirmUpload(id: string, companyId: string, sizeBytes: number): Promise<boolean> {
    const result = await prisma.document.updateMany({
      where: { id, companyId, status: DocumentStatus.PENDING_UPLOAD },
      data: { status: DocumentStatus.PROCESSING, sizeBytes },
    });

    return result.count > 0;
  }

  /**
   * Transicion terminal condicional PROCESSING -> PROCESSED, dentro de la
   * Transaccion A unica de D-007 (Addendum AD-10.1.2). Arbiter de exclusion:
   * si `count !== 1`, otro worker ya cerro el Documento (count=0) o el
   * `WHERE` esta mal construido (count>1 — imposible con PK, pero la
   * asercion es explicita). En ambos casos se lanza
   * `TransicionNoConfirmadaError` para forzar el rollback total de la
   * transaccion llamante — nunca se retorna silenciosamente ni se declara
   * exito parcial (criterio 58, D-007 Regla 3 y Regla 4).
   *
   * Recibe el `tx` de la Transaccion A explicitamente — nunca el cliente
   * Prisma global, nunca abre su propia transaccion. `checksumSha256` se
   * persiste en la misma operacion atomica, no en una escritura separada.
   */
  async markAsProcessed(
    tx: Prisma.TransactionClient,
    id: string,
    companyId: string,
    checksumSha256: string,
  ): Promise<void> {
    const result = await tx.document.updateMany({
      where: { id, companyId, status: DocumentStatus.PROCESSING },
      data: { status: DocumentStatus.PROCESSED, checksumSha256 },
    });

    if (result.count !== 1) {
      throw new TransicionNoConfirmadaError('document', result.count);
    }
  }
}
