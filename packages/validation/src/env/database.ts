import { z } from 'zod';

/**
 * Variables de base de datos (PostgreSQL via Prisma).
 * Ver docs/21_DATABASE_MIGRATION_PLAN.md.
 */
export const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  POSTGRES_DB: z.string().min(1).default('contaia'),
  POSTGRES_USER: z.string().min(1).default('contaia'),
  POSTGRES_PASSWORD: z.string().min(1).default('contaia_dev_only'),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
});

export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
