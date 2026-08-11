import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { submitHandoff, runQa, handoffFromRecord, QaSessionError } from '../lib/qa-session.mjs';
import { dispatch, transitionTask } from '../lib/dispatcher.mjs';
import { readTaskState } from '../lib/store.mjs';
import { readLock } from '../lib/lock.mjs';
import { taskLockFile, eventsFile } from '../lib/paths.mjs';
import { eventsForTask } from '../lib/events.mjs';
import { getWorktreeOwner, worktreeName } from '../lib/worktree.mjs';
import { NonIndependentAuditorError } from '../lib/qa-contract.mjs';
import {
  useTempState,
  useTempQueue,
  useTempRepo,
  taskDefinition,
  handoff,
  auditResult,
  finding,
  captureError,
} from './helpers.mjs';

const TASK = 'LOOP-TEST-001';
const IMPL = 'CLAUDE-02';
const AUDITOR = 'CODEX-01';
const CANDIDATE = 'c0ffee1';

/**
 * Lleva una tarjeta hasta `READY_FOR_QA` por el camino real: despacho,
 * implementación, pruebas. El lock queda en manos del implementador — que
 * es justamente el problema que la separación de ownership resuelve.
 */
function readyForQa(t, { commit = CANDIDATE } = {}) {
  const repo = useTempRepo(t);
  useTempState(t);
  useTempQueue(t, [taskDefinition({ base_commit: repo.baseCommit })]);

  const dispatched = dispatch({ agentId: IMPL, missionId: 'CONTAIA-TEST' });
  assert.equal(dispatched.dispatched, true, 'el despacho debe funcionar');

  const actor = { type: 'agent', id: IMPL };
  transitionTask({ taskId: TASK, to: 'TESTING', actor });
  transitionTask({ taskId: TASK, to: 'READY_FOR_QA', actor, commit });

  return { repo, worktree: dispatched.worktree };
}

const evidencia = (overrides = {}) =>
  handoff({ implementerId: IMPL, candidateCommit: CANDIDATE, ...overrides });

// --- 9. handoff válido en READY_FOR_QA --------------------------------------

test('READY_FOR_QA con handoff válido: se persiste el registro canónico', (t) => {
  readyForQa(t);
  const { handoff: record } = submitHandoff({
    taskId: TASK,
    implementerId: IMPL,
    handoff: evidencia(),
  });

  assert.equal(record.task_id, TASK);
  assert.equal(record.mission_id, 'CONTAIA-TEST');
  assert.equal(record.implementer_id, IMPL);
  assert.equal(record.candidate_commit, CANDIDATE);
  assert.equal(record.base_commit, 'deadbeef');
  assert.deepEqual(record.changed_files, ['src/a.ts']);
  assert.equal(record.test_evidence.tests.passed, true);
  assert.ok(record.timestamp, 'el handoff lleva marca de tiempo');

  const stored = readTaskState(TASK);
  assert.equal(stored.state, 'READY_FOR_QA', 'entregar evidencia no es transicionar');
  assert.deepEqual(stored.qa_handoff, record);
  assert.equal(stored.qa_owner, null, 'nadie ha tomado aún el proceso de QA');

  assert.ok(
    eventsForTask(TASK).some((e) => e.note === 'qa_handoff entregado'),
    'el handoff queda en la traza',
  );
});

test('sólo el dueño del lock entrega el handoff', (t) => {
  readyForQa(t);
  const err = captureError(() =>
    submitHandoff({ taskId: TASK, implementerId: 'OTRO-AGENTE', handoff: evidencia() }),
  );
  assert.equal(err.code, 'NOT_LOCK_OWNER');
});

// --- 10. auditor == implementador -------------------------------------------

test('auditor == implementador: rechazado antes de tocar el estado', (t) => {
  readyForQa(t);
  submitHandoff({ taskId: TASK, implementerId: IMPL, handoff: evidencia() });

  const err = captureError(() =>
    runQa({ taskId: TASK, auditorId: IMPL, auditResult: auditResult({ auditorId: IMPL }) }),
  );
  assert.ok(err instanceof NonIndependentAuditorError);
  assert.equal(readTaskState(TASK).state, 'READY_FOR_QA');
});

test('designar auditor == implementador en el handoff también se rechaza', (t) => {
  readyForQa(t);
  const err = captureError(() =>
    submitHandoff({ taskId: TASK, implementerId: IMPL, handoff: evidencia(), auditorId: IMPL }),
  );
  assert.ok(err instanceof NonIndependentAuditorError);
});

