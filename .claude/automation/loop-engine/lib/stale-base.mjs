import { execFileSync } from 'node:child_process';

/**
 * Detección de drift de base. Adoptado de Claude-03 (`2e128c7`), marcado
 * `REUSE` en `LOOP-000_GOVERNANCE_SUBSTRATE.md` §6.3 porque ya coincide con
 * la arquitectura §16: **nunca se rebasa automáticamente.**
 *
 * `allow_rebase` del contrato es la única puerta hacia `READY_FOR_REBASE`;
 * su ausencia implica `BLOCKED` por defecto (fail-closed).
 *
 * Nota de vocabulario: `READY_FOR_REBASE` **no** es un estado de la máquina
 * canónica (§3.2) — es el veredicto de esta comprobación, que el dispatcher
 * traduce a `BLOCKED_HUMAN_DECISION` con `blocked_reason: stale_base`. El
 * rebase en sí lo ejecuta una persona, o una tarjeta nueva.
 */

export function evaluateStaleBase({ recordedBaseCommit, targetHeadCommit, taskContract = {} }) {
  if (recordedBaseCommit === targetHeadCommit) {
    return { stale: false, status: 'CURRENT' };
  }
  return {
    stale: true,
    status: taskContract.allow_rebase ? 'READY_FOR_REBASE' : 'BLOCKED',
  };
}

/**
 * Drift real contra una referencia, con los commits intermedios. Sólo
 * lectura: jamás ejecuta `rebase`, `merge` ni nada que altere historia.
 */
export function detectDrift({ repoPath, targetRef, recordedBaseCommit, taskContract = {} }) {
  const git = (args) => execFileSync('git', args, { cwd: repoPath, encoding: 'utf8' }).trim();

  const targetHeadCommit = git(['rev-parse', targetRef]);
  const evaluation = evaluateStaleBase({ recordedBaseCommit, targetHeadCommit, taskContract });

  let driftCommits = [];
  let baseIsAncestor = true;
  if (evaluation.stale) {
    const log = git(['log', '--oneline', `${recordedBaseCommit}..${targetHeadCommit}`]);
    driftCommits = log.length > 0 ? log.split('\n') : [];
    try {
      execFileSync('git', ['merge-base', '--is-ancestor', recordedBaseCommit, targetHeadCommit], {
        cwd: repoPath,
        stdio: 'ignore',
      });
    } catch {
      baseIsAncestor = false;
    }
  }

  return {
    ...evaluation,
    targetRef,
    targetHeadCommit,
    recordedBaseCommit,
    baseIsAncestor,
    driftCommits,
  };
}
