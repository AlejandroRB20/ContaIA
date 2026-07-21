import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useUpdateProfile } from './use-update-profile';

import { updateProfile } from '@/lib/auth-client';

vi.mock('@/lib/auth-client', () => ({ updateProfile: vi.fn() }));

function createWrapper(
  queryClient: QueryClient,
): ({ children }: { children: ReactNode }) => React.JSX.Element {
  return function QueryWrapper({ children }: { children: ReactNode }): React.JSX.Element {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useUpdateProfile', () => {
  beforeEach(() => {
    vi.mocked(updateProfile).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('actualiza el perfil e invalida la sesión en caché al tener éxito', async () => {
    vi.mocked(updateProfile).mockResolvedValue({
      id: 'user-1',
      firstName: 'Ana',
      lastName: 'Prueba',
      phone: null,
      avatar: null,
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({ firstName: 'Ana' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(updateProfile).toHaveBeenCalledWith({ firstName: 'Ana' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['session', 'me'] });
  });

  it('no invalida la caché de sesión cuando la actualización falla', async () => {
    vi.mocked(updateProfile).mockRejectedValue(new Error('correo ya en uso'));

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({ firstName: 'Ana' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
