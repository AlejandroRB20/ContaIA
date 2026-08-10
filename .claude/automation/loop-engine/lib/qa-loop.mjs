import { assertIndependentAuditor, canonicalizeAuditResult } from './qa-contract.mjs';
import { evaluateFindings } from './finding-gate.mjs';
import { MAX_QA_REPAIR_ITERATIONS } from './constants.mjs';
import { canTransition } from './state-machine.mjs';

/**
 * Ciclo de QA. Base: Claude-03 (`2e128c7`), con las tres correcciones que
 * `LOOP-000_GOVERNANCE_SUBSTRATE.md` §7 exige:
 *
 *   1. `IN_QA` → `QA` (nomenclatura canónica).
 *   2. `MEDIO` se enruta a `BLOCKED_HUMAN_DECISION`, que Claude-03 no tenía.
 *   3. Los estados usados son los de la máquina canónica, y cada avance se
 *      valida contra su tabla de transiciones — antes eran `assert` locales
 *      con un vocabulario propio de 7 estados.
 *
 * Las funciones son puras: reciben y devuelven `loopState` sin tocar disco.
 * El `history[]` resultante se vuelca a `events.jsonl` con
 * `events.flushLoopHistory()`.
 */

export { MAX_QA_REPAIR_ITERATIONS };

function assertState(loopState, expected) {
  if (loopState.state !== expected) {
    throw new Error(
      `Transición inválida en el ciclo de QA: se esperaba "${expected}", estado actual "${loopState.state}".`,
    );
  }
}

function advance(loopState, nextState, event = {}) {
  if (!canTransition(loopState.state, nextState)) {
    throw new Error(
      `Transición prohibida por la máquina canónica: ${loopState.state} -> ${nextState}.`,
    );
  }
  return {
    ...loopState,
    state: nextState,
    history: [...loopState.history, { from: loopState.state, to: nextState, ...event }],
  };
}

/** Estado inicial del ciclo, a partir de un handoff ya validado. */
export function createLoopState(taskId, handoff, taskContract = {}) {
  return {
    taskId,
    handoff,
    taskContract,
    state: 'READY_FOR_QA',
    qaCycles: taskContract.qa_iteration ?? 0,
    history: [],
  };
}

export function beginQa(loopState) {
  assertState(loopState, 'READY_FOR_QA');
  return advance(loopState, 'QA');
}

/**
 * Ingesta del resultado de auditoría.
 *
 * Orden deliberado: **primero** la independencia del auditor, sólo después
 * el veredicto. Un resultado autofirmado no llega a interpretarse.
 *
 * Fail-closed en tres frentes:
 *   - veredicto `BLOCKED` del auditor → `QA_FAILED` → `BLOCKED_ARCHITECTURE`;
 *   - `PASSED` con hallazgos bloqueantes → contradicción del propio auditor
 *     (arquitectura §11.6): nunca promueve, escala;
 *   - `REQUIRES_CHANGES` más allá del límite de ciclos → `BLOCKED_ARCHITECTURE`.
 *
 * Nota de trazabilidad: la arquitectura §11.6 y §12 describen el escalamiento
 * como `QA → BLOCKED_ARCHITECTURE`, pero la matriz §3.3 no habilita ese arco
 * directo (fila `QA`, columna `BLOCKED_ARCH` = prohibida). Se resuelve por la
 * ruta que **sí** autoriza la matriz, `QA → QA_FAILED → BLOCKED_ARCHITECTURE`,
 * que preserva ambos requisitos: el candidato no promueve y termina en
 * `BLOCKED_ARCHITECTURE`. Ambos saltos quedan registrados en el historial.
 */
export function submitQaResult(loopState, rawAuditResult) {
  assertState(loopState, 'QA');
  assertIndependentAuditor(loopState.handoff, rawAuditResult);

  const auditResult = canonicalizeAuditResult(rawAuditResult);

  if (auditResult.verdict === 'BLOCKED') {
    return escalateToArchitecture(loopState, {
      reason: 'AUDITOR_BLOCKED',
      auditResult,
    });
  }

  const gate = evaluateFindings(auditResult.findings ?? [], loopState.taskContract);

  if (auditResult.verdict === 'PASSED') {
    if (gate.route === 'QA_FAILED') {
      return escalateToArchitecture(loopState, {
        reason: 'PASSED_WITH_BLOCKING_FINDINGS',
        auditResult,
        blockingFindings: gate.blockingFindings,
      });
    }
    if (gate.route === 'BLOCKED_HUMAN_DECISION') {
      return advance(loopState, 'BLOCKED_HUMAN_DECISION', {
        reason: 'FINDINGS_REQUIRE_HUMAN_DECISION',
        blocked_reason: 'medium_finding_requires_decision',
        auditResult,
        blockingFindings: gate.blockingFindings,
      });
    }
    return advance(loopState, 'READY_FOR_INTEGRATION', { auditResult });
  }

  if (auditResult.verdict === 'REQUIRES_CHANGES') {
    const qaCycles = loopState.qaCycles + 1;
    if (qaCycles > MAX_QA_REPAIR_ITERATIONS) {
      return escalateToArchitecture(
        { ...loopState, qaCycles },
        { reason: 'MAX_QA_CYCLES_EXCEEDED', auditResult, qaCycles },
      );
    }
    return advance({ ...loopState, qaCycles }, 'QA_FAILED', { auditResult, qaCycles });
  }

  throw new Error(`Veredicto desconocido: ${auditResult.verdict}`);
}

/** `QA → QA_FAILED → BLOCKED_ARCHITECTURE`, ambos saltos trazados. */
function escalateToArchitecture(loopState, event) {
  const failed = advance(loopState, 'QA_FAILED', event);
  return advance(failed, 'BLOCKED_ARCHITECTURE', {
    ...event,
    blocked_reason:
      event.reason === 'MAX_QA_CYCLES_EXCEEDED' ? 'qa_repair_limit_exceeded' : 'auditor_contradiction',
  });
}

export function beginRepair(loopState) {
  assertState(loopState, 'QA_FAILED');
  return advance(loopState, 'REPAIRING');
}

export function completeRepair(loopState) {
  assertState(loopState, 'REPAIRING');
  return advance(loopState, 'TESTING');
}

/** De vuelta a `READY_FOR_QA` tras pruebas verdes locales del repair. */
export function finishTesting(loopState) {
  assertState(loopState, 'TESTING');
  return advance(loopState, 'READY_FOR_QA');
}
