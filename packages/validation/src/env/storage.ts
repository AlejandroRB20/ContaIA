import { z } from 'zod';

/**
 * Variables de almacenamiento de objetos compatible con S3 (MinIO en local).
 * Reservado para cuando el modulo Documents/Files lo requiera (fuera del
 * alcance de EWO-001) — se valida aqui para no fragmentar la validacion
 * de entorno mas adelante.
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
