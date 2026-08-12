import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  acquireLock,
  readLock,
  releaseLock,
  refreshHeartbeat,
  withLock,
  LockHeldError,
  ForeignLockError,
} from '../lib/lock.mjs';
import { taskLockFile, locksDir } from '../lib/paths.mjs';
import { classifyClaim, findRecoverableClaims, validateCandidateEnvironment } from '../lib/recovery.mjs';
import {
  registerWorktreeOwnership,
  releaseWorktreeOwnership,
  getWorktreeOwner,
  worktreeName,
  branchNameFor,
  ensureWorktree,
  WorktreeOwnedError,
  ProtectedBranchWriteError,
  ForbiddenWorktreeLocationError,
} from '../lib/worktree.mjs';
import {
  evaluateConcurrency,
  dependencyCycle,
  touchesMigrationSurface,
  MAX_CONCURRENT_TASKS,
} from '../lib/concurrency.mjs';
import { useTempState, useTempRepo, runtimeTask, captureError } from './helpers.mjs';

// --- 3. doble claim a nivel de primitiva ------------------------------------

test('claim atómico: la segunda adquisición del mismo lock falla', (t) => {
  useTempState(t);
  const lockPath = taskLockFile('T-1');
  acquireLock(lockPath, { task_id: 'T-1', agent_id: 'A' });
  assert.throws(() => acquireLock(lockPath, { task_id: 'T-1', agent_id: 'B' }), LockHeldError);
  assert.equal(readLock(lockPath).agent_id, 'A', 'el primer dueño no se sobrescribe');
});

test('el lock registra created_at y heartbeat_at', (t) => {
  useTempState(t);
  const lock = acquireLock(taskLockFile('T-1'), { task_id: 'T-1', agent_id: 'A' });
  assert.ok(lock.created_at);
  assert.ok(lock.heartbeat_at);
});

// --- 5. ownership del lock --------------------------------------------------

test('nadie libera un lock ajeno', (t) => {
  useTempState(t);
  const lockPath = taskLockFile('T-1');
  acquireLock(lockPath, { task_id: 'T-1', agent_id: 'A' });
  assert.throws(() => releaseLock(lockPath, { agentId: 'B', confirmed: true }), ForeignLockError);
  assert.notEqual(readLock(lockPath), null, 'el lock sigue ahí');
});

test('liberar exige confirmación explícita', (t) => {
  useTempState(t);
  const lockPath = taskLockFile('T-1');
  acquireLock(lockPath, { task_id: 'T-1', agent_id: 'A' });
  assert.throws(() => releaseLock(lockPath, { agentId: 'A' }), /confirmación explícita/);
  assert.equal(releaseLock(lockPath, { agentId: 'A', confirmed: true }), true);
  assert.equal(readLock(lockPath), null);
});

test('sólo el dueño refresca el heartbeat', (t) => {
  useTempState(t);
  const lockPath = taskLockFile('T-1');
  acquireLock(lockPath, { task_id: 'T-1', agent_id: 'A' });
  assert.throws(() => refreshHeartbeat(lockPath, 'B'), ForeignLockError);
  assert.ok(refreshHeartbeat(lockPath, 'A').heartbeat_at);
});

test('withLock libera la sección crítica incluso si el cuerpo lanza', (t) => {
  useTempState(t);
  const lockPath = path.join(locksDir(), 'seccion.lock');
  assert.throws(() => withLock(lockPath, () => { throw new Error('boom'); }), /boom/);
  assert.equal(readLock(lockPath), null);
  assert.equal(withLock(lockPath, () => 'ok'), 'ok');
});

// --- recuperación: locks huérfanos ------------------------------------------

test('un lock sin heartbeat reciente es candidato a huérfano, nunca se borra', (t) => {
  useTempState(t);
  const stale = { task_id: 'T-1', agent_id: 'A', created_at: new Date(0).toISOString(), heartbeat_at: new Date(0).toISOString() };
  assert.equal(classifyClaim(stale, Date.now()), 'STALE_HEARTBEAT');

  acquireLock(taskLockFile('T-1'), { task_id: 'T-1', agent_id: 'A' });
  fs.writeFileSync(taskLockFile('T-1'), JSON.stringify(stale), 'utf8');

  const recoverable = findRecoverableClaims();
  assert.equal(recoverable.length, 1);
  assert.equal(recoverable[0].requiresHumanConfirmation, true);
  assert.notEqual(readLock(taskLockFile('T-1')), null, 'detectar no es borrar');
});

test('un lock con heartbeat fresco está ACTIVE', (t) => {
  useTempState(t);
  const fresh = { task_id: 'T', agent_id: 'A', created_at: new Date().toISOString(), heartbeat_at: new Date().toISOString() };
  assert.equal(classifyClaim(fresh, Date.now()), 'ACTIVE');
  assert.deepEqual(findRecoverableClaims(), []);
});

// --- 22. candidato ausente en el entorno ------------------------------------

test('validateCandidateEnvironment detecta worktree y commit ausentes', (t) => {
  const repo = useTempRepo(t);
  assert.deepEqual(
    validateCandidateEnvironment({
      repoPath: repo.dir,
      worktreePath: repo.dir,
      candidateCommit: repo.baseCommit,
    }),
    [],
  );
  const issues = validateCandidateEnvironment({
    repoPath: repo.dir,
    worktreePath: path.join(repo.dir, 'no-existe'),
    candidateCommit: '0000000000000000000000000000000000000000',
  });
  assert.ok(issues.includes('WORKTREE_MISSING'));
  assert.ok(issues.includes('CANDIDATE_COMMIT_MISSING'));
});

