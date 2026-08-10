import { globsOverlap } from './glob.mjs';

/**
 * Detección de colisión de superficie entre tarjetas (arquitectura §10.1).
 *
 * Sustituye la versión de Claude-03 (`2e128c7`), que comparaba rutas por
 * igualdad exacta y llevaba su propia nota `ponytail:` reconociendo el
 * límite: "si las tareas empiezan a declarar globs, ampliar aquí antes de
 * confiar en este detector". El contrato de la arquitectura §6 declara
 * globs, así que ese momento es ahora.
 */

/**
 * @param {Array<{task_id: string, allowed_write: string[]}>} claims
 * @returns {Array<{task_ids: string[], patterns: string[]}>}
 */
export function detectCollisions(claims) {
  const collisions = [];
  for (let i = 0; i < claims.length; i += 1) {
    for (let j = i + 1; j < claims.length; j += 1) {
      const a = claims[i];
      const b = claims[j];
      if (globsOverlap(a.allowed_write, b.allowed_write)) {
        collisions.push({
          task_ids: [a.task_id, b.task_id],
          patterns: [...(a.allowed_write ?? []), ...(b.allowed_write ?? [])],
        });
      }
    }
  }
  return collisions;
}

export function canRunInParallel(claims) {
  return detectCollisions(claims).length === 0;
}
