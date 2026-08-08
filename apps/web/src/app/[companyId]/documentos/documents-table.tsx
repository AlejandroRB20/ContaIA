'use client';

import type { DocumentDetail, DocumentStatus } from '@/lib/documents-client';

// ──────────────────────────────────────────────────────────────────────────────
// Etiquetas y estilos de estado
// ──────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  DocumentStatus,
  { label: string; className: string; dotClass: string }
> = {
  PENDING_UPLOAD: {
    label: 'Pendiente',
    className: 'bg-warning/10 text-warning border border-warning/30',
    dotClass: 'bg-warning',
  },
  PROCESSING: {
    label: 'Procesando',
    className: 'bg-action/10 text-action border border-action/30',
    dotClass: 'bg-action animate-pulse',
  },
  PROCESSED: {
    label: 'Procesado',
    className: 'bg-success/10 text-success border border-success/30',
    dotClass: 'bg-success',
  },
  REJECTED: {
    label: 'Rechazado',
    className: 'bg-danger/10 text-danger border border-danger/30',
    dotClass: 'bg-danger',
  },
};

interface StatusBadgeProps {
  status: DocumentStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING_UPLOAD;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />
      {config.label}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers de formato
// ──────────────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Tabla de documentos
// ──────────────────────────────────────────────────────────────────────────────

interface DocumentsTableProps {
  items: DocumentDetail[];
}

/**
 * Tabla responsive de documentos. En móvil colapsa a tarjetas apiladas.
 * Muestra nombre, tipo, tamaño, estado y fecha de carga.
 * Si status === REJECTED y hay rejectionReason, lo muestra inline.
 */
export function DocumentsTable({ items }: DocumentsTableProps) {
  return (
    <>
      {/* Vista escritorio */}
      <div className="border-border dark:border-border-dark hidden overflow-x-auto rounded-md border md:block">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="bg-page dark:bg-page-dark border-border dark:border-border-dark border-b text-left">
              <th
                scope="col"
                className="text-muted-foreground dark:text-muted-foreground-dark px-4 py-3 font-medium"
              >
                Nombre
              </th>
              <th
                scope="col"
                className="text-muted-foreground dark:text-muted-foreground-dark px-4 py-3 font-medium"
              >
                Tipo
              </th>
              <th
                scope="col"
                className="text-muted-foreground dark:text-muted-foreground-dark px-4 py-3 font-medium"
              >
                Tamaño
              </th>
              <th
                scope="col"
                className="text-muted-foreground dark:text-muted-foreground-dark px-4 py-3 font-medium"
              >
                Estado
              </th>
              <th
                scope="col"
                className="text-muted-foreground dark:text-muted-foreground-dark px-4 py-3 font-medium"
              >
                Cargado
              </th>
            </tr>
          </thead>
          <tbody className="divide-border dark:divide-border-dark divide-y">
            {items.map((doc) => (
              <tr
                key={doc.id}
                className="bg-surface dark:bg-surface-dark hover:bg-page dark:hover:bg-page-dark transition-colors"
              >
                <td className="max-w-[240px] px-4 py-3">
                  <p
                    className="text-foreground dark:text-foreground-dark truncate font-medium"
                    title={doc.originalFilename}
                  >
                    {doc.originalFilename}
                  </p>
                  {doc.status === 'REJECTED' && doc.rejectionReason ? (
                    <p className="text-danger mt-0.5 line-clamp-2 text-xs" role="alert">
                      {doc.rejectionReason}
                    </p>
                  ) : null}
                </td>
                <td className="text-foreground dark:text-foreground-dark px-4 py-3">
                  <span className="bg-page dark:bg-page-dark rounded px-2 py-0.5 font-mono text-xs">
                    {doc.fileType}
                  </span>
                </td>
                <td className="text-muted-foreground dark:text-muted-foreground-dark px-4 py-3 tabular-nums">
                  {formatBytes(doc.sizeBytes)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={doc.status} />
                </td>
                <td className="text-muted-foreground dark:text-muted-foreground-dark whitespace-nowrap px-4 py-3 text-xs tabular-nums">
                  {formatDate(doc.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vista móvil — tarjetas */}
      <ul className="flex flex-col gap-3 md:hidden" aria-label="Lista de documentos">
        {items.map((doc) => (
          <li
            key={doc.id}
            className="bg-surface dark:bg-surface-dark border-border dark:border-border-dark flex flex-col gap-2 rounded-md border p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-foreground dark:text-foreground-dark min-w-0 break-words text-sm font-medium">
                {doc.originalFilename}
              </p>
              <StatusBadge status={doc.status} />
            </div>
            <div className="text-muted-foreground dark:text-muted-foreground-dark flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span>
                <span className="bg-page dark:bg-page-dark rounded px-1.5 py-0.5 font-mono">
                  {doc.fileType}
                </span>
              </span>
              <span>{formatBytes(doc.sizeBytes)}</span>
              <span>{formatDate(doc.createdAt)}</span>
            </div>
            {doc.status === 'REJECTED' && doc.rejectionReason ? (
              <p className="text-danger text-xs" role="alert">
                {doc.rejectionReason}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}
