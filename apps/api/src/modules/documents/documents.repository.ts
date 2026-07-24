import { prisma, DocumentStatus, type Document, type DocumentFileType } from '@contaia/database';
import { Injectable } from '@nestjs/common';

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
 * Forma "segura" de un Documento — nunca incluye `storageReference`,
 * `checksumSha256` ni `uploadedByUserId`. `companyId` SI se incluye (a
 * diferencia del DTO de respuesta): el service lo necesita para autorizar
 * la ruta plana `GET /documents/{documentId}` antes de construir la
 * respuesta publica, que lo omite.
 */
export interface DocumentSummary {
  id: string;
  companyId: string;
  originalFilename: string;
  fileType: DocumentFileType;
  mimeType: string;
  sizeBytes: number | null;
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
  status: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Bloque A + B de EWO-005. Bloque A: crear el Documento inicial y compensar
 * (eliminar) el registro recien creado si la generacion de la URL
 * prefirmada falla despues del insert. Bloque B: listar (tenant-safe,
 * paginado) y consultar por id (sin filtro de companyId — el service lo
 * usa para resolver la Empresa antes de autorizar, nunca para devolver
 * datos directamente). Descargar, confirmar carga y eliminar documentos
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
}
