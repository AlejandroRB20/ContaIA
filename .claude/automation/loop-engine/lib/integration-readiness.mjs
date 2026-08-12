import { execFileSync } from 'node:child_process';
import { evaluateFindings } from './finding-gate.mjs';
import { checkWriteScope, normalizePath } from './glob.mjs';
import { repoRoot } from './paths.mjs';
import { getOrCreateTaskState } from './store.mjs';
import { assertOperable } from './guard.mjs';
import { handoffFromRecord } from './qa-session.mjs';

/**
 * Único punto que decide si un candidato puede declararse
 * `READY_FOR_INTEGRATION`.
 *
 * **Git es la autoridad, no el handoff.** La auditoría independiente de
 * `LOOP-001` encontró que el gate aceptaba cualquier string no vacío como
 * `candidateCommit` y confiaba en los `changedFiles` que declaraba el
 * constructor: un candidato inexistente con evidencia declarada en verde
 * producía `ready: true`. Ahora toda ejecución del gate:
 *
 *   1. comprueba que `candidateCommit` y `baseCommit` existan de verdad
 *      (`git cat-file -e <sha>^{commit}`, sin shell interpolado);
 *   2. **deriva** los archivos modificados de `git diff --name-only`, y usa
 *      esa lista —no la declarada— para `allowed_write`/`forbidden_scope`;
 *   3. compara la lista declarada contra la real como defensa adicional:
 *      cualquier discrepancia bloquea;
 *   4. calcula `conflict_prediction` sobre el repositorio real. Si no puede
 *      calcularse, se falla cerrado.
 *
 * **El motor no integra.** Este módulo genera evidencia para que una
 * persona decida; ninguna ruta ejecuta `push`, `merge`, `rebase` ni
 * `cherry-pick`. `READY_FOR_INTEGRATION` es el estado terminal del motor.
 *
 * Cualquier condición ausente o en rojo produce `reasons[]` no vacío,
 * `blockers[]` tipificados y `manifest: null` — **nunca un manifest
 * parcial**.
 */

