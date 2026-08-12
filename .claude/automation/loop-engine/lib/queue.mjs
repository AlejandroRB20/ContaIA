import fs from 'node:fs';
import { queueFile } from './paths.mjs';
import { parseYaml } from './yaml.mjs';
import { RISK_CLASSES } from './constants.mjs';
import { isValidState } from './state-machine.mjs';

/**
 * Cola de tarjetas — **definiciones versionadas**, nunca estado.
 *
 * Resuelve el conflicto de `LOOP-000_GOVERNANCE_SUBSTRATE.md` §6.3:
 * Claude-02 guardaba `queue.json` dentro de `state/` (ignorado), con lo que
 * las *definiciones* de tarjeta tampoco se versionaban. Aquí:
 *
 *   queue.yaml  → VERSIONADO. Intención: qué tarjetas existen, su
 *                 contrato, sus dependencias y su estado **inicial**.
 *   state/      → IGNORADO. Runtime: en qué estado va cada instancia.
 *
 * El runtime **nunca reescribe `queue.yaml`** (misión T7). La única
 * dirección de escritura es `queue.yaml → state/`, vía `instantiate()`.
 */

/** Campos que definen el contrato de una tarjeta; viven en `queue.yaml`. */
const DEFINITION_FIELDS = Object.freeze([
  'task_id',
  'mission_id',
  'title',
  'risk_class',
  'base_commit',
  'allowed_write',
  'forbidden_scope',
  'dependencies',
  'test_commands',
  'agent_role',
  'qa_required',
  'human_gate_required',
  'allow_low_findings',
  'allow_rebase',
  'reads_contract',
  'max_repairs',
]);

/** Campos que sólo existen en runtime; jamás se escriben en `queue.yaml`. */
const RUNTIME_FIELDS = Object.freeze([
  'state',
  'repair_iteration',
  'qa_iteration',
  'owner',
  'worktree',
  'branch',
  'candidate_commit',
  'blocked_reason',
  'qa_handoff',
  'qa_owner',
  'qa_result',
  'transaction_pending',
]);

export { DEFINITION_FIELDS, RUNTIME_FIELDS };

/** Campos sin los cuales una tarjeta no puede estar `READY` (§3.2). */
const CONTRACT_FIELDS_REQUIRED_FOR_READY = Object.freeze([
  'base_commit',
  'allowed_write',
  'test_commands',
]);

export class QueueValidationError extends Error {
  constructor(errors) {
    super(`queue.yaml inválido:\n  - ${errors.join('\n  - ')}`);
    this.name = 'QueueValidationError';
    this.code = 'QUEUE_INVALID';
    this.errors = errors;
  }
}

