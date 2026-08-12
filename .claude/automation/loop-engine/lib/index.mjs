/**
 * Superficie pública del Loop Engine v1 unificado.
 *
 * Un solo motor: reúne la cola, la máquina de estados, los locks, los
 * worktrees, el event log y la CLI de Claude-02 (`7bdf159`) con la capa de
 * QA y seguridad de Claude-03 (`2e128c7`), en la ubicación canónica
 * ratificada `.claude/automation/loop-engine/`.
 */

export * from './constants.mjs';
export * from './state-machine.mjs';
export * from './glob.mjs';
export * from './yaml.mjs';
export * from './queue.mjs';
export * from './store.mjs';
export * from './lock.mjs';
export * from './events.mjs';
export * from './transaction.mjs';
export * from './guard.mjs';
export * from './substrate.mjs';
export * from './worktree.mjs';
export * from './concurrency.mjs';
export * from './file-collision.mjs';
export * from './git-safety.mjs';
export * from './stale-base.mjs';
export * from './qa-contract.mjs';
export * from './finding-gate.mjs';
export * from './qa-loop.mjs';
export * from './qa-session.mjs';
export * from './integration-readiness.mjs';
export * from './recovery.mjs';
export * from './dispatcher.mjs';
