import { taskLockFile } from './paths.mjs';
import { acquireLock, readLock, releaseLock, refreshHeartbeat, LockHeldError } from './lock.mjs';
import { loadQueue } from './queue.mjs';
import { listTasks, getOrCreateTaskState, mutateTaskState } from './store.mjs';
import { assertTransition, isTerminal } from './state-machine.mjs';
import { appendEvent } from './events.mjs';
import { evaluateConcurrency } from './concurrency.mjs';
import { assertSubstrate } from './substrate.mjs';
import {
  ensureWorktree,
  registerWorktreeOwnership,
  releaseWorktreeOwnership,
  branchNameFor,
} from './worktree.mjs';
import { BLOCKED_REASONS } from './constants.mjs';

/**
 * Dispatcher del Loop Engine.
 *
 * **Lo que este módulo nunca hace, por diseño:** integrar, hacer `merge`,
 * `push`, `rebase` o `cherry-pick`; marcar `PASSED`; escribir sobre una
 * rama protegida; borrar un lock o un worktree ajeno. No existe aquí
 * ninguna función que lo permita, y la máquina de estados rechaza por su
 * cuenta cualquier intento (transiciones `H`).
 *
 * El estado máximo que produce es `READY_FOR_INTEGRATION`.
 */

export class DispatchError extends Error {
  constructor(message, detail) {
    super(message);
    this.name = 'DispatchError';
    this.code = 'DISPATCH_ERROR';
    this.detail = detail;
  }
}

/** Actor por defecto: agente. Un humano debe declararse explícitamente. */
function normalizeActor(actor) {
  if (!actor) throw new DispatchError('Se requiere un actor ({type, id}).');
  if (typeof actor === 'string') return { type: 'agent', id: actor };
  return { type: actor.type ?? 'agent', id: actor.id, holdsLock: actor.holdsLock };
}

function holdsLock(taskId, agentId) {
  const lock = readLock(taskLockFile(taskId));
  return lock !== null && lock.agent_id === agentId;
}

/**
 * Autoridad para transicionar una tarjeta poseída. Son **dos fuentes
 * distintas y deliberadamente separadas** (hallazgo MEDIO de la auditoría
 * de `LOOP-001`):
 *
 *   - **lock de la tarjeta** → ownership del código y del worktree. Es del
 *     implementador y nadie se lo quita.
 *   - **handoff de QA** → ownership del *proceso* de QA. Lo ejerce el
 *     auditor independiente sin adquirir el lock, sin tocar el worktree y
 *     sin poder abrir trabajo de implementación.
 *
 * Sin esta separación no existía flujo de QA ejecutable: la transición
 * `READY_FOR_QA → QA` exige lock, y el lock es de quien no puede auditar.
 */
function hasQaAuthority(task, agentId, to) {
  const handoff = task.qa_handoff;
  if (!handoff) return false;
  if (handoff.implementer_id === agentId) return false;
  if (handoff.auditor_id && handoff.auditor_id !== agentId) return false;
  if (task.qa_owner && task.qa_owner !== agentId) return false;

  if (task.state === 'READY_FOR_QA' || task.state === 'QA') return true;
  // Desde QA_FAILED el auditor sólo puede escalar. Abrir REPARACIÓN es
  // trabajo de implementación y le corresponde a quien tiene el lock.
  if (task.state === 'QA_FAILED') return to.startsWith('BLOCKED');
  return false;
}

function hasStateAuthority(task, agentId, to) {
  return holdsLock(task.task_id, agentId) || hasQaAuthority(task, agentId, to);
}

/**
 * Único punto de escritura de `state`. Valida la transición (legalidad,
 * gate humano, posesión de lock, límites), persiste y registra el evento.
 */
export function transitionTask({ taskId, to, actor, commit, reason, blockedReason, limits }) {
  const who = normalizeActor(actor);
  const current = getOrCreateTaskState(taskId);

  if (isTerminal(current.state)) {
    throw new DispatchError(
      `La tarjeta "${taskId}" está en estado terminal (${current.state}); no admite transiciones.`,
    );
  }

  if (blockedReason && !BLOCKED_REASONS.includes(blockedReason)) {
    throw new DispatchError(
      `blocked_reason "${blockedReason}" no es tipificado. Válidos: ${BLOCKED_REASONS.join(', ')}`,
    );
  }
  if (to.startsWith('BLOCKED') && !blockedReason) {
    throw new DispatchError(`La transición a ${to} exige un blocked_reason tipificado.`);
  }

  const actorWithLock = {
    ...who,
    holdsLock: who.holdsLock ?? (who.type === 'agent' ? hasStateAuthority(current, who.id, to) : true),
  };

  const validated = assertTransition(current, to, actorWithLock, limits);

  const updated = mutateTaskState(taskId, (task) => ({
    ...task,
    state: to,
    repair_iteration: validated.repairIteration,
    qa_iteration: validated.qaIteration,
    candidate_commit: commit ?? task.candidate_commit,
    blocked_reason: to.startsWith('BLOCKED') ? blockedReason : null,
  }));

  appendEvent({
    task_id: taskId,
    mission_id: updated.mission_id,
    agent_id: who.id,
    actor_type: who.type,
    from_state: validated.from,
    to_state: to,
    repair_iteration: updated.repair_iteration,
    qa_iteration: updated.qa_iteration,
    commit: commit ?? null,
    blocked_reason: updated.blocked_reason,
    note: reason ?? null,
  });

  if (who.type === 'agent' && holdsLock(taskId, who.id)) {
    try {
      refreshHeartbeat(taskLockFile(taskId), who.id);
    } catch {
      /* el heartbeat es best-effort; nunca invalida una transición ya válida */
    }
  }

  return updated;
}

