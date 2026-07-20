import { z } from 'zod';

/**
 * Variables PRIVADAS del backend (apps/api). Nunca deben exponerse al
 * cliente ni registrarse en logs (docs/11_SECURITY_ARCHITECTURE.md seccion 29).
 */
export const serverEnvSchema = z.object({
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_GLOBAL_PREFIX: z.string().min(1).default('api'),
  CORS_ORIGINS: z
    .string()
    .min(1)
    .default('http://localhost:3000')
    .transform((value) => value.split(',').map((origin) => origin.trim())),
  RATE_LIMIT_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
  AUTH_RATE_LIMIT_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(10),

  /**
   * EWO-002 (Authentication & Authorization). Access token JWT de corta
   * duracion (docs/20_BACKEND_IMPLEMENTATION_PLAN.md seccion 2/18) — nunca
   * expuesto al cliente, nunca en logs.
   */
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  SESSION_COOKIE_DOMAIN: z.string().min(1).optional(),

  /** Cifrado simetrico del secreto TOTP en reposo (User.mfaSecretEncrypted). */
  MFA_ENCRYPTION_KEY: z.string().min(32),
  MFA_ISSUER_NAME: z.string().min(1).default('ContaIA'),

  PASSWORD_RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  EMAIL_VERIFICATION_TOKEN_TTL_HOURS: z.coerce.number().int().positive().default(24),
  INVITATION_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),

  /** Secreto de firma del token CSRF de doble cookie. */
  CSRF_SECRET: z.string().min(32),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
