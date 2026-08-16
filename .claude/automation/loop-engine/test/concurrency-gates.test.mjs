import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateConcurrency,
  transitiveDependencyClosure,
  dependencyCycle,
  unmetDependencies,
  fileOverlapConflicts,
  migrationLockConflicts,
  touchesMigrationSurface,
  MAX_CONCURRENT_TASKS,
} from '../lib/concurrency.mjs';
import { acquireMigrationLock } from '../lib/migration-lock.mjs';
import { useTempState, runtimeTask } from './helpers.mjs';

const SATISFIED = 'READY_FOR_INTEGRATION';

// --- 1. direct dependency blocked --------------------------------------------

test('una dependencia directa no satisfecha bloquea', () => {
  const a = runtimeTask({ task_id: 'A', dependencies: ['B'] });
  const b = runtimeTask({ task_id: 'B', state: 'IMPLEMENTING' });
  const closure = transitiveDependencyClosure(a, [a, b]);
  assert.deepEqual(closure.unmet, ['B']);

  const result = evaluateConcurrency(a, [a, b]);
  assert.equal(result.eligible, false);
  assert.ok(result.conflicts.some((c) => c.check === 'UNMET_DEPENDENCIES' && c.unmet.includes('B')));
});

test('una dependencia directa satisfecha no bloquea', () => {
  const a = runtimeTask({ task_id: 'A', dependencies: ['B'] });
  const b = runtimeTask({ task_id: 'B', state: SATISFIED });
  assert.deepEqual(unmetDependencies(a, [a, b]), []);
});

// --- 2. transitive dependency blocked ----------------------------------------

test('A depende de B, B depende de C: C sin cerrar bloquea a A aunque B esté satisfecho', () => {
  const a = runtimeTask({ task_id: 'A', dependencies: ['B'] });
  const b = runtimeTask({ task_id: 'B', state: SATISFIED, dependencies: ['C'] });
  const c = runtimeTask({ task_id: 'C', state: 'TESTING' });

  const closure = transitiveDependencyClosure(a, [a, b, c]);
  assert.deepEqual(closure.unmet, ['C'], 'B está satisfecha; sólo C debe reportarse');

  const result = evaluateConcurrency(a, [a, b, c]);
  assert.equal(result.eligible, false);
  assert.ok(result.conflicts.some((conf) => conf.check === 'UNMET_DEPENDENCIES' && conf.unmet.includes('C')));
});

test('cadena de cuatro niveles: el bloqueo más profundo se propaga hasta la raíz', () => {
  const a = runtimeTask({ task_id: 'A', dependencies: ['B'] });
  const b = runtimeTask({ task_id: 'B', state: SATISFIED, dependencies: ['C'] });
  const c = runtimeTask({ task_id: 'C', state: SATISFIED, dependencies: ['D'] });
  const d = runtimeTask({ task_id: 'D', state: 'REPAIRING' });

  const closure = transitiveDependencyClosure(a, [a, b, c, d]);
  assert.deepEqual(closure.unmet, ['D']);
});

// --- 3. valid transitive chain ------------------------------------------------

test('cadena transitiva completamente satisfecha no bloquea', () => {
  const a = runtimeTask({ task_id: 'A', dependencies: ['B'] });
  const b = runtimeTask({ task_id: 'B', state: SATISFIED, dependencies: ['C'] });
  const c = runtimeTask({ task_id: 'C', state: 'INTEGRATED', dependencies: ['D'] });
  const d = runtimeTask({ task_id: 'D', state: 'PASSED' });

  const closure = transitiveDependencyClosure(a, [a, b, c, d]);
  assert.deepEqual(closure.unmet, []);
  assert.deepEqual(closure.malformed, []);

  const result = evaluateConcurrency(a, [a, b, c, d]);
  assert.equal(result.eligible, true);
});

// --- 4. dependency cycle -------------------------------------------------------

test('un ciclo A->B->A se detecta y bloquea', () => {
  const tasks = [
    runtimeTask({ task_id: 'A', dependencies: ['B'] }),
    runtimeTask({ task_id: 'B', dependencies: ['A'] }),
  ];
  assert.ok(dependencyCycle(tasks[0], tasks));
  const result = evaluateConcurrency(tasks[0], tasks);
  assert.equal(result.eligible, false);
  assert.ok(result.conflicts.some((c) => c.blocked_reason === 'dependency_cycle'));
});

