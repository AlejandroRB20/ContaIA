import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useUploadDocument } from './use-upload-document';

import * as documentsClient from '@/lib/documents-client';

vi.mock('@/lib/documents-client', async () => {
  const actual = await vi.importActual('@/lib/documents-client');
  return {
    ...actual,
    initiateUpload: vi.fn(),
    uploadBinaryToStorage: vi.fn(),
    confirmUpload: vi.fn(),
  };
});

const mockInitiate = vi.mocked(documentsClient.initiateUpload);
const mockUploadBinary = vi.mocked(documentsClient.uploadBinaryToStorage);
const mockConfirm = vi.mocked(documentsClient.confirmUpload);

describe('useUploadDocument', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();

    mockInitiate.mockResolvedValue({
      documentId: 'doc-123',
      uploadUrl: 'https://storage/upload',
      expiresAt: '2026-01-01T00:00:00Z',
      status: 'PENDING_UPLOAD',
    });
    mockUploadBinary.mockResolvedValue(undefined);
    mockConfirm.mockResolvedValue({} as unknown as documentsClient.DocumentDetail);
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('usa application/octet-stream como fallback si el MIME esta vacio', async () => {
    const { result } = renderHook(() => useUploadDocument('company-1'), { wrapper });

    // Archivo sin type
    const file = new File([''], 'test.xml', { type: '' });

    result.current.mutate({ file, fileType: 'XML' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockInitiate).toHaveBeenCalledWith(
      'company-1',
      expect.objectContaining({
        mimeType: 'application/octet-stream',
      }),
    );

    expect(mockUploadBinary).toHaveBeenCalledWith(
      'https://storage/upload',
      file,
      'application/octet-stream',
    );
  });

  it('usa el mismo MIME en solicitud inicial y PUT para XML', async () => {
    const { result } = renderHook(() => useUploadDocument('company-1'), { wrapper });

    const file = new File([''], 'test.xml', { type: 'text/xml' });

    result.current.mutate({ file, fileType: 'XML' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockInitiate).toHaveBeenCalledWith(
      'company-1',
      expect.objectContaining({
        mimeType: 'text/xml',
      }),
    );
    expect(mockUploadBinary).toHaveBeenCalledWith('https://storage/upload', file, 'text/xml');
  });

  it('usa el mismo MIME en solicitud inicial y PUT para PDF', async () => {
    const { result } = renderHook(() => useUploadDocument('company-1'), { wrapper });

    const file = new File([''], 'test.pdf', { type: 'application/pdf ' }); // con espacio para probar trim

    result.current.mutate({ file, fileType: 'PDF' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockInitiate).toHaveBeenCalledWith(
      'company-1',
      expect.objectContaining({
        mimeType: 'application/pdf',
      }),
    );
    expect(mockUploadBinary).toHaveBeenCalledWith(
      'https://storage/upload',
      file,
      'application/pdf',
    );
  });

  it('no ejecuta confirm-upload si el PUT falla', async () => {
    mockUploadBinary.mockRejectedValueOnce(new Error('S3 error'));

    const { result } = renderHook(() => useUploadDocument('company-1'), { wrapper });

    const file = new File([''], 'test.pdf', { type: 'application/pdf' });

    result.current.mutate({ file, fileType: 'PDF' });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(mockInitiate).toHaveBeenCalledTimes(1);
    expect(mockUploadBinary).toHaveBeenCalledTimes(1);
    expect(mockConfirm).not.toHaveBeenCalled();
  });
});
