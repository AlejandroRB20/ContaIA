import { loadClientConfig, type ClientConfig } from '@contaia/config/client';

/**
 * Punto unico de lectura de variables publicas del cliente en apps/web.
 * Ningun componente debe leer `process.env.NEXT_PUBLIC_*` directamente —
 * pasa siempre por aqui, coherente con
 * docs/19_FRONTEND_IMPLEMENTATION_PLAN.md (seccion 3, capa `lib/`).
 */
export function getClientEnv(): ClientConfig {
  return loadClientConfig(process.env);
}
