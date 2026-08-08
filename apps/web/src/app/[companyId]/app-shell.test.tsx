import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppShell } from './app-shell';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/company-1/inicio',
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
}));
vi.mock('@/hooks/use-logout', () => ({
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
}));

function renderWithClient(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('AppShell', () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.replace.mockReset();
  });

  it('navega a /seleccionar-empresa sin parámetro next al pulsar "Cambiar empresa"', () => {
    renderWithClient(
      <AppShell
        user={{ firstName: 'Ana', lastName: 'Pérez' } as never}
        membership={{ companyName: 'Empresa Uno', role: 'ADMINISTRADOR' } as never}
        companyId="company-1"
      >
        <div />
      </AppShell>,
    );

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Cambiar empresa' }));
    });

    expect(mocks.push).toHaveBeenCalledWith('/seleccionar-empresa');
    expect(mocks.push).toHaveBeenCalledTimes(1);
  });
});
