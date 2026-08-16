import fs from 'node:fs';
import { recoveryFile } from './paths.mjs';
import { readTaskState } from './store.mjs';

/**
 * Guarda central de operabilidad de una tarjeta.
 *
 * La auditoría independiente de `LOOP-001` encontró dos condiciones que
 * quedaban registradas pero **no bloqueaban nada**:
 *
 *   ALTO   `RecoveryRequiredError` dejaba evidencia durable en
 *          `state/recovery/<task_id>.json` y ninguna operación posterior la
 *          consultaba: la tarjeta seguía avanzando sobre un estado que el
 *          propio motor había declarado irrecuperable.
 *
 *   MEDIO  entre la persistencia del estado y la confirmación del append de
 *          eventos existía una ventana en la que un lector veía el estado
 *          adelantado. Si el append fallaba, ese estado se restauraba: quien
 *          hubiera decidido en ese intervalo habría decidido sobre algo que
 *          nunca ocurrió.
 *
 * Ambas se cierran igual: **fail-closed y explícito**. Toda operación que
 * pueda promover una tarjeta llama a `assertOperable()` antes de escribir.
 * Ninguna condición se oculta ni se resuelve sola.
 *
 * ## Lo que esta guarda NO hace
 *
 * No borra evidencia, no repara estado, no infiere qué debería haber
 * pasado y no caduca. Salir de `RECOVERY_REQUIRED` exige la resolución
 * humana explícita de `resolveRecovery()` (`recovery.mjs`).
 *
 * ## Lectura vs decisión
 *
 * `describeTaskConditions()` es la vía informativa: `status` y `list`
 * pueden mostrar `RECOVERY_REQUIRED` o `PENDING_TRANSACTION` sin lanzar.
 * Informar no promueve; decidir sí, y decidir pasa por los `assert*`.
 */

export class RecoveryPendingError extends Error {
  constructor(taskId, evidence) {
    super(
      `"${taskId}" tiene recuperación pendiente y no admite ninguna operación que la promueva. ` +
        `Evidencia: ${recoveryFile(taskId)}. ` +
        'Requiere resolución humana explícita (`resolve-recovery --confirmed`). ' +
        'El motor no la borra ni la caduca por su cuenta.',
    );
    this.name = 'RecoveryPendingError';
    this.code = 'RECOVERY_REQUIRED';
    this.taskId = taskId;
    this.evidence = evidence ?? null;
  }
}

export class PendingTransactionError extends Error {
  constructor(taskId, pending) {
    super(
      `"${taskId}" tiene una transacción sin confirmar (${pending?.transaction_id ?? 'sin id'}): ` +
        `el estado "${pending?.to ?? '?'}" aún no está respaldado por su registro de eventos. ` +
        'Ninguna operación decisoria puede actuar sobre un estado no confirmado.',
    );
    this.name = 'PendingTransactionError';
    this.code = 'PENDING_TRANSACTION';
    this.taskId = taskId;
    this.pending = pending ?? null;
  }
}

/** Evidencia de recuperación de una tarjeta, o `null`. Sólo lectura. */
export function readRecovery(taskId) {
  const file = recoveryFile(taskId);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    // Ilegible sigue siendo bloqueante: su sola presencia es la señal.
    return { unreadable: true, file };
  }
}

export function hasPendingRecovery(taskId) {
  return fs.existsSync(recoveryFile(taskId));
}

/** Marca de transacción sin confirmar que lleva un estado ya leído. */
export function pendingTransactionOf(task) {
  return task?.transaction_pending ?? null;
}

/**
 * Fail-closed sobre recuperación pendiente. La evidencia **no se toca**:
 * ni se lee para decidir, ni se borra, ni se marca como vista.
 */
export function assertNoPendingRecovery(taskId) {
  if (hasPendingRecovery(taskId)) {
    throw new RecoveryPendingError(taskId, readRecovery(taskId));
  }
}

/**
 * Fail-closed sobre estado no confirmado. Acepta la tarjeta ya leída para
 * no releer disco en el camino caliente; si no se pasa, la lee.
 */
export function assertNoPendingTransaction(taskId, task) {
  const current = task ?? readTaskState(taskId);
  const pending = pendingTransactionOf(current);
  if (pending) throw new PendingTransactionError(taskId, pending);
}

/**
 * Puerta única. La llama toda operación que pueda promover la tarjeta:
 * `claim`, `dispatch`, `transition`, `block`, `release`, `resume`,
 * `handoff` de QA, `qa` y `readiness`.
 *
 * El orden importa: recuperación primero, porque es la condición más
 * grave y la única que exige intervención humana para levantarse.
 */
export function assertOperable(taskId, task) {
  assertNoPendingRecovery(taskId);
  assertNoPendingTransaction(taskId, task);
}

/**
 * Vista informativa, nunca lanza. Para `status`, `list` y cualquier
 * consumidor que deba **mostrar** la condición sin actuar sobre ella.
 *
 * @returns {{operable: boolean, conditions: string[], recovery: object|null,
 *            transaction_pending: object|null}}
 */
export function describeTaskConditions(taskId, task) {
  const recovery = readRecovery(taskId);
  const pending = pendingTransactionOf(task ?? readTaskState(taskId));
  const conditions = [];
  if (recovery) conditions.push('RECOVERY_REQUIRED');
  if (pending) conditions.push('PENDING_TRANSACTION');
  return {
    operable: conditions.length === 0,
    conditions,
    recovery,
    transaction_pending: pending,
    // Una resolución que registró su evento pero no llegó a archivarse. Sigue
    // bloqueando, y quien reintente debe saber que el evento ya existe para
    // no leer la traza duplicada como dos resoluciones distintas.
    recovery_resolution_incomplete: recovery?.resolution_event_appended != null,
  };
}
