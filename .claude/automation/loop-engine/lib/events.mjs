import fs from 'node:fs';
import path from 'node:path';
import { eventsFile } from './paths.mjs';

/**
 * Log de transiciones append-only en JSONL (arquitectura §8).
 *
 * Nunca se reescribe ni se reordena. Está **subordinado** a `CHANGELOG.md`
 * y a los `_FINAL_AUDIT.md`: no es una segunda fuente de verdad del estado
 * del proyecto (riesgo `RL-07`), sólo la traza de ejecución del motor.
 *
 * `state/<task_id>.json` es una proyección derivable de este log: si se
 * corrompe, se reconstruye con `projectTaskState()`.
 */
export function appendEvent(event) {
  const file = eventsFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const record = {
    ts: new Date().toISOString(),
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
  fs.appendFileSync(file, `${JSON.stringify(record)}\n`, 'utf8');
  return record;
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
 * Vuelca un `history[]` en memoria (formato del ciclo de QA de Claude-03)
 * al log canónico. Así el QA loop conserva su pureza funcional y su
 * historial acaba igualmente en `events.jsonl`.
 */
export function flushLoopHistory(taskId, missionId, agentId, history) {
  return (history ?? []).map((entry) =>
    appendEvent({
      task_id: taskId,
      mission_id: missionId,
      agent_id: entry.agent_id ?? agentId,
      actor_type: 'agent',
      from_state: entry.from,
      to_state: entry.to,
      qa_iteration: entry.qaCycles ?? null,
      result: entry.auditResult?.verdict ?? null,
      note: entry.reason ?? null,
    }),
  );
}
