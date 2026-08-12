import { migrationLockFile } from './paths.mjs';
import { acquireLock, readLock, releaseLock, refreshHeartbeat } from './lock.mjs';
import { classifyClaim } from './recovery.mjs';

/**
 * Cerrojo de sección crítica de migración (arquitectura §10.3, `LOOP-002`).
 *
 * *"Sólo una tarjeta que afecte el alcance de migración/schema puede poseer
 * la sección crítica de migración a la vez. Sin liberación automática de un
 * lock ajeno. Un cerrojo de migración vencido exige resolución humana."*
 *
 * No es un segundo primitivo de locking: es el **mismo** `acquireLock`/
 * `releaseLock`/`refreshHeartbeat` de `lock.mjs` sobre una única ruta global
 * (`migration.lock.json`, no una por tarjeta), y la misma clasificación de
 * vencimiento que `recovery.mjs` ya usa para el lock de tarjeta
 * (`classifyClaim`), reutilizada, no reimplementada.
 *
 * **Por qué un lock vencido no se libera aquí.** `classifyMigrationLock`
 * puede devolver `STALE_HEARTBEAT`; ninguna función de este módulo actúa
 * sobre esa clasificación por su cuenta. Liberar sigue exigiendo
 * `releaseMigrationLock({ confirmed: true, agentId })`, exactamente como
 * cualquier otro lock del motor (arquitectura §9.6) — la diferencia es que
 * cuando el lock está vencido, quien libera casi siempre es una persona con
 * un `agentId` distinto al dueño original, así que `migrationLockConflicts`
 * (en `concurrency.mjs`) sigue bloqueando la elegibilidad mientras el lock
 * exista, esté vencido o no: vencido no es sinónimo de libre.
 */

export function acquireMigrationLock({ taskId, agentId, missionId }) {
  return acquireLock(migrationLockFile(), {
    task_id: taskId,
    mission_id: missionId ?? null,
    agent_id: agentId,
    pid_hint: process.pid,
  });
}

export function readMigrationLock() {
  return readLock(migrationLockFile());
}

/** `'NO_LOCK' | 'ACTIVE' | 'STALE_HEARTBEAT' | 'TIMED_OUT'`. Sólo lectura. */
export function classifyMigrationLock(now = Date.now(), timeouts = {}) {
  const lock = readMigrationLock();
  if (!lock) return { status: 'NO_LOCK', lock: null };
  return { status: classifyClaim(lock, now, timeouts), lock };
}

export function refreshMigrationLockHeartbeat(agentId) {
  return refreshHeartbeat(migrationLockFile(), agentId);
}

/**
 * Libera el cerrojo. Exige `confirmed: true`; `agentId` debe coincidir con
 * el dueño salvo que quien libera declare explícitamente que actúa por
 * decisión humana pasando el `agentId` real del dueño (igual que
 * `releaseLock` en general — nadie borra un lock ajeno sin saber de quién
 * es y decidir conscientemente liberarlo).
 */
export function releaseMigrationLock({ agentId, confirmed }) {
  return releaseLock(migrationLockFile(), { agentId, confirmed });
}
