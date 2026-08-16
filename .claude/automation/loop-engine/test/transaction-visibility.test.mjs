import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { dispatch, transitionTask } from '../lib/dispatcher.mjs';
import { submitHandoff, runQa } from '../lib/qa-session.mjs';
import { evaluateTaskReadiness } from '../lib/integration-readiness.mjs';
import { commitTransaction, RecoveryRequiredError } from '../lib/transaction.mjs';
import { getOrCreateTaskState, readTaskState, writeTaskState } from '../lib/store.mjs';
import { readEvents, eventsForTask } from '../lib/events.mjs';
import { describeTaskConditions, hasPendingRecovery } from '../lib/guard.mjs';
import { eventsFile, recoveryFile } from '../lib/paths.mjs';
import { run } from '../cli.mjs';
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
 * Hallazgo MEDIO de la reauditoría de `LOOP-001`: entre la persistencia del
 * estado y la confirmación del append de eventos había una ventana en la que
 * un lector veía el estado adelantado. Si el append fallaba, ese estado se
 * restauraba — y quien hubiera decidido en el intervalo habría decidido
 * sobre algo que nunca ocurrió.
 *
 * La ventana no se elimina (eso exigiría un journal): se hace **explícita y
 * fail-closed** con la marca `transaction_pending`.
 */

const TASK = 'LOOP-TEST-001';
const OTRA = 'LOOP-TEST-002';
const IMPL = 'CLAUDE-02';
const AUDITOR = 'CODEX-01';
const CANDIDATE = 'c0ffee1';

function escenario(t, { tasks = [TASK] } = {}) {
  const repo = useTempRepo(t);
  useTempState(t);
  useTempQueue(
    t,
    tasks.map((id) => taskDefinition({ task_id: id, base_commit: repo.baseCommit })),
  );
  for (const id of tasks) getOrCreateTaskState(id);
  return repo;
}

/** Deja la tarjeta con una transacción sin confirmar, como al morir a media vía. */
function marcarPendiente(taskId, to = 'CLAIMED') {
  const actual = getOrCreateTaskState(taskId);
  writeTaskState({
    ...actual,
    state: to,
    transaction_pending: {
      transaction_id: 'tx-sin-confirmar',
      from: actual.state,
      to,
      event_count: 1,
      started_at: new Date().toISOString(),
    },
  });
}

/** Captura lo que la CLI imprime, sin ensuciar la salida de la suite. */
function capturarSalida(t, fn) {
  const lineas = [];
  const original = console.log;
  console.log = (...args) => lineas.push(args.join(' '));
  t.after(() => {
    console.log = original;
  });
  try {
    fn();
  } finally {
    console.log = original;
  }
  return lineas.join('\n');
}

// --- 10. transaction pending bloquea readiness ------------------------------

test('10. una transacción sin confirmar bloquea readiness', (t) => {
  escenario(t);
  marcarPendiente(TASK, 'READY_FOR_QA');

  const err = captureError(() => evaluateTaskReadiness({ taskId: TASK }));
  assert.equal(err.code, 'PENDING_TRANSACTION');
  assert.match(err.message, /no está respaldado por su registro de eventos/);
});

// --- 11. transaction pending bloquea QA -------------------------------------

test('11. una transacción sin confirmar bloquea el handoff y la auditoría de QA', (t) => {
  escenario(t);
  marcarPendiente(TASK, 'READY_FOR_QA');

  assert.equal(
    captureError(() =>
      runQa({ taskId: TASK, auditorId: AUDITOR, auditResult: auditResult({ auditorId: AUDITOR }) }),
    ).code,
    'PENDING_TRANSACTION',
  );
  assert.equal(
    captureError(() =>
      submitHandoff({ taskId: TASK, implementerId: IMPL, handoff: handoff({ implementerId: IMPL }) }),
    ).code,
    'PENDING_TRANSACTION',
  );
});

// --- 12. transaction pending bloquea dispatcher -----------------------------

test('12. una transacción sin confirmar hace la tarjeta no despachable', (t) => {
  escenario(t);
  marcarPendiente(TASK, 'READY');

  const resultado = dispatch({ agentId: IMPL, missionId: 'CONTAIA-TEST' });

  assert.equal(resultado.dispatched, false);
  assert.deepEqual(resultado.skipped, [
    { task_id: TASK, reason: 'not-operable', conditions: ['PENDING_TRANSACTION'] },
  ]);
});

