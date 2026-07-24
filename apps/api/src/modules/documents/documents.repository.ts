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

/**
 * Bloque A de EWO-005: solo las operaciones que este bloque necesita —
 * crear el Documento inicial y compensar (eliminar) el registro recien
 * creado si la generacion de la URL prefirmada falla despues del insert.
 * Listar, consultar por id, descargar, confirmar carga y eliminar
 * documentos existentes quedan para bloques posteriores.
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
}
