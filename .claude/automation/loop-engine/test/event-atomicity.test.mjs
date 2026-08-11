import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  appendEvent,
  appendEvents,
  readEvents,
  eventsForTask,
  withEventLogLock,
} from '../lib/events.mjs';
import { commitTransaction, StaleTransactionError, RecoveryRequiredError } from '../lib/transaction.mjs';
import { submitHandoff, runQa } from '../lib/qa-session.mjs';
import { dispatch, transitionTask } from '../lib/dispatcher.mjs';
import { readTaskState } from '../lib/store.mjs';
import { eventsFile, stateDir } from '../lib/paths.mjs';
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

const LIB = path.dirname(fileURLToPath(new URL('../lib/events.mjs', import.meta.url)));
const TASK = 'LOOP-TEST-001';
const IMPL = 'CLAUDE-02';
const AUDITOR = 'CODEX-01';
const CANDIDATE = 'c0ffee1';

function readyForQa(t) {
  const repo = useTempRepo(t);
  const stateDirPath = useTempState(t);
  useTempQueue(t, [taskDefinition({ base_commit: repo.baseCommit })]);

  assert.equal(dispatch({ agentId: IMPL, missionId: 'CONTAIA-TEST' }).dispatched, true);
  const actor = { type: 'agent', id: IMPL };
  transitionTask({ taskId: TASK, to: 'TESTING', actor });
  transitionTask({ taskId: TASK, to: 'READY_FOR_QA', actor, commit: CANDIDATE });
  return { repo, stateDirPath };
}

const evidencia = () => handoff({ implementerId: IMPL, candidateCommit: CANDIDATE });

/** Deja el log de solo lectura: el append falla, el contenido se conserva. */
function bloquearLog() {
  fs.chmodSync(eventsFile(), 0o444);
  return () => fs.chmodSync(eventsFile(), 0o666);
}

// --- 1/15. concurrencia real entre procesos ---------------------------------

test('dos procesos escriben eventos a la vez: sobreviven todos y sin corrupción', async (t) => {
  const dir = useTempState(t);

  const script = `
    const { appendEvent } = await import(${JSON.stringify(
      pathToFileURL(path.join(LIB, 'events.mjs')).href,
    )});
    for (let i = 0; i < 25; i += 1) {
      appendEvent({ task_id: process.env.TASK, from_state: 'A', to_state: 'B', note: String(i) });
    }
  `;

  const lanzar = (taskId) =>
    new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['--input-type=module', '-e', script], {
        env: { ...process.env, LOOP_ENGINE_STATE_DIR: dir, TASK: taskId },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stderr = '';
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
      });
      child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(stderr))));
    });

  await Promise.all([lanzar('TAREA-A'), lanzar('TAREA-B'), lanzar('TAREA-C')]);

  // 14. cada línea sigue siendo JSON válido: ninguna escritura se entrelazó.
  const lineas = fs.readFileSync(eventsFile(), 'utf8').split('\n').filter(Boolean);
  assert.equal(lineas.length, 75, 'no se pierde ni se duplica ningún evento');
  for (const linea of lineas) assert.doesNotThrow(() => JSON.parse(linea));

  for (const taskId of ['TAREA-A', 'TAREA-B', 'TAREA-C']) {
    assert.equal(eventsForTask(taskId).length, 25, `${taskId} conserva sus 25 eventos`);
  }
});

// --- 2/7. el evento ajeno sobrevive al fallo de QA --------------------------

test('un evento de otra tarjeta sobrevive al fallo de una sesión de QA', (t) => {
  readyForQa(t);
  submitHandoff({ taskId: TASK, implementerId: IMPL, handoff: evidencia() });

  // La otra tarjeta registra su evento válido ANTES de que QA falle: es
  // exactamente el evento que el rollback por truncado hacía desaparecer.
  appendEvent({ task_id: 'OTRA-TAREA', from_state: 'READY', to_state: 'CLAIMED', note: 'ajeno' });
  const historialPrevio = readEvents();

  const desbloquear = bloquearLog();
  const err = captureError(() =>
    runQa({ taskId: TASK, auditorId: AUDITOR, auditResult: auditResult({ auditorId: AUDITOR }) }),
  );
  desbloquear();

  assert.ok(err, 'la persistencia de eventos debe fallar');
  assert.equal(eventsForTask('OTRA-TAREA').length, 1, 'el evento ajeno sigue ahí');
  assert.deepEqual(readEvents(), historialPrevio, 'el log no perdió ni una línea');
});

// --- 3/4. no se trunca, ni siquiera el propio log ---------------------------

