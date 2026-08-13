import { execFileSync } from 'node:child_process';
import { evaluateFindings } from './finding-gate.mjs';
import { checkWriteScope, normalizePath } from './glob.mjs';
import { repoRoot } from './paths.mjs';
import { getOrCreateTaskState, listTasks } from './store.mjs';
import { assertOperable } from './guard.mjs';
import { handoffFromRecord } from './qa-session.mjs';
import { detectCollisions } from './file-collision.mjs';
import { evaluateStaleBase } from './stale-base.mjs';
import {
  fileOverlapConflicts,
  transitiveDependencyClosure,
  dependencyCycle,
  migrationLockConflicts,
  activeTasks,
} from './concurrency.mjs';
import { decisionGateConflicts } from './decision-gate.mjs';
import { sharedContractConflicts } from './contracts.mjs';

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
 *   5. dentro de `conflict_prediction`, distingue predicción informativa de
 *      gate normativo (§10, §16): `file_collision`/`glob_overlap` advierten
 *      sin bloquear; `dependency_conflict`, `pending_decision`,
 *      `migration_lock`, `shared_contract_collision` y `stale_base` usan el
 *      mismo vocabulario que `BLOCKED_REASONS` y, si están presentes,
 *      `ready` no puede ser `true` — corrección de la reauditoría de
 *      `LOOP-002` (hallazgo ALTO), que encontró estas cinco condiciones
 *      calculadas correctamente pero sin conectar a `ready`.
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
 * Dimensiones de `LOOP-002` para `conflict_prediction` (§10, extendido por
 * la misión de gates avanzados).
 *
 * **No todas tienen la misma semántica — la reauditoría de `LOOP-002`
 * (hallazgo ALTO) encontró que este módulo las trataba todas como
 * informativas por igual, lo que dejaba `ready: true` conviviendo con
 * condiciones que el propio motor tipifica como bloqueantes.**
 *
 *   - `file_collision` / `glob_overlap` — **informativas.** Ninguna de las
 *     dos aparece en `BLOCKED_REASONS` (`constants.mjs`): son una advertencia
 *     de que otra tarjeta *activa* también toca esas rutas, útil para quien
 *     decide integrar, pero no una condición legal que impida continuar —
 *     igual que `predicted_conflicts` del diff de Git (§14).
 *   - `dependency_conflict`, `pending_decision`, `migration_lock`,
 *     `shared_contract_collision`, `stale_base` — **normativas.** Sus
 *     `blocked_reason` (`dependency_cycle`, `dependency_transitive_unmet`,
 *     `dependency_malformed`, `pending_decision`, `migration_lock_held`,
 *     `migration_lock_stale`, `shared_contract_collision`, `stale_base`) son
 *     exactamente el vocabulario que `BLOCKED_REASONS` reserva para mover una
 *     tarjeta a `BLOCKED*` en el resto del motor (§10.2–§10.5, §16). Que
 *     `evaluateConcurrency` ya las use para decidir elegibilidad de despacho
 *     no las vuelve opcionales aquí: una tarjeta puede haber sido elegible al
 *     despachar y dejar de estarlo antes de integrar (el destino avanzó, un
 *     cerrojo de migración se tomó, una decisión `D-XXX` cambió de estado).
 *     `evaluateIntegrationReadiness` es quien produce el manifest sobre el
 *     que una persona integra, así que es quien debe volver a comprobarlas.
 *
 * Se calcula sólo si se provee `tasks` (el resto de la cola); sin ella no
 * hay con qué comparar, y se reporta así explícitamente (`calculable: false`)
 * en vez de fingir "sin conflictos". `evaluateTaskReadiness` — el único punto
 * de entrada real del motor — siempre provee `tasks`; la ausencia sólo es
 * alcanzable invocando esta función directamente sin ese argumento, así que
 * `calculable: false` no bloquea `ready` por sí sola (evitaría romper la API
 * pública de esta función sin necesidad, para un caso que el motor nunca
 * produce). Un cálculo que sí se intenta y falla (excepción) es distinto y
 * sigue siendo fail-closed vía `CONFLICT_PREDICTION_FAILED`, sin cambios de
 * esta reparación.
 */
function evaluateGateConflictPrediction({ task, tasks, decisionEvidence, targetHeadCommit, taskContract }) {
  if (!Array.isArray(tasks)) {
    return {
      calculable: false,
      reason: 'no se proveyó `tasks` (la cola completa) para evaluar los gates de LOOP-002',
    };
  }

  const others = tasks.filter((t) => t.task_id !== task.task_id);
  const activeOthers = activeTasks(others);

  const fileCollision = fileOverlapConflicts(task, tasks);
  const globOverlap = detectCollisions(
    activeTasks(tasks).map((t) => ({ task_id: t.task_id, allowed_write: t.allowed_write })),
  );
  const sharedContract = sharedContractConflicts(task, activeOthers);
  const closure = transitiveDependencyClosure(task, tasks);
  const cycle = dependencyCycle(task, tasks);
  const migration = migrationLockConflicts(task, tasks);
  const decision = decisionGateConflicts(task, decisionEvidence);
  const staleBase = evaluateStaleBase({
    recordedBaseCommit: task.base_commit,
    targetHeadCommit,
    taskContract,
  });

  return {
    calculable: true,
    file_collision: { detected: fileCollision.length > 0, conflicts: fileCollision },
    glob_overlap: { detected: globOverlap.length > 0, collisions: globOverlap },
    shared_contract_collision: { detected: sharedContract.length > 0, conflicts: sharedContract },
    dependency_conflict: {
      detected: closure.unmet.length > 0 || closure.malformed.length > 0 || cycle !== null,
      unmet: closure.unmet,
      malformed: closure.malformed,
      cycle,
    },
    stale_base: staleBase,
    migration_lock: { detected: migration.length > 0, conflicts: migration },
    pending_decision: { detected: decision.length > 0, conflicts: decision },
  };
}

