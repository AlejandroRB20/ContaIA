import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import StatusPage from './page';

describe('StatusPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('muestra el nombre de ContaIA, el estado del frontend, la version y el ambiente', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <StatusPage />
      </QueryClientProvider>,
    );

    expect(screen.getByRole('heading', { name: 'ContaIA' })).toBeInTheDocument();
    expect(screen.getByTestId('frontend-status')).toHaveTextContent('Operativo');
    expect(screen.getByText(/Versión:/)).toBeInTheDocument();
    expect(screen.getByText(/Ambiente:/)).toBeInTheDocument();
  });
});
