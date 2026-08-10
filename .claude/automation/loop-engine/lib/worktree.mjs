import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loopWorktreesDir, repoRoot, worktreeOwnershipFile } from './paths.mjs';
import { PROTECTED_BRANCHES, TASK_BRANCH_PREFIX } from './constants.mjs';

/**
 * Ciclo de vida y ownership del worktree de tarea.
 *
 * Invariante (arquitectura §9): **1 tarjeta = 1 worktree = 1 rama = 1
 * agente dueño.**
 *
 * Corrección aplicada respecto de Claude-02 (`7bdf159`), según
 * `LOOP-000_GOVERNANCE_SUBSTRATE.md` §6.2: los worktrees de tarea viven en
 * `.worktrees/loop/<task_id>` y **nunca** en `.claude/worktrees/`, que es
 * el espacio de los worktrees efímeros de Claude Code y podría reciclarlos
 * un proceso ajeno al motor.
 */

export class ProtectedBranchWriteError extends Error {
  constructor(branch) {
    super(`El motor no puede escribir sobre la rama protegida "${branch}" (arquitectura §1.1).`);
    this.name = 'ProtectedBranchWriteError';
    this.code = 'PROTECTED_BRANCH';
  }
}

export class ForbiddenWorktreeLocationError extends Error {
  constructor(target) {
    super(
      `Ubicación de worktree prohibida: "${target}". Los worktrees de tarea van en ` +
        '.worktrees/loop/<task_id>; .claude/worktrees/ está reservado a Claude Code.',
    );
    this.name = 'ForbiddenWorktreeLocationError';
    this.code = 'FORBIDDEN_WORKTREE_LOCATION';
  }
}

export class WorktreeOwnedError extends Error {
  constructor(taskId, owner) {
    super(
      `El worktree de "${taskId}" ya pertenece a la tarjeta "${owner.task_id}" ` +
        `(agente ${owner.agent_id}). No se reutiliza sin cierre explícito.`,
    );
    this.name = 'WorktreeOwnedError';
    this.code = 'WORKTREE_OWNED';
    this.owner = owner;
  }
}

/** Nombre determinista y seguro para el sistema de archivos. */
export function worktreeName(taskId) {
  return String(taskId)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function worktreePathFor(taskId) {
  return path.join(loopWorktreesDir(), worktreeName(taskId));
}

export function branchNameFor(taskId) {
  return `${TASK_BRANCH_PREFIX}${worktreeName(taskId)}`;
}

function assertBranchAllowed(branch) {
  if (PROTECTED_BRANCHES.includes(branch)) throw new ProtectedBranchWriteError(branch);
  if (!branch.startsWith(TASK_BRANCH_PREFIX)) {
    throw new Error(
      `La rama de tarea debe usar el prefijo reservado "${TASK_BRANCH_PREFIX}"; recibida "${branch}".`,
    );
  }
}

function assertLocationAllowed(target) {
  const normalized = target.replace(/\\/g, '/');
  if (normalized.includes('/.claude/worktrees/')) throw new ForbiddenWorktreeLocationError(target);
}

function readOwnership() {
  const file = worktreeOwnershipFile();
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

function writeOwnership(map) {
  const file = worktreeOwnershipFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(map, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, file);
}

export function getWorktreeOwner(name) {
  return readOwnership()[name] ?? null;
}

export function listWorktreeOwnership() {
  return readOwnership();
}

/** Registra ownership. Idempotente para la misma tarjeta; lanza si es de otra. */
export function registerWorktreeOwnership({ taskId, missionId, agentId, worktree, branch }) {
  const name = worktreeName(taskId);
  const map = readOwnership();
  const existing = map[name];
  if (existing && existing.task_id !== taskId) throw new WorktreeOwnedError(taskId, existing);

  map[name] = {
    task_id: taskId,
    mission_id: missionId ?? null,
    agent_id: agentId ?? null,
    worktree: worktree ?? worktreePathFor(taskId),
    branch: branch ?? branchNameFor(taskId),
    registered_at: existing?.registered_at ?? new Date().toISOString(),
  };
  writeOwnership(map);
  return map[name];
}

/**
 * Cierre explícito del ownership. No borra el worktree ni su contenido:
 * `.claude/rules/40-parallel-work.md` §4 prohíbe borrar un worktree con
 * cambios sin confirmación humana, y la arquitectura §16 lo reitera.
 */
export function releaseWorktreeOwnership(taskId, { confirmed } = {}) {
  if (confirmed !== true) {
    throw new Error(
      `releaseWorktreeOwnership exige confirmación explícita (confirmed: true) para "${taskId}".`,
    );
  }
  const name = worktreeName(taskId);
  const map = readOwnership();
  const released = map[name] ?? null;
  delete map[name];
  writeOwnership(map);
  return released;
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: 'pipe' }).trim();
}

/**
 * Crea (si no existe) el worktree de la tarjeta sobre `base_commit`, en su
 * propia rama con prefijo reservado. Verifica la base **antes** de crear.
 */
export function ensureWorktree({ taskId, baseCommit, branch }) {
  if (!baseCommit) throw new Error('base_commit es obligatorio para crear un worktree.');

  const dir = worktreePathFor(taskId);
  const targetBranch = branch ?? branchNameFor(taskId);
  assertBranchAllowed(targetBranch);
  assertLocationAllowed(dir);

  if (fs.existsSync(dir)) {
    return { taskId, dir, branch: targetBranch, created: false };
  }

  // La base debe existir antes de intentar nada (aceptación de LOOP-003).
  git(['cat-file', '-e', `${baseCommit}^{commit}`], repoRoot());

  fs.mkdirSync(loopWorktreesDir(), { recursive: true });
  git(['worktree', 'add', '--detach', dir, baseCommit], repoRoot());
  git(['checkout', '-b', targetBranch], dir);

  return { taskId, dir, branch: targetBranch, created: true };
}
