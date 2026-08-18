import { qaSessionLockFile, taskLockFile } from './paths.mjs';
import { withLock, readLock, acquireLock, releaseLock } from './lock.mjs';
import { getOrCreateTaskState } from './store.mjs';
import { commitTransaction } from './transaction.mjs';
import {
  validateHandoff,
  validateAuditResult,
  assertIndependentAuditor,
  NonIndependentAuditorError,
} from './qa-contract.mjs';
import { createLoopState, beginQa, submitQaResult } from './qa-loop.mjs';
import { assertOperable } from './guard.mjs';
import { prepareTransition } from './dispatcher.mjs';

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
 * calcula puro.
 *
 * La persistencia va después, en una sola transacción: los saltos se
 * preparan en memoria con `prepareTransition` y se entregan a
 * `commitTransaction`, que escribe primero el estado y luego **todos** los
 * eventos de una vez, bajo el lock global del log.
 *
 * La versión anterior persistía salto a salto y, al fallar, truncaba
 * `events.jsonl` al tamaño previo. Como el log es global y el lock era por
 * `task_id`, eso borraba eventos válidos de otras tarjetas — hallazgo ALTO
 * de la reauditoría. Aquí ya no se trunca nada: ver `transaction.mjs`.
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

// --- adopción humana del lock de una tarjeta sin dueño ----------------------

/**
 * Estados en los que se admite adoptar el lock. **Uno solo, a propósito.**
 *
 * `READY_FOR_QA` es el único estado poseído al que una tarjeta legítima
 * puede llegar sin haber pasado nunca por `claim`: materialización directa
 * en `queue.yaml`, importación de trabajo previo al motor, o reconciliación
 * histórica. En cualquier otro estado poseído, un lock ausente no es un
 * hueco que rellenar sino una anomalía que se investiga —y para eso está
 * `resolve-recovery`, no esto.
 */
export const ADOPTABLE_STATES = Object.freeze(['READY_FOR_QA']);

/**
 * Adopción **humana y explícita** del lock de una tarjeta en `READY_FOR_QA`
 * que no lo tiene.
 *
 * ## El vacío que cierra
 *
 * `submitHandoff` exige el lock del implementador. El lock sólo lo crea
 * `claim`, y `dispatch` sólo selecciona tarjetas en `READY`. Una tarjeta
 * materializada directamente en `READY_FOR_QA` no puede por tanto entregar
 * handoff, y sin handoff persistido `runQa` tampoco arranca: la tarjeta
 * queda fuera del ciclo sin ninguna ruta canónica. No es un caso hipotético
 * —`E5-S3-T06` lo demostró.
 *
 * ## Por qué es un gate humano y no una capacidad de agente
 *
 * La alternativa aparente —que `submitHandoff` materialice el lock cuando
 * no hay ninguno— convierte «sólo el dueño entrega su handoff» en «lo
 * entrega quien llegue primero», y lo hace de forma invisible. Cualquier
 * agente podría entonces declararse implementador de cualquier tarjeta sin
 * dueño. La regla de posesión no se relaja aquí: se le da la única vía
 * legítima que le faltaba para poder cumplirse.
 *
 * Por eso esto sigue la forma de las otras tres rutas de recuperación del
 * motor (`resume`, `resolve-recovery`, `resolve-migration-lock`): exige
 * `--human`, `--reason` y `--confirmed`, y **ningún agente gana capacidad
 * alguna**. Lo que un humano puede hacer aquí —designar quién cuenta como
 * implementador de una tarjeta que nunca tuvo uno— queda atribuido en el
 * log de eventos.
 *
 * ## Lo que NO hace
 *
 * No transiciona (la tarjeta sigue en `READY_FOR_QA`), no crea worktree, no
 * toca el commit candidato, no audita y **nunca sobrescribe un lock ajeno**:
 * la exclusión la da `acquireLock` con `O_CREAT|O_EXCL`, la misma primitiva
 * de siempre. Tampoco relaja la independencia auditor/implementador — quien
 * adopta el lock queda registrado como implementador y `runQa` seguirá
 * rechazándolo como auditor de su propia tarjeta.
 *
 * ## Orden y fallo
 *
 *   VALIDATE  confirmación, actor humano, razón, estado adoptable, operable
 *   LOCK      adquisición atómica; si ya existe y es ajeno, se aborta
 *   COMMIT    `owner` + evento de adopción, en una sola transacción
 *
 * Si el COMMIT falla, se libera el lock **recién creado por nosotros** y se
 * propaga el error: no queda ni lock ni traza, que es el estado previo. No
 * se libera ningún lock ajeno en ninguna ruta.
 *
 * @param {object}  params
 * @param {string}  params.taskId
 * @param {string}  params.implementerId agente que queda como dueño del trabajo
 * @param {string}  params.adoptedBy identidad humana que autoriza
 * @param {string}  params.reason justificación, obligatoria
 * @param {true}    params.confirmed confirmación explícita, sin valor por defecto
 */
