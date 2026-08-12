import { globsOverlap } from './glob.mjs';
import { OWNED_STATES } from './state-machine.mjs';
import { classifyMigrationLock } from './migration-lock.mjs';
import { decisionGateConflicts } from './decision-gate.mjs';
import { sharedContractConflicts } from './contracts.mjs';

/**
 * Comprobaciones de concurrencia (arquitectura §10). Dos tarjetas corren en
 * paralelo **sólo si superan todas**; cualquier fallo las serializa.
 *
 * `LOOP-001` implementó #1 (solape de archivos), #2 directa (dependencias
 * inmediatas) y #3 en su forma de barrido de estado activo. `LOOP-002`
 * completa las cinco: #2 pasa a razonar **transitivamente** sobre el grafo
 * completo con detección de ciclos y cierre fail-closed sobre referencias
 * malformadas; #3 se respalda además en un cerrojo persistido
 * (`migration-lock.mjs`) que no depende de qué tarjetas aparecen "activas"
 * en la llamada; #4 (`D-XXX` pendiente) y #5 (contrato compartido) dejan de
 * ser `NOT_IMPLEMENTED` y pasan a `decision-gate.mjs` y `contracts.mjs`.
 */

const OWNED = new Set(OWNED_STATES);

/** Límite de tarjetas simultáneas en v1 (arquitectura §10). */
export const MAX_CONCURRENT_TASKS = 2;

/** Superficie que fuerza cerrojo global: nunca dos migraciones a la vez. */
export const MIGRATION_GLOBS = Object.freeze([
  'packages/database/prisma/**',
  'packages/database/prisma',
]);

export function activeTasks(tasks) {
  return tasks.filter((t) => OWNED.has(t.state));
}

/** #1 — solape de `allowed_write` por globs. */
export function fileOverlapConflicts(task, tasks) {
  return activeTasks(tasks)
    .filter((other) => other.task_id !== task.task_id)
    .filter((other) => globsOverlap(task.allowed_write, other.allowed_write))
    .map((other) => ({ check: 'FILE_OVERLAP', with: other.task_id }));
}

/**
 * #2 — dependencias, transitivas.
 *
 * Una dependencia sólo se considera satisfecha si su tarjeta alcanzó
 * `READY_FOR_INTEGRATION`, `INTEGRATED` o `PASSED`. La misión de `LOOP-002`
 * exige razonar **la cadena completa**, no sólo el padre directo: si A
 * depende de B y B depende de C, un C sin cerrar bloquea a A aunque B mismo
 * ya esté satisfecho — otro caso donde comprobar sólo el padre inmediato
 * daría un falso verde.
 */
const SATISFIED_STATES = new Set(['READY_FOR_INTEGRATION', 'INTEGRATED', 'PASSED']);

/** Compatibilidad directa — conservada porque `LOOP-001` ya la exponía. */
export function unmetDependencies(task, tasks) {
  return transitiveDependencyClosure(task, tasks).unmet;
}

/**
 * Recorre el grafo completo de dependencias alcanzable desde `task`.
 * **Fail-closed sobre DAG malformado:** un `task_id` referenciado que no
 * existe en `tasks` no se ignora — cuenta como no satisfecho y se reporta
 * aparte en `malformed`. Segura ante ciclos: un `visited` por recorrido
 * impide bucle infinito aunque se llame sin pasar antes por
 * `dependencyCycle`.
 *
 * @returns {{unmet: string[], malformed: string[], visited: string[]}}
 */
export function transitiveDependencyClosure(task, tasks) {
  const byId = new Map(tasks.map((t) => [t.task_id, t]));
  const visited = new Set();
  const unmet = [];
  const malformed = [];

  function walk(depId) {
    if (visited.has(depId)) return;
    visited.add(depId);

    const dep = byId.get(depId);
    if (!dep) {
      malformed.push(depId);
      unmet.push(depId); // referencia rota: nunca se interpreta como satisfecha
      return;
    }
    if (!SATISFIED_STATES.has(dep.state)) unmet.push(depId);
    for (const nextId of dep.dependencies ?? []) walk(nextId);
  }

  for (const depId of task.dependencies ?? []) walk(depId);

  return { unmet: [...new Set(unmet)], malformed: [...new Set(malformed)], visited: [...visited] };
}

/** Detecta un ciclo alcanzable desde `task`. Un ciclo → decisión humana. */
export function dependencyCycle(task, tasks) {
  const byId = new Map(tasks.map((t) => [t.task_id, t]));
  const visiting = new Set();
  const path = [];

  function walk(id) {
    if (visiting.has(id)) return [...path.slice(path.indexOf(id)), id];
    const node = byId.get(id);
    if (!node) return null;
    visiting.add(id);
    path.push(id);
    for (const dep of node.dependencies ?? []) {
      const cycle = walk(dep);
      if (cycle) return cycle;
    }
    path.pop();
    visiting.delete(id);
    return null;
  }

  return walk(task.task_id);
}

/** #3 — cerrojo global de migración: superficie declarada. */
export function touchesMigrationSurface(task) {
  return globsOverlap(task.allowed_write, MIGRATION_GLOBS);
}

