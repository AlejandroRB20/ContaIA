import type { z } from 'zod';

/**
 * Analiza `process.env` contra un esquema Zod y falla rapido (fail-fast) con
 * un mensaje claro que nunca expone el valor de la variable — solo el
 * nombre del campo y el problema (docs/11_SECURITY_ARCHITECTURE.md seccion 29:
 * ningun log ni mensaje de error expone un secreto).
 */
export function parseEnv<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  source: NodeJS.ProcessEnv,
  contextLabel: string,
): z.infer<TSchema> {
  const result = schema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(raiz)'}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `Configuracion invalida para "${contextLabel}". Revisa las siguientes variables de entorno:\n${issues}`,
    );
  }

  return result.data;
}