// --- worktree: ownership y ubicación prohibida ------------------------------

test('ownership: otra tarjeta no reutiliza el worktree sin cierre explícito', (t) => {
  useTempState(t);
  registerWorktreeOwnership({ taskId: 'T-1', agentId: 'A' });
  assert.doesNotThrow(() => registerWorktreeOwnership({ taskId: 'T-1', agentId: 'A' }));

  const map = getWorktreeOwner(worktreeName('T-1'));
  assert.equal(map.task_id, 'T-1');

  assert.throws(() => releaseWorktreeOwnership('T-1'), /confirmación explícita/);
  releaseWorktreeOwnership('T-1', { confirmed: true });
  assert.equal(getWorktreeOwner(worktreeName('T-1')), null);
});

test('un worktree ya poseído por otra tarjeta lanza WorktreeOwnedError', (t) => {
  useTempState(t);
  // Dos task_id que normalizan al mismo nombre de worktree.
  registerWorktreeOwnership({ taskId: 'T/1', agentId: 'A' });
  const err = captureError(() => registerWorktreeOwnership({ taskId: 'T-1', agentId: 'B' }));
  assert.ok(err instanceof WorktreeOwnedError);
});

test('la rama de tarea nunca puede ser una protegida ni salirse del prefijo', (t) => {
  const repo = useTempRepo(t);
  useTempState(t);
  assert.throws(
    () => ensureWorktree({ taskId: 'T-1', baseCommit: repo.baseCommit, branch: 'feature/frontend-ux-audit' }),
    ProtectedBranchWriteError,
  );
  assert.throws(
    () => ensureWorktree({ taskId: 'T-1', baseCommit: repo.baseCommit, branch: 'main' }),
    ProtectedBranchWriteError,
  );
  assert.throws(
    () => ensureWorktree({ taskId: 'T-1', baseCommit: repo.baseCommit, branch: 'suelta' }),
    /prefijo reservado/,
  );
  assert.equal(branchNameFor('T-1'), 'loop/t-1');
});

test('.claude/worktrees/ está prohibido como ubicación de worktree de tarea', () => {
  const err = captureError(() => {
    throw new ForbiddenWorktreeLocationError('/repo/.claude/worktrees/x');
  });
  assert.equal(err.code, 'FORBIDDEN_WORKTREE_LOCATION');
});

test('ensureWorktree exige que la base exista antes de crear nada', (t) => {
  const repo = useTempRepo(t);
  useTempState(t);
  assert.throws(() =>
    ensureWorktree({ taskId: 'T-1', baseCommit: '0000000000000000000000000000000000000000' }),
  );
  assert.equal(fs.existsSync(path.join(repo.dir, '.worktrees', 'loop', 't-1')), false);
});

// --- concurrencia -----------------------------------------------------------

test('ciclo de dependencias se detecta y bloquea', () => {
  const tasks = [
    runtimeTask({ task_id: 'A', dependencies: ['B'] }),
    runtimeTask({ task_id: 'B', dependencies: ['A'] }),
  ];
  assert.ok(dependencyCycle(tasks[0], tasks));
  const result = evaluateConcurrency(tasks[0], tasks);
  assert.equal(result.eligible, false);
  assert.ok(result.conflicts.some((c) => c.blocked_reason === 'dependency_cycle'));
});

test('el cerrojo global de migración serializa contra cualquier tarjeta activa', () => {
  const migration = runtimeTask({ task_id: 'M', allowed_write: ['packages/database/prisma/**'] });
  const other = runtimeTask({ task_id: 'O', state: 'IMPLEMENTING', allowed_write: ['apps/web/**'] });
  assert.equal(touchesMigrationSurface(migration), true);
  const result = evaluateConcurrency(migration, [migration, other]);
  assert.equal(result.eligible, false);
  assert.ok(result.conflicts.some((c) => c.check === 'MIGRATION_GLOBAL_LOCK'));
});

test('el límite de concurrencia de v1 es 2', () => {
  assert.equal(MAX_CONCURRENT_TASKS, 2);
  const candidate = runtimeTask({ task_id: 'C', allowed_write: ['z/**'] });
  const actives = [
    runtimeTask({ task_id: 'A', state: 'IMPLEMENTING', allowed_write: ['a/**'] }),
    runtimeTask({ task_id: 'B', state: 'TESTING', allowed_write: ['b/**'] }),
  ];
  const result = evaluateConcurrency(candidate, [candidate, ...actives]);
  assert.ok(result.conflicts.some((c) => c.check === 'MAX_CONCURRENCY'));
});

// Las comprobaciones §10.4 (D-XXX pendiente) y §10.5 (contrato compartido),
// declaradas NOT_IMPLEMENTED en LOOP-001, están implementadas en LOOP-002 —
// ver concurrency.test.mjs, decision-gate.test.mjs y contracts.test.mjs.
test('sin decision_refs ni reads_contract declarados, una tarjeta sola es elegible', () => {
  const task = runtimeTask({ task_id: 'A', allowed_write: ['a/**'] });
  const result = evaluateConcurrency(task, [task]);
  assert.equal(result.eligible, true);
  assert.deepEqual(result.conflicts, []);
});