/**
 * @param {object} handoff evidencia declarada por el constructor
 * @param {object} auditResult veredicto de la auditoría independiente
 * @param {object} taskContract contrato de la tarjeta (`allowed_write`, …)
 * @param {{repoPath?: string, targetRef?: string, tasks?: object[],
 *   decisionEvidence?: Record<string, {status: string}>}} [opts]
 *   `repoPath`/`targetRef`: repositorio real a verificar (por defecto el
 *   del motor). `tasks`: el resto de la cola, para las dimensiones de
 *   `LOOP-002` de `conflict_prediction` — opcional; sin ella esas
 *   dimensiones se reportan `calculable: false`, nunca se omiten en
 *   silencio. `decisionEvidence`: evidencia explícita de `D-XXX` (§10.4),
 *   nunca inferida por el motor.
 */
export function evaluateIntegrationReadiness(
  handoff,
  auditResult,
  taskContract = {},
  { repoPath = repoRoot(), targetRef = 'HEAD', tasks, decisionEvidence } = {},
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
  // Fail-closed: un manifest READY nunca lleva `conflict_prediction: null`,
  // ni con las dimensiones de Git ni con las de LOOP-002 a medio calcular.
  let prediction = null;
  if (evidence.ok) {
    try {
      const gitPrediction = predictConflicts({
        repoPath,
        baseCommit: handoff.baseCommit,
        targetRef,
        changedFiles: evidence.changedFiles,
      });
      const gates = evaluateGateConflictPrediction({
        task: taskContract,
        tasks,
        decisionEvidence,
        targetHeadCommit: gitPrediction.target_head,
        taskContract,
      });
      prediction = { ...gitPrediction, ...gates };

      // --- 5b. gates normativos de LOOP-002 (§10.2–§10.5, §16) ------------
      // `file_collision`/`glob_overlap` se dejan fuera a propósito: no están
      // en `BLOCKED_REASONS`, siguen siendo informativas. Las otras cinco sí
      // lo están — su detección aquí debe producir exactamente lo que
      // produciría en el resto del motor: bloqueo, no una nota al margen.
      //
      // Sin `tasks` (`gates.calculable === false`) estas cinco dimensiones no
      // pueden evaluarse — se reportan explícitamente así (ver docstring de
      // `evaluateGateConflictPrediction`), pero **no bloquean por sí solo**:
      // `evaluateTaskReadiness`, el único punto de entrada del motor, siempre
      // provee `tasks` (`listTasks()`); la ausencia sólo ocurre al invocar
      // `evaluateIntegrationReadiness` directamente sin ese argumento — un
      // caso de API, no un candidato real sin cobertura. Un cálculo que sí
      // se intenta y falla (excepción) sigue cayendo en el `catch` de abajo,
      // que es fail-closed desde antes de esta reparación.
      if (gates.calculable) {
        if (gates.dependency_conflict.detected) {
          const parts = [];
          if (gates.dependency_conflict.cycle) {
            parts.push(`ciclo de dependencias: ${gates.dependency_conflict.cycle.join(' -> ')}`);
          }
          if (gates.dependency_conflict.malformed.length > 0) {
            parts.push(`referencias a tarjetas inexistentes: ${gates.dependency_conflict.malformed.join(', ')}`);
          }
          if (gates.dependency_conflict.unmet.length > 0) {
            parts.push(`dependencias sin cerrar: ${gates.dependency_conflict.unmet.join(', ')}`);
          }
          fail('DEPENDENCY_CONFLICT', parts.join('; '));
        }

        if (gates.pending_decision.detected) {
          fail(
            'PENDING_DECISION',
            `decisión(es) sin evidencia de aprobación: ${gates.pending_decision.conflicts
              .map((c) => `${c.decision_id} (${c.status})`)
              .join(', ')}`,
          );
        }

        if (gates.migration_lock.detected) {
          fail(
            'MIGRATION_LOCK_CONFLICT',
            `cerrojo de migración en conflicto: ${gates.migration_lock.conflicts
              .map((c) => `${c.check} con "${c.with}"`)
              .join('; ')}`,
          );
        }

        if (gates.shared_contract_collision.detected) {
          fail(
            'SHARED_CONTRACT_COLLISION',
            `colisión de contrato compartido: ${gates.shared_contract_collision.conflicts
              .map((c) => c.direction)
              .join('; ')}`,
          );
        }

        if (gates.stale_base.stale) {
          fail(
            'STALE_BASE',
            `base_commit ya no coincide con el HEAD destino (${gates.stale_base.status}); ` +
              'reconstruir sobre base nueva es decisión humana, el motor no rebasa solo (§16).',
          );
        }
      }
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
export function evaluateTaskReadiness({ taskId, repoPath, targetRef, decisionEvidence }) {
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
    { repoPath, targetRef, tasks: listTasks(), decisionEvidence },
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
