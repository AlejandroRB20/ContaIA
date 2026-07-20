import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HealthStatus } from './health-status';

function renderWithClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('HealthStatus', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('muestra el estado operativo cuando el backend responde ok', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: { status: 'ok', uptimeSeconds: 12, checks: [] },
          meta: { correlationId: 'test', timestamp: new Date().toISOString() },
        }),
        { status: 200 },
      ),
    );

    renderWithClient(<HealthStatus />);

    await waitFor(() => {
      expect(screen.getByTestId('backend-status')).toHaveTextContent('Operativo');
    });
  });

  it('maneja el caso de backend no disponible sin lanzar una excepcion no controlada', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network error'));

    renderWithClient(<HealthStatus />);

    await waitFor(() => {
      expect(screen.getByTestId('backend-status')).toHaveTextContent('no disponible');
    });
  });
});