/**
 * #3 — cerrojo global de migración, evaluado en dos capas independientes:
 *
 *   1. **Barrido de estado activo** (`LOOP-001`): cualquier otra tarjeta
 *      `activeTasks` que también toque la superficie de migración serializa,
 *      sin importar si algún lock llegó a persistirse todavía.
 *   2. **Cerrojo persistido** (`LOOP-002`): si `state/locks/migration.lock.json`
 *      existe y pertenece a otra tarjeta, bloquea — **incluso si esa
 *      tarjeta no aparece en `tasks` como activa**, porque el cerrojo es la
 *      fuente de verdad de posesión, no un derivado del estado en memoria.
 *      Un cerrojo vencido (`STALE_HEARTBEAT`/`TIMED_OUT`) **sigue
 *      bloqueando**: vencido nunca se interpreta como libre; liberarlo exige
 *      la resolución humana explícita de `releaseMigrationLock`.
 */
export function migrationLockConflicts(task, tasks) {
  const others = activeTasks(tasks).filter((o) => o.task_id !== task.task_id);
  const touchesMigration = touchesMigrationSurface(task);
  const conflicts = [];

  if (touchesMigration) {
    // Una migración no corre junto a nada: ni con otra migración ni con
    // trabajo que pueda leer el schema mientras cambia.
    for (const other of others) {
      conflicts.push({ check: 'MIGRATION_GLOBAL_LOCK', with: other.task_id });
    }
  } else {
    for (const other of others.filter((o) => touchesMigrationSurface(o))) {
      conflicts.push({ check: 'MIGRATION_GLOBAL_LOCK', with: other.task_id });
    }
  }

  if (touchesMigration) {
    const { status, lock } = classifyMigrationLock();
    if (lock && lock.task_id !== task.task_id) {
      conflicts.push({
        check: 'MIGRATION_LOCK_HELD',
        with: lock.task_id,
        lock_status: status,
        blocked_reason: status === 'ACTIVE' ? 'migration_lock_held' : 'migration_lock_stale',
        requires_human_resolution: status !== 'ACTIVE',
      });
    }
  }

  return conflicts;
}

/** #4 — `D-XXX` pendiente. Evidencia explícita; ver `decision-gate.mjs`. */
export function decisionGateCheck(task, decisionEvidence) {
  const conflicts = decisionGateConflicts(task, decisionEvidence);
  if (conflicts.length === 0) {
    return { check: 'PENDING_DECISION_GATE', status: 'CLEARED', conflicts: [] };
  }
  return { check: 'PENDING_DECISION_GATE', status: 'BLOCKED', conflicts };
}

/** #5 — contrato compartido. Ver `contracts.mjs`. */
export function sharedContractCheck(task, tasks) {
  const others = activeTasks(tasks).filter((o) => o.task_id !== task.task_id);
  const conflicts = sharedContractConflicts(task, others);
  return {
    check: 'SHARED_CONTRACT',
    status: conflicts.length === 0 ? 'CLEARED' : 'BLOCKED',
    conflicts,
  };
}

/**
 * Evaluación completa para una tarjeta candidata.
 *
 * @param {object} task
 * @param {object[]} tasks todas las tarjetas conocidas (para dependencias,
 *   solape, migración y contrato compartido)
 * @param {{decisionEvidence?: Record<string, {status: string}>}} [options]
 *   `decisionEvidence` es evidencia explícita de estado de decisión — nunca
 *   derivada por el motor (§10.4). Ausente equivale a "sin evidencia": las
 *   tarjetas con `decision_refs` declarado bloquean.
 * @returns {{eligible: boolean, conflicts: object[]}}
 */
export function evaluateConcurrency(task, tasks, { decisionEvidence } = {}) {
  const conflicts = [];

  const cycle = dependencyCycle(task, tasks);
  if (cycle) {
    conflicts.push({ check: 'DEPENDENCY_CYCLE', cycle, blocked_reason: 'dependency_cycle' });
  }

  const closure = transitiveDependencyClosure(task, tasks);
  if (closure.malformed.length > 0) {
    conflicts.push({
      check: 'DEPENDENCY_MALFORMED',
      malformed: closure.malformed,
      blocked_reason: 'dependency_malformed',
    });
  }
  if (closure.unmet.length > 0) {
    conflicts.push({
      check: 'UNMET_DEPENDENCIES',
      unmet: closure.unmet,
      blocked_reason: 'dependency_transitive_unmet',
    });
  }

  conflicts.push(...fileOverlapConflicts(task, tasks));
  conflicts.push(...migrationLockConflicts(task, tasks));
  conflicts.push(...decisionGateConflicts(task, decisionEvidence));
  conflicts.push(...sharedContractConflicts(task, activeTasks(tasks).filter((o) => o.task_id !== task.task_id)));

  if (activeTasks(tasks).filter((t) => t.task_id !== task.task_id).length >= MAX_CONCURRENT_TASKS) {
    conflicts.push({ check: 'MAX_CONCURRENCY', limit: MAX_CONCURRENT_TASKS });
  }

  return {
    eligible: conflicts.length === 0,
    conflicts,
  };
}
