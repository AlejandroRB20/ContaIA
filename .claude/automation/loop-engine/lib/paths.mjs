import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Resolución centralizada de rutas. `LOOP_ENGINE_STATE_DIR` y
 * `LOOP_ENGINE_REPO_ROOT` permiten a las pruebas apuntar a un estado y a un
 * repositorio temporales sin tocar los reales.
 */
const ENGINE_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DEFAULT_REPO_ROOT = path.resolve(ENGINE_ROOT, '..', '..', '..');

export function engineRoot() {
  return ENGINE_ROOT;
}

export function repoRoot() {
  return process.env.LOOP_ENGINE_REPO_ROOT ?? DEFAULT_REPO_ROOT;
}

/** `queue.yaml` — VERSIONADO. Definiciones de tarjeta, nunca estado. */
export function queueFile() {
  return process.env.LOOP_ENGINE_QUEUE_FILE ?? path.join(ENGINE_ROOT, 'queue.yaml');
}

/** `state/` — IGNORADO. Todo lo de aquí es efímero (arquitectura §8). */
export function stateDir() {
  return process.env.LOOP_ENGINE_STATE_DIR ?? path.join(ENGINE_ROOT, 'state');
}

export function taskStateFile(taskId) {
  return path.join(stateDir(), `${taskId}.json`);
}

export function locksDir() {
  return path.join(stateDir(), 'locks');
}

export function taskLockFile(taskId) {
  return path.join(locksDir(), `${taskId}.lock.json`);
}

export function stateMutationLockFile() {
  return path.join(stateDir(), 'state.lock');
}

export function eventsFile() {
  return path.join(stateDir(), 'events.jsonl');
}

export function worktreeOwnershipFile() {
  return path.join(stateDir(), 'worktree-ownership.json');
}

export function manifestsDir() {
  return path.join(stateDir(), 'manifests');
}

/**
 * Worktrees de tarea: `.worktrees/loop/<task_id>`.
 * `.claude/worktrees/` queda PROHIBIDO — es el espacio de los worktrees
 * efímeros de Claude Code, que un proceso ajeno puede reciclar
 * (`LOOP-000_GOVERNANCE_SUBSTRATE.md` §6.2).
 */
export function loopWorktreesDir() {
  return path.join(repoRoot(), '.worktrees', 'loop');
}
