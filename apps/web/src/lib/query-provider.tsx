'use client';

import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { ApiError } from './http';
import { onProtectedQueryError } from './session-error-handling';

/**
 * Proveedor de TanStack Query para toda la aplicacion
 * (docs/19_FRONTEND_IMPLEMENTATION_PLAN.md seccion 6: "estado de servidor y
 * cache"). Una instancia de QueryClient por sesion de navegador — se crea
 * dentro de un componente cliente con `useState` para evitar compartir
 * estado entre solicitudes distintas durante el renderizado en servidor.
 *
 * `queryCache.onError` centraliza la reaccion a 401/403 para TODAS las
 * consultas autenticadas (sesion, Empresas, permisos) en un solo lugar —
 * ver `session-error-handling.ts`. Solo cubre `useQuery`, no mutaciones:
 * login/MFA/registro ya manejan sus propios errores localmente
 * (`login-form.tsx`) y no deben verse interceptados por este handler.
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
        queryCache: new QueryCache({
          onError: (error) => {
            if (error instanceof ApiError) {
              onProtectedQueryError(error, queryClient);
            }
          },
        }),
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
