import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adoptQaLock, submitHandoff, runQa, QaSessionError } from '../lib/qa-session.mjs';
import { dispatch, transitionTask } from '../lib/dispatcher.mjs';
import { readTaskState, writeTaskState, getOrCreateTaskState } from '../lib/store.mjs';
import { readLock, acquireLock } from '../lib/lock.mjs';
import { taskLockFile } from '../lib/paths.mjs';
import { eventsForTask } from '../lib/events.mjs';
import { NonIndependentAuditorError } from '../lib/qa-contract.mjs';
import {
  useTempState,
  useTempQueue,
  useTempRepo,
  taskDefinition,
  handoff,
  auditResult,
  captureError,
} from './helpers.mjs';

/**
 * Adopción humana del lock de una tarjeta `READY_FOR_QA` sin dueño.
 *
 * El vacío que se cierra: `submitHandoff` exige el lock, el lock sólo lo
 * crea `claim`, y `dispatch` sólo selecciona `READY`. Una tarjeta
 * materializada directamente en `READY_FOR_QA` no tenía por tanto ninguna
 * ruta hacia QA. `E5-S3-T06` lo demostró en producción.
 *
 * Estas pruebas cubren las dos mitades del arreglo: que la ruta exista, y
 * que no haya ampliado la superficie de privilegio de ningún agente.
 */

const TASK = 'LOOP-TEST-001';
const IMPL = 'CLAUDE-02';
const OTRO = 'CLAUDE-99';
const AUDITOR = 'CODEX-01';
const HUMANO = 'ALEJANDRO';
const CANDIDATE = 'c0ffee1';

/** Tarjeta materializada YA en `READY_FOR_QA`: nunca pasó por `claim`. */
function materializada(t, overrides = {}) {
  const repo = useTempRepo(t);
  useTempState(t);
  useTempQueue(t, [
    taskDefinition({ base_commit: repo.baseCommit, state: 'READY_FOR_QA', ...overrides }),
  ]);
  return repo;
}

const evidencia = (overrides = {}) =>
  handoff({ implementerId: IMPL, candidateCommit: CANDIDATE, ...overrides });

const adopcion = (overrides = {}) => ({
  taskId: TASK,
  implementerId: IMPL,
  adoptedBy: HUMANO,
  reason: 'importación histórica: el trabajo es anterior al motor',
  confirmed: true,
  ...overrides,
});

// --- 1. el deadlock existe y la adopción es su única salida -----------------

test('READY_FOR_QA sin lock: el handoff falla y el error nombra la ruta canónica', (t) => {
  materializada(t);

  const err = captureError(() =>
    submitHandoff({ taskId: TASK, implementerId: IMPL, handoff: evidencia() }),
  );

  assert.equal(err.code, 'NOT_LOCK_OWNER');
  assert.match(err.message, /lock=ninguno/);
  assert.match(err.message, /adopt --human/, 'el error debe indicar la salida, no sólo el bloqueo');
});

test('READY_FOR_QA sin lock: adopt abre la ruta completa hasta el veredicto', (t) => {
  materializada(t);

  const adoptado = adoptQaLock(adopcion());
  assert.equal(adoptado.adopted, true);
  assert.equal(adoptado.lock.agent_id, IMPL);
  assert.equal(adoptado.task.owner, IMPL);
  assert.equal(adoptado.task.state, 'READY_FOR_QA', 'adoptar no transiciona');

  // El handoff, antes imposible, ahora procede.
  const { handoff: record } = submitHandoff({
    taskId: TASK,
    implementerId: IMPL,
    handoff: evidencia(),
  });
  assert.equal(record.implementer_id, IMPL);

  // Y la auditoría independiente cierra el ciclo.
  const resultado = runQa({ taskId: TASK, auditorId: AUDITOR, auditResult: auditResult() });
  assert.equal(resultado.state, 'READY_FOR_INTEGRATION');
});

