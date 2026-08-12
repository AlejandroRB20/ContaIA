import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { recoveryFile, stateMutationLockFile } from './paths.mjs';
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
 * ## Orden de commit
 *
 *   PREPARE  — todo se calcula y se valida en memoria, sin escribir.
 *   LOCKS    — lock global del log, y dentro de él el lock de estado.
 *   STATE    — estado nuevo **marcado** `transaction_pending`.
 *   EVENTS   — una sola escritura con todo el grupo.
 *   CONFIRM  — se retira la marca: el estado queda respaldado por el log.
 *
 * ## La marca `transaction_pending` — hallazgo MEDIO de la reauditoría
 *
 * Entre STATE y EVENTS el estado en disco va por delante del log. La versión
 * anterior no lo señalaba, así que un lector concurrente (`status`, `list`,
 * `readiness`, el dispatcher) podía **decidir** sobre un estado que un
 * instante después se restauraba.
 *
 * Ahora ese intervalo es explícito y local: `state/<task_id>.json` lleva
 * `transaction_pending` mientras dura. `guard.mjs` lo convierte en
 * fail-closed para toda operación decisoria; las lecturas informativas
 * pueden mostrarlo como `PENDING_TRANSACTION` sin actuar. La ventana no se
 * elimina —eso exigiría un journal— pero deja de ser **silenciosa**, que es
 * lo que la hacía peligrosa.
 *
 * ## Rutas de fallo
 *
 *   - falla STATE  → no se escribe ningún evento; nada que deshacer.
 *   - falla EVENTS → se restaura el estado previo (sin marca). El log global
 *                    **no se trunca jamás**.
 *   - falla la restauración → evidencia en `state/recovery/<task_id>.json`,
 *                    la marca **permanece** y se lanza `RecoveryRequiredError`.
 *   - falla CONFIRM → los eventos ya están escritos y son válidos, pero la
 *                    marca no pudo retirarse. Se deja evidencia y la tarjeta
 *                    queda bloqueada: preferimos exigir una revisión humana
 *                    antes que declarar confirmado lo que no pudimos cerrar.
 *
 * ## Garantía que ofrece v1 — y la que no
 *
 * **No es ACID.** No hay journal, ni fsync de dos fases, ni aislamiento de
 * snapshot. Lo que sí garantiza, y está cubierto por pruebas:
 *
 *   - nunca se pierde un evento ya persistido, de esta tarjeta o de otra;
 *   - un fallo al escribir el estado no deja eventos de esa transacción;
 *   - un fallo al escribir los eventos no deja el estado adelantado, salvo
 *     que la restauración falle, y entonces se señala explícitamente en vez
 *     de silenciarse;
 *   - los eventos de una transacción entran todos o ninguno, porque son una
 *     única llamada de escritura bajo el lock global;
 *   - una escritura concurrente de otra tarjeta no se corrompe ni se pierde;
 *   - mientras el estado no esté respaldado por el log, ninguna operación
 *     decisoria puede consumirlo.
 *
 * Lo que **no** garantiza: durabilidad ante corte de energía a media llamada
 * del sistema operativo (un proceso muerto entre STATE y EVENTS deja la
 * marca puesta, que es fail-closed pero exige resolución humana), ni
 * aislamiento de lecturas que no pasen por la guarda.
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
      `"${taskId}" quedó con la transacción sin cerrar y el motor no pudo dejarla consistente: ` +
        `${detail}. El event log NO se ha truncado ni reescrito. La tarjeta queda bloqueada ` +
        'hasta una resolución humana explícita.',
    );
    this.name = 'RecoveryRequiredError';
    this.code = 'RECOVERY_REQUIRED';
    this.taskId = taskId;
  }
}

/**
 * Evidencia en disco: el proceso puede morir antes de que nadie lea el
 * error. Su sola presencia bloquea la tarjeta (`guard.mjs`) hasta que una
 * persona la resuelva; el motor nunca la borra.
 */
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

/** Retira la marca de transacción sin confirmar. Bajo el lock de estado. */
function confirmTransaction(taskId, transactionId) {
  withLock(stateMutationLockFile(), () => {
    const current = getOrCreateTaskState(taskId);
    if (current.transaction_pending?.transaction_id !== transactionId) return;
    const confirmed = { ...current };
    delete confirmed.transaction_pending;
    writeTaskState(confirmed);
  });
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
    // STATE. Se relee dentro del lock y se aborta si derivó: la validación
    // se hizo contra `from` y no vale para otro estado. El estado nuevo se
    // escribe MARCADO: hasta que los eventos estén, no es consumible.
    const { next, snapshot } = withLock(stateMutationLockFile(), () => {
      const fresh = getOrCreateTaskState(taskId);
      if (from !== undefined && fresh.state !== from) {
        throw new StaleTransactionError(taskId, from, fresh.state);
      }
      const updated = {
        ...fresh,
        ...changes,
        transaction_pending: {
          transaction_id: transactionId,
          from: fresh.state,
          to: changes.state ?? fresh.state,
          event_count: records.length,
          started_at: new Date().toISOString(),
        },
      };
      writeTaskState(updated);
      // El snapshot de restauración nunca lleva marca: es el estado previo.
      const clean = { ...fresh };
      delete clean.transaction_pending;
      return { next: updated, snapshot: clean };
    });

    // EVENTS. Una sola escritura: entran todos o ninguno.
    try {
      appendRecordsHoldingEventLock(records);
    } catch (appendError) {
      // El log NO se trunca ni se reescribe. Se deshace sólo el estado, y
      // con él la marca: el intervalo no confirmado se cierra al revertir.
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
          events_written: false,
          at: new Date().toISOString(),
        });
        // La marca permanece: el estado en disco sigue sin respaldo.
        throw new RecoveryRequiredError(taskId, restoreError.message);
      }
      throw appendError;
    }

    // CONFIRM. Los eventos ya son durables; sólo falta retirar la marca.
    // Si esto falla, la transacción fue correcta pero no pudimos cerrarla:
    // se deja evidencia y la tarjeta queda bloqueada en vez de aparentar
    // normalidad. Ninguna limpieza fallida se da por buena.
    try {
      confirmTransaction(taskId, transactionId);
    } catch (confirmError) {
      preserveEvidence(taskId, {
        reason: 'los eventos se escribieron pero la marca transaction_pending no pudo retirarse',
        confirm_error: confirmError.message,
        transaction_id: transactionId,
        state_snapshot: snapshot,
        pending_events: records,
        events_written: true,
        at: new Date().toISOString(),
      });
      throw new RecoveryRequiredError(taskId, confirmError.message);
    }

    const confirmed = { ...next };
    delete confirmed.transaction_pending;
    return { task: confirmed, transactionId, records };
  });
}
