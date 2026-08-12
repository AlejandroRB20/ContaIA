import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { dispatch, transitionTask } from '../lib/dispatcher.mjs';
import { submitHandoff, runQa } from '../lib/qa-session.mjs';
import { evaluateTaskReadiness } from '../lib/integration-readiness.mjs';
import { resolveRecovery } from '../lib/recovery.mjs';
import { getOrCreateTaskState, readTaskState, writeTaskState } from '../lib/store.mjs';
import { readEvents, eventsForTask } from '../lib/events.mjs';
import { assertOperable, describeTaskConditions, hasPendingRecovery } from '../lib/guard.mjs';
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
 * Hallazgo MEDIO de la reauditoría de `LOOP-001`: la resolución humana
 * archivaba y desactivaba `state/recovery/<task_id>.json` **antes** de
 * confirmar que el evento de resolución se había persistido. Codex reprodujo
 * la secuencia completa: con `appendEvents` fallando en EIO, la recuperación
 * dejaba de bloquear, no quedaba evento alguno, y una transición posterior a
 * `CLAIMED` era aceptada.
 *
 * El contrato que fijan estas pruebas es uno solo: **una recuperación no está
 * resuelta hasta que su evidencia obligatoria está persistida.**
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

/** 1. Evidencia de recuperación activa, como la escribe `transaction.mjs`. */
function sembrarRecovery(taskId, extra = {}) {
  const file = recoveryFile(taskId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const evidencia = {
    reason: 'append de eventos y restauración de estado fallaron',
    transaction_id: 'tx-original-0001',
    state_snapshot: { ...getOrCreateTaskState(taskId) },
    pending_events: [{ task_id: taskId, from_state: 'READY', to_state: 'CLAIMED' }],
    events_written: false,
    at: new Date().toISOString(),
    ...extra,
  };
  fs.writeFileSync(file, `${JSON.stringify(evidencia, null, 2)}\n`, 'utf8');
  return evidencia;
}

/** 3. `appendEvents` falla con EIO — sólo sobre el event log. */
function romperLog(t) {
  const log = eventsFile();
  fs.mkdirSync(path.dirname(log), { recursive: true });
  if (!fs.existsSync(log)) fs.writeFileSync(log, '');
  const original = fs.appendFileSync;
  t.mock.method(fs, 'appendFileSync', (file, ...rest) => {
    if (String(file) === log) {
      const err = new Error(`EIO: i/o error, write '${file}'`);
      err.code = 'EIO';
      throw err;
    }
    return original.call(fs, file, ...rest);
  });
}

function archivados() {
  const dir = resolvedRecoveryDir();
  return fs.existsSync(dir) ? fs.readdirSync(dir) : [];
}

// --- 1-3. el EIO deja la recuperación ACTIVA --------------------------------

test('1-3. si el evento de resolución no se persiste, la recuperación sigue activa', (t) => {
  escenario(t);
  sembrarRecovery(TASK);
  romperLog(t);

  const err = captureError(() =>
    resolveRecovery({
      taskId: TASK,
      resolvedBy: 'ALEJANDRO',
      reason: 'resolución que no llegará al log',
      confirmed: true,
    }),
  );
  t.mock.restoreAll();

  assert.equal(err.code, 'RESOLUTION_EVENT_NOT_PERSISTED');
  assert.match(err.message, /sigue ACTIVA/);
  assert.equal(hasPendingRecovery(TASK), true, 'la evidencia NO se desactivó');
});

// --- 4. assertOperable sigue lanzando ---------------------------------------

test('4. tras el EIO, assertOperable sigue lanzando RECOVERY_REQUIRED', (t) => {
  escenario(t);
  sembrarRecovery(TASK);
  romperLog(t);
  captureError(() =>
    resolveRecovery({ taskId: TASK, resolvedBy: 'ALEJANDRO', reason: 'r', confirmed: true }),
  );
  t.mock.restoreAll();

  assert.equal(captureError(() => assertOperable(TASK)).code, 'RECOVERY_REQUIRED');
  assert.equal(describeTaskConditions(TASK).operable, false);
});

// --- 5-8. ninguna operación posterior avanza --------------------------------

test('5-7. tras el EIO, transition / QA / readiness siguen bloqueadas', (t) => {
  escenario(t);
  sembrarRecovery(TASK);
  romperLog(t);
  captureError(() =>
    resolveRecovery({ taskId: TASK, resolvedBy: 'ALEJANDRO', reason: 'r', confirmed: true }),
  );
  t.mock.restoreAll();

  // 5. Es la transición exacta que Codex consiguió que se aceptara.
  assert.equal(
    captureError(() =>
      transitionTask({
        taskId: TASK,
        to: 'CLAIMED',
        actor: { type: 'agent', id: IMPL, holdsLock: true },
      }),
    ).code,
    'RECOVERY_REQUIRED',
  );
  assert.notEqual(readTaskState(TASK).state, 'CLAIMED', 'la tarjeta no avanzó');

  // 6. QA — handoff y auditoría.
  assert.equal(
    captureError(() =>
      submitHandoff({ taskId: TASK, implementerId: IMPL, handoff: handoff({ implementerId: IMPL }) }),
    ).code,
    'RECOVERY_REQUIRED',
  );
  assert.equal(
    captureError(() =>
      runQa({ taskId: TASK, auditorId: AUDITOR, auditResult: auditResult({ auditorId: AUDITOR }) }),
    ).code,
    'RECOVERY_REQUIRED',
  );

  // 7. readiness.
  assert.equal(captureError(() => evaluateTaskReadiness({ taskId: TASK })).code, 'RECOVERY_REQUIRED');
});

test('8. tras el EIO, el dispatcher no selecciona ni avanza la tarjeta', (t) => {
  escenario(t);
  sembrarRecovery(TASK);
  romperLog(t);
  captureError(() =>
    resolveRecovery({ taskId: TASK, resolvedBy: 'ALEJANDRO', reason: 'r', confirmed: true }),
  );
  t.mock.restoreAll();

  assert.equal(dispatch({ agentId: IMPL, missionId: 'CONTAIA-TEST' }).dispatched, false);

  // La disposición ya se había aplicado antes de que fallara el append, así
  // que la tarjeta ni siquiera está READY. El caso duro es el otro: forzarla
  // a READY en disco y comprobar que lo que la frena es la GUARDA, no el
  // filtro de estado. Sin esto, la prueba pasaría por el motivo equivocado.
  writeTaskState({ ...readTaskState(TASK), state: 'READY' });

  const resultado = dispatch({ agentId: IMPL, missionId: 'CONTAIA-TEST' });
  assert.equal(resultado.dispatched, false);
  assert.equal(resultado.reason, 'no-eligible-task');
  assert.deepEqual(resultado.skipped, [
    { task_id: TASK, reason: 'not-operable', conditions: ['RECOVERY_REQUIRED'] },
  ]);
  assert.equal(readTaskState(TASK).state, 'READY', 'sigue sin reclamarse');
  assert.equal(readTaskState(TASK).owner, null, 'ni se le asignó dueño');
});

// --- 9-10. ninguna falsa evidencia de éxito ---------------------------------

test('9. tras el EIO no aparece nada en resolved/', (t) => {
  escenario(t);
  sembrarRecovery(TASK);
  romperLog(t);
  captureError(() =>
    resolveRecovery({ taskId: TASK, resolvedBy: 'ALEJANDRO', reason: 'r', confirmed: true }),
  );
  t.mock.restoreAll();

  assert.deepEqual(archivados(), [], 'archivar sería afirmar un éxito que no ocurrió');
});

test('10. tras el EIO no queda ningún evento parcial ni corrupto', (t) => {
  escenario(t);
  sembrarRecovery(TASK);
  romperLog(t);
  captureError(() =>
    resolveRecovery({ taskId: TASK, resolvedBy: 'ALEJANDRO', reason: 'r', confirmed: true }),
  );
  t.mock.restoreAll();

  assert.equal(eventsForTask(TASK).length, 0, 'no hay evento de resolución');
  // Y lo que haya en el log sigue siendo JSONL íntegro.
  const contenido = fs.existsSync(eventsFile()) ? fs.readFileSync(eventsFile(), 'utf8') : '';
  for (const linea of contenido.split('\n').filter(Boolean)) {
    assert.doesNotThrow(() => JSON.parse(linea));
  }
});

test('10b. el fallo es reintentable: cuando el log vuelve, la resolución procede', (t) => {
  escenario(t);
  sembrarRecovery(TASK);
  romperLog(t);
  captureError(() =>
    resolveRecovery({ taskId: TASK, resolvedBy: 'ALEJANDRO', reason: 'r', confirmed: true }),
  );
  t.mock.restoreAll();

  const { task } = resolveRecovery({
    taskId: TASK,
    resolvedBy: 'ALEJANDRO',
    reason: 'reintento con el log sano',
    confirmed: true,
  });

  assert.equal(task.state, 'BLOCKED_HUMAN_DECISION');
  assert.equal(hasPendingRecovery(TASK), false);
  assert.equal(eventsForTask(TASK).length, 1, 'exactamente un evento de resolución');
});

// --- 11-12. el camino de éxito, en el orden correcto ------------------------

test('11. en el éxito, el evento se confirma ANTES de archivar y desactivar', (t) => {
  escenario(t);
  sembrarRecovery(TASK);

  // Se observa el estado del bloqueo en el instante del append: si en ese
  // momento la evidencia ya estuviera archivada o retirada, el orden sería
  // el defectuoso que esta corrección elimina.
  const orden = [];
  const original = fs.appendFileSync;
  t.mock.method(fs, 'appendFileSync', (file, ...rest) => {
    if (String(file) === eventsFile()) {
      orden.push({
        momento: 'append',
        recovery_activa: hasPendingRecovery(TASK),
        archivados: archivados().length,
      });
    }
    return original.call(fs, file, ...rest);
  });

  const { archived } = resolveRecovery({
    taskId: TASK,
    resolvedBy: 'ALEJANDRO',
    reason: 'resolución completa',
    confirmed: true,
  });
  t.mock.restoreAll();

  assert.equal(orden.length, 1, 'un único append de resolución');
  assert.equal(orden[0].recovery_activa, true, 'al escribir el evento la evidencia seguía activa');
  assert.equal(orden[0].archivados, 0, 'y todavía no se había archivado nada');

  // Y sólo después queda operable.
  assert.equal(hasPendingRecovery(TASK), false);
  assert.equal(fs.existsSync(archived), true);
  assert.equal(describeTaskConditions(TASK).operable, true);
});

test('12. el archivo de resolved/ conserva actor, razón, timestamp y disposición', (t) => {
  escenario(t);
  sembrarRecovery(TASK);

  const { archived, resolution } = resolveRecovery({
    taskId: TASK,
    resolvedBy: 'ALEJANDRO',
    reason: 'revisado a mano contra el log',
    confirmed: true,
  });

  const guardado = JSON.parse(fs.readFileSync(archived, 'utf8'));
  assert.equal(guardado.resolution.resolved_by, 'ALEJANDRO');
  assert.equal(guardado.resolution.reason, 'revisado a mano contra el log');
  assert.equal(guardado.resolution.disposition, 'block_human_decision');
  assert.equal(guardado.resolution.confirmed, true);
  assert.ok(Date.parse(guardado.resolution.resolved_at) > 0, 'timestamp parseable');

  // Evidencia original preservada y enlazada con su evento.
  assert.equal(guardado.transaction_id, 'tx-original-0001');
  assert.equal(guardado.resolution_event_appended.transaction_id, resolution.event.transaction_id);
  const evento = eventsForTask(TASK).at(-1);
  assert.equal(evento.transaction_id, resolution.event.transaction_id, 'el enlace apunta al evento real');
  assert.equal(evento.actor_type, 'human');
  assert.equal(evento.agent_id, 'ALEJANDRO');
});

// --- 13. evento persistido pero archivado fallido ---------------------------

/** Rompe únicamente la escritura del archivo en `resolved/`. */
function romperArchivado(t) {
  const original = fs.writeFileSync;
  t.mock.method(fs, 'writeFileSync', (file, ...rest) => {
    if (String(file).startsWith(resolvedRecoveryDir())) {
      throw new Error('disco de archivo no disponible');
    }
    return original.call(fs, file, ...rest);
  });
}

test('13. evento persistido + archivado fallido: no se borra el evento y sigue bloqueada', (t) => {
  escenario(t);
  sembrarRecovery(TASK);
  romperArchivado(t);

  const err = captureError(() =>
    resolveRecovery({
      taskId: TASK,
      resolvedBy: 'ALEJANDRO',
      reason: 'archivado que falla',
      confirmed: true,
    }),
  );
  t.mock.restoreAll();

  assert.equal(err.code, 'RESOLUTION_INCOMPLETE');

  // El evento es durable y NO se deshace: el log jamás se trunca.
  assert.equal(eventsForTask(TASK).length, 1, 'el evento ya registrado se conserva');

  // Fail-closed: la tarjeta sigue bloqueada, sin contradicción silenciosa.
  assert.equal(hasPendingRecovery(TASK), true);
  assert.equal(captureError(() => assertOperable(TASK)).code, 'RECOVERY_REQUIRED');
  assert.deepEqual(archivados(), [], 'nada quedó archivado a medias');

  // Y la condición se reporta como incompleta, no como una recovery cualquiera.
  const conditions = describeTaskConditions(TASK);
  assert.equal(conditions.recovery_resolution_incomplete, true);
  assert.ok(conditions.recovery.resolution_event_appended.transaction_id);
});

test('13b. el reintento tras un archivado fallido reconcilia sin duplicar el evento', (t) => {
  escenario(t);
  sembrarRecovery(TASK);
  romperArchivado(t);
  captureError(() =>
    resolveRecovery({ taskId: TASK, resolvedBy: 'ALEJANDRO', reason: 'primer intento', confirmed: true }),
  );
  t.mock.restoreAll();

  const primerEvento = eventsForTask(TASK).at(-1);

  const { archived } = resolveRecovery({
    taskId: TASK,
    resolvedBy: 'ALEJANDRO',
    reason: 'reintento tras arreglar el disco',
    confirmed: true,
  });

  assert.equal(eventsForTask(TASK).length, 1, 'no se duplica la traza de resolución');
  assert.equal(hasPendingRecovery(TASK), false, 'ahora sí se retira el bloqueo');
  const guardado = JSON.parse(fs.readFileSync(archived, 'utf8'));
  assert.equal(
    guardado.resolution_event_appended.transaction_id,
    primerEvento.transaction_id,
    'el archivo enlaza el evento original, no uno nuevo',
  );
});

// --- 14. aislamiento entre tarjetas -----------------------------------------

test('14. una resolución fallida en A no bloquea ni contamina B', (t) => {
  escenario(t, { tasks: [TASK, OTRA] });
  sembrarRecovery(TASK);
  romperLog(t);
  captureError(() =>
    resolveRecovery({ taskId: TASK, resolvedBy: 'ALEJANDRO', reason: 'r', confirmed: true }),
  );
  t.mock.restoreAll();

  assert.equal(captureError(() => assertOperable(TASK)).code, 'RECOVERY_REQUIRED');
  assert.equal(describeTaskConditions(OTRA).operable, true);
  assert.doesNotThrow(() => assertOperable(OTRA));

  const despachada = dispatch({ agentId: IMPL, missionId: 'CONTAIA-TEST' });
  assert.equal(despachada.dispatched, true);
  assert.equal(despachada.task.task_id, OTRA);
});

// --- 15-17. los contratos ya auditados de disposición siguen intactos -------

test('15. restore_snapshot sigue funcionando y ahora también registra su evento', (t) => {
  escenario(t);
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
      { transaction_id: 'tx-nunca-escrita', state_snapshot: snapshot, pending_events: [] },
      null,
      2,
    )}\n`,
    'utf8',
  );

  const { task, resolution } = resolveRecovery({
    taskId: TASK,
    resolvedBy: 'ALEJANDRO',
    reason: 'verificado: la transacción no llegó al log',
    confirmed: true,
    disposition: 'restore_snapshot',
  });

  assert.equal(task.state, 'READY', 'estado reconciliado con el log');
  assert.equal(resolution.disposition, 'restore_snapshot');
  assert.equal(describeTaskConditions(TASK).operable, true);

  const evento = eventsForTask(TASK).at(-1);
  assert.equal(evento.to_state, 'READY');
  assert.equal(evento.actor_type, 'human');

  // Y la tarjeta continúa según la máquina de estados, sin bypass.
  assert.equal(
    transitionTask({
      taskId: TASK,
      to: 'CLAIMED',
      actor: { type: 'agent', id: IMPL, holdsLock: true },
    }).state,
    'CLAIMED',
  );
  assert.equal(
    captureError(() =>
      transitionTask({
        taskId: TASK,
        to: 'READY_FOR_INTEGRATION',
        actor: { type: 'agent', id: IMPL, holdsLock: true },
      }),
    ).code,
    'INVALID_TRANSITION',
    'restaurar no abre atajos en la matriz',
  );
});

test('16. SNAPSHOT_CONTRADICTS_LOG sigue rechazando y sin registrar evento', (t) => {
  escenario(t);
  const evidencia = sembrarRecovery(TASK);
  fs.mkdirSync(path.dirname(eventsFile()), { recursive: true });
  fs.appendFileSync(
    eventsFile(),
    `${JSON.stringify({
      ts: new Date().toISOString(),
      transaction_id: evidencia.transaction_id,
      task_id: TASK,
      to_state: 'CLAIMED',
    })}\n`,
  );
  const eventosPrevios = readEvents().length;

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
  assert.equal(hasPendingRecovery(TASK), true, 'sigue bloqueada');
  assert.equal(readEvents().length, eventosPrevios, 'un rechazo no escribe evento de resolución');
  assert.deepEqual(archivados(), []);
});

test('17. SNAPSHOT_UNAVAILABLE sigue rechazando y sin registrar evento', (t) => {
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
  assert.equal(eventsForTask(TASK).length, 0);
  assert.deepEqual(archivados(), []);
});

test('block_human_decision registra su evento antes de cerrar la recuperación', (t) => {
  escenario(t);
  sembrarRecovery(TASK);

  const { task } = resolveRecovery({
    taskId: TASK,
    resolvedBy: 'ALEJANDRO',
    reason: 'no puede inferirse el estado correcto',
    confirmed: true,
    disposition: 'block_human_decision',
  });

  assert.equal(task.state, 'BLOCKED_HUMAN_DECISION');
  const evento = eventsForTask(TASK).at(-1);
  assert.equal(evento.to_state, 'BLOCKED_HUMAN_DECISION');
  assert.equal(evento.actor_type, 'human');
  assert.match(evento.note, /recovery resuelta \(block_human_decision\)/);
  assert.equal(hasPendingRecovery(TASK), false);
});

// --- la validación sigue siendo la primera puerta ---------------------------

test('una resolución sin confirmed no llega a tocar el log ni la evidencia', (t) => {
  escenario(t);
  sembrarRecovery(TASK);

  assert.equal(
    captureError(() => resolveRecovery({ taskId: TASK, resolvedBy: 'ALEJANDRO', reason: 'r' })).code,
    'CONFIRMATION_REQUIRED',
  );
  assert.equal(eventsForTask(TASK).length, 0, 'no se registró ningún evento');
  assert.equal(hasPendingRecovery(TASK), true);
  assert.deepEqual(archivados(), []);
});

// --- el ciclo completo tras una resolución exitosa --------------------------

test('tras resolver y reactivar, el ciclo de QA vuelve a funcionar de extremo a extremo', (t) => {
  const repo = escenario(t);
  sembrarRecovery(TASK);
  resolveRecovery({ taskId: TASK, resolvedBy: 'ALEJANDRO', reason: 'r', confirmed: true });

  // BLOCKED_HUMAN_DECISION -> READY es gate humano.
  transitionTask({ taskId: TASK, to: 'READY', actor: { type: 'human', id: 'ALEJANDRO' } });

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
  assert.equal(describeTaskConditions(TASK).operable, true);
});
