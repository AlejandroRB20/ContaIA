import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { evaluatePreflight, gatherGitFacts, runPreflight } from '../lib/git-safety.mjs';
import { evaluateStaleBase, detectDrift } from '../lib/stale-base.mjs';
import { useTempRepo } from './helpers.mjs';

function facts(overrides = {}) {
  return {
    currentBranch: 'loop/task',
    expectedBranch: 'loop/task',
    headCommit: 'abc',
    expectedBaseCommit: 'abc',
    indexLockPresent: false,
    mergeInProgress: false,
    rebaseInProgress: false,
    cherryPickInProgress: false,
    workingTreeClean: true,
    claimedByAgentId: 'CLAUDE-02',
    actualAgentId: 'CLAUDE-02',
    ...overrides,
  };
}

function codes(result) {
  return result.blockers.map((b) => b.code);
}

test('preflight limpio: safe = true, sin bloqueadores', () => {
  const result = evaluatePreflight(facts());
  assert.equal(result.safe, true);
  assert.deepEqual(result.blockers, []);
});

// --- 15. branch mismatch ----------------------------------------------------

test('branch mismatch bloquea', () => {
  const result = evaluatePreflight(facts({ currentBranch: 'feature/frontend-ux-audit' }));
  assert.equal(result.safe, false);
  assert.ok(codes(result).includes('BRANCH_MISMATCH'));
});

// --- 16. base mismatch ------------------------------------------------------

test('base mismatch bloquea', () => {
  const result = evaluatePreflight(facts({ headCommit: 'otro' }));
  assert.equal(result.safe, false);
  assert.ok(codes(result).includes('BASE_MISMATCH'));
});

// --- 17. operación git activa -----------------------------------------------

test('index.lock bloquea y NO se borra automáticamente', () => {
  const result = evaluatePreflight(facts({ indexLockPresent: true }));
  assert.equal(result.safe, false);
  const blocker = result.blockers.find((b) => b.code === 'INDEX_LOCKED');
  assert.match(blocker.detail, /[Nn]unca se borra autom/);
});

test('merge, rebase y cherry-pick en curso bloquean cada uno', () => {
  for (const [flag, code] of [
    ['mergeInProgress', 'MERGE_IN_PROGRESS'],
    ['rebaseInProgress', 'REBASE_IN_PROGRESS'],
    ['cherryPickInProgress', 'CHERRY_PICK_IN_PROGRESS'],
  ]) {
    const result = evaluatePreflight(facts({ [flag]: true }));
    assert.equal(result.safe, false);
    assert.ok(codes(result).includes(code), `${flag} debe producir ${code}`);
  }
});

test('working tree sucio bloquea', () => {
  const result = evaluatePreflight(facts({ workingTreeClean: false }));
  assert.ok(codes(result).includes('WORKING_TREE_DIRTY'));
});

test('ownership mismatch bloquea', () => {
  const result = evaluatePreflight(facts({ actualAgentId: 'CLAUDE-03' }));
  assert.ok(codes(result).includes('OWNERSHIP_MISMATCH'));
});

test('varios problemas simultáneos se reportan todos, no sólo el primero', () => {
  const result = evaluatePreflight(
    facts({ currentBranch: 'otra', headCommit: 'otro', workingTreeClean: false }),
  );
  assert.equal(result.blockers.length, 3);
});

test('gatherGitFacts resuelve rutas correctamente dentro de un worktree real', (t) => {
  const repo = useTempRepo(t);
  const worktreeDir = path.join(repo.dir, 'wt');
  execFileSync('git', ['worktree', 'add', '--detach', worktreeDir, repo.baseCommit], {
    cwd: repo.dir,
    stdio: 'pipe',
  });

  const gathered = gatherGitFacts({
    repoPath: worktreeDir,
    expectedBranch: 'HEAD',
    expectedBaseCommit: repo.baseCommit,
    claimedByAgentId: 'A',
    actualAgentId: 'A',
  });

  assert.equal(gathered.headCommit, repo.baseCommit);
  assert.equal(gathered.indexLockPresent, false);
  assert.equal(gathered.workingTreeClean, true);

  // Un archivo sin commitear debe detectarse como working tree sucio.
  fs.writeFileSync(path.join(worktreeDir, 'nuevo.txt'), 'x\n');
  const dirty = runPreflight({
    repoPath: worktreeDir,
    expectedBranch: 'HEAD',
    expectedBaseCommit: repo.baseCommit,
    claimedByAgentId: 'A',
    actualAgentId: 'A',
  });
  assert.equal(dirty.safe, false);
  assert.ok(dirty.blockers.some((b) => b.code === 'WORKING_TREE_DIRTY'));
});

// --- 18. stale base ---------------------------------------------------------

test('base al día: CURRENT', () => {
  const result = evaluateStaleBase({ recordedBaseCommit: 'a', targetHeadCommit: 'a' });
  assert.equal(result.stale, false);
  assert.equal(result.status, 'CURRENT');
});

test('base desfasada sin allow_rebase: BLOCKED (fail-closed)', () => {
  const result = evaluateStaleBase({ recordedBaseCommit: 'a', targetHeadCommit: 'b' });
  assert.equal(result.stale, true);
  assert.equal(result.status, 'BLOCKED');
});

test('base desfasada con allow_rebase explícito: READY_FOR_REBASE', () => {
  const result = evaluateStaleBase({
    recordedBaseCommit: 'a',
    targetHeadCommit: 'b',
    taskContract: { allow_rebase: true },
  });
  assert.equal(result.status, 'READY_FOR_REBASE');
});

test('detectDrift registra los commits intermedios y no muta historia', (t) => {
  const repo = useTempRepo(t);
  fs.writeFileSync(path.join(repo.dir, 'otro.txt'), 'y\n');
  execFileSync('git', ['add', '-A'], { cwd: repo.dir, stdio: 'pipe' });
  execFileSync('git', ['commit', '--quiet', '-m', 'segundo'], { cwd: repo.dir, stdio: 'pipe' });

  const headAfter = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo.dir }).toString().trim();

  const drift = detectDrift({
    repoPath: repo.dir,
    targetRef: 'HEAD',
    recordedBaseCommit: repo.baseCommit,
  });

  assert.equal(drift.stale, true);
  assert.equal(drift.status, 'BLOCKED');
  assert.equal(drift.targetHeadCommit, headAfter);
  assert.equal(drift.baseIsAncestor, true);
  assert.equal(drift.driftCommits.length, 1);
  assert.match(drift.driftCommits[0], /segundo/);

  // La historia no cambió: el commit base sigue existiendo tal cual.
  assert.doesNotThrow(() =>
    execFileSync('git', ['cat-file', '-e', `${repo.baseCommit}^{commit}`], { cwd: repo.dir }),
  );
});
