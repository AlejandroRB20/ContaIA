import { z } from 'zod';

/**
 * Variables de almacenamiento de objetos compatible con S3 (MinIO en local).
 * Activo desde EWO-005 (modulo Documents/Files) — docker-compose.yml levanta
 * MinIO y STORAGE_ENABLED=true por defecto en desarrollo.
 */
export const storageEnvSchema = z.object({
  STORAGE_ENABLED: z
    .string()
    .default('false')
    .transform((value) => value === 'true'),
  STORAGE_ENDPOINT: z.string().optional(),
  STORAGE_PORT: z.coerce.number().int().positive().optional(),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),
  STORAGE_BUCKET: z.string().optional(),
});

export type StorageEnv = z.infer<typeof storageEnvSchema>;
