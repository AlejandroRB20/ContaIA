'use client';

import { Button } from '@contaia/ui';
import { useParams } from 'next/navigation';
import { useCallback, useId, useState } from 'react';

import { DocumentsTable } from './documents-table';
import { FileDropzone } from './file-dropzone';

import { useDocuments } from '@/hooks/use-documents';
import { useUploadDocument } from '@/hooks/use-upload-document';
import type { DocumentFileType, DocumentStatus } from '@/lib/documents-client';
import { ApiError } from '@/lib/http';
import { useSessionStore } from '@/store/use-session-store';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

const FILTER_STATUS_OPTIONS: Array<{ value: DocumentStatus | ''; label: string }> = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDING_UPLOAD', label: 'Pendiente' },
  { value: 'PROCESSING', label: 'Procesando' },
  { value: 'PROCESSED', label: 'Procesado' },
  { value: 'REJECTED', label: 'Rechazado' },
];

const FILTER_FILE_TYPE_OPTIONS: Array<{ value: DocumentFileType | ''; label: string }> = [
  { value: '', label: 'Todos los tipos' },
  { value: 'XML', label: 'XML' },
  { value: 'PDF', label: 'PDF' },
  { value: 'OTHER', label: 'Otro' },
];

/** Mensaje genérico para fallos internos — nunca expone detalles de Redis, BullMQ ni Prisma. */
export function resolveUploadError(error: unknown): string {
  if (error instanceof ApiError) {
    // Errores semánticos de negocio (4xx) sí son legibles para el usuario.
    if (error.detail.code === 'UNAUTHORIZED' || error.detail.code === 'AUTH_REQUIRED') {
      return 'Tu sesión ha expirado. Recarga la página e inicia sesión nuevamente.';
    }
    if (
      error.detail.code === 'FORBIDDEN' ||
      error.detail.code === 'PERMISSION_DENIED' ||
      error.detail.code === 'AUTHORIZATION_ERROR'
    ) {
      return 'No tienes permiso para subir documentos en esta empresa.';
    }
    // Para 5xx y errores de almacenamiento, mensaje genérico.
  }
  return 'No fue posible iniciar el procesamiento. Intenta nuevamente.';
}

// ──────────────────────────────────────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Vista de documentos de la Empresa: zona de carga + listado paginado.
 * Implementa los flujos API-0023, API-0024 y confirm-upload (EWO-005).
 *
 * Límites actuales de la API documentados como hallazgos:
 *  - No existe endpoint de detalle navegable en el frontend (API-0025 existe
 *    pero no hay ruta de detalle en el frontend todavía).
 *  - El backend no define un límite máximo de tamaño; el frontend usa 25 MB
 *    como límite visual orientativo.
 *  - No existe endpoint de re-procesamiento: los documentos REJECTED solo
 *    pueden volver a cargarse como documentos nuevos.
 */
