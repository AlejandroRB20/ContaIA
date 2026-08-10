import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { useTempState, useTempQueue, useTempRepo, taskDefinition, captureError } from './helpers.mjs';

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

test('readiness genera manifest sólo si todo está en verde, y no integra', (t) => {
  const repo = setup(t);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'loop-cli-io-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const handoffFile = path.join(dir, 'handoff.json');
  const auditFile = path.join(dir, 'audit.json');
  fs.writeFileSync(
    handoffFile,
    JSON.stringify({
      implementerId: 'CLAUDE-02',
      candidateCommit: repo.baseCommit,
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

  const out = runCli([
    'readiness',
    'LOOP-TEST-001',
    '--handoff',
    handoffFile,
    '--audit',
    auditFile,
    '--write',
  ]);
  assert.match(out, /"ready": true/);
  assert.match(out, /El motor NO integra/);
});

test('un comando desconocido sale con código distinto de 0', (t) => {
  setup(t);
  assert.throws(() => runCli(['no-existe']));
});
