import fs from 'node:fs';
import { qaSessionLockFile, taskLockFile, eventsFile } from './paths.mjs';
import { withLock, readLock } from './lock.mjs';
import { getOrCreateTaskState, mutateTaskState, writeTaskState } from './store.mjs';
import { appendEvent } from './events.mjs';
import {
  validateHandoff,
  validateAuditResult,
  assertIndependentAuditor,
  NonIndependentAuditorError,
} from './qa-contract.mjs';
import { createLoopState, beginQa, submitQaResult } from './qa-loop.mjs';
import { transitionTask } from './dispatcher.mjs';

/**
 * Sesión de QA **persistente**.
 *
 * `qa-loop.mjs` calcula, sin tocar disco, qué debería pasar. Este módulo es
 * lo que la auditoría de `LOOP-001` echó en falta: la parte que *ocurre* —
 * handoff guardado, entrada a QA, resultado, eventos y transición posterior
 * escritos en el estado del motor.
 *
 * ## READ ONLY del auditor
 *
 * El auditor no modifica código, worktree, commit candidato ni
 * documentación de producto. Registrar su veredicto en `state/` **no** es
 * escribir sobre el candidato: es dejar constancia del proceso. Por eso el
 * ownership se parte en dos y el auditor nunca adquiere el lock del
 * implementador (ver `hasQaAuthority` en `dispatcher.mjs`).
 *
 * ## Atomicidad
 *
 * Todo lo que puede fallar por contrato —handoff ausente, commit que no
 * corresponde, auditor no independiente, veredicto inválido, transición
 * prohibida— falla **antes** de la primera escritura, porque el ciclo se
 * calcula puro. Para el resto (un fallo de E/S a media persistencia) la
 * sección crítica restaura el estado previo y deshace únicamente los
 * eventos escritos dentro de ella: nunca queda estado sin evento, evento
 * sin estado ni handoff consumido a medias.
 */

export class QaSessionError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'QaSessionError';
    this.code = code;
  }
}

/** Registro canónico del handoff, tal como se persiste en `state/`. */
function toRecord(taskId, task, implementerId, auditorId, handoff) {
  return {
    task_id: taskId,
    mission_id: task.mission_id ?? null,
    implementer_id: implementerId,
    auditor_id: auditorId,
    candidate_commit: handoff.candidateCommit,
    base_commit: handoff.baseCommit,
    changed_files: handoff.changedFiles,
    test_evidence: {
      tests: handoff.tests,
      typecheck: handoff.typecheck,
      lint: handoff.lint,
      diff_check: handoff.diffCheck ?? null,
    },
    known_findings: handoff.knownFindings ?? [],
    timestamp: new Date().toISOString(),
  };
}

/** Vista del registro persistido en la forma que consumen los validadores. */
export function handoffFromRecord(record) {
  if (!record) return null;
  return {
    implementerId: record.implementer_id,
    candidateCommit: record.candidate_commit,
    baseCommit: record.base_commit,
    changedFiles: record.changed_files,
    tests: record.test_evidence?.tests,
    typecheck: record.test_evidence?.typecheck,
    lint: record.test_evidence?.lint,
    diffCheck: record.test_evidence?.diff_check ?? undefined,
    knownFindings: record.known_findings ?? [],
  };
}

/**
 * El implementador entrega su evidencia en `READY_FOR_QA`. Exige poseer el
 * lock: el handoff es del dueño del trabajo, de nadie más.
 *
 * `auditorId` es opcional. Si se declara, sólo ese agente podrá auditar; si
 * se omite, cualquier agente independiente puede tomar el proceso de QA y
 * queda registrado como `qa_owner` al hacerlo.
 */
export function submitHandoff({ taskId, implementerId, handoff, auditorId = null }) {
  if (!implementerId) throw new QaSessionError('implementerId es obligatorio.', 'IMPLEMENTER_REQUIRED');

  const task = getOrCreateTaskState(taskId);
  if (task.state !== 'READY_FOR_QA') {
    throw new QaSessionError(
      `El handoff de QA sólo se entrega en READY_FOR_QA; "${taskId}" está en ${task.state}.`,
      'INVALID_STATE',
    );
  }

  const lock = readLock(taskLockFile(taskId));
  if (!lock || lock.agent_id !== implementerId) {
    throw new QaSessionError(
      `Sólo el dueño del lock de "${taskId}" entrega su handoff (lock=${lock?.agent_id ?? 'ninguno'}).`,
      'NOT_LOCK_OWNER',
    );
  }

  const check = validateHandoff(handoff);
  if (!check.valid) {
    throw new QaSessionError(`handoff inválido:\n  - ${check.errors.join('\n  - ')}`, 'INVALID_HANDOFF');
  }
  if (handoff.implementerId !== implementerId) {
    throw new QaSessionError(
      `El handoff declara implementerId "${handoff.implementerId}" y lo entrega "${implementerId}".`,
      'IMPLEMENTER_MISMATCH',
    );
  }
  if (task.candidate_commit && handoff.candidateCommit !== task.candidate_commit) {
    throw new QaSessionError(
      `El handoff apunta a "${handoff.candidateCommit}" y la tarjeta a "${task.candidate_commit}".`,
      'CANDIDATE_COMMIT_MISMATCH',
    );
  }
  if (auditorId && auditorId === implementerId) throw new NonIndependentAuditorError(implementerId);

  const record = toRecord(taskId, task, implementerId, auditorId, handoff);

  const updated = mutateTaskState(taskId, (t) => ({
    ...t,
    qa_handoff: record,
    qa_owner: null,
    qa_result: null,
    candidate_commit: t.candidate_commit ?? record.candidate_commit,
  }));

  // No es una transición: la tarjeta sigue en READY_FOR_QA. Se registra
  // igualmente porque la evidencia entregada es parte de la traza.
  appendEvent({
    task_id: taskId,
    mission_id: record.mission_id,
    agent_id: implementerId,
    actor_type: 'agent',
    from_state: 'READY_FOR_QA',
    to_state: 'READY_FOR_QA',
    commit: record.candidate_commit,
    note: 'qa_handoff entregado',
  });

  return { task: updated, handoff: record };
}

