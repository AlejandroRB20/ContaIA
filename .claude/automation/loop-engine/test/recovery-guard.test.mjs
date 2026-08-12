import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { dispatch, transitionTask, release, resume, block } from '../lib/dispatcher.mjs';
import { submitHandoff, runQa } from '../lib/qa-session.mjs';
import { evaluateTaskReadiness } from '../lib/integration-readiness.mjs';
import { resolveRecovery, RecoveryResolutionError } from '../lib/recovery.mjs';
import { commitTransaction, RecoveryRequiredError } from '../lib/transaction.mjs';
import { getOrCreateTaskState, readTaskState } from '../lib/store.mjs';
import { eventsForTask, readEvents } from '../lib/events.mjs';
import { hasPendingRecovery, describeTaskConditions } from '../lib/guard.mjs';
import { recoveryFile, resolvedRecoveryDir, eventsFile } from '../lib/paths.mjs';
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
 * Hallazgo ALTO de la reauditoría de `LOOP-001`: `RecoveryRequiredError`
 * dejaba evidencia durable en `state/recovery/<task_id>.json` y **ninguna
 * operación posterior la consultaba**. La tarjeta seguía avanzando sobre un
 * estado que el propio motor había declarado irrecuperable.
 *
 * Estas pruebas fijan las dos mitades del arreglo: la guarda fail-closed y
 * la resolución humana explícita, sin auto-heal en ninguna ruta.
 */

const TASK = 'LOOP-TEST-001';
const OTRA = 'LOOP-TEST-002';
const IMPL = 'CLAUDE-02';
const AUDITOR = 'CODEX-01';
const CANDIDATE = 'c0ffee1';

/** Escenario mínimo: una o dos tarjetas instanciadas en `state/`. */
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

