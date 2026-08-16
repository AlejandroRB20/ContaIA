import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STATES,
  TRANSITIONS,
  canTransition,
  requiresHuman,
  transitionKind,
  assertTransition,
  isTerminal,
  InvalidTransitionError,
  HumanGateRequiredError,
  LockRequiredError,
  IterationLimitExceededError,
} from '../lib/state-machine.mjs';
import { runtimeTask, AGENT, HUMAN, captureError } from './helpers.mjs';

// --- 1. transición válida ---------------------------------------------------

test('transición válida: READY -> CLAIMED por un agente', () => {
  const result = assertTransition(runtimeTask({ state: 'READY' }), 'CLAIMED', AGENT);
  assert.equal(result.from, 'READY');
  assert.equal(result.to, 'CLAIMED');
  assert.equal(result.kind, 'A');
});

test('transición válida: cadena completa hasta READY_FOR_INTEGRATION', () => {
  const chain = [
    ['READY', 'CLAIMED'],
    ['CLAIMED', 'IMPLEMENTING'],
    ['IMPLEMENTING', 'TESTING'],
    ['TESTING', 'READY_FOR_QA'],
    ['READY_FOR_QA', 'QA'],
    ['QA', 'READY_FOR_INTEGRATION'],
  ];
  for (const [from, to] of chain) {
    assert.equal(canTransition(from, to), true, `${from} -> ${to} debe ser válida`);
    assert.equal(requiresHuman(from, to), false, `${from} -> ${to} no debe exigir humano`);
  }
});

test('los 16 estados canónicos de la arquitectura están presentes', () => {
  assert.equal(STATES.length, 16);
  for (const state of [
    'READY', 'CLAIMED', 'IMPLEMENTING', 'TESTING', 'REPAIRING', 'READY_FOR_QA', 'QA',
    'QA_FAILED', 'READY_FOR_INTEGRATION', 'INTEGRATING', 'INTEGRATED', 'PASSED',
    'BLOCKED', 'BLOCKED_ARCHITECTURE', 'BLOCKED_HUMAN_DECISION', 'CANCELLED',
  ]) {
    assert.ok(STATES.includes(state), `falta el estado canónico ${state}`);
  }
});

test('no existe el estado divergente IN_QA de Claude-03', () => {
  assert.equal(STATES.includes('IN_QA'), false);
  assert.equal(TRANSITIONS.IN_QA, undefined);
});

// --- 2. transición inválida -------------------------------------------------

test('transición inválida: READY -> QA directo está prohibida', () => {
  assert.equal(canTransition('READY', 'QA'), false);
  assert.throws(() => assertTransition(runtimeTask({ state: 'READY' }), 'QA', AGENT), InvalidTransitionError);
});

test('transición inválida: las 6 prohibiciones explícitas de §3.3', () => {
  // 1. saltarse pruebas y QA
  assert.equal(canTransition('IMPLEMENTING', 'READY_FOR_INTEGRATION'), false);
  // 2. autocertificación
  assert.equal(canTransition('TESTING', 'PASSED'), false);
  assert.equal(canTransition('READY_FOR_QA', 'PASSED'), false);
  assert.equal(canTransition('QA', 'PASSED'), false);
  // 3. saltarse el gate de integración
  assert.equal(canTransition('QA', 'INTEGRATED'), false);
  // 5. terminales sin salida
  assert.deepEqual(TRANSITIONS.PASSED, {});
  assert.deepEqual(TRANSITIONS.CANCELLED, {});
  assert.equal(isTerminal('PASSED'), true);
  assert.equal(isTerminal('CANCELLED'), true);
});

test('transición inválida: estado desconocido nunca es alcanzable', () => {
  assert.equal(canTransition('READY', 'NO_EXISTE'), false);
  assert.equal(canTransition('NO_EXISTE', 'READY'), false);
  assert.equal(transitionKind('READY', 'NO_EXISTE'), null);
});

// --- 29. BLOCKED -> READY requiere humano -----------------------------------

test('BLOCKED -> READY exige gate humano; un agente es rechazado', () => {
  for (const blocked of ['BLOCKED', 'BLOCKED_ARCHITECTURE', 'BLOCKED_HUMAN_DECISION']) {
    assert.equal(requiresHuman(blocked, 'READY'), true, `${blocked} -> READY debe exigir humano`);
    assert.throws(
      () => assertTransition(runtimeTask({ state: blocked }), 'READY', AGENT),
      HumanGateRequiredError,
      `${blocked} -> READY no debe permitirse a un agente`,
    );
    assert.doesNotThrow(() => assertTransition(runtimeTask({ state: blocked }), 'READY', HUMAN));
  }
});