test('un auditor distinto del designado no puede auditar', (t) => {
  readyForQa(t);
  submitHandoff({
    taskId: TASK,
    implementerId: IMPL,
    handoff: evidencia(),
    auditorId: 'CODEX-DESIGNADO',
  });
  const err = captureError(() =>
    runQa({ taskId: TASK, auditorId: AUDITOR, auditResult: auditResult({ auditorId: AUDITOR }) }),
  );
  assert.equal(err.code, 'AUDITOR_NOT_DESIGNATED');
});

// --- 11/12/13. QA independiente, persistente y sin robo de ownership --------

test('el auditor independiente audita sin apropiarse del lock ni del worktree', (t) => {
  readyForQa(t);
  submitHandoff({ taskId: TASK, implementerId: IMPL, handoff: evidencia() });

  const lockAntes = readLock(taskLockFile(TASK));
  const worktreeAntes = getWorktreeOwner(worktreeName(TASK));

  const result = runQa({
    taskId: TASK,
    auditorId: AUDITOR,
    auditResult: auditResult({ auditorId: AUDITOR }),
  });

  assert.equal(result.state, 'READY_FOR_INTEGRATION');

  const lockDespues = readLock(taskLockFile(TASK));
  assert.equal(lockDespues.agent_id, IMPL, 'el lock sigue siendo del implementador');
  assert.equal(lockDespues.created_at, lockAntes.created_at, 'el lock no se recreó');

  const worktreeDespues = getWorktreeOwner(worktreeName(TASK));
  assert.deepEqual(worktreeDespues, worktreeAntes, 'el worktree no cambia de dueño');

  const stored = readTaskState(TASK);
  assert.equal(stored.owner, IMPL, 'el ownership del código no se transfiere');
  assert.equal(stored.qa_owner, AUDITOR, 'el ownership del proceso de QA sí es del auditor');
});

test('qa persistente registra la transición READY_FOR_QA -> QA', (t) => {
  readyForQa(t);
  submitHandoff({ taskId: TASK, implementerId: IMPL, handoff: evidencia() });
  runQa({ taskId: TASK, auditorId: AUDITOR, auditResult: auditResult({ auditorId: AUDITOR }) });

  const transiciones = eventsForTask(TASK)
    .filter((e) => e.from_state !== e.to_state)
    .map((e) => `${e.from_state}->${e.to_state}`);
  assert.ok(transiciones.includes('READY_FOR_QA->QA'), `traza: ${transiciones.join(', ')}`);
  assert.ok(transiciones.includes('QA->READY_FOR_INTEGRATION'));

  const entradaQa = eventsForTask(TASK).find((e) => e.to_state === 'QA');
  assert.equal(entradaQa.agent_id, AUDITOR, 'la entrada a QA la firma el auditor');
});

test('PASSED limpio: QA -> READY_FOR_INTEGRATION queda persistido', (t) => {
  readyForQa(t);
  submitHandoff({ taskId: TASK, implementerId: IMPL, handoff: evidencia() });
  const result = runQa({
    taskId: TASK,
    auditorId: AUDITOR,
    auditResult: auditResult({ auditorId: AUDITOR }),
  });

  assert.equal(result.state, 'READY_FOR_INTEGRATION');
  const stored = readTaskState(TASK);
  assert.equal(stored.state, 'READY_FOR_INTEGRATION');
  assert.equal(stored.qa_result.verdict, 'PASSED');
  assert.equal(stored.qa_result.auditor_id, AUDITOR);
  assert.ok(stored.qa_result.decided_at);
});

// --- 14. REQUIRES_CHANGES ---------------------------------------------------

test('REQUIRES_CHANGES: QA -> QA_FAILED queda persistido con su contador', (t) => {
  readyForQa(t);
  submitHandoff({ taskId: TASK, implementerId: IMPL, handoff: evidencia() });
  const result = runQa({
    taskId: TASK,
    auditorId: AUDITOR,
    auditResult: auditResult({
      auditorId: AUDITOR,
      verdict: 'REQUIRES_CHANGES',
      findings: [finding('ALTO')],
    }),
  });

  assert.equal(result.state, 'QA_FAILED');
  const stored = readTaskState(TASK);
  assert.equal(stored.state, 'QA_FAILED');
  assert.equal(stored.qa_iteration, 1);
});

// --- 15/16. PASSED contradictorio: escalamiento completo y trazado ----------

test('PASSED con hallazgo bloqueante: QA -> QA_FAILED -> BLOCKED_ARCHITECTURE', (t) => {
  readyForQa(t);
  submitHandoff({ taskId: TASK, implementerId: IMPL, handoff: evidencia() });
  const result = runQa({
    taskId: TASK,
    auditorId: AUDITOR,
    auditResult: auditResult({ auditorId: AUDITOR, findings: [finding('CRÍTICO')] }),
  });

  assert.equal(result.state, 'BLOCKED_ARCHITECTURE');
  const stored = readTaskState(TASK);
  assert.equal(stored.state, 'BLOCKED_ARCHITECTURE');
  assert.equal(stored.blocked_reason, 'auditor_contradiction');
});

