import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as dispatcherModule from '../lib/dispatcher.mjs';
import { dispatch, transitionTask, release, resume, block } from '../lib/dispatcher.mjs';
import { getOrCreateTaskState } from '../lib/store.mjs';
import { acquireLock, readLock } from '../lib/lock.mjs';
import { taskLockFile } from '../lib/paths.mjs';
import { eventsForTask, projectTaskState } from '../lib/events.mjs';
import { HumanGateRequiredError } from '../lib/state-machine.mjs';
import { getWorktreeOwner } from '../lib/worktree.mjs';
import {
  useTempState,
  useTempQueue,
  useTempRepo,
  taskDefinition,
  captureError,
} from './helpers.mjs';

function setup(t, tasks, repoOptions) {
  const repo = useTempRepo(t, repoOptions);
  useTempState(t);
  useTempQueue(
    t,
    tasks.map((task) => ({ ...task, base_commit: task.base_commit ?? repo.baseCommit })),
  );
  return repo;
}

// --- 1/2. transición válida e inválida, persistidas -------------------------

test('transición válida: persiste el estado y registra el evento', (t) => {
  setup(t, [taskDefinition()]);
  const updated = transitionTask({
    taskId: 'LOOP-TEST-001',
    to: 'BLOCKED',
    actor: { type: 'agent', id: 'CLAUDE-02' },
    reason: 'prueba',
    blockedReason: 'substrate_missing',
  });
  assert.equal(updated.state, 'BLOCKED');
  assert.equal(updated.blocked_reason, 'substrate_missing');

  const events = eventsForTask('LOOP-TEST-001');
  assert.equal(events.length, 1);
  assert.equal(events[0].from_state, 'READY');
  assert.equal(events[0].to_state, 'BLOCKED');
  assert.equal(events[0].actor_type, 'agent');
  assert.ok(events[0].ts);
});

test('transición inválida: no muta el estado ni registra evento', (t) => {
  setup(t, [taskDefinition()]);
  assert.throws(() =>
    transitionTask({ taskId: 'LOOP-TEST-001', to: 'QA', actor: { type: 'agent', id: 'A' } }),
  );
  assert.equal(getOrCreateTaskState('LOOP-TEST-001').state, 'READY');
  assert.equal(eventsForTask('LOOP-TEST-001').length, 0);
});

test('un estado BLOCKED* exige blocked_reason tipificado', (t) => {
  setup(t, [taskDefinition()]);
  assert.throws(
    () => transitionTask({ taskId: 'LOOP-TEST-001', to: 'BLOCKED', actor: { type: 'agent', id: 'A' } }),
    /blocked_reason/,
  );
  assert.throws(
    () =>
      transitionTask({
        taskId: 'LOOP-TEST-001',
        to: 'BLOCKED',
        actor: { type: 'agent', id: 'A' },
        blockedReason: 'inventado',
      }),
    /no es tipificado/,
  );
});

// --- 3. doble claim ---------------------------------------------------------

test('doble claim: un lock preexistente descarta la tarjeta sin tocarla', (t) => {
  setup(t, [taskDefinition()]);
  acquireLock(taskLockFile('LOOP-TEST-001'), { task_id: 'LOOP-TEST-001', agent_id: 'OTRO' });

  const result = dispatch({ agentId: 'CLAUDE-02' });
  assert.equal(result.dispatched, false);
  assert.equal(result.reason, 'no-eligible-task');
  assert.equal(getOrCreateTaskState('LOOP-TEST-001').state, 'READY');
  assert.equal(readLock(taskLockFile('LOOP-TEST-001')).agent_id, 'OTRO', 'el lock ajeno no se toca');
});

test('dos dispatch consecutivos: el segundo no puede reclamar la misma tarjeta', (t) => {
  setup(t, [taskDefinition()]);
  const first = dispatch({ agentId: 'CLAUDE-02' });
  assert.equal(first.dispatched, true);

  const second = dispatch({ agentId: 'CLAUDE-03' });
  assert.equal(second.dispatched, false);
  assert.equal(readLock(taskLockFile('LOOP-TEST-001')).agent_id, 'CLAUDE-02');
});

