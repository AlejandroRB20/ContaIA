'use client';

import { useSessionStore } from '@/store/use-session-store';

/**
 * Devuelve true si el usuario tiene el permiso indicado en la Empresa activa.
 * Cosmético únicamente — la autorización real siempre ocurre en el servidor
 * (docs/19_FRONTEND_IMPLEMENTATION_PLAN.md sección 11).
 */
export function useHasPermission(permissionKey: string): boolean {
  return useSessionStore((state) => state.permissions.includes(permissionKey));
}
