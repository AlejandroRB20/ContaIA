import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  evaluateIntegrationReadiness,
  collectGitEvidence,
  commitExists,
  predictConflicts,
} from '../lib/integration-readiness.mjs';
import { detectCollisions, canRunInParallel } from '../lib/file-collision.mjs';
import { handoff, auditResult, finding, useTempRepo, commitFiles } from './helpers.mjs';

const NO_EXISTE = '0000000000000000000000000000000000000000';

/**
 * Escenario base: repositorio real, un commit candidato que toca
 * `src/a.ts`, y un contrato cuyo `allowed_write` lo cubre.
 */
function scenario(t, { files = { 'src/a.ts': 'candidato\n' }, allowedWrite = ['src/**'] } = {}) {
  const repo = useTempRepo(t);
  const candidate = commitFiles(repo.dir, files);
  const contract = {
    task_id: 'LOOP-TEST-001',
    mission_id: 'CONTAIA-TEST',
    base_commit: repo.baseCommit,
    allowed_write: allowedWrite,
    forbidden_scope: ['packages/database/**'],
  };
  const evidence = handoff({
    candidateCommit: candidate,
    baseCommit: repo.baseCommit,
    changedFiles: Object.keys(files),
  });
  return { repo, candidate, contract, evidence, git: { repoPath: repo.dir } };
}

const blockerCodes = (result) => result.blockers.map((b) => b.code);

// --- 1/2. los commits deben existir de verdad -------------------------------

test('candidateCommit inexistente: ready false, manifest null, blocker tipificado', (t) => {
  const s = scenario(t);
  const result = evaluateIntegrationReadiness(
    { ...s.evidence, candidateCommit: 'not-a-git-object' },
    auditResult(),
    s.contract,
    s.git,
  );
  assert.equal(result.ready, false);
  assert.equal(result.manifest, null);
  assert.ok(blockerCodes(result).includes('CANDIDATE_COMMIT_MISSING'));
});

test('candidateCommit ausente bloquea igual que uno inventado', (t) => {
  const s = scenario(t);
  const result = evaluateIntegrationReadiness(
    { ...s.evidence, candidateCommit: undefined },
    auditResult(),
    s.contract,
    s.git,
  );
  assert.equal(result.ready, false);
  assert.equal(result.manifest, null);
  assert.ok(blockerCodes(result).includes('CANDIDATE_COMMIT_MISSING'));
});

test('baseCommit inexistente: ready false, manifest null', (t) => {
  const s = scenario(t);
  const result = evaluateIntegrationReadiness(
    { ...s.evidence, baseCommit: NO_EXISTE },
    auditResult(),
    { ...s.contract, base_commit: NO_EXISTE },
    s.git,
  );
  assert.equal(result.ready, false);
  assert.equal(result.manifest, null);
  assert.ok(blockerCodes(result).includes('BASE_COMMIT_MISSING'));
});

test('commitExists distingue un commit real de un SHA plausible', (t) => {
  const s = scenario(t);
  assert.equal(commitExists(s.repo.dir, s.candidate), true);
  assert.equal(commitExists(s.repo.dir, NO_EXISTE), false);
  assert.equal(commitExists(s.repo.dir, ''), false);
});

// --- 3. Git es la autoridad sobre los archivos cambiados --------------------

test('changedFiles declarados distintos del diff real bloquean', (t) => {
  const s = scenario(t);
  const result = evaluateIntegrationReadiness(
    { ...s.evidence, changedFiles: ['src/otro.ts'] },
    auditResult(),
    s.contract,
    s.git,
  );
  assert.equal(result.ready, false);
  assert.equal(result.manifest, null);
  assert.ok(blockerCodes(result).includes('CHANGED_FILES_MISMATCH'));
});

