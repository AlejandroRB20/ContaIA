import { act, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CompanyLayout from './layout';

import { useSessionStore } from '@/store/use-session-store';

const mocks = vi.hoisted(() => ({
  companyId: 'company-1',
  pathname: '/company-1/inicio',
  replace: vi.fn(),
  useMyPermissions: vi.fn(),
  useSession: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ companyId: mocks.companyId }),
  usePathname: () => mocks.pathname,
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock('@/hooks/use-my-permissions', () => ({ useMyPermissions: mocks.useMyPermissions }));
vi.mock('@/hooks/use-session', () => ({ useSession: mocks.useSession }));
vi.mock('./app-shell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  ),
}));

const SESSION_WITH_COMPANY = {
  isLoading: false,
  isError: false,
  data: {
    firstName: 'Ana',
    lastName: 'Prueba',
    memberships: [
      {
        id: 'membership-1',
        companyId: 'company-1',
        companyName: 'Empresa Uno',
        role: 'ADMINISTRADOR',
        isOwner: true,
      },
    ],
  },
};

describe('CompanyLayout', () => {
  beforeEach(() => {
    mocks.companyId = 'company-1';
    mocks.pathname = '/company-1/inicio';
    mocks.replace.mockReset();
    mocks.useMyPermissions.mockReset();
    mocks.useSession.mockReset();
    act(() => {
      useSessionStore.getState().clearSession();
    });
  });

  afterEach(() => {
    act(() => {
      useSessionStore.getState().clearSession();
    });
  });

  it('activa el Workspace y carga permisos solo para una Membership valida', async () => {
    mocks.useSession.mockReturnValue(SESSION_WITH_COMPANY);

    render(
      <CompanyLayout>
        <p>Contenido protegido</p>
      </CompanyLayout>,
    );

    await waitFor(() => {
      expect(useSessionStore.getState().activeCompanyId).toBe('company-1');
    });
    expect(screen.getByTestId('app-shell')).toHaveTextContent('Contenido protegido');
    expect(mocks.useMyPermissions).toHaveBeenCalledWith('company-1');
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('redirige a seleccionar empresa y no carga permisos para una Empresa sin Membership', async () => {
    mocks.companyId = 'company-2';
    mocks.pathname = '/company-2/inicio';
    mocks.useSession.mockReturnValue(SESSION_WITH_COMPANY);

    render(
      <CompanyLayout>
        <p>Contenido protegido</p>
      </CompanyLayout>,
    );

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/seleccionar-empresa?next=%2Fcompany-2%2Finicio');
    });
    expect(screen.queryByTestId('app-shell')).not.toBeInTheDocument();
    expect(mocks.useMyPermissions).toHaveBeenCalledWith(null);
  });

  it('redirige al inicio de sesión cuando no hay sesión disponible', async () => {
    mocks.useSession.mockReturnValue({ isLoading: false, isError: true, data: undefined });

    render(
      <CompanyLayout>
        <p>Contenido protegido</p>
      </CompanyLayout>,
    );

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith(
        '/acceso/iniciar-sesion?next=%2Fcompany-1%2Finicio',
      );
    });
    expect(mocks.useMyPermissions).toHaveBeenCalledWith(null);
  });
});
