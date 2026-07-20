import { z } from 'zod';

/**
 * Variables de observabilidad (docs/22_INFRASTRUCTURE_IMPLEMENTATION_PLAN.md
 * seccion 10). En EWO-001 solo se define el nivel de log estructurado.
 */
export const logLevelSchema = z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']);

export const observabilityEnvSchema = z.object({
  LOG_LEVEL: logLevelSchema.default('info'),
});

export type ObservabilityEnv = z.infer<typeof observabilityEnvSchema>;
