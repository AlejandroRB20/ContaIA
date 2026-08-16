import { ACCEPTED_DECISION_STATES } from './constants.mjs';

/**
 * Gate de decisión `D-XXX` (arquitectura §10.4, `LOOP-002`).
 *
 * Una tarjeta que depende de una decisión `D-XXX` pendiente —propuesta,
 * `D-014` sin cerrar, aprobación humana en curso— **no debe volverse
 * elegible**. La misión es explícita en una cosa: *"El motor debe recibir
 * evidencia explícita del estado de la decisión. NO inferir aprobación de
 * que el código exista en una rama."*
 *
 * Por eso este módulo no lee `brain/DECISION_INDEX.md`, no hace `grep` de
 * `D-XXX` en el código, y no asume nada por la sola presencia de un commit.
 * `decisionEvidence` es un parámetro obligatorio en la forma
 * `{ [decisionId]: { status: string } }` que el llamador debe construir a
 * partir de una fuente humana — la misma disciplina de `handoff`/`auditResult`
 * en `qa-session.mjs`, que tampoco se autogeneran.
 *
 * **Fail-closed en dos frentes, no en uno:**
 *
 *   - decisión referenciada sin evidencia en absoluto → bloquea
 *     (`MISSING_EVIDENCE`, no "se asume aprobada").
 *   - evidencia presente pero con un estado que no es exactamente uno de
 *     los tres canónicos de la arquitectura → bloquea (`PENDING`), sin
 *     intentar adivinar variantes ("casi aprobada", "en revisión final"…).
 */

/** ¿El estado declarado es uno de los tres aceptados por la arquitectura? */
export function isDecisionAccepted(status) {
  return typeof status === 'string' && ACCEPTED_DECISION_STATES.includes(status);
}

/**
 * @param {{decision_refs?: string[]}} task
 * @param {Record<string, {status: string}>} [decisionEvidence] evidencia
 *   explícita, nunca derivada por el motor. `undefined`/`{}` bloquea todo
 *   `decision_refs` declarado — ausencia de evidencia no es aprobación.
 * @returns {Array<{check: 'PENDING_DECISION_GATE', decision_id: string,
 *   status: 'MISSING_EVIDENCE'|string, blocked_reason: 'pending_decision'}>}
 */
export function decisionGateConflicts(task, decisionEvidence = {}) {
  const refs = task?.decision_refs ?? [];
  if (refs.length === 0) return [];

  const evidence = decisionEvidence ?? {};
  const conflicts = [];

  for (const decisionId of refs) {
    const record = evidence[decisionId];
    if (!record || typeof record.status !== 'string') {
      conflicts.push({
        check: 'PENDING_DECISION_GATE',
        decision_id: decisionId,
        status: 'MISSING_EVIDENCE',
        blocked_reason: 'pending_decision',
      });
      continue;
    }
    if (!isDecisionAccepted(record.status)) {
      conflicts.push({
        check: 'PENDING_DECISION_GATE',
        decision_id: decisionId,
        status: record.status,
        blocked_reason: 'pending_decision',
      });
    }
  }

  return conflicts;
}
