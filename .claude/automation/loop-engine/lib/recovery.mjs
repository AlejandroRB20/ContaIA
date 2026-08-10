import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { locksDir, taskLockFile, repoRoot } from './paths.mjs';
import { readLock } from './lock.mjs';

/**
 * Recuperación (arquitectura §16). Fusiona las dos aportaciones:
 * `classifyClaim`/`findRecoverableClaims`/`validateCandidateEnvironment` de
 * Claude-03 (`2e128c7`) y el ciclo `release`/`resume` de Claude-02
 * (`7bdf159`, ahora en `dispatcher.mjs`).
 *
 * **Principio transversal: el motor conserva y reporta; nunca borra,
 * descarta ni resetea.** Un lock vencido es *candidato* a huérfano, jamás
 * se elimina solo (§9.5, §16). Un worktree con cambios no se toca
 * (`.claude/rules/40-parallel-work.md` §4).
 */

/** Minutos sin heartbeat tras los que un lock es candidato a huérfano. */
export const LOCK_STALE_MINUTES = 45;

export function classifyClaim(lock, now, { heartbeatTimeoutMs, taskTimeoutMs } = {}) {
  const heartbeatLimit = heartbeatTimeoutMs ?? LOCK_STALE_MINUTES * 60_000;
  const createdAt = Date.parse(lock.created_at);
  const heartbeatAt = Date.parse(lock.heartbeat_at ?? lock.created_at);

  if (taskTimeoutMs !== undefined && now - createdAt > taskTimeoutMs) return 'TIMED_OUT';
  if (now - heartbeatAt > heartbeatLimit) return 'STALE_HEARTBEAT';
  return 'ACTIVE';
}

/**
 * Locks candidatos a recuperación. Cada uno se devuelve marcado
 * `requiresHumanConfirmation: true` — **no los libera**.
 */
export function findRecoverableClaims(now = Date.now(), timeouts = {}) {
  const dir = locksDir();
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.lock.json'))
    .map((name) => readLock(`${dir}/${name}`))
    .filter(Boolean)
    .map((lock) => ({ lock, status: classifyClaim(lock, now, timeouts) }))
    .filter(({ status }) => status !== 'ACTIVE')
    .map(({ lock, status }) => ({
      lock,
      status,
      requiresHumanConfirmation: true,
      note: 'Candidato a huérfano. El motor NO lo libera: exige confirmación humana explícita.',
    }));
}

/**
 * Valida que el entorno de un candidato sea utilizable. Sólo lectura.
 * @returns {string[]} códigos de problema; vacío si todo es válido
 */
export function validateCandidateEnvironment({
  repoPath = repoRoot(),
  worktreePath,
  candidateCommit,
} = {}) {
  const issues = [];

  if (!worktreePath || !fs.existsSync(worktreePath)) issues.push('WORKTREE_MISSING');

  if (!candidateCommit) {
    issues.push('CANDIDATE_COMMIT_MISSING');
  } else {
    try {
      execFileSync('git', ['cat-file', '-e', `${candidateCommit}^{commit}`], {
        cwd: repoPath,
        stdio: 'ignore',
      });
    } catch {
      issues.push('CANDIDATE_COMMIT_MISSING');
    }
  }

  return issues;
}

/** Estado de recuperación de una tarjeta, sin efectos secundarios. */
export function inspectTask(task, now = Date.now()) {
  const lock = readLock(taskLockFile(task.task_id));
  return {
    task_id: task.task_id,
    state: task.state,
    owner: task.owner,
    lock_present: lock !== null,
    lock_holder: lock?.agent_id ?? null,
    lock_status: lock ? classifyClaim(lock, now) : 'NO_LOCK',
    worktree: task.worktree,
    environment_issues: task.worktree
      ? validateCandidateEnvironment({
          worktreePath: task.worktree,
          candidateCommit: task.candidate_commit,
        })
      : ['WORKTREE_MISSING'],
  };
}
