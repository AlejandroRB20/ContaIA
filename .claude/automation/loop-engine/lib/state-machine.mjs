/**
 * Máquina de estados canónica del Loop Engine.
 *
 * Transcripción literal de la matriz de la arquitectura ratificada
 * (`AUTONOMOUS_LOOP_ENGINE_V1_ARCHITECTURE.md` §3.3). No hay transición
 * libre: toda transición pasa por `assertTransition()`.
 *
 * Reconciliación aplicada (`LOOP-000_GOVERNANCE_SUBSTRATE.md` §7):
 *   1. `IN_QA` (Claude-03) → `QA` (canon).
 *   2. `BLOCKED_HUMAN_DECISION` presente; `MEDIO` se enruta aquí.
 *   3. `BLOCKED* → READY` marcado `requiresHuman` — Claude-02 lo permitía
 *      sin gate, lo que dejaba a un dispatcher automático desbloquearse solo.
 *   4. `INTEGRATING`/`INTEGRATED`/`PASSED` reconocidos, pero ninguna
 *      transición hacia ellos es iniciable por un agente.
 */
import {
  MAX_IMPLEMENTATION_REPAIR_ITERATIONS,
  MAX_QA_REPAIR_ITERATIONS,
} from './constants.mjs';

export const STATES = Object.freeze([
  'READY',
  'CLAIMED',
  'IMPLEMENTING',
  'TESTING',
  'REPAIRING',
  'READY_FOR_QA',
  'QA',
  'QA_FAILED',
  'READY_FOR_INTEGRATION',
  'INTEGRATING',
  'INTEGRATED',
  'PASSED',
  'BLOCKED',
  'BLOCKED_ARCHITECTURE',
  'BLOCKED_HUMAN_DECISION',
  'CANCELLED',
]);

const STATE_SET = new Set(STATES);

/** Estados terminales: ninguna salida, para nadie. */
export const TERMINAL_STATES = Object.freeze(['PASSED', 'CANCELLED']);

/**
 * Estados en los que la tarjeta está poseída por un agente con lock. Una
 * transición desde cualquiera de ellos exige poseer el lock (§3.3 regla 6).
 */
export const OWNED_STATES = Object.freeze([
  'CLAIMED',
  'IMPLEMENTING',
  'TESTING',
  'REPAIRING',
  'READY_FOR_QA',
  'QA',
  'QA_FAILED',
]);

const OWNED_SET = new Set(OWNED_STATES);

/** Estados de bloqueo; salir de cualquiera de ellos exige humano. */
export const BLOCKED_STATES = Object.freeze([
  'BLOCKED',
  'BLOCKED_ARCHITECTURE',
  'BLOCKED_HUMAN_DECISION',
]);

/**
 * Matriz de transiciones. `A` = permitida a un agente · `H` = exige
 * autoridad humana · ausente = prohibida.
 *
 * Transcrita fila por fila de la arquitectura §3.3.
 */
export const TRANSITIONS = Object.freeze({
  READY: { CLAIMED: 'A', BLOCKED: 'A', BLOCKED_HUMAN_DECISION: 'A', CANCELLED: 'H' },
  CLAIMED: { READY: 'A', IMPLEMENTING: 'A', BLOCKED: 'A', BLOCKED_HUMAN_DECISION: 'A', CANCELLED: 'H' },
  IMPLEMENTING: { TESTING: 'A', BLOCKED: 'A', BLOCKED_HUMAN_DECISION: 'A', CANCELLED: 'H' },
  TESTING: {
    REPAIRING: 'A',
    READY_FOR_QA: 'A',
    BLOCKED: 'A',
    BLOCKED_HUMAN_DECISION: 'A',
    CANCELLED: 'H',
  },
  REPAIRING: {
    TESTING: 'A',
    BLOCKED: 'A',
    BLOCKED_ARCHITECTURE: 'A',
    BLOCKED_HUMAN_DECISION: 'A',
    CANCELLED: 'H',
  },
  READY_FOR_QA: { QA: 'A', BLOCKED: 'A', BLOCKED_HUMAN_DECISION: 'A', CANCELLED: 'H' },
  QA: {
    QA_FAILED: 'A',
    READY_FOR_INTEGRATION: 'A',
    BLOCKED: 'A',
    BLOCKED_HUMAN_DECISION: 'A',
    CANCELLED: 'H',
  },
  QA_FAILED: {
    REPAIRING: 'A',
    BLOCKED: 'A',
    BLOCKED_ARCHITECTURE: 'A',
    BLOCKED_HUMAN_DECISION: 'A',
    CANCELLED: 'H',
  },
  READY_FOR_INTEGRATION: {
    INTEGRATING: 'H',
    BLOCKED: 'A',
    BLOCKED_HUMAN_DECISION: 'A',
    CANCELLED: 'H',
  },
  INTEGRATING: { INTEGRATED: 'H', BLOCKED_HUMAN_DECISION: 'A', CANCELLED: 'H' },
  INTEGRATED: { PASSED: 'H', BLOCKED_HUMAN_DECISION: 'A' },
  PASSED: {},
  BLOCKED: { READY: 'H', BLOCKED_HUMAN_DECISION: 'A', CANCELLED: 'H' },
  BLOCKED_ARCHITECTURE: { READY: 'H', BLOCKED_HUMAN_DECISION: 'A', CANCELLED: 'H' },
  BLOCKED_HUMAN_DECISION: { READY: 'H', READY_FOR_INTEGRATION: 'H', CANCELLED: 'H' },
  CANCELLED: {},
});

