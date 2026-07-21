import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMyPermissions } from './use-my-permissions';

import { fetchMyPermissions } from '@/lib/roles-client';
import { useSessionStore } from '@/store/use-session-store';

vi.mock('@/lib/roles-client', () => ({ fetchMyPermissions: vi.fn() }));

function createWrapper(): ({ children }: { children: ReactNode }) => React.JSX.Element {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return function QueryWrapper({ children }: { children: ReactNode }): React.JSX.Element {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useMyPermissions', () => {
  beforeEach(() => {
    useSessionStore.getState().clearSession();
    vi.mocked(fetchMyPermissions).mockReset();
  });

  afterEach(() => {
    useSessionStore.getState().clearSession();
  });

  it('sincroniza los permisos de la Empresa consultada en el estado del navegador', async () => {
    vi.mocked(fetchMyPermissions).mockResolvedValue(['company.read']);

    const { result } = renderHook(() => useMyPermissions('company-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.permissions).toEqual(['company.read']);
      expect(useSessionStore.getState().permissions).toEqual(['company.read']);
    });
    expect(fetchMyPermissions).toHaveBeenCalledWith('company-1');
  });

  it('recarga y reemplaza permisos al cambiar de Empresa', async () => {
    vi.mocked(fetchMyPermissions)
      .mockResolvedValueOnce(['company.read'])
      .mockResolvedValueOnce(['company.update']);

    const { rerender } = renderHook(({ companyId }) => useMyPermissions(companyId), {
      initialProps: { companyId: 'company-1' as string | null },
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(useSessionStore.getState().permissions).toEqual(['company.read']);
    });

    rerender({ companyId: 'company-2' });

    await waitFor(() => {
      expect(useSessionStore.getState().permissions).toEqual(['company.update']);
    });
    expect(fetchMyPermissions).toHaveBeenNthCalledWith(2, 'company-2');
  });

  it('no consulta permisos sin una Membresía validada', () => {
    renderHook(() => useMyPermissions(null), { wrapper: createWrapper() });

    expect(fetchMyPermissions).not.toHaveBeenCalled();
  });
});
