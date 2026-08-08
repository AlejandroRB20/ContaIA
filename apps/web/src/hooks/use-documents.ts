'use client';

import { useQuery } from '@tanstack/react-query';

import type { DocumentFileType, DocumentStatus, ListDocumentsParams } from '@/lib/documents-client';
import { listDocuments } from '@/lib/documents-client';

export type { DocumentFileType, DocumentStatus };

/**
 * Hook para listar documentos de una Empresa (API-0024).
 * Refresca automáticamente cuando hay documentos en PROCESSING
 * (pollInterval de 5 s) para mostrar la transición a PROCESSED/REJECTED.
 */
export function useDocuments(companyId: string, params: ListDocumentsParams = {}) {
  const query = useQuery({
    queryKey: ['documents', companyId, params],
    queryFn: () => listDocuments(companyId, params),
    // Refresca cada 5 s mientras algún documento esté procesándose
    refetchInterval: (data) => {
      const hasProcessing = data.state.data?.items.some((d) => d.status === 'PROCESSING');
      return hasProcessing ? 5_000 : false;
    },
  });

  return query;
}