test('el motor no puede alcanzar PASSED, INTEGRATING ni INTEGRATED por sí mismo', () => {
  assert.equal(requiresHuman('READY_FOR_INTEGRATION', 'INTEGRATING'), true);
  assert.equal(requiresHuman('INTEGRATING', 'INTEGRATED'), true);
  assert.equal(requiresHuman('INTEGRATED', 'PASSED'), true);

  assert.throws(
    () => assertTransition(runtimeTask({ state: 'READY_FOR_INTEGRATION' }), 'INTEGRATING', AGENT),
    HumanGateRequiredError,
  );
  assert.throws(
    () => assertTransition(runtimeTask({ state: 'INTEGRATED' }), 'PASSED', AGENT),
    HumanGateRequiredError,
  );

  // Ningún estado permite a un agente llegar a PASSED, por ninguna ruta.
  for (const from of STATES) {
    const kind = transitionKind(from, 'PASSED');
    assert.notEqual(kind, 'A', `${from} -> PASSED no puede ser una transición de agente`);
  }
});

// --- 5. ownership del lock --------------------------------------------------

test('un agente sin lock no puede transicionar una tarjeta poseída (§3.3 regla 6)', () => {
  const task = runtimeTask({ state: 'IMPLEMENTING' });
  assert.throws(
    () => assertTransition(task, 'TESTING', { type: 'agent', id: 'CLAUDE-02', holdsLock: false }),
    LockRequiredError,
  );
  assert.doesNotThrow(() =>
    assertTransition(task, 'TESTING', { type: 'agent', id: 'CLAUDE-02', holdsLock: true }),
  );
});

test('un humano puede intervenir sin lock: es la vía de recuperación', () => {
  const task = runtimeTask({ state: 'IMPLEMENTING' });
  assert.doesNotThrow(() => assertTransition(task, 'BLOCKED', HUMAN));
});

// --- 8. máximo repair -------------------------------------------------------

test('max repair: la 6ª entrada a REPAIRING excede el límite (max=5)', () => {
  let task = runtimeTask({ state: 'TESTING', repair_iteration: 0 });
  for (let i = 1; i <= 5; i += 1) {
    const { repairIteration } = assertTransition(task, 'REPAIRING', AGENT);
    assert.equal(repairIteration, i);
    task = { ...task, state: 'TESTING', repair_iteration: repairIteration };
  }
  const err = captureError(() => assertTransition(task, 'REPAIRING', AGENT));
  assert.ok(err instanceof IterationLimitExceededError);
  assert.equal(err.blockedReason, 'implementation_repair_limit_exceeded');
});

// --- 9. máximo QA -----------------------------------------------------------

test('max QA: la 3ª entrada a QA_FAILED excede el límite (max=2)', () => {
  let task = runtimeTask({ state: 'QA', qa_iteration: 0 });
  for (let i = 1; i <= 2; i += 1) {
    const { qaIteration } = assertTransition(task, 'QA_FAILED', AGENT);
    assert.equal(qaIteration, i);
    task = { ...task, state: 'QA', qa_iteration: qaIteration };
  }
  const err = captureError(() => assertTransition(task, 'QA_FAILED', AGENT));
  assert.ok(err instanceof IterationLimitExceededError);
  assert.equal(err.blockedReason, 'qa_repair_limit_exceeded');
});

test('los contadores son independientes: reparar por QA no gasta presupuesto de implementación', () => {
  const task = runtimeTask({ state: 'QA', qa_iteration: 0, repair_iteration: 4 });
  const result = assertTransition(task, 'QA_FAILED', AGENT);
  assert.equal(result.qaIteration, 1);
  assert.equal(result.repairIteration, 4, 'repair_iteration no debe moverse');
});

// --- 28. READY_FOR_INTEGRATION sin integración automática -------------------

test('READY_FOR_INTEGRATION es terminal para el motor: sólo humano avanza', () => {
  const outgoing = TRANSITIONS.READY_FOR_INTEGRATION;
  assert.equal(outgoing.INTEGRATING, 'H');
  assert.equal(outgoing.INTEGRATED, undefined);
  assert.equal(outgoing.PASSED, undefined);
});
