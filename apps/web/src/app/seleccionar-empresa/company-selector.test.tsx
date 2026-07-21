import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CompanySelector } from './company-selector';

import { useSessionStore } from '@/store/use-session-store';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  searchParam: null as string | null,
  useSession: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => ({ get: () => mocks.searchParam }),
}));
vi.mock('@/hooks/use-session', () => ({ useSession: mocks.useSession }));

const SESSION_WITH_COMPANIES = {
  isLoading: false,
  isError: false,
  data: {
    memberships: [
      {
        id: 'membership-1',
        companyId: 'company-1',
        companyName: 'Empresa Uno',
        role: 'ADMINISTRADOR',
        isOwner: true,
      },
      {
        id: 'membership-2',
        companyId: 'company-2',
        companyName: 'Empresa Dos',
        role: 'CONTADOR',
        isOwner: false,
      },
    ],
  },
};

function getEntryButton(index: number): HTMLElement {
  const button = screen.getAllByRole('button', { name: 'Entrar' })[index];
  if (!button) {
    throw new Error(`No se encontr\u00f3 el bot\u00f3n Entrar en la posici\u00f3n ${index}.`);
  }

  return button;
}

describe('CompanySelector', () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.searchParam = null;
    mocks.useSession.mockReset();
    mocks.useSession.mockReturnValue(SESSION_WITH_COMPANIES);
    act(() => {
      useSessionStore.getState().clearSession();
    });
  });

  afterEach(() => {
    act(() => {
      useSessionStore.getState().clearSession();
    });
  });

  it('actualiza el Workspace local y navega al inicio de la Empresa elegida', () => {
    render(<CompanySelector />);

    act(() => {
      fireEvent.click(getEntryButton(0));
    });

    expect(useSessionStore.getState().activeCompanyId).toBe('company-1');
    expect(mocks.push).toHaveBeenCalledWith('/company-1/inicio');
  });

  it('descarta un destino externo y conserva la navegación interna segura', () => {
    mocks.searchParam = 'https://example.invalid';

    render(<CompanySelector />);

    act(() => {
      fireEvent.click(getEntryButton(0));
    });

    expect(mocks.push).toHaveBeenCalledWith('/company-1/inicio');
  });

  it('reemplaza la Empresa activa al cambiar de contexto', () => {
    act(() => {
      useSessionStore.getState().setActiveCompany('company-1');
    });

    render(<CompanySelector />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    });

    expect(useSessionStore.getState().activeCompanyId).toBe('company-2');
    expect(mocks.push).toHaveBeenCalledWith('/company-2/inicio');
  });

  it('muestra la ruta de creación cuando el usuario no tiene Memberships', () => {
    mocks.useSession.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { memberships: [] },
    });

    render(<CompanySelector />);

    expect(screen.getByRole('link', { name: /crear empresa/i })).toHaveAttribute(
      'href',
      '/crear-empresa',
    );
  });
});