test('la adopción queda atribuida en el log como acto humano', (t) => {
  materializada(t);
  adoptQaLock(adopcion());

  const evento = eventsForTask(TASK).find((e) => e.note?.startsWith('lock adoptado'));
  assert.ok(evento, 'la adopción debe dejar traza');
  assert.equal(evento.actor_type, 'human');
  assert.equal(evento.agent_id, HUMANO);
  assert.equal(evento.from_state, 'READY_FOR_QA');
  assert.equal(evento.to_state, 'READY_FOR_QA', 'no es una transición');
  assert.match(evento.note, /importación histórica/, 'la razón humana se conserva');

  const lock = readLock(taskLockFile(TASK));
  assert.equal(lock.adopted_by, HUMANO, 'el lock recuerda quién lo autorizó');
});

// --- 2. ningún agente gana capacidad ----------------------------------------

test('sin confirmación humana explícita no hay adopción', (t) => {
  materializada(t);

  for (const [campo, sustituto] of [
    ['confirmed', false],
    ['confirmed', undefined],
    ['adoptedBy', undefined],
    ['reason', undefined],
    ['reason', '   '],
    ['implementerId', undefined],
  ]) {
    const err = captureError(() => adoptQaLock(adopcion({ [campo]: sustituto })));
    assert.ok(err instanceof QaSessionError, `${campo}=${sustituto} debe rechazarse`);
    assert.equal(readLock(taskLockFile(TASK)), null, 'ningún rechazo deja lock a medias');
  }
});

test('la CLI exige --human, --agent, --reason y --confirmed', async (t) => {
  materializada(t);
  const { run } = await import('../cli.mjs');

  const invocaciones = [
    ['adopt', TASK, '--agent', IMPL, '--reason', 'x', '--confirmed'], // sin --human
    ['adopt', TASK, '--human', HUMANO, '--reason', 'x', '--confirmed'], // sin --agent
    ['adopt', TASK, '--human', HUMANO, '--agent', IMPL, '--confirmed'], // sin --reason
    ['adopt', TASK, '--human', HUMANO, '--agent', IMPL, '--reason', 'x'], // sin --confirmed
  ];

  for (const argv of invocaciones) {
    assert.throws(() => run(argv), /adopt/, `debe rechazarse: ${argv.join(' ')}`);
    assert.equal(readLock(taskLockFile(TASK)), null);
  }

  // Con las cuatro, procede.
  run(['adopt', TASK, '--human', HUMANO, '--agent', IMPL, '--reason', 'histórico', '--confirmed']);
  assert.equal(readLock(taskLockFile(TASK)).agent_id, IMPL);
});

test('un agente ajeno no entrega handoff de una tarjeta adoptada por otro', (t) => {
  materializada(t);
  adoptQaLock(adopcion());

  const err = captureError(() =>
    submitHandoff({
      taskId: TASK,
      implementerId: OTRO,
      handoff: evidencia({ implementerId: OTRO }),
    }),
  );
  assert.equal(err.code, 'NOT_LOCK_OWNER');
  assert.match(err.message, new RegExp(`lock=${IMPL}`));
  assert.equal(readTaskState(TASK).qa_handoff, null, 'no se persistió nada');
});

// --- 3. nadie sobrescribe un lock ajeno -------------------------------------

test('adoptar sobre un lock ajeno se rechaza y no lo toca', (t) => {
  materializada(t);
  acquireLock(taskLockFile(TASK), { task_id: TASK, agent_id: OTRO, pid_hint: process.pid });

  const err = captureError(() => adoptQaLock(adopcion({ implementerId: IMPL })));
  assert.equal(err.code, 'LOCK_HELD_BY_OTHER');

  const lock = readLock(taskLockFile(TASK));
  assert.equal(lock.agent_id, OTRO, 'el lock ajeno permanece intacto');
  assert.equal(lock.adopted_by, undefined, 'no se le inyectó ninguna adopción');
});

test('adoptar dos veces con el mismo implementador es idempotente', (t) => {
  materializada(t);

  const primera = adoptQaLock(adopcion());
  const segunda = adoptQaLock(adopcion({ reason: 'reintento tras corte' }));

  assert.equal(primera.adopted, true);
  assert.equal(segunda.adopted, false, 'la repetición no vuelve a adoptar');
  assert.equal(segunda.lock.created_at, primera.lock.created_at, 'el lock es el mismo');

  const adopciones = eventsForTask(TASK).filter((e) => e.note?.startsWith('lock adoptado'));
  assert.equal(adopciones.length, 1, 'la traza no se duplica');
});