// --- 4. dependencia bloqueada -----------------------------------------------

test('dependencia no satisfecha impide el despacho', (t) => {
  setup(t, [
    taskDefinition({ task_id: 'DEP-1', state: 'BLOCKED', allowed_write: ['other/**'] }),
    taskDefinition({ task_id: 'LOOP-TEST-001', dependencies: ['DEP-1'] }),
  ]);
  const result = dispatch({ agentId: 'CLAUDE-02' });
  assert.equal(result.dispatched, false);
  assert.equal(result.reason, 'no-eligible-task');
  assert.ok(result.skipped.some((s) => s.reason === 'concurrency'));
});

test('dependencia en READY_FOR_INTEGRATION sí desbloquea', (t) => {
  setup(t, [
    taskDefinition({ task_id: 'DEP-1', state: 'READY_FOR_INTEGRATION', allowed_write: ['other/**'] }),
    taskDefinition({ task_id: 'LOOP-TEST-001', dependencies: ['DEP-1'] }),
  ]);
  const result = dispatch({ agentId: 'CLAUDE-02' });
  assert.equal(result.dispatched, true);
  assert.equal(result.task.task_id, 'LOOP-TEST-001');
});

// --- LOOP-002: una decisión D-XXX pendiente impide el despacho --------------

test('decision_refs pendiente impide el despacho, sin evidencia', (t) => {
  setup(t, [taskDefinition({ decision_refs: ['D-014'] })]);
  const result = dispatch({ agentId: 'CLAUDE-02' });
  assert.equal(result.dispatched, false);
  assert.ok(result.skipped.some((s) => s.reason === 'concurrency'));
});

test('decision_refs con evidencia aprobada, provista explícitamente, desbloquea', (t) => {
  setup(t, [taskDefinition({ decision_refs: ['D-010'] })]);
  const result = dispatch({
    agentId: 'CLAUDE-02',
    decisionEvidence: { 'D-010': { status: 'IMPLEMENTADA · PASSED' } },
  });
  assert.equal(result.dispatched, true);
});

// --- 5/6. ownership y release -----------------------------------------------

test('release desde CLAIMED: rollback limpio a READY, lock y ownership liberados', (t) => {
  setup(t, [taskDefinition()]);
  const dispatched = dispatch({ agentId: 'CLAUDE-02', autoStartImplementing: false });
  assert.equal(dispatched.task.state, 'CLAIMED');

  const released = release({ taskId: 'LOOP-TEST-001', agentId: 'CLAUDE-02', reason: 'fin' });
  assert.equal(released.state, 'READY');
  assert.equal(released.owner, null);
  assert.equal(readLock(taskLockFile('LOOP-TEST-001')), null);
  assert.equal(getWorktreeOwner('loop-test-001'), null);
  assert.equal(fs.existsSync(dispatched.worktree.dir), true, 'el worktree NO se borra');
});

test('release desde IMPLEMENTING: va a BLOCKED, no a READY, y conserva el worktree', (t) => {
  // La matriz §3.3 prohíbe IMPLEMENTING -> READY: con trabajo posiblemente
  // sin commitear, reabrir la tarjeta dejaría que otro agente reclamara un
  // worktree ajeno. Reactivarla exige humano.
  setup(t, [taskDefinition()]);
  const dispatched = dispatch({ agentId: 'CLAUDE-02' });
  assert.equal(dispatched.task.state, 'IMPLEMENTING');

  const released = release({ taskId: 'LOOP-TEST-001', agentId: 'CLAUDE-02' });
  assert.equal(released.state, 'BLOCKED');
  assert.equal(released.blocked_reason, 'agent_released_mid_flight');
  assert.equal(readLock(taskLockFile('LOOP-TEST-001')), null);
  assert.notEqual(getWorktreeOwner('loop-test-001'), null, 'el ownership se conserva');
  assert.equal(fs.existsSync(dispatched.worktree.dir), true);

  // Sólo un humano puede devolverla a READY.
  const err = captureError(() =>
    resume({ taskId: 'LOOP-TEST-001', actor: { type: 'agent', id: 'CLAUDE-02' } }),
  );
  assert.ok(err instanceof HumanGateRequiredError);
});

