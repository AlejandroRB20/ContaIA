import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { eventsFile, eventLogLockFile } from './paths.mjs';
import { withLock } from './lock.mjs';

/**
 * Log de transiciones append-only en JSONL (arquitectura §8).
 *
 * Nunca se reescribe, ni se reordena, **ni se trunca**. Está subordinado a
 * `CHANGELOG.md` y a los `_FINAL_AUDIT.md`: no es una segunda fuente de
 * verdad del estado del proyecto (riesgo `RL-07`), sólo la traza de
 * ejecución del motor.
 *
 * `state/<task_id>.json` es una proyección derivable de este log: si se
 * corrompe, se reconstruye con `projectTaskState()`.
 *
 * ## Recurso global, exclusión global
 *
 * El archivo lo comparten **todas** las tarjetas. La reauditoría de
 * `LOOP-001` encontró que la sesión de QA se protegía con un lock por
 * `task_id` y, al fallar, truncaba el log al tamaño que tenía antes de
 * empezar: si otra tarjeta había registrado un evento válido en ese
 * intervalo, ese evento desaparecía.
 *
 * De ahí las dos reglas de este módulo:
 *
 *   1. **Un solo camino de escritura.** `fs.appendFileSync` sobre el log
 *      aparece exactamente una vez, en `appendRecords`. Nadie más escribe
 *      el archivo; hay prueba que lo verifica sobre el código fuente.
 *   2. **Una sola exclusión, y es global.** Todo escritor pasa por
 *      `withEventLogLock`, que usa el mismo primitivo atómico de
 *      `lock.mjs` sobre `state/events.lock`.
 */

/** Sección crítica global del event log. Reentrar en ella es un error. */
export function withEventLogLock(fn) {
  return withLock(eventLogLockFile(), fn);
}

/** Forma canónica de un evento. Pura: no toca disco. */
export function toEventRecord(event, transactionId = null) {
  return {
    ts: new Date().toISOString(),
    transaction_id: event.transaction_id ?? transactionId,
    mission_id: event.mission_id ?? null,
    task_id: event.task_id,
    agent_id: event.agent_id ?? null,
    actor_type: event.actor_type ?? null,
    from_state: event.from_state ?? null,
    to_state: event.to_state ?? null,
    repair_iteration: event.repair_iteration ?? null,
    qa_iteration: event.qa_iteration ?? null,
    commit: event.commit ?? null,
    result: event.result ?? null,
    blocked_reason: event.blocked_reason ?? null,
    note: event.note ?? null,
  };
}

/**
 * ÚNICO punto de escritura del archivo. Exige sostener ya el lock global;
 * sólo `appendEvents` y `commitTransaction` deben llamarlo.
 *
 * Los registros de una misma transacción se escriben en **una sola**
 * llamada: o entran todos o no entra ninguno.
 */
export function appendRecordsHoldingEventLock(records) {
  if (records.length === 0) return records;
  const file = eventsFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, records.map((r) => `${JSON.stringify(r)}\n`).join(''), 'utf8');
  return records;
}

/** Registra un grupo de eventos como una unidad, bajo el lock global. */
export function appendEvents(events, { transactionId = randomUUID() } = {}) {
  const records = events.map((event) => toEventRecord(event, transactionId));
  return withEventLogLock(() => appendRecordsHoldingEventLock(records));
}

export function appendEvent(event) {
  return appendEvents([event])[0];
}

export function readEvents() {
  const file = eventsFile();
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export function eventsForTask(taskId) {
  return readEvents().filter((e) => e.task_id === taskId);
}

/**
 * Reconstruye el estado de una tarjeta reproduciendo su log — la garantía
 * de recuperación exigida por la arquitectura §16 y por `LOOP-007`.
 * Devuelve `null` si la tarjeta no tiene eventos.
 */
export function projectTaskState(taskId) {
  const events = eventsForTask(taskId);
  if (events.length === 0) return null;
  const last = events.at(-1);
  return {
    task_id: taskId,
    mission_id: last.mission_id,
    state: last.to_state,
    repair_iteration: lastNonNull(events, 'repair_iteration') ?? 0,
    qa_iteration: lastNonNull(events, 'qa_iteration') ?? 0,
    candidate_commit: lastNonNull(events, 'commit'),
    blocked_reason: last.blocked_reason,
    owner: last.agent_id,
    event_count: events.length,
  };
}

function lastNonNull(events, field) {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (events[i][field] !== null && events[i][field] !== undefined) return events[i][field];
  }
  return null;
}

/**
 * Vuelca un `history[]` en memoria (formato del ciclo de QA) al log
 * canónico, como **un solo grupo**. Así el QA loop conserva su pureza
 * funcional y su historial acaba igualmente en `events.jsonl`.
 */
export function flushLoopHistory(taskId, missionId, agentId, history) {
  return appendEvents(
    (history ?? []).map((entry) => ({
      task_id: taskId,
      mission_id: missionId,
      agent_id: entry.agent_id ?? agentId,
      actor_type: 'agent',
      from_state: entry.from,
      to_state: entry.to,
      qa_iteration: entry.qaCycles ?? null,
      result: entry.auditResult?.verdict ?? null,
      note: entry.reason ?? null,
    })),
  );
}
