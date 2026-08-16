import { SEVERITIES, VERDICTS, normalizeSeverity } from './constants.mjs';

/**
 * Contratos de handoff (constructor → auditor) y de resultado de auditoría.
 * Adoptado de Claude-03 (`2e128c7`); las severidades pasan por
 * `constants.mjs`, que normaliza `CRITICO` → `CRÍTICO` (misión T5).
 */

export class NonIndependentAuditorError extends Error {
  constructor(agentId) {
    super(
      `Auditoría no independiente: implementerId y auditorId coinciden ("${agentId}"). ` +
        'Un agente nunca audita su propio trabajo (AI_PLAYBOOK.md regla 1, arquitectura §11.2).',
    );
    this.name = 'NonIndependentAuditorError';
    this.code = 'NON_INDEPENDENT_AUDITOR';
  }
}

export function validateHandoff(handoff) {
  const errors = [];
  if (!handoff || typeof handoff !== 'object') return { valid: false, errors: ['handoff ausente'] };

  for (const field of ['implementerId', 'candidateCommit', 'baseCommit']) {
    if (typeof handoff[field] !== 'string' || handoff[field].length === 0) {
      errors.push(`handoff.${field} debe ser un string no vacío`);
    }
  }
  if (!Array.isArray(handoff.changedFiles) || handoff.changedFiles.length === 0) {
    errors.push('handoff.changedFiles debe ser un arreglo no vacío');
  }
  for (const gate of ['tests', 'typecheck', 'lint']) {
    if (!handoff[gate] || typeof handoff[gate].passed !== 'boolean') {
      errors.push(`handoff.${gate}.passed debe ser boolean`);
    }
  }
  if (handoff.knownFindings !== undefined && !Array.isArray(handoff.knownFindings)) {
    errors.push('handoff.knownFindings debe ser un arreglo si está presente');
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Todo hallazgo lleva Ubicación · Problema · Evidencia · Impacto ·
 * Corrección mínima — el formato ya usado por `qa-engineer` y por las
 * auditorías del repositorio (arquitectura §12).
 */
function validateFinding(finding, index) {
  const errors = [];
  const prefix = `findings[${index}]`;

  if (normalizeSeverity(finding?.severity) === null) {
    errors.push(`${prefix}.severity debe ser una de ${SEVERITIES.join(', ')}`);
  }
  for (const field of ['location', 'problem', 'evidence', 'impact', 'recommendedFix']) {
    if (typeof finding?.[field] !== 'string' || finding[field].length === 0) {
      errors.push(`${prefix}.${field} debe ser un string no vacío`);
    }
  }
  return errors;
}

export function validateAuditResult(auditResult) {
  const errors = [];
  if (!auditResult || typeof auditResult !== 'object') {
    return { valid: false, errors: ['auditResult ausente'] };
  }
  if (typeof auditResult.auditorId !== 'string' || auditResult.auditorId.length === 0) {
    errors.push('auditResult.auditorId debe ser un string no vacío');
  }
  if (!VERDICTS.includes(auditResult.verdict)) {
    errors.push(`auditResult.verdict debe ser una de ${VERDICTS.join(', ')}`);
  }
  if (!Array.isArray(auditResult.findings)) {
    errors.push('auditResult.findings debe ser un arreglo (vacío si no hay hallazgos)');
  } else {
    auditResult.findings.forEach((f, i) => errors.push(...validateFinding(f, i)));
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Devuelve el resultado con las severidades ya en forma canónica. Lo que
 * se persiste nunca lleva `CRITICO` sin tilde (misión T5).
 */
export function canonicalizeAuditResult(auditResult) {
  return {
    ...auditResult,
    findings: (auditResult.findings ?? []).map((finding) => ({
      ...finding,
      severity: normalizeSeverity(finding.severity) ?? finding.severity,
    })),
  };
}

/** Invariante central: el implementador nunca certifica su propio trabajo. */
export function assertIndependentAuditor(handoff, auditResult) {
  if (
    handoff?.implementerId &&
    auditResult?.auditorId &&
    handoff.implementerId === auditResult.auditorId
  ) {
    throw new NonIndependentAuditorError(handoff.implementerId);
  }
}
