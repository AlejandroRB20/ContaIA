import {
  sharedEnvSchema,
  serverEnvSchema,
  databaseEnvSchema,
  redisEnvSchema,
  storageEnvSchema,
  observabilityEnvSchema,
} from '@contaia/validation';
import type { z } from 'zod';

import { parseEnv } from './parse-env';

/**
 * Configuracion completa del backend (apps/api). Punto unico de lectura de
 * `process.env` en el proceso de NestJS — ningun otro modulo debe leer
 * `process.env` directamente (docs/20_BACKEND_IMPLEMENTATION_PLAN.md,
 * "Application Services").
 */
const serverConfigSchema = sharedEnvSchema
  .merge(serverEnvSchema)
  .merge(databaseEnvSchema)
  .merge(redisEnvSchema)
  .merge(storageEnvSchema)
  .merge(observabilityEnvSchema);

export type ServerConfig = z.infer<typeof serverConfigSchema>;

let cachedServerConfig: ServerConfig | undefined;

/**
 * Carga y valida la configuracion del servidor una sola vez por proceso.
 * Lanza un error descriptivo (sin exponer valores) si alguna variable
 * obligatoria falta o es invalida.
 */
export function loadServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  if (!cachedServerConfig) {
    cachedServerConfig = parseEnv(serverConfigSchema, env, 'apps/api');
  }

  return cachedServerConfig;
}

/** Solo para pruebas: limpia la configuracion cacheada. */
export function resetServerConfigCache(): void {
  cachedServerConfig = undefined;
}
