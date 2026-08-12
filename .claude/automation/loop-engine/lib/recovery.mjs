import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  locksDir,
  taskLockFile,
  repoRoot,
  recoveryFile,
  resolvedRecoveryDir,
  stateMutationLockFile,
} from './paths.mjs';
import { readLock, withLock } from './lock.mjs';
import { readRecovery, hasPendingRecovery, describeTaskConditions } from './guard.mjs';
import { getOrCreateTaskState, writeTaskState } from './store.mjs';
import { readEvents, appendEvents } from './events.mjs';

/**
 * Recuperación (arquitectura §16). Fusiona las dos aportaciones:
 * `classifyClaim`/`findRecoverableClaims`/`validateCandidateEnvironment` de
 * Claude-03 (`2e128c7`) y el ciclo `release`/`resume` de Claude-02
 * (`7bdf159`, ahora en `dispatcher.mjs`).
 *
 * **Principio transversal: el motor conserva y reporta; nunca borra,
 * descarta ni resetea.** Un lock vencido es *candidato* a huérfano, jamás
 * se elimina solo (§9.5, §16). Un worktree con cambios no se toca
 * (`.claude/rules/40-parallel-work.md` §4).
 */

/** Minutos sin heartbeat tras los que un lock es candidato a huérfano. */
export const LOCK_STALE_MINUTES = 45;

export function classifyClaim(lock, now, { heartbeatTimeoutMs, taskTimeoutMs } = {}) {
  const heartbeatLimit = heartbeatTimeoutMs ?? LOCK_STALE_MINUTES * 60_000;
  const createdAt = Date.parse(lock.created_at);
  const heartbeatAt = Date.parse(lock.heartbeat_at ?? lock.created_at);

  if (taskTimeoutMs !== undefined && now - createdAt > taskTimeoutMs) return 'TIMED_OUT';
  if (now - heartbeatAt > heartbeatLimit) return 'STALE_HEARTBEAT';
  return 'ACTIVE';
}

/**
 * Locks candidatos a recuperación. Cada uno se devuelve marcado
 * `requiresHumanConfirmation: true` — **no los libera**.
 */
export function findRecoverableClaims(now = Date.now(), timeouts = {}) {
  const dir = locksDir();
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.lock.json'))
    .map((name) => readLock(`${dir}/${name}`))
    .filter(Boolean)
    .map((lock) => ({ lock, status: classifyClaim(lock, now, timeouts) }))
    .filter(({ status }) => status !== 'ACTIVE')
    .map(({ lock, status }) => ({
      lock,
      status,
      requiresHumanConfirmation: true,
      note: 'Candidato a huérfano. El motor NO lo libera: exige confirmación humana explícita.',
    }));
}

/**
 * Valida que el entorno de un candidato sea utilizable. Sólo lectura.
 * @returns {string[]} códigos de problema; vacío si todo es válido
 */
export function validateCandidateEnvironment({
  repoPath = repoRoot(),
  worktreePath,
  candidateCommit,
} = {}) {
  const issues = [];

  if (!worktreePath || !fs.existsSync(worktreePath)) issues.push('WORKTREE_MISSING');

  if (!candidateCommit) {
    issues.push('CANDIDATE_COMMIT_MISSING');
  } else {
    try {
      execFileSync('git', ['cat-file', '-e', `${candidateCommit}^{commit}`], {
        cwd: repoPath,
        stdio: 'ignore',
      });
    } catch {
      issues.push('CANDIDATE_COMMIT_MISSING');
    }
  }

  return issues;
}

/** Estado de recuperación de una tarjeta, sin efectos secundarios. */
export function inspectTask(task, now = Date.now()) {
  const lock = readLock(taskLockFile(task.task_id));
  const conditions = describeTaskConditions(task.task_id, task);
  return {
    task_id: task.task_id,
    state: task.state,
    owner: task.owner,
    operable: conditions.operable,
    conditions: conditions.conditions,
    recovery_pending: conditions.recovery !== null,
    transaction_pending: conditions.transaction_pending,
    lock_present: lock !== null,
    lock_holder: lock?.agent_id ?? null,
    lock_status: lock ? classifyClaim(lock, now) : 'NO_LOCK',
    worktree: task.worktree,
    environment_issues: task.worktree
      ? validateCandidateEnvironment({
          worktreePath: task.worktree,
          candidateCommit: task.candidate_commit,
        })
      : ['WORKTREE_MISSING'],
  };
}

// --- resolución humana de una recuperación pendiente ------------------------

export class RecoveryResolutionError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'RecoveryResolutionError';
    this.code = code;
  }
}

/** Disposiciones admitidas. No hay ninguna que el motor elija por su cuenta. */
export const RECOVERY_DISPOSITIONS = Object.freeze([
  'restore_snapshot',
  'block_human_decision',
]);

/**
 * ¿Llegaron al log los eventos que la transacción no pudo escribir?
 *
 * Es la única comprobación que permite restaurar el snapshot sin inventar
 * nada: si el `transaction_id` no aparece en `events.jsonl`, la transacción
 * no ocurrió para la única fuente de verdad del motor, y devolver el estado
 * a su snapshot es **reconciliarlo con el log**, no adivinar.
 */
function pendingEventsLanded(evidence) {
  const transactionId = evidence?.transaction_id;
  if (!transactionId) return null; // indeterminable
  return readEvents().some((e) => e.transaction_id === transactionId);
}

/** Archiva la evidencia con su resolución. Nunca se borra sin dejar copia. */
function archiveEvidence(taskId, evidence, resolution) {
  const dir = resolvedRecoveryDir();
  fs.mkdirSync(dir, { recursive: true });
  const stamp = resolution.resolved_at.replace(/[:.]/g, '-');
  const file = path.join(dir, `${taskId}.${stamp}.json`);
  fs.writeFileSync(file, `${JSON.stringify({ ...evidence, resolution }, null, 2)}\n`, 'utf8');
  return file;
}