// --- 4. sólo READY_FOR_QA ---------------------------------------------------

test('ningún otro estado admite adopción', (t) => {
  const repo = useTempRepo(t);
  useTempState(t);
  useTempQueue(t, [taskDefinition({ base_commit: repo.baseCommit })]);

  // READY, antes de cualquier claim.
  const enReady = captureError(() => adoptQaLock(adopcion()));
  assert.equal(enReady.code, 'STATE_NOT_ADOPTABLE');
  assert.equal(readLock(taskLockFile(TASK)), null);

  // IMPLEMENTING, con lock propio del despacho.
  dispatch({ agentId: IMPL, missionId: 'CONTAIA-TEST' });
  assert.equal(readTaskState(TASK).state, 'IMPLEMENTING');
  const enImplementing = captureError(() => adoptQaLock(adopcion({ implementerId: OTRO })));
  assert.equal(enImplementing.code, 'STATE_NOT_ADOPTABLE');

  // Y tampoco en un estado de bloqueo.
  transitionTask({
    taskId: TASK,
    to: 'BLOCKED',
    actor: { type: 'agent', id: IMPL },
    reason: 'prueba',
    blockedReason: 'unclassified',
  });
  const enBlocked = captureError(() => adoptQaLock(adopcion({ implementerId: OTRO })));
  assert.equal(enBlocked.code, 'STATE_NOT_ADOPTABLE');
});

// --- 5. lo que la adopción NO relaja ----------------------------------------

test('el auditor sigue sin poder ser el implementador adoptado', (t) => {
  materializada(t);
  adoptQaLock(adopcion());

  // Designado en el handoff: se rechaza al entregarlo.
  const alEntregar = captureError(() =>
    submitHandoff({ taskId: TASK, implementerId: IMPL, handoff: evidencia(), auditorId: IMPL }),
  );
  assert.ok(alEntregar instanceof NonIndependentAuditorError);

  // Y tampoco por la puerta de atrás, auditando sin haberse designado.
  submitHandoff({ taskId: TASK, implementerId: IMPL, handoff: evidencia() });
  const alAuditar = captureError(() =>
    runQa({ taskId: TASK, auditorId: IMPL, auditResult: auditResult({ auditorId: IMPL }) }),
  );
  assert.ok(alAuditar instanceof NonIndependentAuditorError);
  assert.equal(readTaskState(TASK).state, 'READY_FOR_QA', 'nada avanzó');
});

test('una tarjeta con recuperación pendiente no se adopta', (t) => {
  materializada(t);
  // La guarda central es la misma que protege claim, handoff y qa.
  writeTaskState({
    ...getOrCreateTaskState(TASK),
    transaction_pending: { transaction_id: 'x', from: 'READY_FOR_QA', to: 'READY_FOR_QA' },
  });

  const err = captureError(() => adoptQaLock(adopcion()));
  assert.equal(err.code, 'PENDING_TRANSACTION');
  assert.equal(readLock(taskLockFile(TASK)), null);
});

// --- 6. el flujo normal no cambia -------------------------------------------

test('READY -> claim -> handoff sigue funcionando sin adopción alguna', (t) => {
  const repo = useTempRepo(t);
  useTempState(t);
  useTempQueue(t, [taskDefinition({ base_commit: repo.baseCommit })]);

  assert.equal(dispatch({ agentId: IMPL, missionId: 'CONTAIA-TEST' }).dispatched, true);
  const actor = { type: 'agent', id: IMPL };
  transitionTask({ taskId: TASK, to: 'TESTING', actor });
  transitionTask({ taskId: TASK, to: 'READY_FOR_QA', actor, commit: CANDIDATE });

  const { handoff: record } = submitHandoff({
    taskId: TASK,
    implementerId: IMPL,
    handoff: evidencia(),
  });
  assert.equal(record.implementer_id, IMPL);

  const adopciones = eventsForTask(TASK).filter((e) => e.note?.startsWith('lock adoptado'));
  assert.equal(adopciones.length, 0, 'el camino normal no adopta nada');

  assert.equal(
    runQa({ taskId: TASK, auditorId: AUDITOR, auditResult: auditResult() }).state,
    'READY_FOR_INTEGRATION',
  );
});
