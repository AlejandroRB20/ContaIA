import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CompaniesList } from './companies-list';

function renderWithClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

/** UI-0010 — estados universales (docs/18_UI_SPECIFICATION.md sección 10). */
describe('CompaniesList', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('muestra el estado vacío con la acción de crear empresa cuando el usuario no tiene ninguna (BR-GLB-001)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [],
          meta: { correlationId: 'test', timestamp: new Date().toISOString() },
        }),
        { status: 200 },
      ),
    );

    renderWithClient(<CompaniesList />);

    await waitFor(() => {
      expect(screen.getByText(/aún no tienes ninguna empresa/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /crear empresa/i })).toHaveAttribute(
      'href',
      '/crear-empresa',
    );
  });

  it('muestra las empresas devueltas por el servidor con su rol', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            {
              membershipId: 'membership-1',
              companyId: 'company-1',
              organizationId: 'org-1',
              name: 'Empresa Demo',
              businessActivity: 'Servicios de consultoría',
              rfc: null,
              role: 'ADMINISTRADOR',
              isOwner: true,
            },
          ],
          meta: { correlationId: 'test', timestamp: new Date().toISOString() },
        }),
        { status: 200 },
      ),
    );

    renderWithClient(<CompaniesList />);

    await waitFor(() => {
      expect(screen.getByText('Empresa Demo')).toBeInTheDocument();
    });
    expect(screen.getByText(/administrador/i)).toBeInTheDocument();
    expect(screen.getByText(/propietario/i)).toBeInTheDocument();
  });

  it('muestra un estado de error con opción de reintentar si la solicitud falla', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network error'));

    renderWithClient(<CompaniesList />);

    await waitFor(() => {
      expect(screen.getByText(/no se pudo cargar el listado/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
  });
});