test('release por un agente que no posee el lock es rechazado', (t) => {
  setup(t, [taskDefinition()]);
  dispatch({ agentId: 'CLAUDE-02' });
  assert.throws(
    () => release({ taskId: 'LOOP-TEST-001', agentId: 'CLAUDE-03' }),
    /pertenece a "CLAUDE-02"/,
  );
  assert.equal(getOrCreateTaskState('LOOP-TEST-001').state, 'IMPLEMENTING');
});

// --- 7. resume --------------------------------------------------------------

test('resume por un agente es rechazado; por un humano funciona', (t) => {
  setup(t, [taskDefinition({ state: 'BLOCKED' })]);

  const err = captureError(() =>
    resume({ taskId: 'LOOP-TEST-001', actor: { type: 'agent', id: 'CLAUDE-02' } }),
  );
  assert.ok(err instanceof HumanGateRequiredError);
  assert.equal(getOrCreateTaskState('LOOP-TEST-001').state, 'BLOCKED');

  const resumed = resume({
    taskId: 'LOOP-TEST-001',
    actor: { type: 'human', id: 'ALEJANDRO' },
    reason: 'autorizado',
  });
  assert.equal(resumed.state, 'READY');
  assert.equal(eventsForTask('LOOP-TEST-001').at(-1).actor_type, 'human');
});

// --- 8/9. límites persistidos -----------------------------------------------

test('max repair: el 6º intento se rechaza y el contador no avanza', (t) => {
  setup(t, [taskDefinition()]);
  dispatch({ agentId: 'CLAUDE-02' });
  const actor = { type: 'agent', id: 'CLAUDE-02' };

  transitionTask({ taskId: 'LOOP-TEST-001', to: 'TESTING', actor });
  for (let i = 1; i <= 5; i += 1) {
    transitionTask({ taskId: 'LOOP-TEST-001', to: 'REPAIRING', actor });
    transitionTask({ taskId: 'LOOP-TEST-001', to: 'TESTING', actor });
  }
  assert.equal(getOrCreateTaskState('LOOP-TEST-001').repair_iteration, 5);

  assert.throws(() => transitionTask({ taskId: 'LOOP-TEST-001', to: 'REPAIRING', actor }));
  const after = getOrCreateTaskState('LOOP-TEST-001');
  assert.equal(after.repair_iteration, 5, 'no incrementa tras el rechazo');
  assert.equal(after.state, 'TESTING', 'el estado no cambia si la transición se rechaza');
});

// --- 27. fallo post-claim / pre-worktree ------------------------------------

test('fallo post-claim: rollback seguro a READY y liberación del propio lock', (t) => {
  // `base_commit` inexistente hace fallar `ensureWorktree` DESPUÉS del claim.
  setup(t, [taskDefinition({ base_commit: '0000000000000000000000000000000000000000' })]);

  const result = dispatch({ agentId: 'CLAUDE-02' });

  assert.equal(result.dispatched, false);
  assert.equal(result.reason, 'claim-setup-failed');
  assert.equal(result.recovery.rolledBack, true);

  const task = getOrCreateTaskState('LOOP-TEST-001');
  assert.equal(task.state, 'READY', 'no queda CLAIMED indefinidamente');
  assert.equal(task.owner, null);
  assert.equal(readLock(taskLockFile('LOOP-TEST-001')), null, 'el propio lock se liberó');

  // La tarjeta vuelve a ser reclamable una vez corregida la causa.
  const states = eventsForTask('LOOP-TEST-001').map((e) => e.to_state);
  assert.deepEqual(states, ['CLAIMED', 'READY']);
});

test('fallo post-claim por sustrato ausente: rollback y motivo tipificado', (t) => {
  setup(t, [taskDefinition()], { withSubstrate: false });

  const result = dispatch({ agentId: 'CLAUDE-02' });
  assert.equal(result.dispatched, false);
  assert.equal(result.blocked_reason, 'substrate_missing');
  assert.equal(getOrCreateTaskState('LOOP-TEST-001').state, 'READY');
});

// --- 28. sin integración automática ------------------------------------------

