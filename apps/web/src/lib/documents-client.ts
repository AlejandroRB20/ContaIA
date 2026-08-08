/**
 * Cliente de documentos — consume los cuatro endpoints reales de Documents
 * (EWO-005, docs/08_API_DESIGN.md sección 9.5):
 *   API-0023  POST   /companies/:companyId/documents        (iniciar carga)
 *   API-0024  GET    /companies/:companyId/documents        (listado paginado)
 *   API-0025  GET    /documents/:documentId                 (detalle)
 *             POST   /documents/:documentId/confirm-upload  (confirmar)
 *
 * El binario nunca pasa por el backend: se carga directamente al
 * almacenamiento de objetos (MinIO/S3) usando la `uploadUrl` prefirmada
 * devuelta por API-0023. Ninguna función inventa endpoints, campos ni
 * estados que no existan en el contrato.
 */

import { apiRequest } from './http';

// ──────────────────────────────────────────────────────────────────────────────
// Tipos espejo de los DTOs del backend (solo los campos que se usan en el
// frontend). Definidos aquí para no depender de `@contaia/database` desde
// el cliente del navegador (solo el servidor usa el cliente de Prisma).
// ──────────────────────────────────────────────────────────────────────────────

/** DocumentStatus — ciclo de vida del documento (schema.prisma:506). */
export type DocumentStatus = 'PENDING_UPLOAD' | 'PROCESSING' | 'PROCESSED' | 'REJECTED';

/** DocumentFileType — tipos de archivo soportados (schema.prisma:517). */
export type DocumentFileType = 'XML' | 'PDF' | 'OTHER';

/** Respuesta de API-0023 (iniciar carga). */
export interface InitiateUploadResponse {
  documentId: string;
  /** URL prefirmada de un solo uso para cargar el binario directamente al almacenamiento. */
  uploadUrl: string;
  expiresAt: string; // ISO date-time
  status: DocumentStatus;
}

/** Forma segura de un Documento (API-0024 item / API-0025 detalle). */
export interface DocumentDetail {
  id: string;
  originalFilename: string;
  fileType: DocumentFileType;
  mimeType: string;
  sizeBytes: number | null;
  status: DocumentStatus;
  /** Solo presente cuando status === 'REJECTED'. */
  rejectionReason: string | null;
  createdAt: string; // ISO date-time
  updatedAt: string; // ISO date-time
}

/** Metadatos de paginación (API-0024). */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Respuesta paginada de API-0024. */
export interface PaginatedDocuments {
  items: DocumentDetail[];
  pagination: PaginationMeta;
}

/** Parámetros opcionales de API-0024. */
export interface ListDocumentsParams {
  page?: number;
  pageSize?: number;
  status?: DocumentStatus;
  fileType?: DocumentFileType;
}

/** Body de API-0023 — metadatos mínimos de carga (BR-DOC-002). */
export interface InitiateUploadInput {
  originalFilename: string;
  mimeType: string;
  fileType: DocumentFileType;
}

// ──────────────────────────────────────────────────────────────────────────────
// Funciones cliente
// ──────────────────────────────────────────────────────────────────────────────

/**
 * API-0023 — Inicia la carga de un documento para una Empresa.
 * Devuelve la URL prefirmada de un solo uso y el ID del documento.
 */
export async function initiateUpload(
  companyId: string,
  input: InitiateUploadInput,
): Promise<InitiateUploadResponse> {
  return apiRequest<InitiateUploadResponse>(
    `/companies/${encodeURIComponent(companyId)}/documents`,
    { method: 'POST', body: input },
  );
}

/**
 * Carga el binario directamente al almacenamiento de objetos usando la URL
 * prefirmada de API-0023. No usa `apiRequest` porque la URL ya es absoluta y
 * no requiere las cabeceras de sesión ni CSRF del backend propio.
 * Lanza si el almacenamiento responde con un código no 2xx.
 */
export async function uploadBinaryToStorage(
  uploadUrl: string,
  file: File,
  mimeType: string,
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`El almacenamiento respondió con estado ${response.status}.`);
  }
}

/**
 * confirm-upload — Confirma que el binario fue cargado correctamente.
 * El backend verifica contra el almacenamiento (sin datos del cliente).
 * Idempotente: llamar dos veces no duplica el procesamiento.
 */
export async function confirmUpload(documentId: string): Promise<DocumentDetail> {
  return apiRequest<DocumentDetail>(`/documents/${encodeURIComponent(documentId)}/confirm-upload`, {
    method: 'POST',
  });
}

/**
 * API-0024 — Lista los documentos de una Empresa (paginado, orden fijo:
 * createdAt DESC, id DESC). Filtra por status y/o fileType si se proveen.
 */
export async function listDocuments(
  companyId: string,
  params: ListDocumentsParams = {},
): Promise<PaginatedDocuments> {
  const searchParams = new URLSearchParams();
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.pageSize !== undefined) searchParams.set('pageSize', String(params.pageSize));
  if (params.status) searchParams.set('status', params.status);
  if (params.fileType) searchParams.set('fileType', params.fileType);

  const qs = searchParams.toString();
  const path = `/companies/${encodeURIComponent(companyId)}/documents${qs ? `?${qs}` : ''}`;
  return apiRequest<PaginatedDocuments>(path);
}

/**
 * API-0025 — Consulta un documento por id (tenant-safe, sin companyId en
 * el path). La autorización se resuelve en el servidor.
 */
export async function fetchDocument(documentId: string): Promise<DocumentDetail> {
  return apiRequest<DocumentDetail>(`/documents/${encodeURIComponent(documentId)}`);
}
