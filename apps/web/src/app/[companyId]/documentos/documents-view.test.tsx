import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DocumentsView, resolveUploadError } from './documents-view';

import * as useDocumentsMock from '@/hooks/use-documents';
import * as useUploadDocumentMock from '@/hooks/use-upload-document';
import { ApiError } from '@/lib/http';
import * as sessionStore from '@/store/use-session-store';

vi.mock('@/store/use-session-store', () => ({
  useSessionStore: vi.fn(),
}));

vi.mock('@/hooks/use-upload-document', () => ({
  useUploadDocument: vi.fn(),
}));

vi.mock('@/hooks/use-documents', () => ({
  useDocuments: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ companyId: 'company-1' }),
}));

describe('DocumentsView', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();

    vi.mocked(useDocumentsMock.useDocuments).mockReturnValue({
      data: { items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDocumentsMock.useDocuments>);

    vi.mocked(useUploadDocumentMock.useUploadDocument).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useUploadDocumentMock.useUploadDocument>);
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('RBAC (document.upload)', () => {
    it('muestra el dropzone si el usuario tiene document.upload', () => {
      vi.mocked(sessionStore.useSessionStore).mockImplementation((selector) =>
        selector({ permissions: ['document.upload'] } as unknown as sessionStore.SessionState),
      );
      render(<DocumentsView />, { wrapper });
      expect(screen.getByText('Cargar documento')).toBeDefined();
      expect(screen.queryByText(/Tienes acceso de consulta/i)).toBeNull();
    });

    it('oculta el dropzone y muestra mensaje si el usuario NO tiene document.upload', () => {
      vi.mocked(sessionStore.useSessionStore).mockImplementation((selector) =>
        selector({ permissions: ['document.read'] } as unknown as sessionStore.SessionState),
      );
      render(<DocumentsView />, { wrapper });
      expect(screen.queryByText('Cargar documento')).toBeNull();
      expect(
        screen.getByText(
          /Tienes acceso de consulta, pero no tienes permiso para cargar documentos/i,
        ),
      ).toBeDefined();
    });

    it('oculta el dropzone si no hay ningun permiso', () => {
      vi.mocked(sessionStore.useSessionStore).mockImplementation((selector) =>
        selector({ permissions: [] } as unknown as sessionStore.SessionState),
      );
      render(<DocumentsView />, { wrapper });
      expect(screen.queryByText('Cargar documento')).toBeNull();
    });
  });

  describe('Manejo de errores (resolveUploadError)', () => {
    it('maneja AUTHORIZATION_ERROR', () => {
      const error = new ApiError({
        code: 'AUTHORIZATION_ERROR',
        message: 'x',
        correlationId: '1',
        retryable: false,
      });
      expect(resolveUploadError(error)).toBe(
        'No tienes permiso para subir documentos en esta empresa.',
      );
    });

    it('maneja UNAUTHORIZED (401)', () => {
      const error = new ApiError({
        code: 'UNAUTHORIZED',
        message: 'x',
        correlationId: '1',
        retryable: false,
      });
      expect(resolveUploadError(error)).toBe(
        'Tu sesión ha expirado. Recarga la página e inicia sesión nuevamente.',
      );
    });

    it('maneja FORBIDDEN (403)', () => {
      const error = new ApiError({
        code: 'FORBIDDEN',
        message: 'x',
        correlationId: '1',
        retryable: false,
      });
      expect(resolveUploadError(error)).toBe(
        'No tienes permiso para subir documentos en esta empresa.',
      );
    });

    it('maneja error de red o desconocido', () => {
      expect(resolveUploadError(new Error('Network error'))).toBe(
        'No fue posible iniciar el procesamiento. Intenta nuevamente.',
      );
      expect(resolveUploadError(null)).toBe(
        'No fue posible iniciar el procesamiento. Intenta nuevamente.',
      );
    });
  });
});