test('el dispatcher no expone ninguna función de integrar/merge/push', () => {
  const exported = Object.keys(dispatcherModule);
  for (const forbidden of ['integrate', 'merge', 'push', 'mergeToMain', 'cherryPick', 'rebase']) {
    assert.equal(exported.includes(forbidden), false, `no debe exportar "${forbidden}"`);
  }
});

test('el código del dispatcher no invoca git ni comandos de integración', async () => {
  const source = fs.readFileSync(new URL('../lib/dispatcher.mjs', import.meta.url), 'utf8');
  assert.equal(source.includes('child_process'), false);
  for (const forbidden of ["'push'", "'merge'", "'rebase'", "'cherry-pick'"]) {
    assert.equal(source.includes(forbidden), false, `no debe contener ${forbidden}`);
  }
});

test('alcanzar READY_FOR_INTEGRATION no dispara integración ni permite avanzar solo', (t) => {
  setup(t, [taskDefinition()]);
  dispatch({ agentId: 'CLAUDE-02' });
  const actor = { type: 'agent', id: 'CLAUDE-02' };

  transitionTask({ taskId: 'LOOP-TEST-001', to: 'TESTING', actor });
  transitionTask({ taskId: 'LOOP-TEST-001', to: 'READY_FOR_QA', actor });
  transitionTask({ taskId: 'LOOP-TEST-001', to: 'QA', actor });
  const done = transitionTask({ taskId: 'LOOP-TEST-001', to: 'READY_FOR_INTEGRATION', actor });

  assert.equal(done.state, 'READY_FOR_INTEGRATION');
  const err = captureError(() =>
    transitionTask({ taskId: 'LOOP-TEST-001', to: 'INTEGRATING', actor }),
  );
  assert.ok(err instanceof HumanGateRequiredError);
});

// --- recuperación: proyección desde el log ----------------------------------

test('el estado se reconstruye reproduciendo events.jsonl', (t) => {
  setup(t, [taskDefinition()]);
  dispatch({ agentId: 'CLAUDE-02' });
  transitionTask({
    taskId: 'LOOP-TEST-001',
    to: 'TESTING',
    actor: { type: 'agent', id: 'CLAUDE-02' },
  });

  const live = getOrCreateTaskState('LOOP-TEST-001');
  const projected = projectTaskState('LOOP-TEST-001');
  assert.equal(projected.state, live.state);
  assert.equal(projected.repair_iteration, live.repair_iteration);
  assert.equal(projected.qa_iteration, live.qa_iteration);
});

test('block exige motivo y lo registra en el evento', (t) => {
  setup(t, [taskDefinition()]);
  assert.throws(() => block({ taskId: 'LOOP-TEST-001', actor: { type: 'agent', id: 'A' } }), /reason/);
  const blocked = block({
    taskId: 'LOOP-TEST-001',
    actor: { type: 'agent', id: 'A' },
    reason: 'contradice D-007',
    blockedReason: 'unclassified',
  });
  assert.equal(blocked.state, 'BLOCKED');
  assert.equal(eventsForTask('LOOP-TEST-001').at(-1).note, 'contradice D-007');
});

// --- worktree en la ubicación canónica --------------------------------------

test('el worktree se crea en .worktrees/loop/, nunca en .claude/worktrees/', (t) => {
  const repo = setup(t, [taskDefinition()]);
  const result = dispatch({ agentId: 'CLAUDE-02' });

  const dir = result.worktree.dir.replace(/\\/g, '/');
  assert.ok(dir.includes('/.worktrees/loop/'), `ruta inesperada: ${dir}`);
  assert.equal(dir.includes('/.claude/worktrees/'), false);
  assert.equal(result.worktree.branch, 'loop/loop-test-001');
  assert.equal(fs.existsSync(path.join(repo.dir, '.worktrees', 'loop', 'loop-test-001')), true);
});

test('la rama de tarea nunca es una rama protegida', (t) => {
  setup(t, [taskDefinition()]);
  const result = dispatch({ agentId: 'CLAUDE-02' });
  assert.notEqual(result.worktree.branch, 'feature/frontend-ux-audit');
  assert.notEqual(result.worktree.branch, 'main');
  assert.ok(result.worktree.branch.startsWith('loop/'));
});
