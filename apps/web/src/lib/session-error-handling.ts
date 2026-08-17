import type { QueryClient } from '@tanstack/react-query';

import type { ApiError } from './http';

import { useSessionStore } from '@/store/use-session-store';

export const SESSION_EXPIRED_PATH = '/sesion-expirada';
export const FORBIDDEN_PATH = '/prohibido';

const SKIP_REDIRECT_PATHS = new Set([SESSION_EXPIRED_PATH, FORBIDDEN_PATH]);

/**
 * Reaccion centralizada a errores de `useQuery` en recursos autenticados
 * (sesion, Empresas, permisos): 401 -> sesion expirada, 403 -> prohibido.
 * Registrado una sola vez en `QueryProvider` para todas las consultas —
 * evita repetir el manejo en cada hook.
 *
 * Solo actua si YA existia una sesion activa en `useSessionStore`: paginas
 * publicas como `/acceso/invitacion/[token]` usan `useSession()` para
 * verificar si el visitante ya inicio sesion, y un 401 ahi es esperado, no
 * una sesion perdida — no debe redirigir a nadie.
 */
export function onProtectedQueryError(error: ApiError, queryClient: QueryClient): void {
  if (typeof window === 'undefined') return;
  if (!useSessionStore.getState().user) return;
  if (SKIP_REDIRECT_PATHS.has(window.location.pathname)) return;

  if (error.status === 401) {
    useSessionStore.getState().clearSession();
    queryClient.clear();
    window.location.assign(SESSION_EXPIRED_PATH);
    return;
  }

  if (error.status === 403) {
    window.location.assign(FORBIDDEN_PATH);
  }
}
