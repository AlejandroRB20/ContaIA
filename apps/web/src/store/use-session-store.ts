import type { PublicUser } from '@contaia/types';
import { create } from 'zustand';

/**
 * Estado global de sesion (Zustand) — unicamente sesion, empresa activa y
 * permisos del rol actual (docs/19_FRONTEND_IMPLEMENTATION_PLAN.md
 * seccion 6: "nada mas"). Nunca cachea datos de negocio — eso es
 * responsabilidad de TanStack Query.
 */
interface SessionState {
  user: PublicUser | null;
  activeCompanyId: string | null;
  permissions: string[];
  setSession: (user: PublicUser, activeCompanyId?: string | null) => void;
  setActiveCompany: (companyId: string) => void;
  setPermissions: (permissions: string[]) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  activeCompanyId: null,
  permissions: [],
  setSession: (user, activeCompanyId = null) => set({ user, activeCompanyId, permissions: [] }),
  setActiveCompany: (companyId) => set({ activeCompanyId: companyId, permissions: [] }),
  setPermissions: (permissions) => set({ permissions }),
  clearSession: () => set({ user: null, activeCompanyId: null, permissions: [] }),
}));