/**
 * Reclamo atómico. El lock se crea **antes** de tocar el estado: si ya
 * existe, otro agente tiene la tarjeta y este intento falla sin efectos.
 */
function claim(taskId, agentId, missionId) {
  const lockPath = taskLockFile(taskId);
  acquireLock(lockPath, {
    task_id: taskId,
    mission_id: missionId ?? null,
    agent_id: agentId,
    pid_hint: process.pid,
  });
  try {
    return transitionTask({
      taskId,
      to: 'CLAIMED',
      actor: { type: 'agent', id: agentId, holdsLock: true },
      reason: 'claim',
    });
  } catch (err) {
    // La transición falló (p.ej. la tarjeta ya no estaba READY): el lock
    // recién creado es nuestro y no debe quedar huérfano.
    releaseLock(lockPath, { agentId, confirmed: true });
    throw err;
  }
}

/**
 * Recuperación de fallo post-claim (misión T9).
 *
 * Con la tarjeta en `CLAIMED` no ha empezado ninguna implementación, así
 * que el rollback es seguro: `CLAIMED → READY` y liberación del **propio**
 * lock. Si el rollback no puede completarse, la tarjeta queda en `BLOCKED`
 * con `claim_setup_failed` y **conserva su lock**, para que ninguna otra
 * ejecución la tome a medio preparar. Nunca se libera un lock ajeno.
 */
function rollbackClaim(taskId, agentId, cause) {
  try {
    releaseWorktreeOwnership(taskId, { confirmed: true });
  } catch {
    /* puede no haberse registrado todavía */
  }

  try {
    transitionTask({
      taskId,
      to: 'READY',
      actor: { type: 'agent', id: agentId, holdsLock: true },
      reason: `rollback de claim: ${cause}`,
    });
    mutateTaskState(taskId, (task) => ({ ...task, owner: null, worktree: null, branch: null }));
    releaseLock(taskLockFile(taskId), { agentId, confirmed: true });
    return { rolledBack: true, state: 'READY' };
  } catch (rollbackError) {
    transitionTask({
      taskId,
      to: 'BLOCKED',
      actor: { type: 'agent', id: agentId, holdsLock: true },
      reason: `fallo de preparación y de rollback: ${cause} / ${rollbackError.message}`,
      blockedReason: 'claim_setup_failed',
    });
    return { rolledBack: false, state: 'BLOCKED', lockRetained: true };
  }
}

/**
 * Procedimiento de despacho. Pasos: sustrato → cola → filtrar `READY` →
 * dependencias/ciclos → locks → conflicto de archivos y migración →
 * seleccionar → claim atómico → asignar agente → preparar worktree →
 * `CLAIMED`/`IMPLEMENTING`.
 */
