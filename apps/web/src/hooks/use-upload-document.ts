'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { DocumentFileType } from '@/lib/documents-client';
import { confirmUpload, initiateUpload, uploadBinaryToStorage } from '@/lib/documents-client';

/** Resultado intermedio de initiate (necesario para la fase de upload). */
interface UploadDocumentInput {
  companyId: string;
  file: File;
  fileType: DocumentFileType;
}

/**
 * Hook que orquesta el flujo completo de carga de un documento (EWO-005):
 *  1. POST /companies/:companyId/documents → obtiene uploadUrl + documentId
 *  2. PUT  <uploadUrl>                     → sube el binario al almacenamiento
 *  3. POST /documents/:documentId/confirm-upload → confirma la carga
 *
 * Invalida el listado de documentos al confirmar para reflejar el estado
 * PROCESSING inmediatamente. isLoading cubre las tres fases — el componente
 * no necesita distinguirlas; no se exponen detalles internos al usuario.
 */
export function useUploadDocument(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, fileType }: Omit<UploadDocumentInput, 'companyId'>) => {
      const normalizedMimeType = file.type.trim() || 'application/octet-stream';

      // Fase 1: solicitar carga
      const initiated = await initiateUpload(companyId, {
        originalFilename: file.name,
        mimeType: normalizedMimeType,
        fileType,
      });

      // Fase 2: cargar binario directamente al almacenamiento
      await uploadBinaryToStorage(initiated.uploadUrl, file, normalizedMimeType);

      // Fase 3: confirmar carga (el backend verifica en el almacenamiento)
      return confirmUpload(initiated.documentId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['documents', companyId],
      });
    },
  });
}