test('collectGitEvidence deriva la lista real del repositorio', (t) => {
  const s = scenario(t, { files: { 'src/a.ts': 'x\n', 'src/b.ts': 'y\n' } });
  const evidence = collectGitEvidence({
    repoPath: s.repo.dir,
    candidateCommit: s.candidate,
    baseCommit: s.repo.baseCommit,
  });
  assert.equal(evidence.ok, true);
  assert.deepEqual(evidence.changedFiles.sort(), ['src/a.ts', 'src/b.ts']);
});

// --- 4/5. el alcance se mide sobre el diff real -----------------------------

test('un archivo del diff real fuera de allowed_write bloquea', (t) => {
  const s = scenario(t, { files: { 'src/a.ts': 'x\n', 'apps/web/x.tsx': 'y\n' } });
  const result = evaluateIntegrationReadiness(s.evidence, auditResult(), s.contract, s.git);
  assert.equal(result.ready, false);
  assert.ok(blockerCodes(result).includes('OUT_OF_SCOPE_WRITE'));
});

test('un archivo del diff real en forbidden_scope bloquea aunque encaje en allowed_write', (t) => {
  const s = scenario(t, {
    files: { 'packages/database/prisma/schema.prisma': 'model X {}\n' },
    allowedWrite: ['packages/**'],
  });
  const result = evaluateIntegrationReadiness(s.evidence, auditResult(), s.contract, s.git);
  assert.equal(result.ready, false);
  assert.ok(blockerCodes(result).includes('FORBIDDEN_SCOPE_WRITE'));
});

test('el alcance real bloquea aunque el constructor declare sólo lo permitido', (t) => {
  // El diff real toca `apps/`, pero el handoff sólo declara `src/a.ts`.
  const s = scenario(t, { files: { 'src/a.ts': 'x\n', 'apps/web/x.tsx': 'y\n' } });
  const result = evaluateIntegrationReadiness(
    { ...s.evidence, changedFiles: ['src/a.ts'] },
    auditResult(),
    s.contract,
    s.git,
  );
  assert.equal(result.ready, false);
  assert.equal(result.manifest, null);
  assert.ok(blockerCodes(result).includes('CHANGED_FILES_MISMATCH'));
});

test('un cambio anidado dentro del alcance pasa (globs, no coincidencia exacta)', (t) => {
  const s = scenario(t, { files: { 'src/deep/nested/a.ts': 'x\n' } });
  const result = evaluateIntegrationReadiness(s.evidence, auditResult(), s.contract, s.git);
  assert.equal(result.ready, true);
});

// --- 6/7. conflict_prediction ----------------------------------------------

test('conflict_prediction se calcula sobre un candidato válido', (t) => {
  const s = scenario(t);

  // Destino aún en la base: nada que se solape con el candidato.
  const limpio = evaluateIntegrationReadiness(s.evidence, auditResult(), s.contract, {
    repoPath: s.repo.dir,
    targetRef: s.repo.baseCommit,
  });
  assert.equal(limpio.ready, true);
  assert.equal(limpio.manifest.conflict_prediction.predicted_conflicts, 'NONE');

  // Destino ya con el candidato dentro: el solape se detecta y se informa,
  // pero NO bloquea — quien decide la integración es una persona.
  const solapado = evaluateIntegrationReadiness(s.evidence, auditResult(), s.contract, s.git);
  assert.equal(solapado.ready, true);
  assert.equal(solapado.manifest.conflict_prediction.predicted_conflicts, 'CERTAIN');
  assert.deepEqual(solapado.manifest.conflict_prediction.overlap_with_candidate, ['src/a.ts']);
});

test('si la predicción no se puede calcular, no hay manifest', (t) => {
  const s = scenario(t);
  const result = evaluateIntegrationReadiness(s.evidence, auditResult(), s.contract, {
    repoPath: s.repo.dir,
    targetRef: 'refs/heads/no-existe',
  });
  assert.equal(result.ready, false);
  assert.equal(result.manifest, null);
  assert.ok(blockerCodes(result).includes('CONFLICT_PREDICTION_FAILED'));
});

