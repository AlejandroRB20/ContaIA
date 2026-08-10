/**
 * Fuente única de constantes canónicas del Loop Engine.
 *
 * Existe para resolver el conflicto `CRITICO` (Claude-03) vs `CRÍTICO`
 * (canon del repositorio y de todas las auditorías) señalado en
 * `LOOP-000_GOVERNANCE_SUBSTRATE.md` §6.3/§7.5. Ningún otro módulo declara
 * severidades ni veredictos por su cuenta.
 */

/** Severidades canónicas — con tilde, exactamente como las usan las auditorías. */
export const SEVERITIES = Object.freeze(['CRÍTICO', 'ALTO', 'MEDIO', 'BAJO']);

/**
 * Normalización de entrada. Se acepta la forma sin tilde y en minúsculas
 * para no romper integraciones que ya escriben `CRITICO`, pero **lo que se
 * persiste es siempre la forma canónica** (arquitectura §12, misión T5).
 */
const SEVERITY_ALIASES = Object.freeze({
  CRITICO: 'CRÍTICO',
  CRITICAL: 'CRÍTICO',
  HIGH: 'ALTO',
  MEDIUM: 'MEDIO',
  LOW: 'BAJO',
});

export function normalizeSeverity(input) {
  if (typeof input !== 'string') return null;
  const upper = input.trim().toUpperCase();
  if (SEVERITIES.includes(upper)) return upper;
  return SEVERITY_ALIASES[upper] ?? null;
}

/** Veredictos de ciclo del auditor. `PASSED` de ciclo ≠ `PASSED` de EWO. */
export const VERDICTS = Object.freeze(['PASSED', 'REQUIRES_CHANGES', 'BLOCKED']);

/** Clases de riesgo (arquitectura §4). */
export const RISK_CLASSES = Object.freeze([
  'STANDARD',
  'DOCUMENTATION',
  'CRITICAL',
  'ARCHITECTURE',
  'SECURITY',
  'FISCAL',
  'MIGRATION',
]);

/** Clases nunca elegibles en modo nocturno (arquitectura §15). */
export const NIGHTLY_INELIGIBLE_RISK_CLASSES = Object.freeze([
  'ARCHITECTURE',
  'SECURITY',
  'FISCAL',
  'MIGRATION',
]);

/** Límites de ciclo (arquitectura §5). Sin auto-reset, en ningún caso. */
export const MAX_IMPLEMENTATION_REPAIR_ITERATIONS = 5;
export const MAX_QA_REPAIR_ITERATIONS = 2;

/** Rama compartida — el motor jamás escribe sobre ella (arquitectura §1.1). */
export const PROTECTED_BRANCHES = Object.freeze(['feature/frontend-ux-audit', 'main']);

/** Prefijo reservado de ramas de tarea. */
export const TASK_BRANCH_PREFIX = 'loop/';

/** Motivos de bloqueo tipificados. Un `BLOCKED*` sin motivo es inválido. */
export const BLOCKED_REASONS = Object.freeze([
  'implementation_repair_limit_exceeded',
  'qa_repair_limit_exceeded',
  'substrate_missing',
  'git_index_locked',
  'git_preflight_failed',
  'stale_base',
  'dependency_cycle',
  'out_of_scope_write',
  'forbidden_scope_write',
  'claim_setup_failed',
  'agent_released_mid_flight',
  'auditor_contradiction',
  'medium_finding_requires_decision',
  'unclassified',
]);
