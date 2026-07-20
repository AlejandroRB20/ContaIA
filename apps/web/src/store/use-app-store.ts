import { create } from 'zustand';

/**
 * Estado global minimo de cliente (Zustand), preparado en EWO-001 sin
 * contenido de dominio todavia. El estado real de sesion, Empresa activa y
 * permisos (docs/19_FRONTEND_IMPLEMENTATION_PLAN.md seccion 6) llega con
 * EWO-002 (Authentication & Authorization) y EWO de Empresas — este store
 * solo demuestra que el patron esta correctamente cableado con la pagina
 * tecnica de estado.
 */
interface AppUiState {
  /** Ultimo momento (ISO 8601) en que el usuario disparo una verificacion manual de estado. */
  lastManualHealthCheckAt: string | null;
  setLastManualHealthCheckAt: (timestamp: string) => void;
}

export const useAppStore = create<AppUiState>((set) => ({
  lastManualHealthCheckAt: null,
  setLastManualHealthCheckAt: (timestamp) => set({ lastManualHealthCheckAt: timestamp }),
}));