// --- 8. manifest válido con evidencia Git real ------------------------------

test('manifest válido: contiene evidencia Git verificada, no declarada', (t) => {
  const s = scenario(t);
  const result = evaluateIntegrationReadiness(s.evidence, auditResult(), s.contract, s.git);

  assert.equal(result.ready, true);
  assert.deepEqual(result.reasons, []);
  assert.equal(result.manifest.source_commit, s.candidate);
  assert.equal(result.manifest.base_commit, s.repo.baseCommit);
  assert.deepEqual(result.manifest.changed_files, ['src/a.ts']);
  assert.equal(result.manifest.git_evidence.candidate_commit_verified, true);
  assert.equal(result.manifest.git_evidence.base_commit_verified, true);
  assert.match(result.manifest.git_evidence.changed_files_source, /^git diff --name-only /);
  assert.equal(result.manifest.qa_verdict.auditor, 'CODEX-01');
  assert.ok(result.manifest.integration_instructions.includes('No hacer push sin autorización'));
});

// --- 24. manifest bloqueado, nunca parcial ---------------------------------

test('cualquier condición en rojo produce manifest null, nunca parcial', (t) => {
  const s = scenario(t);
  const cases = [
    ['tests no verdes', { tests: { passed: false } }],
    ['typecheck no verde', { typecheck: { passed: false } }],
    ['lint no verde', { lint: { passed: false } }],
  ];
  for (const [label, override] of cases) {
    const result = evaluateIntegrationReadiness(
      { ...s.evidence, ...override },
      auditResult(),
      s.contract,
      s.git,
    );
    assert.equal(result.ready, false, label);
    assert.equal(result.manifest, null, `${label}: el manifest debe ser null`);
    assert.ok(result.reasons.length > 0);
  }
});

test('base distinta de la esperada por el contrato bloquea', (t) => {
  const s = scenario(t);
  const result = evaluateIntegrationReadiness(
    s.evidence,
    auditResult(),
    { ...s.contract, base_commit: s.candidate },
    s.git,
  );
  assert.equal(result.ready, false);
  assert.ok(blockerCodes(result).includes('BASE_COMMIT_MISMATCH'));
});

// --- auditoría independiente ------------------------------------------------

test('sin veredicto PASSED no hay manifest', (t) => {
  const s = scenario(t);
  for (const verdict of ['REQUIRES_CHANGES', 'BLOCKED', undefined]) {
    const result = evaluateIntegrationReadiness(
      s.evidence,
      auditResult({ verdict }),
      s.contract,
      s.git,
    );
    assert.equal(result.ready, false);
    assert.equal(result.manifest, null);
  }
});

test('un auditor que coincide con el implementador bloquea el manifest', (t) => {
  const s = scenario(t);
  const result = evaluateIntegrationReadiness(
    { ...s.evidence, implementerId: 'CLAUDE-02' },
    auditResult({ auditorId: 'CLAUDE-02' }),
    s.contract,
    s.git,
  );
  assert.equal(result.ready, false);
  assert.ok(blockerCodes(result).includes('NON_INDEPENDENT_AUDITOR'));
});

test('hallazgos bloqueantes impiden el manifest aunque el veredicto sea PASSED', (t) => {
  const s = scenario(t);
  const result = evaluateIntegrationReadiness(
    s.evidence,
    auditResult({ findings: [finding('ALTO')] }),
    s.contract,
    s.git,
  );
  assert.equal(result.ready, false);
  assert.ok(blockerCodes(result).includes('BLOCKING_FINDINGS'));
});

test('un BAJO autorizado por el contrato sí permite el manifest', (t) => {
  const s = scenario(t);
  const result = evaluateIntegrationReadiness(
    s.evidence,
    auditResult({ findings: [finding('BAJO')] }),
    { ...s.contract, allow_low_findings: true },
    s.git,
  );
  assert.equal(result.ready, true);
  assert.equal(result.manifest.qa_verdict.findings.length, 1);
});

