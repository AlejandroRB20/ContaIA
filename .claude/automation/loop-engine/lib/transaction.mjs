import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { stateDir, stateMutationLockFile } from './paths.mjs';
import { withLock } from './lock.mjs';
import { getOrCreateTaskState, writeTaskState } from './store.mjs';
import { withEventLogLock, appendRecordsHoldingEventLock, toEventRecord } from './events.mjs';

/**
 * Commit de una transacción del motor: un cambio de estado y los eventos
 * que lo documentan, como una sola unidad.
 *
 * ## Por qué existe
 *
 * La reauditoría de `LOOP-001` encontró que la sesión de QA persistía salto
 * a salto y, si un salto posterior fallaba, **truncaba `events.jsonl`** al
 * tamaño previo. Como el log es global y el lock era por `task_id`, un
 * evento válido de otra tarjeta escrito en ese intervalo se perdía.
 *
 * El arreglo no es mover el `truncate` bajo otro lock: es **no truncar
 * nunca**. Un log append-only no se deshace borrando historia.
 *
 * ## Orden de commit (§ recomendación de la misión)
 *
 *   PREPARE  — todo se calcula y se valida en memoria, sin escribir.
 *   1. estado — si falla, **no se escribe ningún evento**.
 *   2. eventos — una sola escritura con todo el grupo.
 *
 * Si (2) falla se restaura únicamente `state/<task_id>.json`; el log global
 * no se toca jamás. Si esa restauración también falla, se deja evidencia en
 * `state/recovery/<task_id>.json` y se lanza `RecoveryRequiredError`.
 *
 * ## Garantía que ofrece v1 — y la que no
 *
 * **No es ACID.** No hay journal ni fsync de dos fases. Lo que sí garantiza,
 * y está cubierto por pruebas:
 *
 *   - nunca se pierde un evento ya persistido, de esta tarjeta o de otra;
 *   - un fallo al escribir el estado no deja eventos de esa transacción;
 *   - un fallo al escribir los eventos no deja el estado adelantado, salvo
 *     que la restauración falle, y entonces se señala explícitamente en vez
 *     de silenciarse;
 *   - los eventos de una transacción entran todos o ninguno, porque son una
 *     única llamada de escritura bajo el lock global;
 *   - una escritura concurrente de otra tarjeta no se corrompe ni se pierde.
 *
 * Lo que **no** garantiza: durabilidad ante corte de energía a media
 * llamada del sistema operativo, ni aislamiento de lecturas sin lock.
 */

export class StaleTransactionError extends Error {
  constructor(taskId, expected, actual) {
    super(
      `La tarjeta "${taskId}" cambió de "${expected}" a "${actual}" mientras se preparaba la ` +
        'transacción. Se aborta sin escribir: la validación se hizo sobre un estado que ya no es.',
    );
    this.name = 'StaleTransactionError';
    this.code = 'STALE_TRANSACTION';
  }
}

export class RecoveryRequiredError extends Error {
  constructor(taskId, detail) {
    super(
      `"${taskId}" quedó con el estado adelantado y sin poder restaurarse: ${detail}. ` +
        'El event log NO se ha tocado. Requiere intervención humana.',
    );
    this.name = 'RecoveryRequiredError';
    this.code = 'RECOVERY_REQUIRED';
    this.taskId = taskId;
  }
}

function recoveryFile(taskId) {
  return path.join(stateDir(), 'recovery', `${taskId}.json`);
}

/** Evidencia en disco: el proceso puede morir antes de que nadie lea el error. */
function preserveEvidence(taskId, evidence) {
  try {
    const file = recoveryFile(taskId);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
    return file;
  } catch {
    return null;
  }
}

/**
 * @param {object} params
 * @param {string} params.taskId
 * @param {string} params.from estado sobre el que se validó la transacción
 * @param {object} params.changes campos a aplicar sobre el estado fresco
 * @param {object[]} params.events eventos del grupo, sin canonizar
 */
export function commitTransaction({ taskId, from, changes, events = [] }) {
  const transactionId = randomUUID();
  const records = events.map((event) => toEventRecord(event, transactionId));

  return withEventLogLock(() => {
    // 1. Estado. Se relee dentro del lock y se aborta si derivó: la
    //    validación se hizo contra `from` y no vale para otro estado.
    const { next, snapshot } = withLock(stateMutationLockFile(), () => {
      const fresh = getOrCreateTaskState(taskId);
      if (from !== undefined && fresh.state !== from) {
        throw new StaleTransactionError(taskId, from, fresh.state);
      }
      const updated = { ...fresh, ...changes };
      writeTaskState(updated);
      return { next: updated, snapshot: fresh };
    });

    // 2. Eventos. Una sola escritura: entran todos o ninguno.
    try {
      appendRecordsHoldingEventLock(records);
    } catch (appendError) {
      // El log NO se trunca ni se reescribe. Se deshace sólo el estado.
      try {
        withLock(stateMutationLockFile(), () => writeTaskState(snapshot));
      } catch (restoreError) {
        preserveEvidence(taskId, {
          reason: 'append de eventos y restauración de estado fallaron',
          append_error: appendError.message,
          restore_error: restoreError.message,
          transaction_id: transactionId,
          state_snapshot: snapshot,
          pending_events: records,
          at: new Date().toISOString(),
        });
        throw new RecoveryRequiredError(taskId, restoreError.message);
      }
      throw appendError;
    }

    return { task: next, transactionId, records };
  });
}
