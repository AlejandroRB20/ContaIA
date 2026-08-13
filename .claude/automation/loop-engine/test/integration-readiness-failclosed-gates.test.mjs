import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateIntegrationReadiness } from '../lib/integration-readiness.mjs';
import { acquireMigrationLock } from '../lib/migration-lock.mjs';
import { handoff, auditResult, useTempRepo, useTempState, commitFiles } from './helpers.mjs';

/**
 * Reauditoría de `LOOP-002`, hallazgo ALTO: `evaluateIntegrationReadiness()`
 * calculaba correctamente `dependency_conflict`, `pending_decision`,
 * `migration_lock`, `shared_contract_collision` y `stale_base`, pero
 * permitía que cualquiera de ellas conviviera con `ready: true` — el gate
 * calculaba la condición y luego la ignoraba.
 *
 * **Por qué exactamente estas cinco y no otras.** Cada una tiene un
 * `blocked_reason` (`dependency_cycle`, `dependency_transitive_unmet`,
 * `dependency_malformed`, `pending_decision`, `migration_lock_held`,
 * `migration_lock_stale`, `shared_contract_collision`, `stale_base`) que
 * aparece en `BLOCKED_REASONS` (`constants.mjs`) — el mismo vocabulario
 * tipificado que el resto del motor usa para mover una tarjeta a
 * `BLOCKED*`. `file_collision`/`glob_overlap` NO aparecen ahí: siguen
 * siendo predicción informativa, igual que `predicted_conflicts` del diff
 * de Git (§14) — advierten a quien integra, no impiden legalmente
 * continuar. Esta suite fija ambos lados de la distinción.
 */

const TASK = 'LOOP-TEST-001';

/** Escenario base: repo real, candidato que toca `src/a.ts`, contrato limpio. */
function scenario(t, { taskOverrides = {}, files = { 'src/a.ts': 'candidato\n' } } = {}) {
  const repo = useTempRepo(t);
  const candidate = commitFiles(repo.dir, files);
  const contract = {
    task_id: TASK,
    mission_id: 'CONTAIA-TEST',
    base_commit: repo.baseCommit,
    allowed_write: ['src/**'],
    forbidden_scope: ['packages/database/**'],
    dependencies: [],
    decision_refs: [],
    reads_contract: [],
    ...taskOverrides,
  };
  const evidence = handoff({
    candidateCommit: candidate,
    baseCommit: repo.baseCommit,
    changedFiles: Object.keys(files),
  });
  // targetRef fijo en la base: sin esto, el default ('HEAD') apuntaría al
  // propio candidato en este repositorio de una sola rama, y stale_base
  // detectaría drift real — ruido ajeno al gate que cada prueba ejercita.
  return { repo, candidate, contract, evidence, git: { repoPath: repo.dir, targetRef: repo.baseCommit } };
}

const blockerCodes = (result) => result.blockers.map((b) => b.code);

// --- 1. dependencia incumplida: detected=true, ready=false ------------------

test('1. dependencia incumplida bloquea ready (gate normativo)', (t) => {
  const s = scenario(t, { taskOverrides: { dependencies: ['B'] } });
  const tasks = [s.contract, { task_id: 'B', state: 'IMPLEMENTING', dependencies: [] }];

  const result = evaluateIntegrationReadiness(s.evidence, auditResult(), s.contract, { ...s.git, tasks });

  assert.equal(result.ready, false);
  assert.equal(result.manifest, null);
  assert.ok(blockerCodes(result).includes('DEPENDENCY_CONFLICT'));
  assert.ok(result.reasons.some((r) => r.includes('B')));
});

test('1b. dependencia satisfecha (READY_FOR_INTEGRATION) no bloquea', (t) => {
  const s = scenario(t, { taskOverrides: { dependencies: ['B'] } });
  const tasks = [s.contract, { task_id: 'B', state: 'READY_FOR_INTEGRATION', dependencies: [] }];

  const result = evaluateIntegrationReadiness(s.evidence, auditResult(), s.contract, { ...s.git, tasks });

  assert.equal(result.ready, true);
  assert.equal(result.manifest.conflict_prediction.dependency_conflict.detected, false);
});

test('1c. ciclo de dependencias también bloquea, con su propio código', (t) => {
  const s = scenario(t, { taskOverrides: { dependencies: ['B'] } });
  const tasks = [s.contract, { task_id: 'B', state: 'IMPLEMENTING', dependencies: [TASK] }];

  const result = evaluateIntegrationReadiness(s.evidence, auditResult(), s.contract, { ...s.git, tasks });

  assert.equal(result.ready, false);
  assert.ok(blockerCodes(result).includes('DEPENDENCY_CONFLICT'));
  assert.ok(result.reasons.some((r) => r.includes('ciclo')));
});

