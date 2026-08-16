import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDecisionAccepted, decisionGateConflicts } from '../lib/decision-gate.mjs';
import { runtimeTask } from './helpers.mjs';

// --- 8. pending D-XXX blocks -------------------------------------------------

test('D-XXX pendiente bloquea', () => {
  const task = runtimeTask({ decision_refs: ['D-014'] });
  const conflicts = decisionGateConflicts(task, { 'D-014': { status: 'PROPUESTA' } });
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].check, 'PENDING_DECISION_GATE');
  assert.equal(conflicts[0].decision_id, 'D-014');
  assert.equal(conflicts[0].status, 'PROPUESTA');
  assert.equal(conflicts[0].blocked_reason, 'pending_decision');
});

// --- 9. approved D-XXX permits ----------------------------------------------

test('las tres formas canónicas de aprobación permiten', () => {
  for (const status of ['ACEPTADA', 'Aprobada y vigente', 'IMPLEMENTADA · PASSED']) {
    assert.equal(isDecisionAccepted(status), true, status);
    const task = runtimeTask({ decision_refs: ['D-010'] });
    const conflicts = decisionGateConflicts(task, { 'D-010': { status } });
    assert.deepEqual(conflicts, []);
  }
});

test('una variante no canónica no se adivina como aprobada', () => {
  // "casi aprobada" o "en revisión final" no son las tres formas exactas —
  // el motor no interpreta matices, sólo compara contra el vocabulario
  // literal de la arquitectura.
  const task = runtimeTask({ decision_refs: ['D-014'] });
  const conflicts = decisionGateConflicts(task, {
    'D-014': { status: 'APROBADA (pendiente de firma)' },
  });
  assert.equal(conflicts.length, 1);
});

// --- 10. missing decision evidence blocks -----------------------------------

test('sin evidencia en absoluto, decision_refs bloquea', () => {
  const task = runtimeTask({ decision_refs: ['D-014'] });
  const conflicts = decisionGateConflicts(task, undefined);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].status, 'MISSING_EVIDENCE');
});

test('evidencia presente pero sin esa decisión concreta también bloquea', () => {
  const task = runtimeTask({ decision_refs: ['D-014'] });
  const conflicts = decisionGateConflicts(task, { 'D-011': { status: 'ACEPTADA' } });
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].decision_id, 'D-014');
  assert.equal(conflicts[0].status, 'MISSING_EVIDENCE');
});

test('no inferir aprobación de la sola presencia de un objeto sin status', () => {
  const task = runtimeTask({ decision_refs: ['D-014'] });
  const conflicts = decisionGateConflicts(task, { 'D-014': {} });
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].status, 'MISSING_EVIDENCE');
});

// --- comportamiento sin decision_refs ---------------------------------------

test('sin decision_refs declarado, no hay nada que evaluar', () => {
  const task = runtimeTask({ decision_refs: [] });
  assert.deepEqual(decisionGateConflicts(task, {}), []);
  assert.deepEqual(decisionGateConflicts(runtimeTask({}), undefined), []);
});

test('varias decisiones: cada una se evalúa independientemente', () => {
  const task = runtimeTask({ decision_refs: ['D-010', 'D-011', 'D-014'] });
  const conflicts = decisionGateConflicts(task, {
    'D-010': { status: 'IMPLEMENTADA · PASSED' },
    'D-011': { status: 'ACEPTADA' },
    // D-014 sin evidencia
  });
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].decision_id, 'D-014');
});