/**
 * Resolución **humana y explícita** de una recuperación pendiente.
 *
 * Diseñada bajo tres restricciones de la misión, en este orden:
 *
 *   1. **No hay auto-heal.** Nada caduca, nada se resuelve solo, ninguna
 *      operación del motor levanta el bloqueo como efecto secundario.
 *   2. **No se inventa estado.** El motor sólo sabe dos cosas: el snapshot
 *      previo que guardó y si los eventos de la transacción llegaron al log.
 *      Cuando eso basta, `restore_snapshot` reconcilia estado y log. Cuando
 *      no basta —no hay snapshot, o los eventos sí se escribieron y el
 *      snapshot ya no describe la realidad— la tarjeta va a
 *      `BLOCKED_HUMAN_DECISION` y decide una persona.
 *   3. **No se destruye evidencia.** El archivo pendiente se archiva en
 *      `state/recovery/resolved/` con quién, cuándo y por qué, y la
 *      resolución queda además en el log de eventos como acto humano.
 *
 * @param {object} params
 * @param {string} params.taskId
 * @param {string} params.resolvedBy identidad humana que resuelve
 * @param {string} params.reason justificación, obligatoria
 * @param {true}   params.confirmed confirmación explícita, sin valor por defecto
 * @param {'restore_snapshot'|'block_human_decision'} [params.disposition]
 */
export function resolveRecovery({
  taskId,
  resolvedBy,
  reason,
  confirmed,
  disposition = 'block_human_decision',
}) {
  if (!taskId) throw new RecoveryResolutionError('taskId es obligatorio.', 'TASK_REQUIRED');
  if (confirmed !== true) {
    throw new RecoveryResolutionError(
      'resolveRecovery exige confirmación humana explícita (confirmed: true). ' +
        'Levantar un bloqueo de recuperación nunca ocurre por omisión.',
      'CONFIRMATION_REQUIRED',
    );
  }
  if (!resolvedBy) {
    throw new RecoveryResolutionError(
      'resolveRecovery exige resolvedBy: la resolución debe ser atribuible a una persona.',
      'ACTOR_REQUIRED',
    );
  }
  if (typeof reason !== 'string' || reason.trim() === '') {
    throw new RecoveryResolutionError(
      'resolveRecovery exige reason: por qué se considera resuelta.',
      'REASON_REQUIRED',
    );
  }
  if (!RECOVERY_DISPOSITIONS.includes(disposition)) {
    throw new RecoveryResolutionError(
      `disposition "${disposition}" no es válida. Admitidas: ${RECOVERY_DISPOSITIONS.join(', ')}.`,
      'INVALID_DISPOSITION',
    );
  }
  if (!hasPendingRecovery(taskId)) {
    throw new RecoveryResolutionError(
      `"${taskId}" no tiene recuperación pendiente: no hay nada que resolver.`,
      'NO_RECOVERY_PENDING',
    );
  }

  const evidence = readRecovery(taskId);
  const landed = pendingEventsLanded(evidence);

  // El estado se aplica ANTES de retirar el bloqueo. Si algo falla aquí, la
  // evidencia sigue en su sitio y la tarjeta sigue bloqueada — fail-closed.
  const applied = withLock(stateMutationLockFile(), () => {
    const current = getOrCreateTaskState(taskId);
    const next = { ...current };
    delete next.transaction_pending;

    if (disposition === 'restore_snapshot') {
      const snapshot = evidence?.state_snapshot;
      if (!snapshot || !snapshot.state) {
        throw new RecoveryResolutionError(
          `La evidencia de "${taskId}" no conserva un state_snapshot utilizable. ` +
            'El motor no puede deducir el estado correcto: resolver con ' +
            'disposition="block_human_decision" y decidirlo a mano.',
          'SNAPSHOT_UNAVAILABLE',
        );
      }
      if (landed !== false) {
        throw new RecoveryResolutionError(
          `Los eventos de la transacción de "${taskId}" ${
            landed === null ? 'no pueden localizarse en el log' : 'sí llegaron al log'
          }: restaurar el snapshot contradiría la fuente de verdad. ` +
            'Resolver con disposition="block_human_decision".',
          'SNAPSHOT_CONTRADICTS_LOG',
        );
      }
      const restored = { ...next, ...snapshot };
      delete restored.transaction_pending;
      writeTaskState(restored);
      return { from: current.state, to: restored.state, task: restored };
    }

    // El motor no infiere: la tarjeta queda a la espera de decisión humana.
    const blocked = {
      ...next,
      state: 'BLOCKED_HUMAN_DECISION',
      blocked_reason: 'unclassified',
    };
    writeTaskState(blocked);
    return { from: current.state, to: blocked.state, task: blocked };
  });

  const resolution = {
    resolved_by: resolvedBy,
    reason,
    confirmed: true,
    disposition,
    events_landed_in_log: landed,
    from_state: applied.from,
    to_state: applied.to,
    resolved_at: new Date().toISOString(),
  };

  const archived = archiveEvidence(taskId, evidence ?? {}, resolution);
  fs.rmSync(recoveryFile(taskId));

  appendEvents([
    {
      task_id: taskId,
      mission_id: applied.task.mission_id ?? null,
      agent_id: resolvedBy,
      actor_type: 'human',
      from_state: applied.from,
      to_state: applied.to,
      blocked_reason: applied.task.blocked_reason ?? null,
      note: `recovery resuelta (${disposition}): ${reason} · evidencia archivada en ${archived}`,
    },
  ]);

  return { task: applied.task, resolution, archived };
}
