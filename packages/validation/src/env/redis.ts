import { z } from 'zod';

/**
 * Variables de Redis. En EWO-001 solo se deja preparada la configuracion
 * (docs/20_BACKEND_IMPLEMENTATION_PLAN.md seccion 2) — sin uso funcional
 * de colas (BullMQ) todavia.
 */
export const redisEnvSchema = z.object({
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  REDIS_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
});

export type RedisEnv = z.infer<typeof redisEnvSchema>;
