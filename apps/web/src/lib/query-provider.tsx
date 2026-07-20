'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

/**
 * Proveedor de TanStack Query para toda la aplicacion
 * (docs/19_FRONTEND_IMPLEMENTATION_PLAN.md seccion 6: "estado de servidor y
 * cache"). Una instancia de QueryClient por sesion de navegador — se crea
 * dentro de un componente cliente con `useState` para evitar compartir
 * estado entre solicitudes distintas durante el renderizado en servidor.
 */
export function QueryProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // EWO-001 no tiene datos de negocio con requisitos de frescura
            // especificos todavia — valores conservadores por defecto.
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
