'use client';

import { useCallback, useRef, useState } from 'react';

import type { DocumentFileType } from '@/lib/documents-client';

// ──────────────────────────────────────────────────────────────────────────────
// Tipos de archivo soportados por la API (DocumentFileType en schema.prisma).
// ──────────────────────────────────────────────────────────────────────────────
const MIME_TO_FILE_TYPE: Record<string, DocumentFileType> = {
  'application/xml': 'XML',
  'text/xml': 'XML',
  'application/pdf': 'PDF',
};

/** Extensión → fileType para archivos sin MIME type correcto. */
const EXT_TO_FILE_TYPE: Record<string, DocumentFileType> = {
  xml: 'XML',
  pdf: 'PDF',
};

/** Tamaño máximo: 25 MB (límite visual — el backend no define uno todavía). */
const MAX_SIZE_BYTES = 25 * 1024 * 1024;

export interface FileValidationResult {
  success: true;
  file: File;
  fileType: DocumentFileType;
}
export interface FileValidationError {
  success: false;
  error: string;
}
type FileValidation = FileValidationResult | FileValidationError;

function detectFileType(file: File): DocumentFileType {
  const byMime = MIME_TO_FILE_TYPE[file.type.toLowerCase()];
  if (byMime) return byMime;
  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  return EXT_TO_FILE_TYPE[ext] ?? 'OTHER';
}

export function validateFile(file: File): FileValidation {
  if (file.size === 0) {
    return { success: false, error: 'El archivo está vacío.' };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { success: false, error: 'El archivo supera el tamaño máximo de 25 MB.' };
  }
  const fileType = detectFileType(file);
  return { success: true, file, fileType };
}

// ──────────────────────────────────────────────────────────────────────────────
// Componente FileDropzone
// ──────────────────────────────────────────────────────────────────────────────

interface FileDropzoneProps {
  onFileSelected: (file: File, fileType: DocumentFileType) => void;
  onError: (message: string) => void;
  disabled?: boolean;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
}

/**
 * Zona de arrastrar-y-soltar o selección manual. Acepta XML, PDF y otros.
 * Valida tipo y tamaño antes de propagarlo al padre.
 */
export function FileDropzone({
  onFileSelected,
  onError,
  disabled = false,
  ariaDescribedBy,
  ariaInvalid,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback(
    (file: File) => {
      const result = validateFile(file);
      if (!result.success) {
        onError(result.error);
      } else {
        onFileSelected(result.file, result.fileType);
      }
    },
    [onFileSelected, onError],
  );

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Resetea para permitir seleccionar el mismo archivo de nuevo
    e.target.value = '';
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Zona de carga de archivos. Arrastra un archivo aquí o presiona Enter para seleccionarlo"
      aria-disabled={disabled}
      aria-describedby={ariaDescribedBy}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onClick={() => {
        if (!disabled) inputRef.current?.click();
      }}
      className={[
        'flex select-none flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed p-8 transition-colors',
        'focus-visible:ring-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        disabled
          ? 'border-border bg-page dark:border-border-dark dark:bg-page-dark cursor-not-allowed opacity-60'
          : isDragging
            ? 'border-action bg-action/5 cursor-copy'
            : 'border-border bg-surface hover:border-action/60 hover:bg-page dark:border-border-dark dark:bg-surface-dark dark:hover:bg-page-dark cursor-pointer',
      ].join(' ')}
    >
      {/* Ícono */}
      <svg
        aria-hidden="true"
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-muted-foreground dark:text-muted-foreground-dark"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.338-2.32 4.5 4.5 0 0 1 1.14 8.095"
        />
      </svg>

      <div className="text-center">
        <p className="text-foreground dark:text-foreground-dark text-sm font-medium">
          Arrastra un archivo aquí
        </p>
        <p className="text-muted-foreground dark:text-muted-foreground-dark mt-1 text-xs">
          o haz clic para seleccionarlo · XML, PDF u otros · máx. 25 MB
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        aria-invalid={ariaInvalid}
        disabled={disabled}
        onChange={handleChange}
      />
    </div>
  );
}