/** Evidencia de recuperación equivalente a la que escribe `transaction.mjs`. */
function sembrarRecovery(taskId, extra = {}) {
  const file = recoveryFile(taskId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const evidencia = {
    reason: 'append de eventos y restauración de estado fallaron',
    transaction_id: 'tx-inventada-0001',
    state_snapshot: { ...getOrCreateTaskState(taskId) },
    pending_events: [{ task_id: taskId, from_state: 'READY', to_state: 'CLAIMED' }],
    events_written: false,
    at: new Date().toISOString(),
    ...extra,
  };
  fs.writeFileSync(file, `${JSON.stringify(evidencia, null, 2)}\n`, 'utf8');
  return evidencia;
}

// --- 1. recovery pendiente bloquea transition -------------------------------

test('1. recovery pendiente bloquea transition', (t) => {
  escenario(t);
  sembrarRecovery(TASK);

  const err = captureError(() =>
    transitionTask({ taskId: TASK, to: 'CLAIMED', actor: { type: 'agent', id: IMPL } }),
  );

  assert.equal(err.code, 'RECOVERY_REQUIRED');
  assert.equal(readTaskState(TASK).state, 'READY', 'el estado no se movió');
});

test('1b. la guarda cubre también block, release y resume', (t) => {
  escenario(t);
  sembrarRecovery(TASK);
  const actor = { type: 'agent', id: IMPL };

  for (const [nombre, fn] of [
    ['block', () => block({ taskId: TASK, actor, reason: 'x', blockedReason: 'unclassified' })],
    ['release', () => release({ taskId: TASK, agentId: IMPL, reason: 'x' })],
    ['resume', () => resume({ taskId: TASK, actor: { type: 'human', id: 'ALEJANDRO' } })],
  ]) {
    assert.equal(captureError(fn).code, 'RECOVERY_REQUIRED', `${nombre} debe bloquearse`);
  }
});

// --- 2. recovery pendiente bloquea QA ---------------------------------------

test('2. recovery pendiente bloquea el handoff y la auditoría de QA', (t) => {
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

  sembrarRecovery(TASK);

  assert.equal(
    captureError(() =>
      runQa({ taskId: TASK, auditorId: AUDITOR, auditResult: auditResult({ auditorId: AUDITOR }) }),
    ).code,
    'RECOVERY_REQUIRED',
  );
  assert.equal(
    captureError(() =>
      submitHandoff({ taskId: TASK, implementerId: IMPL, handoff: handoff({ implementerId: IMPL }) }),
    ).code,
    'RECOVERY_REQUIRED',
  );
  assert.equal(readTaskState(TASK).qa_result, null, 'no se registró veredicto alguno');
});

// --- 3. recovery pendiente bloquea readiness --------------------------------

test('3. recovery pendiente bloquea readiness antes de evaluar nada', (t) => {
  escenario(t);
  sembrarRecovery(TASK);

  const err = captureError(() => evaluateTaskReadiness({ taskId: TASK }));
  assert.equal(err.code, 'RECOVERY_REQUIRED');
  // La guarda va primero: ni siquiera llega a quejarse del handoff ausente.
  assert.doesNotMatch(err.message, /handoff/);
});

// --- 4. recovery pendiente bloquea dispatcher -------------------------------

test('4. recovery pendiente hace la tarjeta no despachable', (t) => {
  escenario(t);
  sembrarRecovery(TASK);

  const resultado = dispatch({ agentId: IMPL, missionId: 'CONTAIA-TEST' });

  assert.equal(resultado.dispatched, false);
  assert.equal(resultado.reason, 'no-eligible-task');
  assert.deepEqual(resultado.skipped, [
    { task_id: TASK, reason: 'not-operable', conditions: ['RECOVERY_REQUIRED'] },
  ]);
  assert.equal(readTaskState(TASK).state, 'READY', 'no se reclamó');
});

// --- 5. recovery no se borra automáticamente --------------------------------

test('5. ninguna operación del motor borra la evidencia de recovery', (t) => {
  escenario(t);
  const sembrada = sembrarRecovery(TASK);
  const actor = { type: 'agent', id: IMPL };

  for (const fn of [
    () => transitionTask({ taskId: TASK, to: 'CLAIMED', actor }),
    () => dispatch({ agentId: IMPL }),
    () => evaluateTaskReadiness({ taskId: TASK }),
    () => release({ taskId: TASK, agentId: IMPL }),
  ]) {
    try {
      fn();
    } catch {
      /* el bloqueo es el comportamiento esperado */
    }
  }

  assert.equal(hasPendingRecovery(TASK), true, 'la evidencia sigue en disco');
  assert.deepEqual(
    JSON.parse(fs.readFileSync(recoveryFile(TASK), 'utf8')),
    sembrada,
    'y sigue intacta, byte a byte',
  );
});

// --- 6. resolución sin confirmed:true falla ---------------------------------

test('6. la resolución exige confirmed:true, actor y razón', (t) => {
  escenario(t);
  sembrarRecovery(TASK);

  const casos = [
    [{ taskId: TASK, resolvedBy: 'ALEJANDRO', reason: 'r' }, 'CONFIRMATION_REQUIRED'],
    [{ taskId: TASK, resolvedBy: 'ALEJANDRO', reason: 'r', confirmed: 'true' }, 'CONFIRMATION_REQUIRED'],
    [{ taskId: TASK, reason: 'r', confirmed: true }, 'ACTOR_REQUIRED'],
    [{ taskId: TASK, resolvedBy: 'ALEJANDRO', confirmed: true }, 'REASON_REQUIRED'],
    [{ taskId: TASK, resolvedBy: 'ALEJANDRO', reason: '   ', confirmed: true }, 'REASON_REQUIRED'],
    [
      { taskId: TASK, resolvedBy: 'ALEJANDRO', reason: 'r', confirmed: true, disposition: 'auto_heal' },
      'INVALID_DISPOSITION',
    ],
  ];

  for (const [params, code] of casos) {
    const err = captureError(() => resolveRecovery(params));
    assert.ok(err instanceof RecoveryResolutionError);
    assert.equal(err.code, code, JSON.stringify(params));
  }

  assert.equal(hasPendingRecovery(TASK), true, 'ningún intento inválido levantó el bloqueo');
});

test('6b. no se puede "resolver" una recuperación que no existe', (t) => {
  escenario(t);
  const err = captureError(() =>
    resolveRecovery({ taskId: TASK, resolvedBy: 'ALEJANDRO', reason: 'r', confirmed: true }),
  );
  assert.equal(err.code, 'NO_RECOVERY_PENDING');
});

// --- 7. resolución humana válida deja trazabilidad --------------------------

test('7. la resolución humana archiva la evidencia y deja traza en el log', (t) => {
  escenario(t);
  sembrarRecovery(TASK);

  const { resolution, archived, task } = resolveRecovery({
    taskId: TASK,
    resolvedBy: 'ALEJANDRO',
    reason: 'revisado a mano: la transacción no llegó al log',
    confirmed: true,
  });

  // Quién, cuándo, por qué y con qué disposición.
  assert.equal(resolution.resolved_by, 'ALEJANDRO');
  assert.equal(resolution.confirmed, true);
  assert.equal(resolution.disposition, 'block_human_decision');
  assert.match(resolution.reason, /revisado a mano/);
  assert.ok(Date.parse(resolution.resolved_at) > 0);

  // El motor no inventó estado: quedó a la espera de decisión humana.
  assert.equal(task.state, 'BLOCKED_HUMAN_DECISION');
  assert.equal(readTaskState(TASK).state, 'BLOCKED_HUMAN_DECISION');

  // La evidencia se archiva, no se destruye.
  assert.equal(hasPendingRecovery(TASK), false, 'deja de bloquear');
  assert.equal(fs.existsSync(archived), true, 'pero sobrevive archivada');
  assert.ok(archived.startsWith(resolvedRecoveryDir()));
  const guardada = JSON.parse(fs.readFileSync(archived, 'utf8'));
  assert.equal(guardada.transaction_id, 'tx-inventada-0001', 'conserva la evidencia original');
  assert.deepEqual(guardada.resolution, resolution);

  // Y queda como acto humano en el log de eventos.
  const evento = eventsForTask(TASK).at(-1);
  assert.equal(evento.actor_type, 'human');
  assert.equal(evento.agent_id, 'ALEJANDRO');
  assert.equal(evento.to_state, 'BLOCKED_HUMAN_DECISION');
  assert.match(evento.note, /recovery resuelta \(block_human_decision\)/);
});

test('7b. restore_snapshot sólo procede si el log confirma que la transacción no ocurrió', (t) => {
  escenario(t);
  const evidencia = sembrarRecovery(TASK);

  // Si los eventos SÍ llegaron al log, restaurar contradiría la fuente de
  // verdad: el motor se niega y remite a la decisión humana.
  fs.mkdirSync(path.dirname(eventsFile()), { recursive: true });
  fs.appendFileSync(
    eventsFile(),
    `${JSON.stringify({ ts: new Date().toISOString(), transaction_id: evidencia.transaction_id, task_id: TASK, to_state: 'CLAIMED' })}\n`,
  );

  const err = captureError(() =>
    resolveRecovery({
      taskId: TASK,
      resolvedBy: 'ALEJANDRO',
      reason: 'intento de restaurar',
      confirmed: true,
      disposition: 'restore_snapshot',
    }),
  );
  assert.equal(err.code, 'SNAPSHOT_CONTRADICTS_LOG');
  assert.equal(hasPendingRecovery(TASK), true, 'sigue bloqueada tras el intento rechazado');
});

test('7c. sin state_snapshot utilizable no se restaura nada', (t) => {
  escenario(t);
  sembrarRecovery(TASK, { state_snapshot: null });

  const err = captureError(() =>
    resolveRecovery({
      taskId: TASK,
      resolvedBy: 'ALEJANDRO',
      reason: 'intento',
      confirmed: true,
      disposition: 'restore_snapshot',
    }),
  );
  assert.equal(err.code, 'SNAPSHOT_UNAVAILABLE');
  assert.equal(hasPendingRecovery(TASK), true);
});

// --- 8. tras la resolución puede continuar según estado permitido -----------

test('8. tras restore_snapshot la tarjeta continúa desde el estado restaurado', (t) => {
  escenario(t);
  // La tarjeta avanzó a CLAIMED y la evidencia guarda el READY previo.
  transitionTask({
    taskId: TASK,
    to: 'CLAIMED',
    actor: { type: 'agent', id: IMPL, holdsLock: true },
  });
  const snapshot = { ...readTaskState(TASK), state: 'READY' };
  fs.mkdirSync(path.dirname(recoveryFile(TASK)), { recursive: true });
  fs.writeFileSync(
    recoveryFile(TASK),
    `${JSON.stringify(
      {
        reason: 'restauración fallida',
        transaction_id: 'tx-nunca-escrita',
        state_snapshot: snapshot,
        pending_events: [],
        events_written: false,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  const { task } = resolveRecovery({
    taskId: TASK,
    resolvedBy: 'ALEJANDRO',
    reason: 'verificado: la transacción no llegó al log',
    confirmed: true,
    disposition: 'restore_snapshot',
  });

  assert.equal(task.state, 'READY', 'estado reconciliado con el log');
  assert.equal(describeTaskConditions(TASK).operable, true);

  // Y ahora sí admite la transición que antes estaba bloqueada.
  const avanzada = transitionTask({
    taskId: TASK,
    to: 'CLAIMED',
    actor: { type: 'agent', id: IMPL, holdsLock: true },
  });
  assert.equal(avanzada.state, 'CLAIMED');
});

test('8b. tras block_human_decision sólo un humano la reactiva', (t) => {
  escenario(t);
  sembrarRecovery(TASK);
  resolveRecovery({ taskId: TASK, resolvedBy: 'ALEJANDRO', reason: 'r', confirmed: true });

  // Un agente no puede salir de BLOCKED_HUMAN_DECISION: sigue siendo gate humano.
  assert.equal(
    captureError(() => resume({ taskId: TASK, actor: { type: 'agent', id: IMPL } })).code,
    'HUMAN_GATE_REQUIRED',
  );
  assert.equal(resume({ taskId: TASK, actor: { type: 'human', id: 'ALEJANDRO' } }).state, 'READY');
});

// --- 9. aislamiento entre tarjetas ------------------------------------------

test('9. la recovery de una tarjeta no bloquea a otra', (t) => {
  escenario(t, { tasks: [TASK, OTRA] });
  sembrarRecovery(TASK);

  assert.equal(captureError(() => evaluateTaskReadiness({ taskId: TASK })).code, 'RECOVERY_REQUIRED');

  // La otra tarjeta es plenamente operable.
  assert.equal(describeTaskConditions(OTRA).operable, true);
  const despachada = dispatch({ agentId: IMPL, missionId: 'CONTAIA-TEST' });
  assert.equal(despachada.dispatched, true);
  assert.equal(despachada.task.task_id, OTRA, 'el dispatcher elige la sana y salta la bloqueada');
  assert.deepEqual(despachada.skipped, [
    { task_id: TASK, reason: 'not-operable', conditions: ['RECOVERY_REQUIRED'] },
  ]);
});

// --- la evidencia la produce el motor, no sólo el fixture -------------------

test('la ruta real de fallo produce evidencia que efectivamente bloquea', (t) => {
  escenario(t);
  getOrCreateTaskState(TASK);

  // El append falla y la restauración también: única ruta que el motor no
  // puede deshacer solo (§ `transaction.mjs`).
  fs.mkdirSync(path.dirname(eventsFile()), { recursive: true });
  fs.writeFileSync(eventsFile(), '');
  fs.chmodSync(eventsFile(), 0o444);
  const original = fs.renameSync;
  let llamadas = 0;
  t.mock.method(fs, 'renameSync', (...args) => {
    llamadas += 1;
    if (llamadas > 1) throw new Error('disco de estado no disponible');
    return original.apply(fs, args);
  });

  const err = captureError(() =>
    commitTransaction({
      taskId: TASK,
      from: 'READY',
      changes: { state: 'CLAIMED' },
      events: [{ task_id: TASK, from_state: 'READY', to_state: 'CLAIMED' }],
    }),
  );
  t.mock.restoreAll();
  fs.chmodSync(eventsFile(), 0o666);

  assert.ok(err instanceof RecoveryRequiredError, `se esperaba RecoveryRequiredError: ${err.message}`);
  assert.equal(hasPendingRecovery(TASK), true);

  // Y desde ese momento la tarjeta deja de admitir operaciones.
  assert.equal(
    captureError(() =>
      transitionTask({ taskId: TASK, to: 'IMPLEMENTING', actor: { type: 'agent', id: IMPL } }),
    ).code,
    'RECOVERY_REQUIRED',
  );
  assert.equal(readEvents().length, 0, 'el log nunca recibió los eventos de la transacción fallida');
});
