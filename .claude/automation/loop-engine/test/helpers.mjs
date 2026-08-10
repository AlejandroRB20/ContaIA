import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

/** Directorio de estado temporal; ninguna prueba toca el estado real. */
export function useTempState(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'loop-engine-state-'));
  const previous = process.env.LOOP_ENGINE_STATE_DIR;
  process.env.LOOP_ENGINE_STATE_DIR = dir;
  t.after(() => {
    if (previous === undefined) delete process.env.LOOP_ENGINE_STATE_DIR;
    else process.env.LOOP_ENGINE_STATE_DIR = previous;
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}

/** `queue.yaml` temporal a partir de definiciones en objeto. */
export function useTempQueue(t, tasks, { version = 1 } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'loop-engine-queue-'));
  const file = path.join(dir, 'queue.yaml');
  fs.writeFileSync(file, toYaml({ version, tasks }), 'utf8');

  const previous = process.env.LOOP_ENGINE_QUEUE_FILE;
  process.env.LOOP_ENGINE_QUEUE_FILE = file;
  t.after(() => {
    if (previous === undefined) delete process.env.LOOP_ENGINE_QUEUE_FILE;
    else process.env.LOOP_ENGINE_QUEUE_FILE = previous;
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return file;
}

/** Serializador mínimo, sólo para fixtures de prueba. */
function toYaml({ version, tasks }) {
  const lines = [`version: ${version}`, 'tasks:'];
  for (const task of tasks) {
    const entries = Object.entries(task);
    entries.forEach(([key, value], index) => {
      const prefix = index === 0 ? '  - ' : '    ';
      if (Array.isArray(value)) {
        if (value.length === 0) {
          lines.push(`${prefix}${key}: []`);
        } else {
          lines.push(`${prefix}${key}:`);
          for (const item of value) lines.push(`      - ${item}`);
        }
      } else if (value === null) {
        lines.push(`${prefix}${key}: null`);
      } else if (typeof value === 'string') {
        lines.push(`${prefix}${key}: "${value}"`);
      } else {
        lines.push(`${prefix}${key}: ${value}`);
      }
    });
  }
  return `${lines.join('\n')}\n`;
}

/** Repositorio git real y aislado — nunca el de ContaIA. */
export function useTempRepo(t, { withSubstrate = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'loop-engine-repo-'));
  const run = (args) => execFileSync('git', args, { cwd: dir, stdio: 'pipe' });

  run(['init', '--quiet', '--initial-branch=trunk']);
  run(['config', 'user.email', 'test@example.com']);
  run(['config', 'user.name', 'Loop Engine Test']);

  fs.writeFileSync(path.join(dir, 'README.md'), 'seed\n');
  if (withSubstrate) writeSubstrate(dir);
  run(['add', '-A']);
  run(['commit', '--quiet', '-m', 'seed']);

  const baseCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: dir }).toString().trim();

  const previous = process.env.LOOP_ENGINE_REPO_ROOT;
  process.env.LOOP_ENGINE_REPO_ROOT = dir;
  t.after(() => {
    if (previous === undefined) delete process.env.LOOP_ENGINE_REPO_ROOT;
    else process.env.LOOP_ENGINE_REPO_ROOT = previous;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  return { dir, baseCommit };
}

/** Escribe el sustrato mínimo de gobierno que `verifySubstrate` exige. */
export function writeSubstrate(root) {
  fs.mkdirSync(path.join(root, '.claude', 'rules'), { recursive: true });
  fs.mkdirSync(path.join(root, '.claude', 'agents'), { recursive: true });
  fs.writeFileSync(path.join(root, 'CLAUDE.md'), '# reglas\n');
  fs.writeFileSync(path.join(root, 'AI_PLAYBOOK.md'), '# roles\n');
  fs.writeFileSync(path.join(root, '.claude', 'settings.json'), '{}\n');
  for (const rule of [
    '00-governance',
    '10-multitenancy-security',
    '20-fiscal-data-safety',
    '30-quality-scope',
    '40-parallel-work',
  ]) {
    fs.writeFileSync(path.join(root, '.claude', 'rules', `${rule}.md`), `# ${rule}\n`);
  }
  fs.writeFileSync(path.join(root, '.claude', 'agents', 'backend-engineer.md'), '# rol\n');
}

/**
 * Definición de tarjeta con valores por defecto sanos.
 *
 * `base_commit` se deja **sin valor** a propósito: quien monta el escenario
 * debe inyectar el commit real del repositorio temporal. Un placeholder
 * aquí haría que toda prueba fallara en `ensureWorktree` por una base
 * inexistente, y el fallo parecería del motor y no del fixture.
 */
export function taskDefinition(overrides = {}) {
  return {
    task_id: 'LOOP-TEST-001',
    mission_id: 'CONTAIA-TEST',
    title: 'Tarjeta de prueba',
    risk_class: 'STANDARD',
    state: 'READY',
    allowed_write: ['src/**'],
    forbidden_scope: ['packages/database/**'],
    dependencies: [],
    test_commands: ['echo ok'],
    ...overrides,
  };
}

/** Instancia de runtime lista para pruebas de máquina de estados. */
export function runtimeTask(overrides = {}) {
  return {
    task_id: 'LOOP-TEST-001',
    mission_id: 'CONTAIA-TEST',
    title: 'Tarjeta de prueba',
    risk_class: 'STANDARD',
    base_commit: 'deadbeef',
    allowed_write: ['src/**'],
    forbidden_scope: ['packages/database/**'],
    dependencies: [],
    test_commands: [],
    state: 'READY',
    repair_iteration: 0,
    qa_iteration: 0,
    owner: null,
    worktree: null,
    branch: null,
    candidate_commit: null,
    blocked_reason: null,
    ...overrides,
  };
}

export const AGENT = Object.freeze({ type: 'agent', id: 'CLAUDE-02', holdsLock: true });
export const HUMAN = Object.freeze({ type: 'human', id: 'ALEJANDRO' });

/** Handoff válido para pruebas de QA/readiness. */
export function handoff(overrides = {}) {
  return {
    implementerId: 'CLAUDE-02',
    candidateCommit: 'c0ffee1',
    baseCommit: 'deadbeef',
    changedFiles: ['src/a.ts'],
    tests: { passed: true, detail: '10/10' },
    typecheck: { passed: true },
    lint: { passed: true },
    ...overrides,
  };
}

export function finding(severity, overrides = {}) {
  return {
    severity,
    location: 'src/a.ts:10',
    problem: 'problema',
    evidence: 'evidencia',
    impact: 'impacto',
    recommendedFix: 'corrección mínima',
    ...overrides,
  };
}

export function auditResult(overrides = {}) {
  return { auditorId: 'CODEX-01', verdict: 'PASSED', findings: [], ...overrides };
}

/** `assert.throws` no devuelve el error; esto sí, para inspeccionar campos. */
export function captureError(fn) {
  try {
    fn();
  } catch (err) {
    return err;
  }
  throw new Error('Se esperaba una excepción y no se lanzó ninguna.');
}