test('events.jsonl registra AMBAS transiciones del escalamiento', (t) => {
  readyForQa(t);
  submitHandoff({ taskId: TASK, implementerId: IMPL, handoff: evidencia() });
  runQa({
    taskId: TASK,
    auditorId: AUDITOR,
    auditResult: auditResult({ auditorId: AUDITOR, findings: [finding('CRÍTICO')] }),
  });

  const transiciones = eventsForTask(TASK)
    .filter((e) => e.from_state !== e.to_state)
    .map((e) => `${e.from_state}->${e.to_state}`);
  assert.ok(transiciones.includes('QA->QA_FAILED'), `traza: ${transiciones.join(', ')}`);
  assert.ok(transiciones.includes('QA_FAILED->BLOCKED_ARCHITECTURE'));
});

test('el auditor puede escalar desde QA_FAILED pero no abrir REPARACIÓN', (t) => {
  readyForQa(t);
  submitHandoff({ taskId: TASK, implementerId: IMPL, handoff: evidencia() });
  runQa({
    taskId: TASK,
    auditorId: AUDITOR,
    auditResult: auditResult({
      auditorId: AUDITOR,
      verdict: 'REQUIRES_CHANGES',
      findings: [finding('ALTO')],
    }),
  });
  assert.equal(readTaskState(TASK).state, 'QA_FAILED');

  const err = captureError(() =>
    transitionTask({ taskId: TASK, to: 'REPARANDO', actor: { type: 'agent', id: AUDITOR } }),
  );
  assert.ok(err, 'un estado inventado nunca es válido');

  const err2 = captureError(() =>
    transitionTask({ taskId: TASK, to: 'REPAIRING', actor: { type: 'agent', id: AUDITOR } }),
  );
  assert.equal(err2.code, 'LOCK_REQUIRED', 'reparar es trabajo del dueño del lock');
});

test('el tercer ciclo de QA escala en vez de reintentar, y se persiste', (t) => {
  readyForQa(t);
  const cambios = auditResult({
    auditorId: AUDITOR,
    verdict: 'REQUIRES_CHANGES',
    findings: [finding('ALTO')],
  });
  const implActor = { type: 'agent', id: IMPL };

  for (let ciclo = 1; ciclo <= 2; ciclo += 1) {
    submitHandoff({ taskId: TASK, implementerId: IMPL, handoff: evidencia() });
    runQa({ taskId: TASK, auditorId: AUDITOR, auditResult: cambios });
    assert.equal(readTaskState(TASK).state, 'QA_FAILED', `ciclo ${ciclo}`);
    transitionTask({ taskId: TASK, to: 'REPAIRING', actor: implActor });
    transitionTask({ taskId: TASK, to: 'TESTING', actor: implActor });
    transitionTask({ taskId: TASK, to: 'READY_FOR_QA', actor: implActor, commit: CANDIDATE });
  }

  submitHandoff({ taskId: TASK, implementerId: IMPL, handoff: evidencia() });
  const result = runQa({ taskId: TASK, auditorId: AUDITOR, auditResult: cambios });

  assert.equal(result.state, 'BLOCKED_ARCHITECTURE');
  assert.equal(readTaskState(TASK).blocked_reason, 'qa_repair_limit_exceeded');
});

// --- 17. QA no toca el candidato --------------------------------------------

test('QA no modifica el commit candidato ni el worktree', (t) => {
  const { worktree } = readyForQa(t);
  submitHandoff({ taskId: TASK, implementerId: IMPL, handoff: evidencia() });

  const antes = readTaskState(TASK);
  runQa({ taskId: TASK, auditorId: AUDITOR, auditResult: auditResult({ auditorId: AUDITOR }) });
  const despues = readTaskState(TASK);

  assert.equal(despues.candidate_commit, antes.candidate_commit);
  assert.equal(despues.candidate_commit, CANDIDATE);
  assert.equal(despues.worktree, antes.worktree);
  assert.equal(despues.branch, antes.branch);
  assert.equal(fs.existsSync(worktree.dir), true, 'el worktree del candidato sigue intacto');
});

// --- 18/19. fail-closed del handoff -----------------------------------------

