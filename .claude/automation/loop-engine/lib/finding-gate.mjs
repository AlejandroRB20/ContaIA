import { normalizeSeverity } from './constants.mjs';

/**
 * Política de hallazgos (arquitectura §12, misión T11). Fail-closed: un
 * hallazgo nunca se ignora automáticamente.
 *
 * | Severidad | Efecto                                                        |
 * | --------- | ------------------------------------------------------------- |
 * | `CRÍTICO` | Bloquea siempre. → `QA_FAILED`. No hay override de contrato.   |
 * | `ALTO`    | Bloquea siempre. → `QA_FAILED`. No hay override de contrato.   |
 * | `MEDIO`   | Bloquea. → `BLOCKED_HUMAN_DECISION`. **No** lo levanta un      |
 * |           | contrato: la arquitectura exige "decisión humana explícita     |
 * |           | registrada", y una bandera en el contrato no es una decisión.  |
 * | `BAJO`    | Bloquea por defecto. Sólo `allow_low_findings: true` en el     |
 * |           | contrato permite `READY_FOR_INTEGRATION`, arrastrándolo como   |
 * |           | observación de seguimiento.                                    |
 *
 * Cambio frente a Claude-03 (`2e128c7`): allí `allowSeverities` podía
 * autorizar `MEDIO`, y no existía `BLOCKED_HUMAN_DECISION` como destino
 * (`LOOP-000_GOVERNANCE_SUBSTRATE.md` §6.3/§7.2).
 */

const NEVER_OVERRIDABLE = new Set(['CRÍTICO', 'ALTO']);

export class UnknownSeverityError extends Error {
  constructor(value) {
    super(`Severidad desconocida: ${JSON.stringify(value)}. Canónicas: CRÍTICO, ALTO, MEDIO, BAJO.`);
    this.name = 'UnknownSeverityError';
    this.code = 'UNKNOWN_SEVERITY';
  }
}

/**
 * @param {Array<{severity: string}>} findings
 * @param {{allow_low_findings?: boolean}} taskContract
 * @returns {{
 *   blocked: boolean,
 *   route: 'READY_FOR_INTEGRATION'|'QA_FAILED'|'BLOCKED_HUMAN_DECISION',
 *   blockingFindings: Array,
 *   bySeverity: Record<string, number>
 * }}
 */
export function evaluateFindings(findings, taskContract = {}) {
  const allowLow = taskContract.allow_low_findings === true;
  const bySeverity = { 'CRÍTICO': 0, ALTO: 0, MEDIO: 0, BAJO: 0 };
  const blockingFindings = [];

  let hasHardBlock = false;
  let needsHumanDecision = false;

  for (const finding of findings ?? []) {
    const severity = normalizeSeverity(finding?.severity);
    if (severity === null) throw new UnknownSeverityError(finding?.severity);
    bySeverity[severity] += 1;

    if (NEVER_OVERRIDABLE.has(severity)) {
      hasHardBlock = true;
      blockingFindings.push({ ...finding, severity });
      continue;
    }
    if (severity === 'MEDIO') {
      needsHumanDecision = true;
      blockingFindings.push({ ...finding, severity });
      continue;
    }
    if (severity === 'BAJO' && !allowLow) {
      needsHumanDecision = true;
      blockingFindings.push({ ...finding, severity });
    }
  }

  let route = 'READY_FOR_INTEGRATION';
  if (hasHardBlock) route = 'QA_FAILED';
  else if (needsHumanDecision) route = 'BLOCKED_HUMAN_DECISION';

  return {
    blocked: blockingFindings.length > 0,
    route,
    blockingFindings,
    bySeverity,
  };
}