test('el fallo de QA no trunca events.jsonl', (t) => {
  readyForQa(t);
  submitHandoff({ taskId: TASK, implementerId: IMPL, handoff: evidencia() });

  const tamanoPrevio = fs.statSync(eventsFile()).size;
  const desbloquear = bloquearLog();
  captureError(() =>
    runQa({ taskId: TASK, auditorId: AUDITOR, auditResult: auditResult({ auditorId: AUDITOR }) }),
  );
  desbloquear();

  assert.equal(fs.statSync(eventsFile()).size, tamanoPrevio, 'el archivo no encoge');
});

test('el código de producción no trunca el event log en ningún punto', () => {
  const fuentes = fuentesDeProduccion();
  for (const [archivo, contenido] of fuentes) {
    assert.doesNotMatch(contenido, /truncateSync|ftruncate|truncate\(/, `${archivo} no debe truncar`);
  }
});

// --- 5. una sola API de escritura -------------------------------------------

test('todos los writers del event log pasan por la API común', () => {
  const escritores = fuentesDeProduccion().filter(([, contenido]) =>
    /appendFileSync|createWriteStream/.test(contenido),
  );
  assert.deepEqual(
    escritores.map(([archivo]) => archivo),
    ['lib/events.mjs'],
    'sólo events.mjs puede escribir el log',
  );

  // Y dentro de events.mjs, un único punto.
  const events = fs.readFileSync(path.join(LIB, 'events.mjs'), 'utf8');
  assert.equal(
    (events.match(/fs\.appendFileSync\(/g) ?? []).length,
    1,
    'la llamada de escritura aparece exactamente una vez',
  );
});

function fuentesDeProduccion() {
  const raiz = path.dirname(LIB);
  const archivos = fs
    .readdirSync(LIB)
    .filter((f) => f.endsWith('.mjs'))
    .map((f) => [`lib/${f}`, path.join(LIB, f)]);
  archivos.push(['cli.mjs', path.join(raiz, 'cli.mjs')]);
  return archivos.map(([nombre, ruta]) => [nombre, fs.readFileSync(ruta, 'utf8')]);
}

// --- 6. si el estado no se persiste, no hay eventos -------------------------

test('si el paso de estado falla, ningún evento de esa transacción aparece', (t) => {
  readyForQa(t);
  const eventosPrevios = readEvents().length;

  // La transacción se validó contra un estado que ya no es el actual.
  const err = captureError(() =>
    commitTransaction({
      taskId: TASK,
      from: 'IMPLEMENTING',
      changes: { state: 'TESTING' },
      events: [{ task_id: TASK, from_state: 'IMPLEMENTING', to_state: 'TESTING' }],
    }),
  );

  assert.ok(err instanceof StaleTransactionError);
  assert.equal(readEvents().length, eventosPrevios, 'no se escribió ningún evento');
  assert.equal(readTaskState(TASK).state, 'READY_FOR_QA', 'el estado no se movió');
});

// --- 8/9/10. fallo del append: estado restaurado, evidencia intacta ---------

test('si el append falla, el estado se restaura y el handoff sigue válido', (t) => {
  readyForQa(t);
  const { handoff: registro } = submitHandoff({
    taskId: TASK,
    implementerId: IMPL,
    handoff: evidencia(),
  });

  const desbloquear = bloquearLog();
  const err = captureError(() =>
    runQa({ taskId: TASK, auditorId: AUDITOR, auditResult: auditResult({ auditorId: AUDITOR }) }),
  );
  desbloquear();

  assert.ok(err);
  const estado = readTaskState(TASK);
  assert.equal(estado.state, 'READY_FOR_QA', 'el estado vuelve a donde estaba');
  assert.equal(estado.qa_owner, null, 'no queda qa_owner huérfano');
  assert.equal(estado.qa_result, null, 'no queda qa_result parcial');
  assert.deepEqual(estado.qa_handoff, registro, 'el handoff no se consume a medias');

  // Y la sesión se puede repetir en cuanto el log vuelve a ser escribible.
  const reintento = runQa({
    taskId: TASK,
    auditorId: AUDITOR,
    auditResult: auditResult({ auditorId: AUDITOR }),
  });
  assert.equal(reintento.state, 'READY_FOR_INTEGRATION');
});

test('si además falla la restauración del estado: RecoveryRequiredError con evidencia', (t) => {
  readyForQa(t);
  submitHandoff({ taskId: TASK, implementerId: IMPL, handoff: evidencia() });

  // El append falla y, acto seguido, la escritura de estado deja de
  // funcionar: es la única ruta que el motor no puede deshacer solo.
  const desbloquear = bloquearLog();
  const original = fs.renameSync;
  let llamadas = 0;
  t.mock.method(fs, 'renameSync', (...args) => {
    llamadas += 1;
    if (llamadas > 1) throw new Error('disco de estado no disponible');
    return original.apply(fs, args);
  });

  const err = captureError(() =>
    runQa({ taskId: TASK, auditorId: AUDITOR, auditResult: auditResult({ auditorId: AUDITOR }) }),
  );
  t.mock.restoreAll();
  desbloquear();

  assert.ok(err instanceof RecoveryRequiredError, `se esperaba RecoveryRequiredError: ${err.message}`);
  assert.equal(err.code, 'RECOVERY_REQUIRED');

  const evidencia_ = path.join(stateDir(), 'recovery', `${TASK}.json`);
  assert.equal(fs.existsSync(evidencia_), true, 'la evidencia queda en disco');
  const guardada = JSON.parse(fs.readFileSync(evidencia_, 'utf8'));
  assert.equal(guardada.state_snapshot.state, 'READY_FOR_QA');
  assert.ok(guardada.pending_events.length > 0, 'los eventos no escritos quedan registrados');
});

// --- 11/12/13. los flujos auditados siguen intactos, ahora en una transacción

test('PASSED: los eventos del ciclo comparten transaction_id', (t) => {
  readyForQa(t);
  submitHandoff({ taskId: TASK, implementerId: IMPL, handoff: evidencia() });
  const result = runQa({
    taskId: TASK,
    auditorId: AUDITOR,
    auditResult: auditResult({ auditorId: AUDITOR }),
  });

  assert.equal(result.state, 'READY_FOR_INTEGRATION');
  const delCiclo = eventsForTask(TASK).filter((e) => e.transaction_id === result.transactionId);
  assert.deepEqual(
    delCiclo.map((e) => `${e.from_state}->${e.to_state}`),
    ['READY_FOR_QA->QA', 'QA->READY_FOR_INTEGRATION'],
  );
});

test('REQUIRES_CHANGES sigue llevando a QA_FAILED en una sola transacción', (t) => {
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
  assert.equal(readTaskState(TASK).state, 'QA_FAILED');
  const delCiclo = eventsForTask(TASK).filter((e) => e.transaction_id === result.transactionId);
  assert.equal(delCiclo.length, 2, 'entrada a QA y salida a QA_FAILED, juntas');
});

test('PASSED contradictorio: los dos saltos del escalamiento entran juntos', (t) => {
  readyForQa(t);
  submitHandoff({ taskId: TASK, implementerId: IMPL, handoff: evidencia() });
  const result = runQa({
    taskId: TASK,
    auditorId: AUDITOR,
    auditResult: auditResult({ auditorId: AUDITOR, findings: [finding('CRÍTICO')] }),
  });

  assert.equal(result.state, 'BLOCKED_ARCHITECTURE');
  const delCiclo = eventsForTask(TASK).filter((e) => e.transaction_id === result.transactionId);
  assert.deepEqual(
    delCiclo.map((e) => `${e.from_state}->${e.to_state}`),
    ['READY_FOR_QA->QA', 'QA->QA_FAILED', 'QA_FAILED->BLOCKED_ARCHITECTURE'],
  );
});

// --- 14. el log sigue siendo JSONL válido -----------------------------------

test('un grupo de eventos entra entero y con el mismo transaction_id', (t) => {
  useTempState(t);
  const registros = appendEvents([
    { task_id: 'T-1', from_state: 'READY', to_state: 'CLAIMED' },
    { task_id: 'T-1', from_state: 'CLAIMED', to_state: 'IMPLEMENTING' },
  ]);

  assert.equal(registros[0].transaction_id, registros[1].transaction_id);
  assert.notEqual(registros[0].transaction_id, null);

  const lineas = fs.readFileSync(eventsFile(), 'utf8').split('\n').filter(Boolean);
  assert.equal(lineas.length, 2);
  for (const linea of lineas) assert.doesNotThrow(() => JSON.parse(linea));
});

test('appendEvent suelto también toma el lock global', (t) => {
  useTempState(t);
  // Si el lock global no fuese reentrante-seguro por diseño, sostenerlo y
  // volver a escribir colgaría; la prueba fija que nadie anide la sección.
  withEventLogLock(() => {
    assert.equal(fs.existsSync(path.join(stateDir(), 'events.lock')), true);
  });
  assert.equal(fs.existsSync(path.join(stateDir(), 'events.lock')), false, 'se libera al salir');

  appendEvent({ task_id: 'T-1', from_state: 'READY', to_state: 'CLAIMED' });
  assert.equal(readEvents().length, 1);
});
