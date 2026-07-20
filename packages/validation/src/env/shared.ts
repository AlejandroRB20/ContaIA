import { z } from 'zod';

/**
 * Variables comunes a cualquier proceso del monorepo (frontend o backend).
 * Ver docs/22_INFRASTRUCTURE_IMPLEMENTATION_PLAN.md seccion 3 (ambientes).
 */
export const nodeEnvSchema = z.enum(['development', 'test', 'staging', 'production']);

export const sharedEnvSchema = z.object({
  NODE_ENV: nodeEnvSchema.default('development'),
  APP_VERSION: z.string().min(1).default('0.1.0'),
});

export type SharedEnv = z.infer<typeof sharedEnvSchema>;