// --- 2. D-XXX pendiente: detected=true, ready=false --------------------------

test('2. decisión D-XXX sin evidencia bloquea ready', (t) => {
  const s = scenario(t, { taskOverrides: { decision_refs: ['D-014'] } });

  const result = evaluateIntegrationReadiness(s.evidence, auditResult(), s.contract, {
    ...s.git,
    tasks: [s.contract],
    decisionEvidence: {},
  });

  assert.equal(result.ready, false);
  assert.equal(result.manifest, null);
  assert.ok(blockerCodes(result).includes('PENDING_DECISION'));
  assert.ok(result.reasons.some((r) => r.includes('D-014')));
});

test('2b. decisión D-XXX con estado no canónico ("en revisión") sigue bloqueando', (t) => {
  const s = scenario(t, { taskOverrides: { decision_refs: ['D-014'] } });

  const result = evaluateIntegrationReadiness(s.evidence, auditResult(), s.contract, {
    ...s.git,
    tasks: [s.contract],
    decisionEvidence: { 'D-014': { status: 'en revisión final' } },
  });

  assert.equal(result.ready, false, 'no se adivinan variantes de aprobación');
  assert.ok(blockerCodes(result).includes('PENDING_DECISION'));
});

test('2c. decisión D-XXX ACEPTADA no bloquea', (t) => {
  const s = scenario(t, { taskOverrides: { decision_refs: ['D-014'] } });

  const result = evaluateIntegrationReadiness(s.evidence, auditResult(), s.contract, {
    ...s.git,
    tasks: [s.contract],
    decisionEvidence: { 'D-014': { status: 'ACEPTADA' } },
  });

  assert.equal(result.ready, true);
  assert.equal(result.manifest.conflict_prediction.pending_decision.detected, false);
});

// --- 3. migration lock conflictivo: detected=true, ready=false --------------

/** Escenario de migración: el candidato toca de verdad la superficie de §10.3. */
function migrationScenario(t, extraOverrides = {}) {
  return scenario(t, {
    files: { 'packages/database/prisma/schema.prisma': 'model X {}\n' },
    taskOverrides: {
      allowed_write: ['packages/database/prisma/**'],
      forbidden_scope: [],
      ...extraOverrides,
    },
  });
}

test('3. cerrojo de migración persistido por otra tarjeta bloquea ready', (t) => {
  useTempState(t);
  const s = migrationScenario(t);
  acquireMigrationLock({ taskId: 'OTRA-MIGRACION', agentId: 'CLAUDE-03' });

  const result = evaluateIntegrationReadiness(s.evidence, auditResult(), s.contract, {
    ...s.git,
    tasks: [s.contract],
  });

  assert.equal(result.ready, false);
  assert.equal(result.manifest, null);
  assert.ok(blockerCodes(result).includes('MIGRATION_LOCK_CONFLICT'));
  assert.ok(result.reasons.some((r) => r.includes('OTRA-MIGRACION')));
});

test('3b. un cerrojo de migración vencido sigue bloqueando: vencido no es libre', (t) => {
  useTempState(t);
  const s = migrationScenario(t);
  acquireMigrationLock({ taskId: 'OTRA-MIGRACION', agentId: 'CLAUDE-03' });
  // No hace falta simular el paso del tiempo: classifyMigrationLock ya se
  // prueba en migration-lock.test.mjs. Aquí basta con que el cerrojo EXISTA
  // y pertenezca a otra tarjeta — bloquea con independencia de su frescura.

  const result = evaluateIntegrationReadiness(s.evidence, auditResult(), s.contract, {
    ...s.git,
    tasks: [s.contract],
  });

  assert.equal(result.ready, false);
  assert.ok(blockerCodes(result).includes('MIGRATION_LOCK_CONFLICT'));
});

test('3c. otra tarjeta activa que también toca migración bloquea, sin cerrojo persistido', (t) => {
  const s = migrationScenario(t);
  const tasks = [
    s.contract,
    { task_id: 'OTRA', state: 'IMPLEMENTING', allowed_write: ['packages/database/prisma/**'] },
  ];

  const result = evaluateIntegrationReadiness(s.evidence, auditResult(), s.contract, { ...s.git, tasks });

  assert.equal(result.ready, false);
  assert.ok(blockerCodes(result).includes('MIGRATION_LOCK_CONFLICT'));
});

