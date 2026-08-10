import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Preflight de Git. Adoptado de Claude-03 (`2e128c7`) prácticamente tal
 * cual: `LOOP-000_GOVERNANCE_SUBSTRATE.md` §6.3 lo marca `REUSE` —
 * "correcto y consciente de worktrees".
 *
 * El motor **DETECTA, BLOQUEA y REPORTA. Nunca corrige** (misión T12):
 * no borra `index.lock`, no aborta un merge/rebase/cherry-pick en curso,
 * no limpia el working tree. Todas son operaciones que `.claude/rules/`
 * y `.claude/settings.json` reservan a decisión humana.
 */

/**
 * Evalúa hechos ya recolectados; nunca ejecuta git. Función pura para que
 * cada bloqueo sea probable sin repositorio real.
 */
export function evaluatePreflight(facts) {
  const blockers = [];

  if (facts.currentBranch !== facts.expectedBranch) {
    blockers.push({
      code: 'BRANCH_MISMATCH',
      detail: `rama actual "${facts.currentBranch}" != esperada "${facts.expectedBranch}"`,
    });
  }
  if (facts.headCommit !== facts.expectedBaseCommit) {
    blockers.push({
      code: 'BASE_MISMATCH',
      detail: `HEAD "${facts.headCommit}" != base esperada "${facts.expectedBaseCommit}"`,
    });
  }
  if (facts.indexLockPresent) {
    blockers.push({
      code: 'INDEX_LOCKED',
      detail: 'index.lock presente — otra operación git en curso. Nunca se borra automáticamente.',
    });
  }
  if (facts.mergeInProgress) {
    blockers.push({ code: 'MERGE_IN_PROGRESS', detail: 'MERGE_HEAD presente' });
  }
  if (facts.rebaseInProgress) {
    blockers.push({ code: 'REBASE_IN_PROGRESS', detail: 'rebase-merge/rebase-apply presente' });
  }
  if (facts.cherryPickInProgress) {
    blockers.push({ code: 'CHERRY_PICK_IN_PROGRESS', detail: 'CHERRY_PICK_HEAD presente' });
  }
  if (!facts.workingTreeClean) {
    blockers.push({ code: 'WORKING_TREE_DIRTY', detail: 'el worktree tiene cambios sin commitear' });
  }
  if (facts.claimedByAgentId !== facts.actualAgentId) {
    blockers.push({
      code: 'OWNERSHIP_MISMATCH',
      detail: `worktree reclamado por "${facts.claimedByAgentId}", ejecutado por "${facts.actualAgentId}"`,
    });
  }

  return { safe: blockers.length === 0, blockers };
}

function git(repoPath, args) {
  return execFileSync('git', args, { cwd: repoPath, encoding: 'utf8' }).trim();
}

function gitPathExists(repoPath, relativeGitPath) {
  try {
    const resolved = git(repoPath, ['rev-parse', '--git-path', relativeGitPath]);
    return existsSync(resolve(repoPath, resolved));
  } catch {
    return false;
  }
}

/**
 * Recolecta hechos reales. Usa `rev-parse --git-path` para resolver rutas
 * tanto en un checkout normal como en un worktree — donde `.git` es un
 * archivo que apunta al gitdir real, de modo que comprobar
 * `.git/index.lock` a mano daría siempre falso.
 */
export function gatherGitFacts({
  repoPath,
  expectedBranch,
  expectedBaseCommit,
  claimedByAgentId,
  actualAgentId,
}) {
  return {
    currentBranch: git(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD']),
    expectedBranch,
    headCommit: git(repoPath, ['rev-parse', 'HEAD']),
    expectedBaseCommit,
    indexLockPresent: gitPathExists(repoPath, 'index.lock'),
    mergeInProgress: gitPathExists(repoPath, 'MERGE_HEAD'),
    rebaseInProgress:
      gitPathExists(repoPath, 'rebase-merge') || gitPathExists(repoPath, 'rebase-apply'),
    cherryPickInProgress: gitPathExists(repoPath, 'CHERRY_PICK_HEAD'),
    workingTreeClean: git(repoPath, ['status', '--porcelain']).length === 0,
    claimedByAgentId,
    actualAgentId,
  };
}

/** Recolecta y evalúa en un paso. */
export function runPreflight(options) {
  const facts = gatherGitFacts(options);
  return { facts, ...evaluatePreflight(facts) };
}
