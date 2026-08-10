import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  verifySubstrate,
  assertSubstrate,
  REQUIRED_SUBSTRATE,
  SubstrateMissingError,
} from '../lib/substrate.mjs';
import { writeSubstrate, captureError } from './helpers.mjs';

function tempRoot(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'loop-engine-substrate-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// --- 26. sustrato válido ----------------------------------------------------

test('sustrato completo: ok = true', (t) => {
  const root = tempRoot(t);
  writeSubstrate(root);
  const result = verifySubstrate(root);
  assert.equal(result.ok, true);
  assert.deepEqual(result.missing, []);
});

test('exige el rol declarado cuando se indica agentRole', (t) => {
  const root = tempRoot(t);
  writeSubstrate(root);
  assert.equal(verifySubstrate(root, { agentRole: 'backend-engineer' }).ok, true);

  const missing = verifySubstrate(root, { agentRole: 'no-existe' });
  assert.equal(missing.ok, false);
  assert.ok(missing.missing.includes('.claude/agents/no-existe.md'));
});

// --- 25. sustrato faltante --------------------------------------------------

test('cada pieza obligatoria, ausente por separado, bloquea', (t) => {
  for (const required of REQUIRED_SUBSTRATE) {
    const root = tempRoot(t);
    writeSubstrate(root);
    fs.rmSync(path.join(root, required));

    const result = verifySubstrate(root);
    assert.equal(result.ok, false, `sin ${required} debe fallar`);
    assert.ok(result.missing.includes(required));
  }
});

test('un worktree sin .claude/ en absoluto falla con la lista completa', (t) => {
  const root = tempRoot(t);
  const result = verifySubstrate(root);
  assert.equal(result.ok, false);
  assert.ok(result.missing.includes('.claude/settings.json'));
  assert.ok(result.missing.includes('.claude/rules/00-governance.md'));
  assert.ok(result.missing.includes('.claude/rules/ (directorio)'));
  assert.ok(result.missing.includes('.claude/agents/ (directorio)'));
});

test('un directorio de reglas vacío no cuenta como sustrato', (t) => {
  const root = tempRoot(t);
  writeSubstrate(root);
  for (const file of fs.readdirSync(path.join(root, '.claude', 'agents'))) {
    fs.rmSync(path.join(root, '.claude', 'agents', file));
  }
  const result = verifySubstrate(root);
  assert.equal(result.ok, false);
  assert.ok(result.missing.includes('.claude/agents/ (vacío)'));
});

test('assertSubstrate lanza con blocked_reason tipificado y NO repara nada', (t) => {
  const root = tempRoot(t);
  const err = captureError(() => assertSubstrate(root));

  assert.ok(err instanceof SubstrateMissingError);
  assert.equal(err.blocked_reason, 'substrate_missing');
  assert.match(err.message, /NO copia ni regenera/);

  // Fail-closed de verdad: tras el fallo no se creó ningún archivo.
  assert.equal(fs.existsSync(path.join(root, '.claude')), false);
  assert.equal(fs.existsSync(path.join(root, 'CLAUDE.md')), false);
});

test('un archivo esperado que es en realidad un directorio no cuenta', (t) => {
  const root = tempRoot(t);
  writeSubstrate(root);
  fs.rmSync(path.join(root, '.claude', 'settings.json'));
  fs.mkdirSync(path.join(root, '.claude', 'settings.json'));

  const result = verifySubstrate(root);
  assert.equal(result.ok, false);
  assert.ok(result.missing.includes('.claude/settings.json'));
});
