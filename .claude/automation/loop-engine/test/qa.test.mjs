import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertIndependentAuditor,
  validateHandoff,
  validateAuditResult,
  canonicalizeAuditResult,
  NonIndependentAuditorError,
} from '../lib/qa-contract.mjs';
import { evaluateFindings, UnknownSeverityError } from '../lib/finding-gate.mjs';
import {
  createLoopState,
  beginQa,
  submitQaResult,
  beginRepair,
  completeRepair,
  finishTesting,
} from '../lib/qa-loop.mjs';
import { SEVERITIES, normalizeSeverity } from '../lib/constants.mjs';
import { handoff, auditResult, finding, captureError } from './helpers.mjs';

// --- 10. auditor == implementador -------------------------------------------

test('auditor == implementador: se rechaza antes de interpretar el veredicto', () => {
  const h = handoff({ implementerId: 'CLAUDE-02' });
  const a = auditResult({ auditorId: 'CLAUDE-02' });
  assert.throws(() => assertIndependentAuditor(h, a), NonIndependentAuditorError);
});

test('auditor == implementador: el ciclo de QA nunca llega a promover', () => {
  const h = handoff({ implementerId: 'CLAUDE-02' });
  const loop = beginQa(createLoopState('T-1', h));
  assert.throws(
    () => submitQaResult(loop, auditResult({ auditorId: 'CLAUDE-02' })),
    NonIndependentAuditorError,
  );
});

test('auditor distinto: el ciclo procede con normalidad', () => {
  const loop = beginQa(createLoopState('T-1', handoff()));
  const result = submitQaResult(loop, auditResult({ auditorId: 'CODEX-01' }));
  assert.equal(result.state, 'READY_FOR_INTEGRATION');
});

// --- severidades canónicas (T5) ---------------------------------------------

test('severidades canónicas: CRÍTICO con tilde es la forma persistida', () => {
  assert.deepEqual(SEVERITIES, ['CRÍTICO', 'ALTO', 'MEDIO', 'BAJO']);
  assert.equal(normalizeSeverity('CRITICO'), 'CRÍTICO');
  assert.equal(normalizeSeverity('crítico'), 'CRÍTICO');
  assert.equal(normalizeSeverity('inventada'), null);
});

test('canonicalizeAuditResult normaliza CRITICO -> CRÍTICO al persistir', () => {
  const canonical = canonicalizeAuditResult(
    auditResult({ findings: [finding('CRITICO')] }),
  );
  assert.equal(canonical.findings[0].severity, 'CRÍTICO');
});

// --- 11/12/13/14. finding gate ----------------------------------------------

test('CRÍTICO bloquea siempre y enruta a QA_FAILED; ningún contrato lo levanta', () => {
  const gate = evaluateFindings([finding('CRÍTICO')], { allow_low_findings: true });
  assert.equal(gate.blocked, true);
  assert.equal(gate.route, 'QA_FAILED');
});

test('ALTO bloquea siempre y enruta a QA_FAILED', () => {
  const gate = evaluateFindings([finding('ALTO')], { allow_low_findings: true });
  assert.equal(gate.blocked, true);
  assert.equal(gate.route, 'QA_FAILED');
});

test('MEDIO bloquea y enruta a BLOCKED_HUMAN_DECISION, incluso con allow_low_findings', () => {
  const gate = evaluateFindings([finding('MEDIO')], { allow_low_findings: true });
  assert.equal(gate.blocked, true);
  assert.equal(gate.route, 'BLOCKED_HUMAN_DECISION');
});

test('BAJO bloquea por defecto (fail-closed)', () => {
  const gate = evaluateFindings([finding('BAJO')], {});
  assert.equal(gate.blocked, true);
  assert.equal(gate.route, 'BLOCKED_HUMAN_DECISION');
});

test('BAJO se permite sólo con autorización explícita del contrato', () => {
  const gate = evaluateFindings([finding('BAJO')], { allow_low_findings: true });
  assert.equal(gate.blocked, false);
  assert.equal(gate.route, 'READY_FOR_INTEGRATION');
});

test('sin hallazgos: ruta libre a READY_FOR_INTEGRATION', () => {
  const gate = evaluateFindings([], {});
  assert.equal(gate.blocked, false);
  assert.equal(gate.route, 'READY_FOR_INTEGRATION');
});