test('12b. y bloquea igualmente cualquier transición', (t) => {
  escenario(t);
  marcarPendiente(TASK, 'CLAIMED');

  assert.equal(
    captureError(() =>
      transitionTask({
        taskId: TASK,
        to: 'IMPLEMENTING',
        actor: { type: 'agent', id: IMPL, holdsLock: true },
      }),
    ).code,
    'PENDING_TRANSACTION',
  );
});

// --- 13. status informa la condición sin promover ---------------------------

test('13. status informa PENDING_TRANSACTION sin lanzar ni promover', (t) => {
  escenario(t);
  marcarPendiente(TASK, 'CLAIMED');
  const antes = readTaskState(TASK);

  const salida = capturarSalida(t, () => run(['status', TASK]));

  assert.match(salida, /PENDING_TRANSACTION/);
  assert.match(salida, /NO admite operaciones que la promuevan/);
  assert.deepEqual(readTaskState(TASK), antes, 'leer no cambió absolutamente nada');
});

test('13b. list marca la condición junto al estado', (t) => {
  escenario(t, { tasks: [TASK, OTRA] });
  marcarPendiente(TASK, 'READY');

  const salida = capturarSalida(t, () => run(['list']));
  const filaBloqueada = salida.split('\n').find((l) => l.startsWith(TASK));
  const filaSana = salida.split('\n').find((l) => l.startsWith(OTRA));

  assert.match(filaBloqueada, /\[PENDING_TRANSACTION\]/);
  assert.doesNotMatch(filaSana, /\[/, 'una tarjeta sana no se marca');
});

test('13c. describeTaskConditions es informativa y nunca lanza', (t) => {
  escenario(t);
  marcarPendiente(TASK, 'CLAIMED');
  fs.mkdirSync(path.dirname(recoveryFile(TASK)), { recursive: true });
  fs.writeFileSync(recoveryFile(TASK), '{"reason":"x"}\n', 'utf8');

  const info = describeTaskConditions(TASK);
  assert.equal(info.operable, false);
  assert.deepEqual(info.conditions, ['RECOVERY_REQUIRED', 'PENDING_TRANSACTION']);
  assert.equal(info.transaction_pending.transaction_id, 'tx-sin-confirmar');
});

// --- 14. la operación fallida limpia la marca cuando es seguro --------------

test('14. si el append falla y la restauración funciona, no queda marca', (t) => {
  escenario(t);
  const previo = readTaskState(TASK);

  fs.mkdirSync(path.dirname(eventsFile()), { recursive: true });
  fs.writeFileSync(eventsFile(), '');
  fs.chmodSync(eventsFile(), 0o444);
  const err = captureError(() =>
    commitTransaction({
      taskId: TASK,
      from: 'READY',
      changes: { state: 'CLAIMED' },
      events: [{ task_id: TASK, from_state: 'READY', to_state: 'CLAIMED' }],
    }),
  );
  fs.chmodSync(eventsFile(), 0o666);

  assert.ok(err, 'el append debe fallar');
  const despues = readTaskState(TASK);
  assert.equal(despues.state, 'READY', 'el estado volvió atrás');
  assert.equal('transaction_pending' in despues, false, 'y la marca se compensó');
  assert.deepEqual(despues, previo, 'el estado quedó exactamente como estaba');
  assert.equal(describeTaskConditions(TASK).operable, true, 'la tarjeta sigue operable');
  assert.equal(hasPendingRecovery(TASK), false, 'no hace falta recuperación');
});

test('14b. una transacción exitosa no deja marca residual', (t) => {
  escenario(t);
  const resultado = transitionTask({
    taskId: TASK,
    to: 'CLAIMED',
    actor: { type: 'agent', id: IMPL, holdsLock: true },
  });

  assert.equal('transaction_pending' in resultado, false, 'ni en el valor devuelto');
  assert.equal('transaction_pending' in readTaskState(TASK), false, 'ni en disco');
  assert.equal(describeTaskConditions(TASK).operable, true);
  assert.equal(eventsForTask(TASK).length, 1, 'y el evento sí está');
});

test('14c. la marca existe realmente durante la ventana, no sólo en teoría', (t) => {
  escenario(t);
  let vistoDurante = null;

  // Se observa el estado en disco justo cuando el log va a escribirse: es
  // exactamente el instante que la auditoría señaló como invisible.
  const original = fs.appendFileSync;
  t.mock.method(fs, 'appendFileSync', (...args) => {
    vistoDurante = readTaskState(TASK);
    return original.apply(fs, args);
  });
  transitionTask({
    taskId: TASK,
    to: 'CLAIMED',
    actor: { type: 'agent', id: IMPL, holdsLock: true },
  });
  t.mock.restoreAll();

  assert.equal(vistoDurante.state, 'CLAIMED', 'el estado ya iba por delante del log');
  assert.equal(
    vistoDurante.transaction_pending.to,
    'CLAIMED',
    'pero iba marcado: un lector decisorio lo habría rechazado',
  );
  assert.equal('transaction_pending' in readTaskState(TASK), false, 'y al confirmar se retira');
});

// --- 15. si la limpieza falla, recovery permanece bloqueante ---------------

test('15. si la marca no puede retirarse, queda recovery y la tarjeta se bloquea', (t) => {
  escenario(t);

  // Los eventos se escriben bien; falla únicamente el paso CONFIRM.
  const original = fs.renameSync;
  let armado = false;
  let llamadas = 0;
  t.mock.method(fs, 'renameSync', (...args) => {
    if (armado) {
      llamadas += 1;
      if (llamadas === 2) throw new Error('disco de estado no disponible al confirmar');
    }
    return original.apply(fs, args);
  });

  armado = true;
  const err = captureError(() =>
    commitTransaction({
      taskId: TASK,
      from: 'READY',
      changes: { state: 'CLAIMED' },
      events: [{ task_id: TASK, from_state: 'READY', to_state: 'CLAIMED' }],
    }),
  );
  t.mock.restoreAll();

  assert.ok(err instanceof RecoveryRequiredError, `se esperaba RecoveryRequiredError: ${err.message}`);

  // Los eventos son válidos y NO se tocaron: el log nunca se deshace.
  assert.equal(readEvents().length, 1, 'el evento escrito se conserva');

  // La limpieza fallida no se da por buena: queda evidencia y bloqueo.
  assert.equal(hasPendingRecovery(TASK), true, 'se preservó evidencia de recuperación');
  const evidencia = JSON.parse(fs.readFileSync(recoveryFile(TASK), 'utf8'));
  assert.equal(evidencia.events_written, true, 'la evidencia distingue este caso del otro');
  assert.match(evidencia.reason, /no pudo retirarse/);

  const conditions = describeTaskConditions(TASK);
  assert.equal(conditions.operable, false);
  assert.deepEqual(conditions.conditions, ['RECOVERY_REQUIRED', 'PENDING_TRANSACTION']);

  // Y sigue bloqueando de verdad.
  assert.equal(
    captureError(() =>
      transitionTask({
        taskId: TASK,
        to: 'IMPLEMENTING',
        actor: { type: 'agent', id: IMPL, holdsLock: true },
      }),
    ).code,
    'RECOVERY_REQUIRED',
  );
});

// --- el ciclo completo sigue funcionando bajo la marca ----------------------

test('el ciclo QA completo no deja ninguna marca residual', (t) => {
  const repo = escenario(t);
  const actor = { type: 'agent', id: IMPL };
  assert.equal(dispatch({ agentId: IMPL, missionId: 'CONTAIA-TEST' }).dispatched, true);
  transitionTask({ taskId: TASK, to: 'TESTING', actor });
  transitionTask({ taskId: TASK, to: 'READY_FOR_QA', actor, commit: CANDIDATE });
  submitHandoff({
    taskId: TASK,
    implementerId: IMPL,
    handoff: handoff({ implementerId: IMPL, candidateCommit: CANDIDATE, baseCommit: repo.baseCommit }),
  });
  const resultado = runQa({
    taskId: TASK,
    auditorId: AUDITOR,
    auditResult: auditResult({ auditorId: AUDITOR }),
  });

  assert.equal(resultado.state, 'READY_FOR_INTEGRATION');
  assert.equal('transaction_pending' in readTaskState(TASK), false);
  assert.equal(describeTaskConditions(TASK).operable, true);
});