test('un ciclo largo (A->B->C->A) también se detecta', () => {
  const tasks = [
    runtimeTask({ task_id: 'A', dependencies: ['B'] }),
    runtimeTask({ task_id: 'B', dependencies: ['C'] }),
    runtimeTask({ task_id: 'C', dependencies: ['A'] }),
  ];
  const cycle = dependencyCycle(tasks[0], tasks);
  assert.ok(cycle);
  assert.ok(cycle.includes('A') && cycle.includes('B') && cycle.includes('C'));
});

test('un ciclo no impide que transitiveDependencyClosure termine (visited evita el bucle infinito)', () => {
  const tasks = [
    runtimeTask({ task_id: 'A', dependencies: ['B'] }),
    runtimeTask({ task_id: 'B', dependencies: ['A'] }),
  ];
  // Llamar directamente, sin pasar antes por dependencyCycle: no debe colgarse.
  const closure = transitiveDependencyClosure(tasks[0], tasks);
  assert.ok(Array.isArray(closure.visited));
});

// --- DAG malformado: fail closed ---------------------------------------------

test('una dependencia que referencia un task_id inexistente falla cerrado', () => {
  const a = runtimeTask({ task_id: 'A', dependencies: ['FANTASMA'] });
  const closure = transitiveDependencyClosure(a, [a]);
  assert.deepEqual(closure.malformed, ['FANTASMA']);
  assert.deepEqual(closure.unmet, ['FANTASMA'], 'una referencia rota nunca se interpreta como satisfecha');

  const result = evaluateConcurrency(a, [a]);
  assert.equal(result.eligible, false);
  assert.ok(result.conflicts.some((c) => c.check === 'DEPENDENCY_MALFORMED'));
});

test('una referencia rota en un nivel profundo de la cadena también se reporta', () => {
  const a = runtimeTask({ task_id: 'A', dependencies: ['B'] });
  const b = runtimeTask({ task_id: 'B', state: SATISFIED, dependencies: ['FANTASMA'] });
  const closure = transitiveDependencyClosure(a, [a, b]);
  assert.deepEqual(closure.malformed, ['FANTASMA']);
});

// --- 13/14. regresión: colisión de archivos y de globs siguen funcionando ----

test('13. colisión de archivos por allowed_write exacto sigue detectándose', () => {
  const a = runtimeTask({ task_id: 'A', state: 'IMPLEMENTING', allowed_write: ['src/a.ts'] });
  const b = runtimeTask({ task_id: 'B', allowed_write: ['src/a.ts'] });
  assert.equal(fileOverlapConflicts(b, [a, b]).length, 1);
});

test('14. colisión por glob (allowed_write con **) sigue detectándose', () => {
  const a = runtimeTask({ task_id: 'A', state: 'IMPLEMENTING', allowed_write: ['apps/api/**'] });
  const b = runtimeTask({ task_id: 'B', allowed_write: ['apps/api/src/x.ts'] });
  assert.equal(fileOverlapConflicts(b, [a, b]).length, 1);
});

// --- 5/6. migration lock: adquirido y bloquea a un segundo -------------------

test('5/6. una tarjeta de migración con el cerrojo ya tomado por otra bloquea', (t) => {
  useTempState(t);
  acquireMigrationLock({ taskId: 'M-1', agentId: 'CLAUDE-02' });

  const m2 = runtimeTask({
    task_id: 'M-2',
    allowed_write: ['packages/database/prisma/schema.prisma'],
  });
  assert.equal(touchesMigrationSurface(m2), true);

  const conflicts = migrationLockConflicts(m2, [m2]);
  assert.ok(conflicts.some((c) => c.check === 'MIGRATION_LOCK_HELD' && c.with === 'M-1'));

  const result = evaluateConcurrency(m2, [m2]);
  assert.equal(result.eligible, false);
});

test('el cerrojo persistido bloquea aunque el dueño no aparezca en la lista de tareas activas', (t) => {
  useTempState(t);
  acquireMigrationLock({ taskId: 'M-1', agentId: 'CLAUDE-02' });

  const m2 = runtimeTask({ task_id: 'M-2', allowed_write: ['packages/database/prisma/**'] });
  // M-1 no está en absoluto en `tasks`: el cerrojo es la fuente de verdad,
  // no un derivado del barrido de estado activo.
  const conflicts = migrationLockConflicts(m2, [m2]);
  assert.ok(conflicts.some((c) => c.check === 'MIGRATION_LOCK_HELD'));
});

// --- 7. stale migration lock requires human --------------------------------

