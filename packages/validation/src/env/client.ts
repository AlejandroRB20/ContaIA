import { z } from 'zod';

/**
 * Variables PUBLICAS consumidas por el frontend (apps/web).
 * Solo variables con prefijo NEXT_PUBLIC_ pueden vivir aqui: Next.js las
 * incrusta en el bundle de cliente en tiempo de compilacion, por lo que
 * NUNCA deben contener secretos (docs/11_SECURITY_ARCHITECTURE.md seccion 3).
 */
export const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_APP_VERSION: z.string().min(1).default('0.1.0'),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;
