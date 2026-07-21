import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useChangePassword } from './use-change-password';

import { changePassword } from '@/lib/auth-client';

vi.mock('@/lib/auth-client', () => ({ changePassword: vi.fn() }));

function createWrapper(): ({ children }: { children: ReactNode }) => React.JSX.Element {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return function QueryWrapper({ children }: { children: ReactNode }): React.JSX.Element {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useChangePassword', () => {
  beforeEach(() => {
    vi.mocked(changePassword).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('envía la contraseña actual y la nueva al backend', async () => {
    vi.mocked(changePassword).mockResolvedValue(undefined);

    const { result } = renderHook(() => useChangePassword(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ currentPassword: 'actual123', newPassword: 'nueva1234' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(changePassword).toHaveBeenCalledWith('actual123', 'nueva1234');
  });

  it('expone el error cuando la contraseña actual es incorrecta', async () => {
    vi.mocked(changePassword).mockRejectedValue(new Error('Contraseña actual incorrecta'));

    const { result } = renderHook(() => useChangePassword(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ currentPassword: 'incorrecta', newPassword: 'nueva1234' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
