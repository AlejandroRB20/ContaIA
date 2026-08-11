import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import {
  useTempState,
  useTempQueue,
  useTempRepo,
  taskDefinition,
  commitFiles,
  captureError,
} from './helpers.mjs';

const CLI = fileURLToPath(new URL('../cli.mjs', import.meta.url));

function runCli(args) {
  return execFileSync('node', [CLI, ...args], { encoding: 'utf8', env: { ...process.env } });
}

function setup(t, tasks = [taskDefinition()]) {
  const repo = useTempRepo(t);
  useTempState(t);
  useTempQueue(
    t,
    tasks.map((task) => ({ ...task, base_commit: task.base_commit ?? repo.baseCommit })),
  );
  return repo;
}

test('list muestra las tarjetas de queue.yaml con su estado', (t) => {
  setup(t);
  const out = runCli(['list']);
  assert.match(out, /LOOP-TEST-001\s+READY\s+STANDARD/);
});

test('list --state filtra', (t) => {
  setup(t, [taskDefinition(), taskDefinition({ task_id: 'OTRA', state: 'BLOCKED' })]);
  assert.match(runCli(['list', '--state', 'BLOCKED']), /OTRA/);
  assert.doesNotMatch(runCli(['list', '--state', 'BLOCKED']), /LOOP-TEST-001/);
});

test('status muestra la tarjeta, su recuperación y su historial', (t) => {
  setup(t);
  const out = runCli(['status', 'LOOP-TEST-001']);
  assert.match(out, /"task_id": "LOOP-TEST-001"/);
  assert.match(out, /--- recuperación ---/);
  assert.match(out, /--- eventos ---/);
});

test('claim despacha y transition avanza el estado', (t) => {
  setup(t);
  const claimed = JSON.parse(runCli(['claim', '--agent', 'CLAUDE-02']));
  assert.equal(claimed.dispatched, true);
  assert.equal(claimed.task.state, 'IMPLEMENTING');

  const moved = JSON.parse(
    runCli(['transition', 'LOOP-TEST-001', '--to', 'TESTING', '--agent', 'CLAUDE-02']),
  );
  assert.equal(moved.state, 'TESTING');
});

test('block exige --reason y registra el motivo tipificado', (t) => {
  setup(t);
  assert.throws(() => runCli(['block', 'LOOP-TEST-001']));
  const blocked = JSON.parse(
    runCli([
      'block',
      'LOOP-TEST-001',
      '--reason',
      'falta definicion',
      '--blocked-reason',
      'unclassified',
      '--agent',
      'CLAUDE-02',
    ]),
  );
  assert.equal(blocked.state, 'BLOCKED');
  assert.equal(blocked.blocked_reason, 'unclassified');
});

// --- 29. BLOCKED -> READY requiere humano, también desde la CLI -------------

test('resume sin --human es rechazado por la CLI', (t) => {
  setup(t, [taskDefinition({ state: 'BLOCKED' })]);
  const err = captureError(() => runCli(['resume', 'LOOP-TEST-001', '--agent', 'CLAUDE-02']));
  assert.match(err.stderr ?? String(err), /gate humano/);
});

test('resume con --human desbloquea y queda registrado como humano', (t) => {
  setup(t, [taskDefinition({ state: 'BLOCKED' })]);
  const resumed = JSON.parse(runCli(['resume', 'LOOP-TEST-001', '--human', 'ALEJANDRO']));
  assert.equal(resumed.state, 'READY');
  assert.match(runCli(['status', 'LOOP-TEST-001']), /human:ALEJANDRO/);
});

test('validate comprueba la cola y el sustrato', (t) => {
  const repo = setup(t);
  const out = runCli(['validate', '--worktree', repo.dir]);
  assert.match(out, /queue\.yaml: OK/);
  assert.match(out, /sustrato: OK/);
});

test('validate falla cuando el sustrato no está', (t) => {
  setup(t);
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'sin-sustrato-'));
  t.after(() => fs.rmSync(empty, { recursive: true, force: true }));
  const err = captureError(() => runCli(['validate', '--worktree', empty]));
  assert.equal(err.status, 1, 'validate debe salir con código 1');
  assert.match(`${err.stdout ?? ''}${err.stderr ?? ''}`, /sustrato: FALTA/);
});

/**
 * Flujo completo por CLI: el implementador construye y entrega evidencia,
 * el auditor independiente audita y persiste, y sólo entonces el gate de
 * integración evalúa contra Git real.
 */
test('handoff + qa + readiness: flujo real, con evidencia Git y sin integrar', (t) => {
  const repo = setup(t);
  const candidate = commitFiles(repo.dir, { 'src/a.ts': 'candidato\n' });

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'loop-cli-io-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const handoffFile = path.join(dir, 'handoff.json');
  const auditFile = path.join(dir, 'audit.json');
  fs.writeFileSync(
    handoffFile,
    JSON.stringify({
      implementerId: 'CLAUDE-02',
      candidateCommit: candidate,
      baseCommit: repo.baseCommit,
      changedFiles: ['src/a.ts'],
      tests: { passed: true },
      typecheck: { passed: true },
      lint: { passed: true },
    }),
  );
  fs.writeFileSync(
    auditFile,
    JSON.stringify({ auditorId: 'CODEX-01', verdict: 'PASSED', findings: [] }),
  );

  runCli(['claim', '--agent', 'CLAUDE-02']);
  runCli(['transition', 'LOOP-TEST-001', '--to', 'TESTING', '--agent', 'CLAUDE-02']);
  runCli([
    'transition', 'LOOP-TEST-001', '--to', 'READY_FOR_QA',
    '--agent', 'CLAUDE-02', '--commit', candidate,
  ]);

  const entregado = runCli([
    'handoff', 'LOOP-TEST-001', '--agent', 'CLAUDE-02', '--file', handoffFile,
  ]);
  assert.match(entregado, /"implementer_id": "CLAUDE-02"/);

  // El auditor no posee el lock y aun así puede auditar: es el handoff, no
  // el robo del claim, lo que le da autoridad.
  const auditado = JSON.parse(
    runCli(['qa', 'LOOP-TEST-001', '--auditor', 'CODEX-01', '--audit', auditFile]),
  );
  assert.equal(auditado.state, 'READY_FOR_INTEGRATION');
  assert.equal(auditado.qa_owner, 'CODEX-01');

  const out = runCli(['readiness', 'LOOP-TEST-001', '--repo', repo.dir, '--write']);
  assert.match(out, /"ready": true/);
  assert.match(out, /"candidate_commit_verified": true/);
  assert.match(out, /El motor NO integra/);
});

test('qa exige un auditor declarado', (t) => {
  setup(t);
  assert.throws(() => runCli(['qa', 'LOOP-TEST-001']));
});

test('readiness sin QA persistido no evalúa nada', (t) => {
  setup(t);
  const err = captureError(() => runCli(['readiness', 'LOOP-TEST-001']));
  assert.match(`${err.stdout ?? ''}${err.stderr ?? ''}`, /no tiene handoff de QA persistido/);
});

test('un comando desconocido sale con código distinto de 0', (t) => {
  setup(t);
  assert.throws(() => runCli(['no-existe']));
});
