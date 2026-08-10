import { globsOverlap } from './glob.mjs';
import { OWNED_STATES } from './state-machine.mjs';

/**
 * Comprobaciones de concurrencia (arquitectura §10). Dos tarjetas corren en
 * paralelo **sólo si superan todas**; cualquier fallo las serializa.
 *
 * Alcance de `LOOP-001`: se implementan #1 (solape de archivos por globs),
 * #2 (dependencias, incluida detección de ciclos) y #3 (cerrojo global de
 * migración). Las comprobaciones #4 (`D-XXX` pendiente) y #5 (contrato
 * compartido) quedan como **interfaz mínima declarada** y devuelven un
 * resultado explícito `NOT_IMPLEMENTED`: la misión prohíbe adelantar
 * `LOOP-002` y las capacidades avanzadas, pero dejarlas sin señal las haría
 * indistinguibles de "comprobado y correcto".
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
 * #2 — dependencias. Una dependencia sólo se considera satisfecha si su
 * tarjeta alcanzó `READY_FOR_INTEGRATION`, `INTEGRATED` o `PASSED`.
 */
const SATISFIED_STATES = new Set(['READY_FOR_INTEGRATION', 'INTEGRATED', 'PASSED']);

export function unmetDependencies(task, tasks) {
  const byId = new Map(tasks.map((t) => [t.task_id, t]));
  return (task.dependencies ?? []).filter((depId) => {
    const dep = byId.get(depId);
    return !dep || !SATISFIED_STATES.has(dep.state);
  });
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

/** #3 — cerrojo global de migración. */
export function touchesMigrationSurface(task) {
  return globsOverlap(task.allowed_write, MIGRATION_GLOBS);
}

export function migrationLockConflicts(task, tasks) {
  const others = activeTasks(tasks).filter((o) => o.task_id !== task.task_id);
  if (touchesMigrationSurface(task)) {
    // Una migración no corre junto a nada: ni con otra migración ni con
    // trabajo que pueda leer el schema mientras cambia.
    return others.map((other) => ({ check: 'MIGRATION_GLOBAL_LOCK', with: other.task_id }));
  }
  return others
    .filter((other) => touchesMigrationSurface(other))
    .map((other) => ({ check: 'MIGRATION_GLOBAL_LOCK', with: other.task_id }));
}

/**
 * #4 y #5 — interfaz declarada, sin implementación en `LOOP-001`.
 * Devuelven `status: 'NOT_IMPLEMENTED'` para que ninguna capa superior las
 * confunda con una comprobación superada.
 */
export function decisionGateCheck() {
  return {
    check: 'PENDING_DECISION_GATE',
    status: 'NOT_IMPLEMENTED',
    note: 'Comprobación §10.4 (D-XXX no ACEPTADA) fuera del alcance de LOOP-001.',
  };
}

export function sharedContractCheck() {
  return {
    check: 'SHARED_CONTRACT',
    status: 'NOT_IMPLEMENTED',
    note: 'Comprobación §10.5 (contrato compartido / reads_contract) fuera del alcance de LOOP-001.',
  };
}

/**
 * Evaluación completa para una tarjeta candidata.
 * @returns {{eligible: boolean, conflicts: object[], notImplemented: object[]}}
 */
export function evaluateConcurrency(task, tasks) {
  const conflicts = [];

  const cycle = dependencyCycle(task, tasks);
  if (cycle) {
    conflicts.push({ check: 'DEPENDENCY_CYCLE', cycle, blocked_reason: 'dependency_cycle' });
  }

  const unmet = unmetDependencies(task, tasks);
  if (unmet.length > 0) conflicts.push({ check: 'UNMET_DEPENDENCIES', unmet });

  conflicts.push(...fileOverlapConflicts(task, tasks));
  conflicts.push(...migrationLockConflicts(task, tasks));

  if (activeTasks(tasks).filter((t) => t.task_id !== task.task_id).length >= MAX_CONCURRENT_TASKS) {
    conflicts.push({ check: 'MAX_CONCURRENCY', limit: MAX_CONCURRENT_TASKS });
  }

  return {
    eligible: conflicts.length === 0,
    conflicts,
    notImplemented: [decisionGateCheck(), sharedContractCheck()],
  };
}
