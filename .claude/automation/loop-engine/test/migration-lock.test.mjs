import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  acquireMigrationLock,
  readMigrationLock,
  classifyMigrationLock,
  refreshMigrationLockHeartbeat,
  releaseMigrationLock,
} from '../lib/migration-lock.mjs';
import { LockHeldError, ForeignLockError } from '../lib/lock.mjs';
import { migrationLockFile } from '../lib/paths.mjs';
import { useTempState, captureError } from './helpers.mjs';

// --- 5. migration lock acquired ----------------------------------------------

test('adquirir el cerrojo de migración crea el registro con dueño', (t) => {
  useTempState(t);
  const lock = acquireMigrationLock({ taskId: 'M-1', agentId: 'CLAUDE-02', missionId: 'CONTAIA-TEST' });
  assert.equal(lock.task_id, 'M-1');
  assert.equal(lock.agent_id, 'CLAUDE-02');
  assert.ok(lock.created_at);
  assert.deepEqual(readMigrationLock(), lock);
});

// --- 6. second migration task blocked ----------------------------------------

test('una segunda adquisición mientras el cerrojo existe falla', (t) => {
  useTempState(t);
  acquireMigrationLock({ taskId: 'M-1', agentId: 'CLAUDE-02' });
  const err = captureError(() => acquireMigrationLock({ taskId: 'M-2', agentId: 'CLAUDE-03' }));
  assert.ok(err instanceof LockHeldError);
  // El cerrojo sigue siendo de M-1: la segunda adquisición no lo pisa.
  assert.equal(readMigrationLock().task_id, 'M-1');
});

test('un único archivo global, no uno por tarea', (t) => {
  useTempState(t);
  acquireMigrationLock({ taskId: 'M-1', agentId: 'A' });
  assert.ok(migrationLockFile().endsWith('migration.lock.json'));
  assert.equal(migrationLockFile().includes('M-1'), false);
});

// --- no liberación ajena -----------------------------------------------------

test('nadie libera el cerrojo de otro sin confirmación, y agentId ajeno se rechaza', (t) => {
  useTempState(t);
  acquireMigrationLock({ taskId: 'M-1', agentId: 'CLAUDE-02' });

  assert.throws(() => releaseMigrationLock({ agentId: 'CLAUDE-02' }), /confirmación explícita/);

  const err = captureError(() => releaseMigrationLock({ agentId: 'CLAUDE-03', confirmed: true }));
  assert.ok(err instanceof ForeignLockError);
  assert.notEqual(readMigrationLock(), null);
});

test('el dueño puede liberar su propio cerrojo con confirmación', (t) => {
  useTempState(t);
  acquireMigrationLock({ taskId: 'M-1', agentId: 'CLAUDE-02' });
  assert.equal(releaseMigrationLock({ agentId: 'CLAUDE-02', confirmed: true }), true);
  assert.equal(readMigrationLock(), null);
});

// --- 7. stale migration lock requires human resolution -----------------------

test('un cerrojo sin heartbeat reciente se clasifica vencido, pero NO se libera solo', (t) => {
  useTempState(t);
  acquireMigrationLock({ taskId: 'M-1', agentId: 'CLAUDE-02' });

  const vencido = Date.now() + 46 * 60_000; // más allá de LOCK_STALE_MINUTES (45)
  const { status, lock } = classifyMigrationLock(vencido);
  assert.equal(status, 'STALE_HEARTBEAT');
  assert.equal(lock.task_id, 'M-1');

  // Clasificar no libera: sigue habiendo un cerrojo activo en disco.
  assert.notEqual(readMigrationLock(), null);
});

test('resolver un cerrojo vencido exige la misma llamada explícita que cualquier otro', (t) => {
  useTempState(t);
  acquireMigrationLock({ taskId: 'M-1', agentId: 'CLAUDE-02' });

  // Una persona, tras revisar el estado, libera conscientemente el cerrojo
  // vencido del agente original — el motor no lo hizo por su cuenta.
  const released = releaseMigrationLock({ agentId: 'CLAUDE-02', confirmed: true });
  assert.equal(released, true);
  assert.equal(classifyMigrationLock().status, 'NO_LOCK');
});

test('refrescar el heartbeat exige ser el dueño', (t) => {
  useTempState(t);
  acquireMigrationLock({ taskId: 'M-1', agentId: 'CLAUDE-02' });
  assert.throws(() => refreshMigrationLockHeartbeat('CLAUDE-03'), ForeignLockError);
  const refreshed = refreshMigrationLockHeartbeat('CLAUDE-02');
  assert.ok(refreshed.heartbeat_at);
});

test('sin cerrojo, classifyMigrationLock devuelve NO_LOCK', (t) => {
  useTempState(t);
  assert.deepEqual(classifyMigrationLock(), { status: 'NO_LOCK', lock: null });
});