export function adoptQaLock({ taskId, implementerId, adoptedBy, reason, confirmed }) {
  if (!taskId) throw new QaSessionError('taskId es obligatorio.', 'TASK_REQUIRED');
  if (confirmed !== true) {
    throw new QaSessionError(
      'adoptQaLock exige confirmación humana explícita (confirmed: true). ' +
        'Designar al dueño de una tarjeta sin lock nunca ocurre por omisión.',
      'CONFIRMATION_REQUIRED',
    );
  }
  if (!adoptedBy) {
    throw new QaSessionError(
      'adoptQaLock exige adoptedBy: la adopción debe ser atribuible a una persona. ' +
        'Ningún agente adopta un lock por su cuenta.',
      'HUMAN_REQUIRED',
    );
  }
  if (typeof reason !== 'string' || reason.trim() === '') {
    throw new QaSessionError(
      'adoptQaLock exige reason: por qué esta tarjeta llegó a READY_FOR_QA sin lock.',
      'REASON_REQUIRED',
    );
  }
  if (!implementerId) {
    throw new QaSessionError('implementerId es obligatorio.', 'IMPLEMENTER_REQUIRED');
  }

  const task = getOrCreateTaskState(taskId);
  assertOperable(taskId, task);
  if (!ADOPTABLE_STATES.includes(task.state)) {
    throw new QaSessionError(
      `La adopción de lock sólo se admite en ${ADOPTABLE_STATES.join(', ')}; ` +
        `"${taskId}" está en ${task.state}. Un lock ausente en otro estado es una anomalía ` +
        'que se investiga, no un hueco que se rellena.',
      'STATE_NOT_ADOPTABLE',
    );
  }

  // Idempotencia: adoptar dos veces con el mismo implementador no reescribe
  // nada ni duplica la traza. Un lock ajeno, en cambio, se respeta siempre.
  const existing = readLock(taskLockFile(taskId));
  if (existing) {
    if (existing.agent_id !== implementerId) {
      throw new QaSessionError(
        `El lock de "${taskId}" ya pertenece a "${existing.agent_id}"; se pretende adoptarlo ` +
          `para "${implementerId}". Nadie sobrescribe un lock ajeno (arquitectura §9.6).`,
        'LOCK_HELD_BY_OTHER',
      );
    }
    return { task, lock: existing, adopted: false };
  }

  const lock = acquireLock(taskLockFile(taskId), {
    task_id: taskId,
    mission_id: task.mission_id ?? null,
    agent_id: implementerId,
    pid_hint: process.pid,
    adopted_by: adoptedBy,
    adoption_reason: reason,
  });

  try {
    // No es una transición: la tarjeta sigue en READY_FOR_QA. Se registra
    // porque designar al dueño de una tarjeta es un acto de gobierno.
    const { task: updated } = commitTransaction({
      taskId,
      from: task.state,
      changes: { owner: implementerId },
      events: [
        {
          task_id: taskId,
          mission_id: task.mission_id ?? null,
          agent_id: adoptedBy,
          actor_type: 'human',
          from_state: task.state,
          to_state: task.state,
          note: `lock adoptado para "${implementerId}": ${reason}`,
        },
      ],
    });
    return { task: updated, lock, adopted: true };
  } catch (err) {
    // El lock lo acabamos de crear nosotros: liberarlo no es tocar uno ajeno.
    try {
      releaseLock(taskLockFile(taskId), { agentId: implementerId, confirmed: true });
    } catch {
      /* si tampoco puede liberarse, el error original es el que informa */
    }
    throw err;
  }
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
  assertOperable(taskId, task);
  if (task.state !== 'READY_FOR_QA') {
    throw new QaSessionError(
      `El handoff de QA sólo se entrega en READY_FOR_QA; "${taskId}" está en ${task.state}.`,
      'INVALID_STATE',
    );
  }

  const lock = readLock(taskLockFile(taskId));
  if (!lock || lock.agent_id !== implementerId) {
    throw new QaSessionError(
      `Sólo el dueño del lock de "${taskId}" entrega su handoff (lock=${lock?.agent_id ?? 'ninguno'}).` +
        (lock
          ? ''
          : ' La tarjeta no tiene dueño: si llegó a READY_FOR_QA sin pasar por `claim`' +
            ' (materialización, importación o reconciliación histórica), un humano debe' +
            ' designarlo con `adopt --human <id> --agent <implementer_id> --reason <texto> --confirmed`.'),
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

  // No es una transición: la tarjeta sigue en READY_FOR_QA. Se registra
  // igualmente porque la evidencia entregada es parte de la traza, y se
  // hace por la misma vía transaccional que todo lo demás.
  const { task: updated } = commitTransaction({
    taskId,
    from: 'READY_FOR_QA',
    changes: {
      qa_handoff: record,
      qa_owner: null,
      qa_result: null,
      candidate_commit: task.candidate_commit ?? record.candidate_commit,
    },
    events: [
      {
        task_id: taskId,
        mission_id: record.mission_id,
        agent_id: implementerId,
        actor_type: 'agent',
        from_state: 'READY_FOR_QA',
        to_state: 'READY_FOR_QA',
        commit: record.candidate_commit,
        note: 'qa_handoff entregado',
      },
    ],
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

/**
 * Ejecuta y persiste una auditoría independiente completa:
 * valida estado y handoff, valida independencia, entra en `QA`, registra el
 * resultado y persiste la transición posterior que dicte el contrato.
 */
export function runQa({ taskId, auditorId, auditResult }) {
  if (!auditorId) throw new QaSessionError('auditorId es obligatorio.', 'AUDITOR_REQUIRED');

  return withLock(qaSessionLockFile(taskId), () => {
    const task = getOrCreateTaskState(taskId);
    // Auditar un estado no confirmado, o una tarjeta con recuperación
    // pendiente, produciría un veredicto sobre algo que puede no existir.
    assertOperable(taskId, task);

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

    // PREPARE — todos los saltos se validan y se pliegan en memoria. Si
    // alguno es ilegal, la excepción llega aquí sin haber escrito nada.
    let proyectada = task;
    const changes = { qa_owner: auditorId };
    const events = [];

    loop.history.forEach((hop, index) => {
      const prepared = prepareTransition({
        task: proyectada,
        to: hop.to,
        actor: { type: 'agent', id: auditorId },
        reason: hop.reason ?? 'qa',
        blockedReason: hop.blocked_reason,
        limits: limitsFor(hop, loop.history[index + 1]),
      });
      proyectada = { ...proyectada, ...prepared.changes };
      Object.assign(changes, prepared.changes);
      events.push(prepared.event);
    });

    changes.qa_result = {
      auditor_id: auditorId,
      verdict: auditResult.verdict,
      findings: loop.history.at(-1)?.auditResult?.findings ?? auditResult.findings ?? [],
      final_state: loop.state,
      decided_at: new Date().toISOString(),
    };

    // COMMIT — estado primero, después los eventos en una sola escritura.
    // Nada aquí trunca ni reescribe el log global.
    const { task: final, transactionId } = commitTransaction({
      taskId,
      from: 'READY_FOR_QA',
      changes,
      events,
    });

    return { task: final, state: loop.state, history: loop.history, auditorId, transactionId };
  });
}