test('3d. sin cerrojo y sin otra tarjeta activa en superficie de migración: no bloquea', (t) => {
  useTempState(t);
  const s = migrationScenario(t);

  const result = evaluateIntegrationReadiness(s.evidence, auditResult(), s.contract, {
    ...s.git,
    tasks: [s.contract],
  });

  assert.equal(result.ready, true);
  assert.equal(result.manifest.conflict_prediction.migration_lock.detected, false);
});

// --- 4. shared contract collision: detected=true, ready=false ---------------

test('4. colisión de contrato compartido bloquea ready', (t) => {
  const s = scenario(t, {
    files: { 'apps/api/src/modules/documents/dto.ts': 'export type Dto = {};\n' },
    taskOverrides: {
      allowed_write: ['apps/api/src/modules/documents/dto.ts'],
      forbidden_scope: [],
    },
  });
  const tasks = [
    s.contract,
    {
      task_id: 'OTRA',
      state: 'IMPLEMENTING',
      allowed_write: ['apps/web/src/lib/documents-client.ts'],
      reads_contract: ['apps/api/src/modules/documents/dto.ts'],
    },
  ];

  const result = evaluateIntegrationReadiness(s.evidence, auditResult(), s.contract, { ...s.git, tasks });

  assert.equal(result.ready, false);
  assert.equal(result.manifest, null);
  assert.ok(blockerCodes(result).includes('SHARED_CONTRACT_COLLISION'));
  assert.ok(result.reasons.some((r) => r.includes('OTRA')));
});

test('4b. la colisión es bidireccional: también cuando la propia tarjeta lee el contrato ajeno', (t) => {
  const s = scenario(t, { taskOverrides: { reads_contract: ['apps/api/src/dto.ts'] } });
  const tasks = [s.contract, { task_id: 'OTRA', state: 'IMPLEMENTING', allowed_write: ['apps/api/src/dto.ts'] }];

  const result = evaluateIntegrationReadiness(s.evidence, auditResult(), s.contract, { ...s.git, tasks });

  assert.equal(result.ready, false);
  assert.ok(blockerCodes(result).includes('SHARED_CONTRACT_COLLISION'));
});

test('4c. sin solape de allowed_write/reads_contract declarado: no bloquea', (t) => {
  const s = scenario(t);
  const tasks = [s.contract, { task_id: 'OTRA', state: 'IMPLEMENTING', allowed_write: ['apps/web/**'] }];

  const result = evaluateIntegrationReadiness(s.evidence, auditResult(), s.contract, { ...s.git, tasks });

  assert.equal(result.ready, true);
  assert.equal(result.manifest.conflict_prediction.shared_contract_collision.detected, false);
});

// --- 5. stale base normativamente bloqueante: detected=true, ready=false ----

test('5. base_commit desfasada del destino bloquea ready (§16, sin allow_rebase)', (t) => {
  const s = scenario(t);
  // El destino avanza con un commit ajeno DESPUÉS de que este candidato
  // registrara su base_commit: exactamente el escenario de §16 "Candidato
  // sobre base antigua".
  const otroCommit = commitFiles(s.repo.dir, { 'README.md': 'avance del destino\n' }, 'avance ajeno');

  const result = evaluateIntegrationReadiness(s.evidence, auditResult(), s.contract, {
    repoPath: s.repo.dir,
    targetRef: otroCommit,
    tasks: [s.contract],
  });

  assert.equal(result.ready, false);
  assert.equal(result.manifest, null);
  assert.ok(blockerCodes(result).includes('STALE_BASE'));
});

test('5b. stale base con allow_rebase declarado SIGUE bloqueando ready: el motor no rebasa solo', (t) => {
  const s = scenario(t, { taskOverrides: { allow_rebase: true } });
  const otroCommit = commitFiles(s.repo.dir, { 'README.md': 'avance del destino\n' }, 'avance ajeno');

  const result = evaluateIntegrationReadiness(s.evidence, auditResult(), s.contract, {
    repoPath: s.repo.dir,
    targetRef: otroCommit,
    tasks: [s.contract],
  });

  assert.equal(result.ready, false, 'allow_rebase autoriza un rebase humano, no un ready automático');
  assert.ok(blockerCodes(result).includes('STALE_BASE'));
});