// --- predicción de conflicto (§14) ------------------------------------------

test('predicción de conflicto: NONE cuando la base es la punta', (t) => {
  const repo = useTempRepo(t);
  const prediction = predictConflicts({
    repoPath: repo.dir,
    baseCommit: repo.baseCommit,
    targetRef: 'HEAD',
    changedFiles: ['README.md'],
  });
  assert.equal(prediction.predicted_conflicts, 'NONE');
  assert.equal(prediction.base_is_ancestor_of_target, true);
  assert.deepEqual(prediction.files_changed_in_target_since_base, []);
});

test('predicción de conflicto: CERTAIN cuando el destino tocó el mismo archivo', (t) => {
  const repo = useTempRepo(t);
  fs.writeFileSync(path.join(repo.dir, 'README.md'), 'cambiado en destino\n');
  execFileSync('git', ['commit', '--quiet', '-am', 'destino'], { cwd: repo.dir, stdio: 'pipe' });

  const prediction = predictConflicts({
    repoPath: repo.dir,
    baseCommit: repo.baseCommit,
    targetRef: 'HEAD',
    changedFiles: ['README.md'],
  });
  assert.equal(prediction.predicted_conflicts, 'CERTAIN');
  assert.deepEqual(prediction.overlap_with_candidate, ['README.md']);
});

// --- 19. colisión de archivos entre tarjetas --------------------------------

test('colisión de archivos por globs entre dos tarjetas', () => {
  const claims = [
    { task_id: 'A', allowed_write: ['apps/api/**'] },
    { task_id: 'B', allowed_write: ['apps/api/src/x.ts'] },
  ];
  const collisions = detectCollisions(claims);
  assert.equal(collisions.length, 1);
  assert.deepEqual(collisions[0].task_ids.sort(), ['A', 'B']);
  assert.equal(canRunInParallel(claims), false);
});

test('superficies disjuntas pueden correr en paralelo', () => {
  const claims = [
    { task_id: 'A', allowed_write: ['apps/api/**'] },
    { task_id: 'B', allowed_write: ['apps/web/**'] },
  ];
  assert.deepEqual(detectCollisions(claims), []);
  assert.equal(canRunInParallel(claims), true);
});

// --- LOOP-002: conflict_prediction extendido --------------------------------

test('19. conflict_prediction completo incluye las siete dimensiones de LOOP-002', (t) => {
  const s = scenario(t);
  const other = {
    task_id: 'OTRA',
    state: 'IMPLEMENTING',
    allowed_write: ['apps/web/**'],
    dependencies: [],
    decision_refs: [],
    reads_contract: [],
  };
  const tasks = [{ ...s.contract, state: 'READY_FOR_QA', dependencies: [], decision_refs: [] }, other];

  // `targetRef: s.repo.baseCommit` — el destino no avanzó desde la base
  // registrada. Sin esto, el `targetRef` por defecto ('HEAD') apuntaría al
  // propio commit candidato (artefacto del repositorio de una sola rama que
  // usa `useTempRepo`/`commitFiles`), y `stale_base` detectaría drift real:
  // exactamente el gate normativo que esta reparación conecta a `ready` más
  // abajo. Mismo patrón que ya usa "conflict_prediction se calcula sobre un
  // candidato válido" para su caso limpio.
  const result = evaluateIntegrationReadiness(s.evidence, auditResult(), s.contract, {
    repoPath: s.repo.dir,
    targetRef: s.repo.baseCommit,
    tasks,
  });

  assert.equal(result.ready, true);
  const cp = result.manifest.conflict_prediction;
  assert.equal(cp.calculable, true);
  for (const key of [
    'file_collision',
    'glob_overlap',
    'shared_contract_collision',
    'dependency_conflict',
    'stale_base',
    'migration_lock',
    'pending_decision',
  ]) {
    assert.ok(key in cp, `falta la dimensión "${key}"`);
  }
  // Ninguna dimensión debería detectar nada: OTRA no comparte alcance y el
  // destino no se movió.
  assert.equal(cp.file_collision.detected, false);
  assert.equal(cp.shared_contract_collision.detected, false);
  assert.equal(cp.dependency_conflict.detected, false);
  assert.equal(cp.migration_lock.detected, false);
  assert.equal(cp.pending_decision.detected, false);
  assert.equal(cp.stale_base.stale, false);
  assert.equal(cp.stale_base.status, 'CURRENT');
});