test('7. un cerrojo de migración vencido sigue bloqueando la elegibilidad', (t) => {
  useTempState(t);
  acquireMigrationLock({ taskId: 'M-1', agentId: 'CLAUDE-02' });
  // No hay forma de "envejecer" el reloj real sin tocarlo; se confirma el
  // caso ACTIVE aquí y el caso STALE_HEARTBEAT en migration-lock.test.mjs,
  // que ejercita classifyMigrationLock con un `now` desplazado. Lo que
  // concurrency.mjs garantiza es que, exista o no vencimiento, el cerrojo
  // JAMÁS se trata como libre por su cuenta.
  const m2 = runtimeTask({ task_id: 'M-2', allowed_write: ['packages/database/prisma/**'] });
  const conflict = migrationLockConflicts(m2, [m2]).find((c) => c.check === 'MIGRATION_LOCK_HELD');
  assert.ok(conflict);
  assert.equal(conflict.requires_human_resolution, false, 'ACTIVE: aún no vencido');
});

test('una tarjeta que NO toca migración no se ve afectada por el cerrojo', (t) => {
  useTempState(t);
  acquireMigrationLock({ taskId: 'M-1', agentId: 'CLAUDE-02' });
  const web = runtimeTask({ task_id: 'W', allowed_write: ['apps/web/**'] });
  assert.deepEqual(migrationLockConflicts(web, [web]), []);
});

// --- regresión: cerrojo global de migración por barrido de estado (LOOP-001) -

test('el cerrojo global de migración sigue serializando contra cualquier tarjeta activa', () => {
  const migration = runtimeTask({ task_id: 'M', allowed_write: ['packages/database/prisma/**'] });
  const other = runtimeTask({ task_id: 'O', state: 'IMPLEMENTING', allowed_write: ['apps/web/**'] });
  const result = evaluateConcurrency(migration, [migration, other]);
  assert.equal(result.eligible, false);
  assert.ok(result.conflicts.some((c) => c.check === 'MIGRATION_GLOBAL_LOCK'));
});

// --- 15. stale base still blocks (regresión, comprobado en integration-readiness.test.mjs)

// --- 16/17/18. gates humanos, no auto-PASSED, no auto-integración -----------
// Ya cubiertos como regresión estructural por state-machine.test.mjs
// ("el motor no puede alcanzar PASSED, INTEGRATING ni INTEGRATED por sí
// mismo", "BLOCKED -> READY exige gate humano"), que no dependen de código
// tocado por LOOP-002 y siguen verdes en la suite completa.

// --- límite de concurrencia intacto ------------------------------------------

test('el límite de concurrencia de v1 sigue siendo 2', () => {
  assert.equal(MAX_CONCURRENT_TASKS, 2);
  const candidate = runtimeTask({ task_id: 'C', allowed_write: ['z/**'] });
  const actives = [
    runtimeTask({ task_id: 'A', state: 'IMPLEMENTING', allowed_write: ['a/**'] }),
    runtimeTask({ task_id: 'B', state: 'TESTING', allowed_write: ['b/**'] }),
  ];
  const result = evaluateConcurrency(candidate, [candidate, ...actives]);
  assert.ok(result.conflicts.some((c) => c.check === 'MAX_CONCURRENCY'));
});

// --- decision gate y contrato compartido integrados en evaluateConcurrency --

test('evaluateConcurrency bloquea por decision_refs pendiente', () => {
  const a = runtimeTask({ task_id: 'A', decision_refs: ['D-014'] });
  const result = evaluateConcurrency(a, [a], { decisionEvidence: {} });
  assert.equal(result.eligible, false);
  assert.ok(result.conflicts.some((c) => c.check === 'PENDING_DECISION_GATE'));
});

test('evaluateConcurrency permite con decision_refs aprobado', () => {
  const a = runtimeTask({ task_id: 'A', decision_refs: ['D-010'] });
  const result = evaluateConcurrency(a, [a], {
    decisionEvidence: { 'D-010': { status: 'IMPLEMENTADA · PASSED' } },
  });
  assert.equal(result.eligible, true);
});

test('evaluateConcurrency bloquea por colisión de contrato compartido', () => {
  const a = runtimeTask({ task_id: 'A', state: 'IMPLEMENTING', allowed_write: ['apps/api/dto.ts'] });
  const b = runtimeTask({
    task_id: 'B',
    allowed_write: ['apps/web/client.ts'],
    reads_contract: ['apps/api/dto.ts'],
  });
  const result = evaluateConcurrency(b, [a, b]);
  assert.equal(result.eligible, false);
  assert.ok(result.conflicts.some((c) => c.check === 'SHARED_CONTRACT'));
});
