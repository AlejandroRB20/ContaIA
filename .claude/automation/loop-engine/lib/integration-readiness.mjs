import { execFileSync } from 'node:child_process';
import { evaluateFindings } from './finding-gate.mjs';
import { checkWriteScope } from './glob.mjs';

/**
 * Único punto que decide si un candidato puede declararse
 * `READY_FOR_INTEGRATION`. Base: Claude-03 (`2e128c7`), con dos añadidos
 * exigidos por `LOOP-000_GOVERNANCE_SUBSTRATE.md` §6.3:
 *
 *   1. `allowed_write`/`forbidden_scope` por **globs** (antes coincidencia
 *      exacta de `Set` y `startsWith`, defecto que hacía inusable §6).
 *   2. `conflict_prediction` calculada sobre datos reales de Git (§14),
 *      que Claude-03 no producía.
 *
 * **El motor no integra.** Este módulo genera evidencia para que una
 * persona decida; ninguna ruta ejecuta `push`, `merge`, `rebase` ni
 * `cherry-pick`. `READY_FOR_INTEGRATION` es el estado terminal del motor.
 *
 * Cualquier condición ausente o en rojo produce `reasons[]` no vacío y
 * `manifest: null` — **nunca un manifest parcial**.
 */

export function evaluateIntegrationReadiness(handoff, auditResult, taskContract = {}) {
  const reasons = [];

  if (!handoff?.candidateCommit) reasons.push('candidateCommit ausente');
  if (!handoff?.baseCommit) reasons.push('baseCommit ausente');
  if (taskContract.base_commit && handoff?.baseCommit !== taskContract.base_commit) {
    reasons.push(
      `baseCommit "${handoff?.baseCommit}" no coincide con la base esperada "${taskContract.base_commit}"`,
    );
  }
  if (handoff?.tests?.passed !== true) reasons.push('tests no verdes');
  if (handoff?.typecheck?.passed !== true) reasons.push('typecheck no verde');
  if (handoff?.lint?.passed !== true) reasons.push('lint no verde');

  if (!auditResult?.auditorId) {
    reasons.push('auditoría independiente ausente (sin auditorId)');
  } else if (handoff?.implementerId && auditResult.auditorId === handoff.implementerId) {
    reasons.push(`auditor no independiente: "${auditResult.auditorId}" también implementó`);
  }

  if (auditResult?.verdict !== 'PASSED') {
    reasons.push(`auditoría independiente no aprobó (verdict=${auditResult?.verdict ?? 'ausente'})`);
  } else {
    const gate = evaluateFindings(auditResult.findings ?? [], taskContract);
    if (gate.blocked) {
      reasons.push(
        `hallazgos bloqueantes pendientes: ${gate.blockingFindings.map((f) => f.severity).join(', ')}`,
      );
    }
  }

  const changedFiles = handoff?.changedFiles ?? [];
  const scope = checkWriteScope(changedFiles, {
    allowedWrite: taskContract.allowed_write,
    forbiddenScope: taskContract.forbidden_scope,
  });
  if (scope.outsideAllowed.length > 0) {
    reasons.push(`archivos fuera de allowed_write: ${scope.outsideAllowed.join(', ')}`);
  }
  if (scope.forbidden.length > 0) {
    reasons.push(`archivos dentro de forbidden_scope: ${scope.forbidden.join(', ')}`);
  }

  if (reasons.length > 0) {
    return { ready: false, reasons, manifest: null };
  }

  return {
    ready: true,
    reasons: [],
    manifest: {
      task_id: taskContract.task_id ?? null,
      mission_id: taskContract.mission_id ?? null,
      source_commit: handoff.candidateCommit,
      base_commit: handoff.baseCommit,
      branch: taskContract.branch ?? null,
      worktree: taskContract.worktree ?? null,
      changed_files: changedFiles,
      test_evidence: {
        tests: handoff.tests?.detail ?? 'PASS',
        typecheck: 'PASS',
        lint: 'PASS',
        diff_check: handoff.diffCheck ?? 'CLEAN',
      },
      qa_verdict: {
        auditor: auditResult.auditorId,
        result: 'PASSED',
        findings: auditResult.findings ?? [],
      },
      conflict_prediction: null,
      integration_instructions:
        `Revisar \`git show ${handoff.candidateCommit}\`.\n` +
        'Integrar con cherry-pick sobre la rama destino verificada.\n' +
        'No hacer push sin autorización.',
      not_verified: taskContract.not_verified ?? [],
      generated_at: new Date().toISOString(),
    },
  };
}

/**
 * Predicción de conflicto calculada con datos reales de Git (§14).
 * Sólo lectura: `merge-base --is-ancestor` y `diff --name-only`.
 *
 * `POSSIBLE`/`CERTAIN` **no bloquea** el estado — informa a la persona que
 * decide la integración.
 */
export function predictConflicts({ repoPath, baseCommit, targetRef, changedFiles }) {
  const git = (args) => execFileSync('git', args, { cwd: repoPath, encoding: 'utf8' }).trim();

  const targetHead = git(['rev-parse', targetRef]);

  let baseIsAncestor = true;
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', baseCommit, targetHead], {
      cwd: repoPath,
      stdio: 'ignore',
    });
  } catch {
    baseIsAncestor = false;
  }

  const changedInTarget =
    baseCommit === targetHead
      ? []
      : git(['diff', '--name-only', `${baseCommit}..${targetHead}`]).split('\n').filter(Boolean);

  const candidateFiles = new Set(changedFiles ?? []);
  const overlap = changedInTarget.filter((file) => candidateFiles.has(file));

  let predicted = 'NONE';
  if (!baseIsAncestor) predicted = 'POSSIBLE';
  if (overlap.length > 0) predicted = 'CERTAIN';

  return {
    target_ref: targetRef,
    target_head: targetHead,
    base_is_ancestor_of_target: baseIsAncestor,
    files_changed_in_target_since_base: changedInTarget,
    overlap_with_candidate: overlap,
    predicted_conflicts: predicted,
  };
}

/** Adjunta la predicción a un manifest ya generado. */
export function withConflictPrediction(manifest, prediction) {
  if (!manifest) return null;
  return { ...manifest, conflict_prediction: prediction };
}