// Corregidas por la reparación fail-closed de la reauditoría de LOOP-002
// (hallazgo ALTO): `dependency_conflict` y `pending_decision` son gates
// normativos (su `blocked_reason` vive en `BLOCKED_REASONS`, el mismo
// vocabulario que bloquea una tarjeta en el resto del motor) — su detección
// ya no puede convivir con `ready: true`. Cobertura completa de las cinco
// dimensiones normativas y la distinción con las informativas vive en
// `test/integration-readiness-failclosed-gates.test.mjs`.

test('conflict_prediction detecta una dependencia sin cerrar en las tareas hermanas: gate normativo', (t) => {
  const s = scenario(t);
  const withDep = { ...s.contract, dependencies: ['B'] };
  const tasks = [withDep, { task_id: 'B', state: 'IMPLEMENTING', dependencies: [] }];

  const result = evaluateIntegrationReadiness(s.evidence, auditResult(), withDep, { ...s.git, tasks });
  assert.equal(result.ready, false, 'dependency_conflict es normativo (BLOCKED_REASONS): bloquea ready');
  assert.equal(result.manifest, null);
  assert.ok(blockerCodes(result).includes('DEPENDENCY_CONFLICT'));
});

test('conflict_prediction detecta D-XXX pendiente: gate normativo', (t) => {
  const s = scenario(t);
  const withDecision = { ...s.contract, decision_refs: ['D-014'] };
  const result = evaluateIntegrationReadiness(s.evidence, auditResult(), withDecision, {
    ...s.git,
    tasks: [withDecision],
    decisionEvidence: {},
  });
  assert.equal(result.ready, false);
  assert.equal(result.manifest, null);
  assert.ok(blockerCodes(result).includes('PENDING_DECISION'));
});

test('sin `tasks`, las dimensiones de LOOP-002 se reportan no calculables, no se omiten en silencio', (t) => {
  const s = scenario(t);
  const result = evaluateIntegrationReadiness(s.evidence, auditResult(), s.contract, s.git);
  // `calculable: false` no bloquea por sí solo: `evaluateTaskReadiness`, el
  // único punto de entrada real del motor, siempre provee `tasks`; esta rama
  // sólo es alcanzable invocando la función pura sin ese argumento — un caso
  // de API, no un candidato sin cobertura de gates. Ver
  // `test/integration-readiness-failclosed-gates.test.mjs` para el caso que
  // sí debe bloquear: un cálculo que se intenta y falla (excepción).
  assert.equal(result.ready, true);
  assert.equal(result.manifest.conflict_prediction.calculable, false);
  assert.ok(result.manifest.conflict_prediction.reason.includes('tasks'));
});

// --- 20. fallo de cálculo de conflict_prediction = manifest null ------------

test('20. si predictConflicts falla (target inexistente), manifest es null pese a tener tasks', (t) => {
  const s = scenario(t);
  const result = evaluateIntegrationReadiness(s.evidence, auditResult(), s.contract, {
    repoPath: s.repo.dir,
    targetRef: 'refs/heads/no-existe',
    tasks: [s.contract],
  });
  assert.equal(result.ready, false);
  assert.equal(result.manifest, null);
  assert.ok(result.blockers.some((b) => b.code === 'CONFLICT_PREDICTION_FAILED'));
});