export function DocumentsView() {
  const params = useParams();
  const companyId = typeof params.companyId === 'string' ? params.companyId : '';
  const permissions = useSessionStore((state) => state.permissions);
  const canUpload = permissions.includes('document.upload');

  // Filtros de listado
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | ''>('');
  const [fileTypeFilter, setFileTypeFilter] = useState<DocumentFileType | ''>('');
  const [page, setPage] = useState(1);

  // IDs para aria-describedby
  const uploadErrorId = useId();
  const uploadSuccessId = useId();

  // Estado de carga
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const uploadMutation = useUploadDocument(companyId);

  const documentsQuery = useDocuments(companyId, {
    page,
    pageSize: 20,
    status: statusFilter || undefined,
    fileType: fileTypeFilter || undefined,
  });

  // ── Manejadores de carga ──────────────────────────────────────────────────

  const handleFileSelected = useCallback(
    (file: File, fileType: DocumentFileType) => {
      if (uploadMutation.isPending) return; // prevención de doble envío

      setUploadError(null);
      setUploadSuccess(false);

      uploadMutation.mutate(
        { file, fileType },
        {
          onSuccess: () => {
            setUploadSuccess(true);
            setUploadError(null);
          },
          onError: (error) => {
            setUploadError(resolveUploadError(error));
            setUploadSuccess(false);
          },
        },
      );
    },
    [uploadMutation],
  );

  const handleDropzoneError = useCallback((message: string) => {
    setUploadError(message);
    setUploadSuccess(false);
  }, []);

  const handleRetry = useCallback(() => {
    setUploadError(null);
    setUploadSuccess(false);
    uploadMutation.reset();
  }, [uploadMutation]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Encabezado */}
      <div>
        <h1 className="text-foreground dark:text-foreground-dark text-2xl font-semibold">
          Documentos
        </h1>
        <p className="text-muted-foreground dark:text-muted-foreground-dark mt-1 text-sm">
          Carga archivos XML de CFDI, PDF u otros documentos fiscales para su procesamiento
          automático.
        </p>
      </div>

      {/* Sección de carga */}
      {canUpload ? (
        <section aria-labelledby="upload-section-heading">
          <h2
            id="upload-section-heading"
            className="text-foreground dark:text-foreground-dark mb-3 text-base font-medium"
          >
            Cargar documento
          </h2>

          <FileDropzone
            onFileSelected={handleFileSelected}
            onError={handleDropzoneError}
            disabled={uploadMutation.isPending}
            ariaDescribedBy={
              [uploadError ? uploadErrorId : null, uploadSuccess ? uploadSuccessId : null]
                .filter(Boolean)
                .join(' ') || undefined
            }
            ariaInvalid={!!uploadError}
          />

          {/* Estado: procesando */}
          {uploadMutation.isPending && (
            <div
              role="status"
              aria-live="polite"
              className="text-action mt-3 flex items-center gap-2 text-sm"
            >
              <span
                aria-hidden="true"
                className="border-action h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
              />
              Subiendo y enviando a procesamiento…
            </div>
          )}

          {/* Estado: éxito */}
          {uploadSuccess && !uploadMutation.isPending && (
            <div
              id={uploadSuccessId}
              role="status"
              aria-live="polite"
              className="bg-success/10 border-success/30 text-success mt-3 flex items-start gap-2 rounded-md border px-4 py-3 text-sm"
            >
              <svg
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                Documento recibido. El procesamiento comenzó automáticamente — el estado se
                actualizará en la tabla.
              </span>
            </div>
          )}

          {/* Estado: error */}
          {uploadError && !uploadMutation.isPending && (
            <div
              id={uploadErrorId}
              role="alert"
              aria-live="assertive"
              className="bg-danger/10 border-danger/30 text-danger mt-3 flex items-start gap-2 rounded-md border px-4 py-3 text-sm"
            >
              <svg
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <p>{uploadError}</p>
                <button
                  onClick={handleRetry}
                  className="focus-visible:ring-danger mt-1.5 text-xs underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-1"
                >
                  Intentar con otro archivo
                </button>
              </div>
            </div>
          )}
        </section>
      ) : (
        <p className="text-muted-foreground dark:text-muted-foreground-dark text-sm">
          Tienes acceso de consulta, pero no tienes permiso para cargar documentos.
        </p>
      )}

      {/* Sección de listado */}
      <section aria-labelledby="list-section-heading">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2
            id="list-section-heading"
            className="text-foreground dark:text-foreground-dark text-base font-medium"
          >
            Documentos de la empresa
          </h2>

          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="filter-status">
              Filtrar por estado
            </label>
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as DocumentStatus | '');
                setPage(1);
              }}
              className="border-border dark:border-border-dark bg-surface dark:bg-surface-dark text-foreground dark:text-foreground-dark focus:ring-action h-9 rounded-sm border px-3 text-sm focus:outline-none focus:ring-2"
            >
              {FILTER_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="filter-file-type">
              Filtrar por tipo de archivo
            </label>
            <select
              id="filter-file-type"
              value={fileTypeFilter}
              onChange={(e) => {
                setFileTypeFilter(e.target.value as DocumentFileType | '');
                setPage(1);
              }}
              className="border-border dark:border-border-dark bg-surface dark:bg-surface-dark text-foreground dark:text-foreground-dark focus:ring-action h-9 rounded-sm border px-3 text-sm focus:outline-none focus:ring-2"
            >
              {FILTER_FILE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Estados del listado */}
        {documentsQuery.isLoading && (
          <div
            role="status"
            aria-live="polite"
            className="text-muted-foreground dark:text-muted-foreground-dark flex items-center justify-center gap-2 py-8 text-sm"
          >
            <span
              aria-hidden="true"
              className="border-muted-foreground h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
            />
            Cargando documentos…
          </div>
        )}

        {documentsQuery.isError && (
          <div
            role="alert"
            className="bg-danger/10 border-danger/30 text-danger flex flex-col items-start gap-2 rounded-md border px-4 py-4 text-sm"
          >
            <p>No fue posible cargar el listado de documentos.</p>
            <Button variant="secondary" onClick={() => void documentsQuery.refetch()}>
              Reintentar
            </Button>
          </div>
        )}

        {documentsQuery.data && documentsQuery.data.items.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <svg
              aria-hidden="true"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-muted-foreground dark:text-muted-foreground-dark"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
            <p className="text-muted-foreground dark:text-muted-foreground-dark text-sm">
              {statusFilter || fileTypeFilter
                ? 'No hay documentos que coincidan con los filtros seleccionados.'
                : 'Aún no has cargado ningún documento. Arrastra un archivo XML o PDF para comenzar.'}
            </p>
          </div>
        )}

        {documentsQuery.data && documentsQuery.data.items.length > 0 && (
          <>
            <DocumentsTable items={documentsQuery.data.items} />

            {/* Paginación */}
            {documentsQuery.data.pagination.totalPages > 1 && (
              <nav
                aria-label="Paginación de documentos"
                className="mt-4 flex items-center justify-between gap-2"
              >
                <p className="text-muted-foreground dark:text-muted-foreground-dark text-xs">
                  Página {documentsQuery.data.pagination.page} de{' '}
                  {documentsQuery.data.pagination.totalPages} ·{' '}
                  {documentsQuery.data.pagination.total} documento
                  {documentsQuery.data.pagination.total !== 1 ? 's' : ''}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    aria-label="Página anterior"
                  >
                    ← Anterior
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={page >= documentsQuery.data.pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    aria-label="Página siguiente"
                  >
                    Siguiente →
                  </Button>
                </div>
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  );
}