test('5c. base al día con el destino: stale_base no bloquea', (t) => {
  const s = scenario(t);
  const result = evaluateIntegrationReadiness(s.evidence, auditResult(), s.contract, {
    ...s.git,
    tasks: [s.contract],
  });

  assert.equal(result.ready, true);
  assert.equal(result.manifest.conflict_prediction.stale_base.stale, false);
  assert.equal(result.manifest.conflict_prediction.stale_base.status, 'CURRENT');
});

// --- 6. caso completamente válido: ready=true --------------------------------

test('6. las cinco dimensiones normativas limpias a la vez: ready=true con manifest completo', (t) => {
  const s = scenario(t, {
    taskOverrides: { dependencies: ['B'], decision_refs: ['D-014'] },
  });
  const tasks = [
    s.contract,
    { task_id: 'B', state: 'PASSED', dependencies: [] },
    { task_id: 'OTRA', state: 'IMPLEMENTING', allowed_write: ['apps/web/**'], reads_contract: [] },
  ];

  const result = evaluateIntegrationReadiness(s.evidence, auditResult(), s.contract, {
    ...s.git,
    tasks,
    decisionEvidence: { 'D-014': { status: 'ACEPTADA' } },
  });

  assert.equal(result.ready, true);
  assert.deepEqual(result.reasons, []);
  assert.deepEqual(result.blockers, []);
  assert.ok(result.manifest, 'debe producirse el manifest completo, no null');
  const cp = result.manifest.conflict_prediction;
  assert.equal(cp.dependency_conflict.detected, false);
  assert.equal(cp.pending_decision.detected, false);
  assert.equal(cp.migration_lock.detected, false);
  assert.equal(cp.shared_contract_collision.detected, false);
  assert.equal(cp.stale_base.stale, false);
});

// --- 7. predicción puramente informativa permitida ---------------------------

test('7. file_collision/glob_overlap detectados NO bloquean ready: siguen siendo informativos', (t) => {
  // `state: 'IMPLEMENTING'` en la propia tarjeta: `glob_overlap` (a
  // diferencia de `file_collision`) se calcula sobre `activeTasks(tasks)`
  // completo, incluida la propia — sin estado activo declarado quedaría
  // fuera del barrido y el solape no se detectaría por ese lado.
  const s = scenario(t, { taskOverrides: { state: 'IMPLEMENTING' } });
  // OTRA está ACTIVA y su allowed_write se solapa con el de esta tarjeta:
  // dispara file_collision y glob_overlap, pero ninguno de los dos vive en
  // BLOCKED_REASONS — a diferencia de las cinco dimensiones normativas.
  const tasks = [s.contract, { task_id: 'OTRA', state: 'IMPLEMENTING', allowed_write: ['src/**'] }];

  const result = evaluateIntegrationReadiness(s.evidence, auditResult(), s.contract, { ...s.git, tasks });

  assert.equal(result.ready, true, 'file_collision/glob_overlap no deben convertirse en gate');
  assert.ok(result.manifest, 'el manifest sí se produce: nada bloqueó');
  const cp = result.manifest.conflict_prediction;
  assert.equal(cp.file_collision.detected, true, 'la detección sí ocurre...');
  assert.equal(cp.glob_overlap.detected, true, '...en ambas formas...');
  assert.ok(cp.glob_overlap.collisions.length > 0);
  assert.deepEqual(result.blockers, [], '...pero ninguna aparece como blocker');
});

// --- 8. fallo de cálculo: continúa fail-closed -------------------------------

test('8. si el cálculo de los gates de LOOP-002 lanza, el resultado es fail-closed', (t) => {
  // Distinto de "calculable: false" (tasks ausente, informativo): aquí
  // `tasks` SÍ se provee, pero la forma de `dependencies` es inválida — no
  // un array, sino un valor no iterable — y `transitiveDependencyClosure`
  // lanza `TypeError` a media evaluación al intentar recorrerlo. Es un
  // fallo real de cómputo, no una entrada opcional omitida, y llega por el
  // mismo `try/catch` que ya protegía la predicción de conflicto de Git
  // desde antes de esta reparación.
  const s = scenario(t, { taskOverrides: { dependencies: 42 } });

  const result = evaluateIntegrationReadiness(s.evidence, auditResult(), s.contract, {
    ...s.git,
    tasks: [s.contract],
  });

  assert.equal(result.ready, false);
  assert.equal(result.manifest, null);
  assert.ok(result.blockers.some((b) => b.code === 'CONFLICT_PREDICTION_FAILED'));
  assert.ok(result.reasons.some((r) => r.includes('no se pudo calcular la predicción de conflicto')));
});
