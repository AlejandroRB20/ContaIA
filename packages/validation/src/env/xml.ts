import { z } from 'zod';

/**
 * Limites estructurales de parseo XML (EWO-005 Bloque E, Addendum §10.3,
 * `E5-S4-T09`). Consumidos por `validateXml`/`XmlValidationLimits`
 * (`E5-S3-T04`) y por el futuro worker — ninguno declara su propio default
 * local; esta es la unica fuente. Fail-fast: un valor presente pero fuera
 * de rango hace fallar el arranque; ausente aplica el default MVP.
 */
export const xmlEnvSchema = z.object({
  XML_MAX_FILE_SIZE_BYTES: z.coerce.number().int().min(1024).max(104857600).default(10485760),
  XML_MAX_DEPTH: z.coerce.number().int().min(5).max(200).default(50),
  XML_MAX_NODE_COUNT: z.coerce.number().int().min(100).max(1000000).default(100000),
  XML_MAX_ATTRIBUTE_COUNT: z.coerce.number().int().min(100).max(500000).default(50000),
});

export type XmlEnv = z.infer<typeof xmlEnvSchema>;
