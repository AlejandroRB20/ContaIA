/**
 * Pruebas del cliente de documentos (documents-client.ts).
 * Verifica que las funciones construyan las rutas correctas y propaguen
 * errores de red o de API sin modificar contratos ni inventar estados.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mockear el módulo http antes de importar el cliente
vi.mock('@/lib/http', () => ({
  apiRequest: vi.fn(),
  apiUrl: (path: string) => `http://localhost:3001/api/v1${path}`,
  ApiError: class ApiError extends Error {
    constructor(
      public detail: { code: string; message: string; correlationId: string; retryable: boolean },
    ) {
      super(detail.message);
      this.name = 'ApiError';
    }
  },
}));

import {
  confirmUpload,
  fetchDocument,
  initiateUpload,
  listDocuments,
} from '@/lib/documents-client';
import { apiRequest } from '@/lib/http';

const mockApiRequest = vi.mocked(apiRequest);

beforeEach(() => {
  mockApiRequest.mockReset();
});

// ──────────────────────────────────────────────────────────────────────────────
// initiateUpload
// ──────────────────────────────────────────────────────────────────────────────

describe('initiateUpload', () => {
  it('llama al endpoint correcto con el body esperado', async () => {
    const fakeResponse = {
      documentId: 'doc-1',
      uploadUrl: 'https://storage/presigned',
      expiresAt: '2026-01-01T00:00:00Z',
      status: 'PENDING_UPLOAD',
    };
    mockApiRequest.mockResolvedValueOnce(fakeResponse);

    const result = await initiateUpload('company-abc', {
      originalFilename: 'factura.xml',
      mimeType: 'application/xml',
      fileType: 'XML',
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      '/companies/company-abc/documents',
      expect.objectContaining({
        method: 'POST',
        body: {
          originalFilename: 'factura.xml',
          mimeType: 'application/xml',
          fileType: 'XML',
        },
      }),
    );
    expect(result.documentId).toBe('doc-1');
    expect(result.status).toBe('PENDING_UPLOAD');
  });

  it('propaga el error de API sin modificarlo', async () => {
    mockApiRequest.mockRejectedValueOnce(new Error('Network error'));
    await expect(
      initiateUpload('company-abc', {
        originalFilename: 'f.xml',
        mimeType: 'application/xml',
        fileType: 'XML',
      }),
    ).rejects.toThrow('Network error');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// confirmUpload
// ──────────────────────────────────────────────────────────────────────────────

describe('confirmUpload', () => {
  it('llama al endpoint de confirm-upload con POST sin body', async () => {
    const fakeDetail = {
      id: 'doc-1',
      originalFilename: 'factura.xml',
      fileType: 'XML' as const,
      mimeType: 'application/xml',
      sizeBytes: 1024,
      status: 'PROCESSING' as const,
      rejectionReason: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:01:00Z',
    };
    mockApiRequest.mockResolvedValueOnce(fakeDetail);

    const result = await confirmUpload('doc-1');

    expect(mockApiRequest).toHaveBeenCalledWith(
      '/documents/doc-1/confirm-upload',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.status).toBe('PROCESSING');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// uploadBinaryToStorage
// ──────────────────────────────────────────────────────────────────────────────

describe('uploadBinaryToStorage', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('llama al PUT con el MIME type especificado', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 200 }));
    const file = new File([''], 'test.xml', { type: 'application/xml' });
    await import('@/lib/documents-client').then((m) =>
      m.uploadBinaryToStorage('https://fake-url', file, 'application/xml'),
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://fake-url',
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/xml' },
        body: file,
      }),
    );
  });

  it('falla si el almacenamiento responde con error', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 500 }));
    const file = new File([''], 'test.pdf', { type: 'application/pdf' });

    await expect(
      import('@/lib/documents-client').then((m) =>
        m.uploadBinaryToStorage('https://fake-url', file, 'application/pdf'),
      ),
    ).rejects.toThrow('El almacenamiento respondió con estado 500.');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// listDocuments
// ──────────────────────────────────────────────────────────────────────────────

describe('listDocuments', () => {
  it('llama al endpoint sin params por defecto', async () => {
    mockApiRequest.mockResolvedValueOnce({
      items: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });
    await listDocuments('company-abc');
    expect(mockApiRequest).toHaveBeenCalledWith('/companies/company-abc/documents');
  });

  it('incluye los query params cuando se proveen', async () => {
    mockApiRequest.mockResolvedValueOnce({
      items: [],
      pagination: { page: 1, pageSize: 5, total: 0, totalPages: 0 },
    });
    await listDocuments('company-abc', {
      page: 1,
      pageSize: 5,
      status: 'PROCESSED',
      fileType: 'XML',
    });
    const call = mockApiRequest.mock.calls[0]?.[0] as string;
    expect(call).toContain('page=1');
    expect(call).toContain('pageSize=5');
    expect(call).toContain('status=PROCESSED');
    expect(call).toContain('fileType=XML');
  });

  it('no incluye parámetros vacíos en la URL', async () => {
    mockApiRequest.mockResolvedValueOnce({
      items: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });
    await listDocuments('company-abc', {});
    const call = mockApiRequest.mock.calls[0]?.[0] as string;
    expect(call).toBe('/companies/company-abc/documents');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// fetchDocument (API-0025)
// ──────────────────────────────────────────────────────────────────────────────

describe('fetchDocument', () => {
  it('llama al endpoint plano de detalle (sin companyId en el path)', async () => {
    const fakeDetail = {
      id: 'doc-99',
      originalFilename: 'recibo.pdf',
      fileType: 'PDF' as const,
      mimeType: 'application/pdf',
      sizeBytes: 4096,
      status: 'PROCESSED' as const,
      rejectionReason: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:05:00Z',
    };
    mockApiRequest.mockResolvedValueOnce(fakeDetail);

    const result = await fetchDocument('doc-99');

    expect(mockApiRequest).toHaveBeenCalledWith('/documents/doc-99');
    expect(result.status).toBe('PROCESSED');
  });
});
