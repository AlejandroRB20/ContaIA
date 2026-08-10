/**
 * Matcher de globs de rutas, sin dependencias externas.
 *
 * Resuelve el defecto señalado en `LOOP-000_GOVERNANCE_SUBSTRATE.md` §6.3:
 * `allowed_write: ["apps/api/**"]` con coincidencia exacta de `Set` no
 * casaba con ningún archivo real, de modo que **todo** quedaba fuera de
 * alcance y el contrato de la arquitectura §6 era inusable.
 *
 * Sintaxis soportada (deliberadamente acotada):
 *
 *   `*`   — cualquier secuencia dentro de UN segmento (no cruza `/`)
 *   `**`  — cero o más segmentos completos (sí cruza `/`)
 *   `?`   — exactamente un carácter dentro de un segmento
 *   resto — literal
 *
 * Todo lo demás (llaves, clases de caracteres, negación, `extglob`) NO se
 * soporta y se trata como literal. Es una decisión de seguridad: un patrón
 * que el motor no entiende del todo no debe ampliar el alcance por
 * accidente. Si un patrón necesita más expresividad, se declara con más
 * entradas en la lista.
 */

/** Normaliza separadores y quita `./` inicial; nunca resuelve `..`. */
export function normalizePath(p) {
  if (typeof p !== 'string') return '';
  return p.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+/g, '/').replace(/\/$/, '');
}

function escapeRegex(literal) {
  return literal.replace(/[.+^${}()|[\]\\]/g, '\\$&');
}

/**
 * Compila un glob a RegExp anclado. Exportado para poder probar la
 * traducción directamente, no solo su efecto.
 */
export function globToRegExp(pattern) {
  const normalized = normalizePath(pattern);
  let out = '';
  let i = 0;

  while (i < normalized.length) {
    const char = normalized[i];

    if (char === '*') {
      const isDouble = normalized[i + 1] === '*';
      if (isDouble) {
        const nextIsSlash = normalized[i + 2] === '/';
        if (nextIsSlash) {
          // `a/**/b` debe casar también `a/b` — el segmento intermedio es opcional.
          out += '(?:.*/)?';
          i += 3;
        } else {
          out += '.*';
          i += 2;
        }
        continue;
      }
      out += '[^/]*';
      i += 1;
      continue;
    }

    if (char === '?') {
      out += '[^/]';
      i += 1;
      continue;
    }

    out += escapeRegex(char);
    i += 1;
  }

  return new RegExp(`^${out}$`);
}

/** ¿Casa `filePath` con el patrón `pattern`? */
export function matchesGlob(filePath, pattern) {
  const file = normalizePath(filePath);
  const pat = normalizePath(pattern);
  if (file === '' || pat === '') return false;

  if (globToRegExp(pat).test(file)) return true;

  // Un patrón sin comodines que nombra un directorio cubre su contenido:
  // `packages/database` cubre `packages/database/prisma/schema.prisma`.
  // Es la semántica de prefijo que Claude-03 aplicaba con `startsWith` a
  // `forbidden_scope`, conservada aquí sin perderla en la unificación.
  if (!/[*?]/.test(pat) && file.startsWith(`${pat}/`)) return true;

  return false;
}

/** ¿Casa `filePath` con alguno de los patrones? Lista vacía → `false`. */
export function matchesAny(filePath, patterns) {
  if (!Array.isArray(patterns) || patterns.length === 0) return false;
  return patterns.some((pattern) => matchesGlob(filePath, pattern));
}

/**
 * Verificación fail-closed del alcance de escritura de un candidato.
 *
 * Reglas (arquitectura §6.2): `allowed_write` es lista blanca —
 * un `allowed_write` ausente o vacío no autoriza nada; `forbidden_scope`
 * gana siempre sobre `allowed_write`.
 *
 * @returns {{ok: boolean, outsideAllowed: string[], forbidden: string[]}}
 */
export function checkWriteScope(changedFiles, { allowedWrite, forbiddenScope } = {}) {
  const files = (changedFiles ?? []).map(normalizePath).filter(Boolean);
  const allowed = allowedWrite ?? [];
  const forbidden = forbiddenScope ?? [];

  const outsideAllowed = files.filter((file) => !matchesAny(file, allowed));
  const forbiddenHits = files.filter((file) => matchesAny(file, forbidden));

  return {
    ok: outsideAllowed.length === 0 && forbiddenHits.length === 0,
    outsideAllowed,
    forbidden: forbiddenHits,
  };
}

/**
 * ¿Se solapan dos conjuntos de globs? Se usa para la comprobación de
 * concurrencia #1 (arquitectura §10): intersección no vacía → serializar.
 *
 * No existe algoritmo exacto de intersección de globs sin enumerar el
 * árbol de archivos. Se usa una aproximación **conservadora**: dos
 * patrones se consideran solapados si uno casa al otro tratado como ruta,
 * o si comparten prefijo literal antes del primer comodín. Ante duda,
 * declara solape — serializar de más es seguro, paralelizar de más no.
 */
export function globsOverlap(patternsA, patternsB) {
  const a = (patternsA ?? []).map(normalizePath).filter(Boolean);
  const b = (patternsB ?? []).map(normalizePath).filter(Boolean);

  for (const pa of a) {
    for (const pb of b) {
      if (pa === pb) return true;
      if (matchesGlob(literalPrefix(pb), pa) || matchesGlob(literalPrefix(pa), pb)) return true;
      const pre1 = literalPrefix(pa);
      const pre2 = literalPrefix(pb);
      if (pre1 && pre2 && (pre1.startsWith(`${pre2}/`) || pre2.startsWith(`${pre1}/`))) return true;
    }
  }
  return false;
}

/** Prefijo literal de un glob: todo lo anterior al primer comodín, por segmentos. */
function literalPrefix(pattern) {
  const segments = normalizePath(pattern).split('/');
  const literal = [];
  for (const segment of segments) {
    if (/[*?]/.test(segment)) break;
    literal.push(segment);
  }
  return literal.join('/');
}