function git(repoPath, args) {
  return execFileSync('git', args, {
    cwd: repoPath,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

/** ¿El objeto existe y es un commit? READ ONLY, argumentos sin shell. */
export function commitExists(repoPath, sha) {
  if (typeof sha !== 'string' || sha.length === 0) return false;
  try {
    execFileSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: repoPath, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Evidencia Git real de un candidato: existencia de ambos commits y lista
 * de archivos derivada del propio repositorio. Sólo lectura.
 *
 * @returns {{ok: boolean, blockers: Array<{code: string, detail: string}>, changedFiles: string[]|null}}
 */
export function collectGitEvidence({ repoPath, candidateCommit, baseCommit }) {
  const blockers = [];

  if (!candidateCommit) {
    blockers.push({ code: 'CANDIDATE_COMMIT_MISSING', detail: 'el handoff no declara candidateCommit' });
  } else if (!commitExists(repoPath, candidateCommit)) {
    blockers.push({
      code: 'CANDIDATE_COMMIT_MISSING',
      detail: `"${candidateCommit}" no existe como commit en ${repoPath}`,
    });
  }

  if (!baseCommit) {
    blockers.push({ code: 'BASE_COMMIT_MISSING', detail: 'el handoff no declara baseCommit' });
  } else if (!commitExists(repoPath, baseCommit)) {
    blockers.push({
      code: 'BASE_COMMIT_MISSING',
      detail: `"${baseCommit}" no existe como commit en ${repoPath}`,
    });
  }

  if (blockers.length > 0) return { ok: false, blockers, changedFiles: null };

  try {
    const changedFiles = git(repoPath, ['diff', '--name-only', `${baseCommit}..${candidateCommit}`])
      .split('\n')
      .filter(Boolean)
      .map(normalizePath);
    return { ok: true, blockers: [], changedFiles };
  } catch (err) {
    return {
      ok: false,
      blockers: [{ code: 'GIT_DIFF_FAILED', detail: err.message }],
      changedFiles: null,
    };
  }
}

function sameFileSet(a, b) {
  const left = [...new Set(a.map(normalizePath).filter(Boolean))].sort();
  const right = [...new Set(b.map(normalizePath).filter(Boolean))].sort();
  return left.length === right.length && left.every((value, i) => value === right[i]);
}

/**
 * @param {object} handoff evidencia declarada por el constructor
 * @param {object} auditResult veredicto de la auditoría independiente
 * @param {object} taskContract contrato de la tarjeta (`allowed_write`, …)
 * @param {{repoPath?: string, targetRef?: string}} [git] repositorio real a
 *   verificar. Por defecto el del motor: omitirlo no relaja nada, sólo
 *   apunta al repositorio de trabajo.
 */
export function evaluateIntegrationReadiness(
  handoff,
  auditResult,
  taskContract = {},
  { repoPath = repoRoot(), targetRef = 'HEAD' } = {},
) {
  const reasons = [];
  const blockers = [];

  const fail = (code, detail) => {
    blockers.push({ code, detail });
    reasons.push(detail);
  };

  // --- 1. evidencia Git real (autoridad sobre lo declarado) ----------------
  const evidence = collectGitEvidence({
    repoPath,
    candidateCommit: handoff?.candidateCommit,
    baseCommit: handoff?.baseCommit,
  });
  for (const blocker of evidence.blockers) fail(blocker.code, blocker.detail);

  if (taskContract.base_commit && handoff?.baseCommit !== taskContract.base_commit) {
    fail(
      'BASE_COMMIT_MISMATCH',
      `baseCommit "${handoff?.baseCommit}" no coincide con la base esperada "${taskContract.base_commit}"`,
    );
  }

  // Lo declarado se compara contra Git; discrepar bloquea. Nunca sustituye.
  const declaredFiles = handoff?.changedFiles ?? [];
  if (evidence.ok && declaredFiles.length > 0 && !sameFileSet(declaredFiles, evidence.changedFiles)) {
    fail(
      'CHANGED_FILES_MISMATCH',
      `changedFiles declarados (${declaredFiles.join(', ') || '∅'}) no coinciden con el diff real ` +
        `(${evidence.changedFiles.join(', ') || '∅'})`,
    );
  }

  // --- 2. gates de construcción -------------------------------------------
  if (handoff?.tests?.passed !== true) fail('TESTS_NOT_GREEN', 'tests no verdes');
  if (handoff?.typecheck?.passed !== true) fail('TYPECHECK_NOT_GREEN', 'typecheck no verde');
  if (handoff?.lint?.passed !== true) fail('LINT_NOT_GREEN', 'lint no verde');

  // --- 3. auditoría independiente -----------------------------------------
  if (!auditResult?.auditorId) {
    fail('AUDIT_MISSING', 'auditoría independiente ausente (sin auditorId)');
  } else if (handoff?.implementerId && auditResult.auditorId === handoff.implementerId) {
    fail(
      'NON_INDEPENDENT_AUDITOR',
      `auditor no independiente: "${auditResult.auditorId}" también implementó`,
    );
  }

  if (auditResult?.verdict !== 'PASSED') {
    fail(
      'AUDIT_NOT_PASSED',
      `auditoría independiente no aprobó (verdict=${auditResult?.verdict ?? 'ausente'})`,
    );
  } else {
    const gate = evaluateFindings(auditResult.findings ?? [], taskContract);
    if (gate.blocked) {
      fail(
        'BLOCKING_FINDINGS',
        `hallazgos bloqueantes pendientes: ${gate.blockingFindings.map((f) => f.severity).join(', ')}`,
      );
    }
  }

  // --- 4. alcance de escritura, medido sobre el diff REAL ------------------
  // Sin evidencia Git no hay lista de archivos que verificar: los blockers
  // de arriba ya bloquean, y comprobar el alcance sobre lo declarado sería
  // exactamente el defecto que esta corrección elimina.
  if (evidence.ok) {
    const scope = checkWriteScope(evidence.changedFiles, {
      allowedWrite: taskContract.allowed_write,
      forbiddenScope: taskContract.forbidden_scope,
    });
    if (scope.outsideAllowed.length > 0) {
      fail('OUT_OF_SCOPE_WRITE', `archivos fuera de allowed_write: ${scope.outsideAllowed.join(', ')}`);
    }
    if (scope.forbidden.length > 0) {
      fail('FORBIDDEN_SCOPE_WRITE', `archivos dentro de forbidden_scope: ${scope.forbidden.join(', ')}`);
    }
  }

  // --- 5. predicción de conflicto sobre el repositorio real ----------------
  // Fail-closed: un manifest READY nunca lleva `conflict_prediction: null`.
  let prediction = null;
  if (evidence.ok) {
    try {
      prediction = predictConflicts({
        repoPath,
        baseCommit: handoff.baseCommit,
        targetRef,
        changedFiles: evidence.changedFiles,
      });
    } catch (err) {
      fail('CONFLICT_PREDICTION_FAILED', `no se pudo calcular la predicción de conflicto: ${err.message}`);
    }
  }

  if (reasons.length > 0 || prediction === null) {
    if (reasons.length === 0) {
      fail('CONFLICT_PREDICTION_FAILED', 'no hay predicción de conflicto calculable');
    }
    return { ready: false, reasons, blockers, manifest: null };
  }

  return {
    ready: true,
    reasons: [],
    blockers: [],
    manifest: {
      task_id: taskContract.task_id ?? null,
      mission_id: taskContract.mission_id ?? null,
      source_commit: handoff.candidateCommit,
      base_commit: handoff.baseCommit,
      branch: taskContract.branch ?? null,
      worktree: taskContract.worktree ?? null,
      changed_files: evidence.changedFiles,
      git_evidence: {
        repo_path: repoPath,
        candidate_commit_verified: true,
        base_commit_verified: true,
        changed_files_source: `git diff --name-only ${handoff.baseCommit}..${handoff.candidateCommit}`,
        declared_changed_files_match: declaredFiles.length > 0,
      },
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
      conflict_prediction: prediction,
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
 * Readiness **de una tarjeta del motor**, no de un handoff suelto.
 *
 * `evaluateIntegrationReadiness` es puro y no conoce `task_id`: no puede
 * saber si el estado que se le pasa está confirmado. Esta capa es la que sí
 * lo sabe, y por eso es aquí donde vive la guarda. Declarar
 * `READY_FOR_INTEGRATION` es la decisión más consecuente del motor —
 * produce el manifest sobre el que una persona integra— así que no puede
 * calcularse sobre un estado sin respaldo en el log ni sobre una tarjeta con
 * recuperación pendiente.
 */
export function evaluateTaskReadiness({ taskId, repoPath, targetRef }) {
  const task = getOrCreateTaskState(taskId);
  assertOperable(taskId, task);

  if (!task.qa_handoff) throw new Error(`"${taskId}" no tiene handoff de QA persistido`);
  if (!task.qa_result) throw new Error(`"${taskId}" no tiene resultado de QA: ejecutar \`qa\` primero`);

  return evaluateIntegrationReadiness(
    handoffFromRecord(task.qa_handoff),
    {
      auditorId: task.qa_result.auditor_id,
      verdict: task.qa_result.verdict,
      findings: task.qa_result.findings,
    },
    task,
    { repoPath, targetRef },
  );
}

/**
 * Predicción de conflicto calculada con datos reales de Git (§14).
 * Sólo lectura: `merge-base --is-ancestor` y `diff --name-only`.
 *
 * `POSSIBLE`/`CERTAIN` **no bloquea** el estado — informa a la persona que
 * decide la integración. Lo que sí bloquea es no poder calcularla.
 */
export function predictConflicts({ repoPath, baseCommit, targetRef, changedFiles }) {
  const targetHead = git(repoPath, ['rev-parse', targetRef]);

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
      : git(repoPath, ['diff', '--name-only', `${baseCommit}..${targetHead}`])
          .split('\n')
          .filter(Boolean);

  const candidateFiles = new Set((changedFiles ?? []).map(normalizePath));
  const overlap = changedInTarget.filter((file) => candidateFiles.has(normalizePath(file)));

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
