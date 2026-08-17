import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import DemoDashboardPage from './page';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('DemoDashboardPage', () => {
  it('renderiza el panel público de demostración sin sesión ni backend', () => {
    render(<DemoDashboardPage />);

    expect(screen.getByRole('heading', { name: 'Resumen general' })).toBeInTheDocument();
    expect(screen.getAllByText(/Contabilidad Norte S\.A\./).length).toBeGreaterThan(0);
  });

  it('muestra el aviso de que los datos son de demostración', () => {
    render(<DemoDashboardPage />);

    expect(screen.getByText(/son datos de\s*demostración/)).toBeInTheDocument();
  });

  it('filtra las facturas por tipo de documento al cambiar de pestaña', () => {
    render(<DemoDashboardPage />);

    expect(screen.getByText('Factura #FNS-348')).toBeInTheDocument();
    expect(screen.queryByText(/Recibo #/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Recibos' }));

    expect(screen.queryByText(/Factura #/)).not.toBeInTheDocument();
    expect(screen.getByText('Recibo #REC-102')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Todas' }));

    expect(screen.getByText('Factura #FNS-348')).toBeInTheDocument();
    expect(screen.getByText('Recibo #REC-102')).toBeInTheDocument();
  });

  it('no presenta acciones sin backend real como funcionales', () => {
    render(<DemoDashboardPage />);

    expect(screen.getByRole('button', { name: 'Personalizar vista' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Registrar operación' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ver todo' })).toBeDisabled();
  });
});
