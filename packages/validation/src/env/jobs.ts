import { z } from 'zod';

/**
 * Configuracion central de BullMQ (EWO-005 Bloque E, Addendum §10.3,
 * `E5-S4-T09`). `JOBS_ATTEMPTS`/`JOBS_BACKOFF_DELAY_MS` reemplazan las
 * constantes hoy hardcodeadas en `BullMqJobsQueueAdapter` (AD-12). El resto
 * (reconciliacion, umbrales de atasco, retencion) queda validado y
 * disponible para el worker/reconciliador de Sprint 4, que todavia no
 * existen — esta tarjeta solo los hace existir, no los consume. Fail-fast:
 * un valor presente pero fuera de rango hace fallar el arranque; ausente
 * aplica el default MVP.
 */
export const jobsEnvSchema = z.object({
  JOBS_RECONCILIATION_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  JOBS_RECONCILIATION_INTERVAL_MS: z.coerce.number().int().min(60000).max(3600000).default(300000),
  JOBS_STALE_QUEUED_MS: z.coerce.number().int().min(60000).max(7200000).default(600000),
  JOBS_STALE_PROCESSING_MS: z.coerce.number().int().min(60000).max(7200000).default(900000),

  /** Cuenta ejecuciones totales, no reintentos (AD-4.1): `1` = sin reintentos. */
  JOBS_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  JOBS_BACKOFF_DELAY_MS: z.coerce.number().int().min(100).max(60000).default(5000),

  JOBS_REMOVE_ON_COMPLETE_COUNT: z.coerce.number().int().min(10).max(100000).default(1000),
  JOBS_REMOVE_ON_COMPLETE_AGE_SECONDS: z.coerce
    .number()
    .int()
    .min(3600)
    .max(2592000)
    .default(86400),
  JOBS_REMOVE_ON_FAIL_COUNT: z.coerce.number().int().min(10).max(100000).default(5000),
  JOBS_REMOVE_ON_FAIL_AGE_SECONDS: z.coerce.number().int().min(3600).max(7776000).default(604800),
});

export type JobsEnv = z.infer<typeof jobsEnvSchema>;