test('sin handoff persistido, QA falla cerrado', (t) => {
  readyForQa(t);
  const err = captureError(() =>
    runQa({ taskId: TASK, auditorId: AUDITOR, auditResult: auditResult({ auditorId: AUDITOR }) }),
  );
  assert.equal(err.code, 'QA_HANDOFF_MISSING');
  assert.equal(readTaskState(TASK).state, 'READY_FOR_QA');
});

test('handoff con candidate_commit distinto al de la tarjeta falla cerrado', (t) => {
  readyForQa(t);
  const err = captureError(() =>
    submitHandoff({
      taskId: TASK,
      implementerId: IMPL,
      handoff: evidencia({ candidateCommit: 'otro-commit' }),
    }),
  );
  assert.equal(err.code, 'CANDIDATE_COMMIT_MISMATCH');
  assert.equal(readTaskState(TASK).qa_handoff, null, 'nada se persistió');
});

test('un handoff ya persistido que deja de corresponder al candidato bloquea QA', (t) => {
  readyForQa(t);
  submitHandoff({ taskId: TASK, implementerId: IMPL, handoff: evidencia() });
  runQa({
    taskId: TASK,
    auditorId: AUDITOR,
    auditResult: auditResult({
      auditorId: AUDITOR,
      verdict: 'REQUIRES_CHANGES',
      findings: [finding('ALTO')],
    }),
  });

  // El implementador repara y vuelve con OTRO candidato, sin renovar su
  // handoff: la evidencia entregada dejó de corresponder al código.
  const implActor = { type: 'agent', id: IMPL };
  transitionTask({ taskId: TASK, to: 'REPAIRING', actor: implActor });
  transitionTask({ taskId: TASK, to: 'TESTING', actor: implActor });
  transitionTask({ taskId: TASK, to: 'READY_FOR_QA', actor: implActor, commit: 'c0ffee2' });

  const err = captureError(() =>
    runQa({ taskId: TASK, auditorId: AUDITOR, auditResult: auditResult({ auditorId: AUDITOR }) }),
  );
  assert.equal(err.code, 'CANDIDATE_COMMIT_MISMATCH');
});

test('un veredicto fuera del vocabulario no llega a persistirse', (t) => {
  readyForQa(t);
  submitHandoff({ taskId: TASK, implementerId: IMPL, handoff: evidencia() });
  const err = captureError(() =>
    runQa({
      taskId: TASK,
      auditorId: AUDITOR,
      auditResult: auditResult({ auditorId: AUDITOR, verdict: 'APROBADO' }),
    }),
  );
  assert.ok(err instanceof QaSessionError);
  assert.equal(err.code, 'INVALID_AUDIT_RESULT');
  assert.equal(readTaskState(TASK).state, 'READY_FOR_QA');
});

// --- 20. atomicidad ----------------------------------------------------------

test('un fallo de persistencia no deja estado ni evento parciales', (t) => {
  readyForQa(t);
  submitHandoff({ taskId: TASK, implementerId: IMPL, handoff: evidencia() });

  const antes = readTaskState(TASK);
  const eventosAntes = eventsForTask(TASK).length;

  // El log deja de ser escribible a mitad de la persistencia: el primer
  // salto ya habrá tocado el estado cuando `appendEvent` falle. El
  // contenido previo se conserva, que es lo que la prueba mide.
  fs.chmodSync(eventsFile(), 0o444);

  const err = captureError(() =>
    runQa({ taskId: TASK, auditorId: AUDITOR, auditResult: auditResult({ auditorId: AUDITOR }) }),
  );
  assert.ok(err, 'la persistencia debe fallar');

  fs.chmodSync(eventsFile(), 0o666);

  const despues = readTaskState(TASK);
  assert.equal(despues.state, 'READY_FOR_QA', 'el estado vuelve a como estaba');
  assert.equal(despues.qa_owner, null, 'no queda ownership de QA a medias');
  assert.equal(despues.qa_result, null, 'no queda resultado a medias');
  assert.deepEqual(despues.qa_handoff, antes.qa_handoff, 'el handoff no se consume a medias');
  assert.equal(eventsForTask(TASK).length, eventosAntes, 'no queda evento huérfano');
});

// --- adaptador --------------------------------------------------------------

test('handoffFromRecord reconstruye la forma que validan los contratos', (t) => {
  readyForQa(t);
  const { handoff: record } = submitHandoff({
    taskId: TASK,
    implementerId: IMPL,
    handoff: evidencia(),
  });
  const vista = handoffFromRecord(record);
  assert.equal(vista.implementerId, IMPL);
  assert.equal(vista.candidateCommit, CANDIDATE);
  assert.deepEqual(vista.changedFiles, ['src/a.ts']);
  assert.equal(vista.tests.passed, true);
  assert.equal(handoffFromRecord(null), null);
});