/** Valida una definición de tarjeta. Devuelve la lista de errores. */
export function validateDefinition(definition, index) {
  const errors = [];
  const where = definition?.task_id ? `tarjeta "${definition.task_id}"` : `tarjeta #${index}`;

  if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
    return [`${where}: debe ser un mapeo`];
  }

  // Identidad: siempre exigible.
  for (const field of ['task_id', 'mission_id', 'title', 'risk_class']) {
    if (definition[field] === undefined || definition[field] === null) {
      errors.push(`${where}: falta el campo obligatorio "${field}"`);
    }
  }

  // Contrato de ejecución: exigible **sólo para una tarjeta READY**.
  // Arquitectura §3.2: "Si falta un campo del contrato → BLOCKED". Una
  // tarjeta bloqueada a la espera de autorización humana no tiene todavía
  // `base_commit` ni `allowed_write`, y **inventárselos sería peor que no
  // tenerlos**: quedaría despachable sin alcance real declarado.
  const initialState = definition.state ?? 'READY';
  if (initialState === 'READY') {
    for (const field of CONTRACT_FIELDS_REQUIRED_FOR_READY) {
      if (definition[field] === undefined || definition[field] === null) {
        errors.push(
          `${where}: una tarjeta en READY exige "${field}". Sin él debe declararse BLOCKED.`,
        );
      }
    }
  }

  if (definition.risk_class && !RISK_CLASSES.includes(definition.risk_class)) {
    errors.push(`${where}: risk_class "${definition.risk_class}" no es canónica (${RISK_CLASSES.join(', ')})`);
  }

  for (const field of ['allowed_write', 'forbidden_scope', 'dependencies', 'test_commands', 'reads_contract']) {
    if (definition[field] !== undefined && definition[field] !== null && !Array.isArray(definition[field])) {
      errors.push(`${where}: "${field}" debe ser una lista`);
    }
  }

  if (
    initialState === 'READY' &&
    Array.isArray(definition.allowed_write) &&
    definition.allowed_write.length === 0
  ) {
    errors.push(
      `${where}: "allowed_write" vacío no autoriza ninguna escritura — declara el alcance real`,
    );
  }

  if (definition.state !== undefined && !isValidState(definition.state)) {
    errors.push(`${where}: state inicial "${definition.state}" no es canónico`);
  }

  // Una definición versionada no puede llevar estado de ejecución: sería
  // mezclar configuración con runtime, justo lo que T7 prohíbe.
  for (const field of RUNTIME_FIELDS) {
    if (field === 'state') continue; // `state` inicial sí es admisible
    if (definition[field] !== undefined) {
      errors.push(`${where}: "${field}" es estado de ejecución y no puede declararse en queue.yaml`);
    }
  }

  return errors;
}

/** Lee y valida `queue.yaml`. Nunca lo escribe. */
export function loadQueue({ file } = {}) {
  const target = file ?? queueFile();
  if (!fs.existsSync(target)) {
    return { version: 1, tasks: [] };
  }
  const parsed = parseYaml(fs.readFileSync(target, 'utf8')) ?? {};
  const tasks = parsed.tasks ?? [];

  if (!Array.isArray(tasks)) {
    throw new QueueValidationError(['"tasks" debe ser una lista de tarjetas']);
  }

  const errors = tasks.flatMap((definition, index) => validateDefinition(definition, index));

  const seen = new Set();
  for (const definition of tasks) {
    const id = definition?.task_id;
    if (!id) continue;
    if (seen.has(id)) errors.push(`task_id duplicado: "${id}"`);
    seen.add(id);
  }

  if (errors.length > 0) throw new QueueValidationError(errors);

  return { version: parsed.version ?? 1, tasks };
}

export function findDefinition(queue, taskId) {
  return queue.tasks.find((t) => t.task_id === taskId) ?? null;
}

/**
 * Proyecta una definición versionada a una instancia de runtime. Es la
 * única puerta entre `queue.yaml` y `state/`: copia el contrato y añade
 * los campos de ejecución en su valor inicial.
 */
export function instantiate(definition) {
  return {
    // contrato (copiado de queue.yaml, inmutable en runtime)
    task_id: definition.task_id,
    mission_id: definition.mission_id,
    title: definition.title,
    risk_class: definition.risk_class,
    base_commit: definition.base_commit,
    allowed_write: definition.allowed_write ?? [],
    forbidden_scope: definition.forbidden_scope ?? [],
    dependencies: definition.dependencies ?? [],
    test_commands: definition.test_commands ?? [],
    reads_contract: definition.reads_contract ?? [],
    agent_role: definition.agent_role ?? null,
    qa_required: definition.qa_required ?? true,
    human_gate_required: definition.human_gate_required ?? false,
    allow_low_findings: definition.allow_low_findings ?? false,
    allow_rebase: definition.allow_rebase ?? false,
    max_repairs: definition.max_repairs ?? null,

    // runtime
    state: definition.state ?? 'READY',
    repair_iteration: 0,
    qa_iteration: 0,
    owner: null,
    worktree: null,
    branch: null,
    candidate_commit: null,
    blocked_reason: null,

    // sesión de QA (ownership de proceso, separado del lock de código)
    qa_handoff: null,
    qa_owner: null,
    qa_result: null,
  };
}
