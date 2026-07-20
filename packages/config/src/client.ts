import { clientEnvSchema } from '@contaia/validation';
import type { z } from 'zod';

import { parseEnv } from './parse-env';

/**
 * Configuracion PUBLICA del frontend (apps/web). Solo variables con prefijo
 * NEXT_PUBLIC_ pueden vivir aqui — Next.js las incrusta en el bundle de
 * cliente en tiempo de compilacion (docs/19_FRONTEND_IMPLEMENTATION_PLAN.md
 * seccion 3). Nunca debe importarse desde codigo exclusivo del servidor
 * para leer un secreto: usa `@contaia/config/server` en su lugar.
 */
export type ClientConfig = z.infer<typeof clientEnvSchema>;

let cachedClientConfig: ClientConfig | undefined;

export function loadClientConfig(env: NodeJS.ProcessEnv = process.env): ClientConfig {
  if (!cachedClientConfig) {
    cachedClientConfig = parseEnv(clientEnvSchema, env, 'apps/web');
  }

  return cachedClientConfig;
}

/** Solo para pruebas: limpia la configuracion cacheada. */
export function resetClientConfigCache(): void {
  cachedClientConfig = undefined;
}
