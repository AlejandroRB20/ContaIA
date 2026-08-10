import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  evaluateIntegrationReadiness,
  predictConflicts,
  withConflictPrediction,
} from '../lib/integration-readiness.mjs';
import { detectCollisions, canRunInParallel } from '../lib/file-collision.mjs';
import { handoff, auditResult, finding, useTempRepo } from './helpers.mjs';

const contract = {
  task_id: 'LOOP-TEST-001',
  mission_id: 'CONTAIA-TEST',
  base_commit: 'deadbeef',
  allowed_write: ['src/**'],
  forbidden_scope: ['packages/database/**'],
};

// --- 23. manifest válido ----------------------------------------------------

test('manifest válido: todas las condiciones en verde', () => {
  const result = evaluateIntegrationReadiness(handoff(), auditResult(), contract);
  assert.equal(result.ready, true);
  assert.deepEqual(result.reasons, []);
  assert.equal(result.manifest.source_commit, 'c0ffee1');
  assert.equal(result.manifest.qa_verdict.auditor, 'CODEX-01');
  assert.equal(result.manifest.task_id, 'LOOP-TEST-001');
  assert.ok(result.manifest.integration_instructions.includes('No hacer push sin autorización'));
});

// --- 24. manifest bloqueado -------------------------------------------------

test('cualquier condición en rojo produce manifest null, nunca parcial', () => {
  const cases = [
    ['tests no verdes', { tests: { passed: false } }],
    ['typecheck no verde', { typecheck: { passed: false } }],
    ['lint no verde', { lint: { passed: false } }],
  ];
  for (const [label, override] of cases) {
    const result = evaluateIntegrationReadiness(handoff(override), auditResult(), contract);
    assert.equal(result.ready, false, label);
    assert.equal(result.manifest, null, `${label}: el manifest debe ser null`);
    assert.ok(result.reasons.length > 0);
  }
});

// --- 22. candidato ausente --------------------------------------------------

test('candidateCommit ausente bloquea', () => {
  const result = evaluateIntegrationReadiness(
    handoff({ candidateCommit: undefined }),
    auditResult(),
    contract,
  );
  assert.equal(result.ready, false);
  assert.equal(result.manifest, null);
  assert.ok(result.reasons.some((r) => r.includes('candidateCommit ausente')));
});

test('base distinta de la esperada bloquea', () => {
  const result = evaluateIntegrationReadiness(
    handoff({ baseCommit: 'otra' }),
    auditResult(),
    contract,
  );
  assert.equal(result.ready, false);
  assert.ok(result.reasons.some((r) => r.includes('no coincide con la base esperada')));
});

// --- auditoría independiente ------------------------------------------------

test('sin veredicto PASSED no hay manifest', () => {
  for (const verdict of ['REQUIRES_CHANGES', 'BLOCKED', undefined]) {
    const result = evaluateIntegrationReadiness(handoff(), auditResult({ verdict }), contract);
    assert.equal(result.ready, false);
    assert.equal(result.manifest, null);
  }
});

test('un auditor que coincide con el implementador bloquea el manifest', () => {
  const result = evaluateIntegrationReadiness(
    handoff({ implementerId: 'CLAUDE-02' }),
    auditResult({ auditorId: 'CLAUDE-02' }),
    contract,
  );
  assert.equal(result.ready, false);
  assert.ok(result.reasons.some((r) => r.includes('no independiente')));
});

test('hallazgos bloqueantes impiden el manifest aunque el veredicto sea PASSED', () => {
  const result = evaluateIntegrationReadiness(
    handoff(),
    auditResult({ findings: [finding('ALTO')] }),
    contract,
  );
  assert.equal(result.ready, false);
  assert.ok(result.reasons.some((r) => r.includes('hallazgos bloqueantes')));
});

test('un BAJO autorizado por el contrato sí permite el manifest', () => {
  const result = evaluateIntegrationReadiness(
    handoff(),
    auditResult({ findings: [finding('BAJO')] }),
    { ...contract, allow_low_findings: true },
  );
  assert.equal(result.ready, true);
  assert.equal(result.manifest.qa_verdict.findings.length, 1);
});

// --- 20/21. alcance por globs en el gate de integración ---------------------

test('allowed_write con globs: un cambio dentro del alcance pasa', () => {
  const result = evaluateIntegrationReadiness(
    handoff({ changedFiles: ['src/deep/nested/a.ts'] }),
    auditResult(),
    contract,
  );
  assert.equal(result.ready, true);
});

test('un archivo fuera de allowed_write bloquea', () => {
  const result = evaluateIntegrationReadiness(
    handoff({ changedFiles: ['src/a.ts', 'apps/web/x.tsx'] }),
    auditResult(),
    contract,
  );
  assert.equal(result.ready, false);
  assert.ok(result.reasons.some((r) => r.includes('fuera de allowed_write')));
});

test('un archivo en forbidden_scope bloquea aunque encaje en allowed_write', () => {
  const result = evaluateIntegrationReadiness(
    handoff({ changedFiles: ['packages/database/prisma/schema.prisma'] }),
    auditResult(),
    { ...contract, allowed_write: ['packages/**'] },
  );
  assert.equal(result.ready, false);
  assert.ok(result.reasons.some((r) => r.includes('forbidden_scope')));
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

test('la predicción se adjunta al manifest sin alterar el resto', () => {
  const base = evaluateIntegrationReadiness(handoff(), auditResult(), contract);
  const withPrediction = withConflictPrediction(base.manifest, { predicted_conflicts: 'NONE' });
  assert.equal(withPrediction.conflict_prediction.predicted_conflicts, 'NONE');
  assert.equal(withPrediction.source_commit, base.manifest.source_commit);
  assert.equal(withConflictPrediction(null, {}), null);
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