export class InvalidTransitionError extends Error {
  constructor(from, to) {
    super(`Transición prohibida: ${from} -> ${to}`);
    this.name = 'InvalidTransitionError';
    this.code = 'INVALID_TRANSITION';
    this.from = from;
    this.to = to;
  }
}

export class HumanGateRequiredError extends Error {
  constructor(from, to, actorType) {
    super(
      `Transición ${from} -> ${to} exige autoridad humana; el actor es "${actorType}". ` +
        'El motor no puede ejecutarla por su cuenta.',
    );
    this.name = 'HumanGateRequiredError';
    this.code = 'HUMAN_GATE_REQUIRED';
    this.from = from;
    this.to = to;
  }
}

export class LockRequiredError extends Error {
  constructor(from, to, taskId) {
    super(
      `Transición ${from} -> ${to} sobre "${taskId}" exige poseer el lock de la tarjeta ` +
        '(arquitectura §3.3 regla 6).',
    );
    this.name = 'LockRequiredError';
    this.code = 'LOCK_REQUIRED';
  }
}

export class IterationLimitExceededError extends Error {
  constructor(kind, limit, blockedReason) {
    super(
      `Límite de iteraciones de ${kind} alcanzado (max=${limit}). ` +
        `La tarjeta debe ir a un estado de bloqueo (${blockedReason}), no reintentar.`,
    );
    this.name = 'IterationLimitExceededError';
    this.code = 'ITERATION_LIMIT_EXCEEDED';
    this.kind = kind;
    this.limit = limit;
    this.blockedReason = blockedReason;
  }
}

export function isValidState(state) {
  return STATE_SET.has(state);
}

export function isTerminal(state) {
  return TERMINAL_STATES.includes(state);
}

export function requiresLock(state) {
  return OWNED_SET.has(state);
}

/** `'A'` | `'H'` | `null` (prohibida). */
export function transitionKind(from, to) {
  if (!isValidState(from) || !isValidState(to)) return null;
  return TRANSITIONS[from][to] ?? null;
}

export function canTransition(from, to) {
  return transitionKind(from, to) !== null;
}

export function requiresHuman(from, to) {
  return transitionKind(from, to) === 'H';
}

/**
 * Valida una transición completa: legalidad, gate humano, posesión del
 * lock y límites de iteración. No muta nada — devuelve los contadores que
 * el llamador debe persistir.
 *
 * @param {object} task tarjeta actual
 * @param {string} to estado destino
 * @param {{type: 'agent'|'human', id: string, holdsLock?: boolean}} actor
 * @param {{maxRepair?: number, maxQa?: number}} [limits]
 */
export function assertTransition(task, to, actor, limits = {}) {
  const from = task.state;
  const maxRepair = limits.maxRepair ?? MAX_IMPLEMENTATION_REPAIR_ITERATIONS;
  const maxQa = limits.maxQa ?? MAX_QA_REPAIR_ITERATIONS;

  if (!actor || (actor.type !== 'agent' && actor.type !== 'human')) {
    throw new Error('actor.type debe ser "agent" o "human".');
  }

  const kind = transitionKind(from, to);
  if (kind === null) {
    throw new InvalidTransitionError(from, to);
  }
  if (kind === 'H' && actor.type !== 'human') {
    throw new HumanGateRequiredError(from, to, actor.type);
  }

  // §3.3 regla 6 — un agente sin lock no transiciona una tarjeta poseída.
  // Un humano puede intervenir siempre (es la vía de recuperación).
  if (actor.type === 'agent' && requiresLock(from) && actor.holdsLock !== true) {
    throw new LockRequiredError(from, to, task.task_id);
  }

  let repairIteration = task.repair_iteration ?? 0;
  let qaIteration = task.qa_iteration ?? 0;

  if (to === 'REPAIRING') {
    if (repairIteration >= maxRepair) {
      throw new IterationLimitExceededError(
        'implementación',
        maxRepair,
        'implementation_repair_limit_exceeded',
      );
    }
    repairIteration += 1;
  }

  if (to === 'QA_FAILED') {
    if (qaIteration >= maxQa) {
      throw new IterationLimitExceededError('QA', maxQa, 'qa_repair_limit_exceeded');
    }
    qaIteration += 1;
  }

  return { from, to, kind, repairIteration, qaIteration };
}