/**
 * El escalamiento `QA → QA_FAILED → BLOCKED_*` atraviesa `QA_FAILED` sin
 * abrir un ciclo de reparación: el salto siguiente es un bloqueo, no un
 * reintento. El límite de ciclos existe para impedir reintentos, así que no
 * debe impedir el escalamiento que precisamente lo hace cumplir.
 */
function limitsFor(hop, next) {
  if (hop.to === 'QA_FAILED' && next?.to?.startsWith('BLOCKED')) {
    return { maxQa: Number.MAX_SAFE_INTEGER };
  }
  return undefined;
}

function regularFileSize(file) {
  try {
    const stat = fs.statSync(file);
    return stat.isFile() ? stat.size : null;
  } catch (err) {
    return err.code === 'ENOENT' ? 0 : null;
  }
}

/**
 * Ejecuta y persiste una auditoría independiente completa:
 * valida estado y handoff, valida independencia, entra en `QA`, registra el
 * resultado y persiste la transición posterior que dicte el contrato.
 */
export function runQa({ taskId, auditorId, auditResult }) {
  if (!auditorId) throw new QaSessionError('auditorId es obligatorio.', 'AUDITOR_REQUIRED');

  return withLock(qaSessionLockFile(taskId), () => {
    const task = getOrCreateTaskState(taskId);

    if (task.state !== 'READY_FOR_QA') {
      throw new QaSessionError(
        `QA arranca en READY_FOR_QA; "${taskId}" está en ${task.state}.`,
        'INVALID_STATE',
      );
    }

    const record = task.qa_handoff;
    if (!record) {
      throw new QaSessionError(
        `"${taskId}" no tiene handoff de QA persistido. Sin evidencia entregada no hay auditoría.`,
        'QA_HANDOFF_MISSING',
      );
    }
    if (record.auditor_id && record.auditor_id !== auditorId) {
      throw new QaSessionError(
        `El handoff designa a "${record.auditor_id}" como auditor, no a "${auditorId}".`,
        'AUDITOR_NOT_DESIGNATED',
      );
    }
    if (task.candidate_commit && record.candidate_commit !== task.candidate_commit) {
      throw new QaSessionError(
        `El handoff apunta a "${record.candidate_commit}" y la tarjeta a "${task.candidate_commit}".`,
        'CANDIDATE_COMMIT_MISMATCH',
      );
    }

    const handoff = handoffFromRecord(record);
    const handoffCheck = validateHandoff(handoff);
    if (!handoffCheck.valid) {
      throw new QaSessionError(
        `handoff persistido inválido:\n  - ${handoffCheck.errors.join('\n  - ')}`,
        'INVALID_HANDOFF',
      );
    }

    assertIndependentAuditor(handoff, { auditorId });

    const auditCheck = validateAuditResult(auditResult);
    if (!auditCheck.valid) {
      throw new QaSessionError(
        `auditResult inválido:\n  - ${auditCheck.errors.join('\n  - ')}`,
        'INVALID_AUDIT_RESULT',
      );
    }

    // Cálculo puro primero: un veredicto imposible falla sin escribir nada.
    const loop = submitQaResult(beginQa(createLoopState(taskId, handoff, task)), auditResult);

    const eventsPath = eventsFile();
    const sizeBefore = regularFileSize(eventsPath);
    try {
      mutateTaskState(taskId, (t) => ({ ...t, qa_owner: auditorId }));

      loop.history.forEach((hop, index) => {
        transitionTask({
          taskId,
          to: hop.to,
          actor: { type: 'agent', id: auditorId },
          reason: hop.reason ?? 'qa',
          blockedReason: hop.blocked_reason,
          limits: limitsFor(hop, loop.history[index + 1]),
        });
      });

      const final = mutateTaskState(taskId, (t) => ({
        ...t,
        qa_result: {
          auditor_id: auditorId,
          verdict: auditResult.verdict,
          findings: loop.history.at(-1)?.auditResult?.findings ?? auditResult.findings ?? [],
          final_state: loop.state,
          decided_at: new Date().toISOString(),
        },
      }));

      return { task: final, state: loop.state, history: loop.history, auditorId };
    } catch (err) {
      // Compensación: se deshace únicamente lo escrito DENTRO de esta
      // sección crítica. El historial previo de events.jsonl no se toca.
      try {
        writeTaskState(task);
      } catch {
        /* no había estado que restaurar */
      }
      if (sizeBefore !== null) {
        try {
          fs.truncateSync(eventsPath, sizeBefore);
        } catch {
          /* no hay log que truncar */
        }
      }
      throw err;
    }
  });
}