test('precedencia: CRÍTICO gana sobre MEDIO/BAJO en el enrutamiento', () => {
  const gate = evaluateFindings([finding('BAJO'), finding('MEDIO'), finding('CRÍTICO')], {});
  assert.equal(gate.route, 'QA_FAILED');
  assert.equal(gate.bySeverity['CRÍTICO'], 1);
});

test('una severidad inventada es un error, nunca un hallazgo ignorado', () => {
  assert.throws(() => evaluateFindings([finding('MENOR')], {}), UnknownSeverityError);
});

// --- auditor contradictorio (arquitectura §11.6) -----------------------------

test('PASSED con hallazgos bloqueantes escala a BLOCKED_ARCHITECTURE, nunca promueve', () => {
  const loop = beginQa(createLoopState('T-1', handoff()));
  const result = submitQaResult(loop, auditResult({ findings: [finding('CRÍTICO')] }));
  assert.equal(result.state, 'BLOCKED_ARCHITECTURE');
  assert.notEqual(result.state, 'READY_FOR_INTEGRATION');
  // La matriz §3.3 no habilita QA -> BLOCKED_ARCH directo: se pasa por QA_FAILED.
  assert.deepEqual(result.history.map((h) => h.to), ['QA', 'QA_FAILED', 'BLOCKED_ARCHITECTURE']);
  assert.equal(result.history.at(-1).blocked_reason, 'auditor_contradiction');
});

test('PASSED con un MEDIO va a BLOCKED_HUMAN_DECISION, no a integración', () => {
  const loop = beginQa(createLoopState('T-1', handoff()));
  const result = submitQaResult(loop, auditResult({ findings: [finding('MEDIO')] }));
  assert.equal(result.state, 'BLOCKED_HUMAN_DECISION');
  assert.equal(result.history.at(-1).blocked_reason, 'medium_finding_requires_decision');
});

test('veredicto BLOCKED del auditor escala a BLOCKED_ARCHITECTURE', () => {
  const loop = beginQa(createLoopState('T-1', handoff()));
  const result = submitQaResult(loop, auditResult({ verdict: 'BLOCKED' }));
  assert.equal(result.state, 'BLOCKED_ARCHITECTURE');
});

// --- 9. máximo de ciclos de QA en el bucle ----------------------------------

test('el tercer ciclo de QA es imposible: escala a BLOCKED_ARCHITECTURE', () => {
  let loop = createLoopState('T-1', handoff());
  const changes = auditResult({ verdict: 'REQUIRES_CHANGES', findings: [finding('ALTO')] });

  loop = submitQaResult(beginQa(loop), changes);
  assert.equal(loop.state, 'QA_FAILED');
  assert.equal(loop.qaCycles, 1);

  loop = finishTesting(completeRepair(beginRepair(loop)));
  loop = submitQaResult(beginQa(loop), changes);
  assert.equal(loop.state, 'QA_FAILED');
  assert.equal(loop.qaCycles, 2);

  loop = finishTesting(completeRepair(beginRepair(loop)));
  loop = submitQaResult(beginQa(loop), changes);
  assert.equal(loop.state, 'BLOCKED_ARCHITECTURE');
  assert.equal(loop.history.at(-1).blocked_reason, 'qa_repair_limit_exceeded');
});

// --- validación de contratos -------------------------------------------------

test('validateHandoff exige commits, archivos y los tres gates', () => {
  assert.equal(validateHandoff(handoff()).valid, true);
  const bad = validateHandoff({ implementerId: 'X' });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.some((e) => e.includes('candidateCommit')));
  assert.ok(bad.errors.some((e) => e.includes('tests.passed')));
});

test('validateAuditResult exige el formato completo de hallazgo', () => {
  assert.equal(validateAuditResult(auditResult()).valid, true);
  const bad = validateAuditResult(auditResult({ findings: [{ severity: 'ALTO' }] }));
  assert.equal(bad.valid, false);
  for (const field of ['location', 'problem', 'evidence', 'impact', 'recommendedFix']) {
    assert.ok(bad.errors.some((e) => e.includes(field)), `debe exigir ${field}`);
  }
});

test('un veredicto fuera del vocabulario es inválido', () => {
  const bad = validateAuditResult(auditResult({ verdict: 'APROBADO' }));
  assert.equal(bad.valid, false);
  const err = captureError(() =>
    submitQaResult(beginQa(createLoopState('T-1', handoff())), auditResult({ verdict: 'APROBADO' })),
  );
  assert.match(err.message, /Veredicto desconocido/);
});