export function dispatch({
  agentId,
  missionId,
  autoStartImplementing = true,
  verifyWorktreeSubstrate = true,
  limits,
} = {}) {
  if (!agentId) throw new DispatchError('agent_id es obligatorio.');

  const queue = loadQueue();
  const tasks = listTasks({ queue });

  const ready = tasks.filter((t) => t.state === 'READY');
  if (ready.length === 0) return { dispatched: false, reason: 'no-ready-tasks' };

  const skipped = [];
  let selected = null;

  for (const task of ready) {
    if (readLock(taskLockFile(task.task_id))) {
      skipped.push({ task_id: task.task_id, reason: 'lock-present' });
      continue;
    }
    const concurrency = evaluateConcurrency(task, tasks);
    if (!concurrency.eligible) {
      skipped.push({ task_id: task.task_id, reason: 'concurrency', conflicts: concurrency.conflicts });
      continue;
    }
    selected = task;
    break;
  }

  if (!selected) return { dispatched: false, reason: 'no-eligible-task', skipped };

  let claimed;
  try {
    claimed = claim(selected.task_id, agentId, missionId ?? selected.mission_id);
  } catch (err) {
    if (err instanceof LockHeldError) {
      return { dispatched: false, reason: 'lost-claim-race', taskId: selected.task_id, skipped };
    }
    throw err;
  }

  // A partir de aquí la tarjeta está reclamada: todo fallo pasa por rollback.
  try {
    mutateTaskState(claimed.task_id, (task) => ({ ...task, owner: agentId }));

    const branch = branchNameFor(claimed.task_id);
    const worktree = ensureWorktree({
      taskId: claimed.task_id,
      baseCommit: claimed.base_commit,
      branch,
    });

    registerWorktreeOwnership({
      taskId: claimed.task_id,
      missionId: claimed.mission_id,
      agentId,
      worktree: worktree.dir,
      branch: worktree.branch,
    });

    // Fail-closed: sin gobierno en el worktree no se entrega el contrato.
    if (verifyWorktreeSubstrate) {
      assertSubstrate(worktree.dir, { agentRole: claimed.agent_role ?? undefined });
    }

    mutateTaskState(claimed.task_id, (task) => ({
      ...task,
      worktree: worktree.dir,
      branch: worktree.branch,
    }));

    let finalTask = getOrCreateTaskState(claimed.task_id);
    if (autoStartImplementing) {
      finalTask = transitionTask({
        taskId: claimed.task_id,
        to: 'IMPLEMENTING',
        actor: { type: 'agent', id: agentId, holdsLock: true },
        reason: 'dispatcher-auto-start',
        limits,
      });
    }

    return { dispatched: true, task: finalTask, worktree, skipped };
  } catch (setupError) {
    const recovery = rollbackClaim(claimed.task_id, agentId, setupError.message);
    return {
      dispatched: false,
      reason: 'claim-setup-failed',
      taskId: claimed.task_id,
      error: setupError.message,
      blocked_reason: setupError.blocked_reason ?? 'claim_setup_failed',
      recovery,
      skipped,
    };
  }
}

/**
 * Libera una tarjeta poseída por el agente que la reclamó.
 *
 * El destino depende de si la implementación llegó a empezar, porque la
 * matriz §3.3 sólo autoriza `CLAIMED → READY`:
 *
 *   - desde `CLAIMED`: nada se construyó todavía → vuelve a `READY`, se
 *     libera el lock y el ownership del worktree. La tarjeta es reclamable.
 *   - desde `IMPLEMENTING` en adelante: **puede haber trabajo sin
 *     commitear en el worktree**, así que devolverla a `READY` permitiría
 *     que otro agente reclamara un worktree con trabajo ajeno. Va a
 *     `BLOCKED` (`agent_released_mid_flight`), y sólo un humano la reactiva
 *     con `resume`. El ownership del worktree **se conserva**.
 *
 * En ningún caso se borra el worktree ni su contenido.
 */
export function release({ taskId, agentId, reason, confirmed = true }) {
  const lock = readLock(taskLockFile(taskId));
  if (lock && lock.agent_id !== agentId) {
    throw new DispatchError(
      `El lock de "${taskId}" pertenece a "${lock.agent_id}", no a "${agentId}". ` +
        'Liberar un lock ajeno exige decisión humana explícita.',
    );
  }

  const current = getOrCreateTaskState(taskId);
  const cleanRollback = current.state === 'CLAIMED';
  const actor = { type: 'agent', id: agentId, holdsLock: true };

  if (cleanRollback) {
    transitionTask({ taskId, to: 'READY', actor, reason: reason ?? 'release' });
  } else {
    transitionTask({
      taskId,
      to: 'BLOCKED',
      actor,
      reason: reason ?? 'release con trabajo posiblemente sin commitear',
      blockedReason: 'agent_released_mid_flight',
    });
  }

  releaseLock(taskLockFile(taskId), { agentId, confirmed });

  if (cleanRollback) {
    try {
      releaseWorktreeOwnership(taskId, { confirmed });
    } catch {
      /* ownership ya liberada */
    }
  }

  return mutateTaskState(taskId, (t) => ({ ...t, owner: null }));
}

/**
 * Desbloquea una tarjeta `BLOCKED*` → `READY`. **Exige actor humano**: la
 * matriz marca esa transición `H` y `assertTransition` la rechaza para un
 * agente (misión T4, arquitectura §3.3 regla 4).
 */
export function resume({ taskId, actor, reason }) {
  const who = normalizeActor(actor);
  return transitionTask({
    taskId,
    to: 'READY',
    actor: who,
    reason: reason ?? 'resume tras decisión humana',
  });
}

/** Bloquea una tarjeta con motivo tipificado obligatorio. */
export function block({ taskId, to = 'BLOCKED', actor, reason, blockedReason }) {
  if (!reason) throw new DispatchError('block() exige reason.');
  return transitionTask({
    taskId,
    to,
    actor,
    reason,
    blockedReason: blockedReason ?? 'unclassified',
  });
}
