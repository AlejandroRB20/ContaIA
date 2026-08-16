import { globsOverlap } from './glob.mjs';

/**
 * Colisión de contrato compartido (arquitectura §10.5, `LOOP-002`).
 *
 * *"Una escribe un archivo que la otra lee como contrato (tipos, DTO,
 * `*-client.ts`, `*.types.ts`, `schema.prisma`, `docs/08_API_DESIGN.md`).
 * Se deriva de los globs `allowed_write` de A contra un conjunto declarado
 * `reads_contract` de B."* — texto literal de la arquitectura, ya presente
 * en el esquema de `queue.mjs` desde `LOOP-001` (`reads_contract` es campo
 * de definición desde el principio; sólo la comprobación faltaba).
 *
 * **Contract-driven, no adivinanza por palabra clave.** El motor no
 * inspecciona nombres de archivo buscando "client" o "schema": compara los
 * globs que cada tarjeta **declaró explícitamente** que lee como contrato
 * contra los que la otra declaró que escribe. Dos tarjetas colisionan
 * aunque sus `allowed_write` no se toquen en absoluto — es exactamente el
 * caso que un colisionador de rutas puro no detecta: A escribe
 * `apps/api/src/modules/documents/dto.ts`, B escribe
 * `apps/web/src/lib/documents-client.ts` sin tocar ese archivo, pero B
 * declaró `reads_contract: ['apps/api/src/modules/documents/dto.ts']`.
 *
 * La comprobación es **bidireccional**: cualquiera de las dos tarjetas
 * puede ser la que escribe el contrato que la otra lee.
 */

/** ¿`writer` escribe algo que `reader` declaró leer como contrato? */
function writesWhatOtherReads(writer, reader) {
  return globsOverlap(writer.allowed_write, reader.reads_contract);
}

/**
 * @param {{task_id: string, allowed_write?: string[], reads_contract?: string[]}} task
 * @param {Array<object>} others candidatas activas, ya excluida `task`
 * @returns {Array<{check: 'SHARED_CONTRACT', with: string, direction: string,
 *   blocked_reason: 'shared_contract_collision'}>}
 */
export function sharedContractConflicts(task, others) {
  const conflicts = [];
  for (const other of others) {
    if (other.task_id === task.task_id) continue;

    if (writesWhatOtherReads(task, other)) {
      conflicts.push({
        check: 'SHARED_CONTRACT',
        with: other.task_id,
        direction: `${task.task_id} escribe contrato que ${other.task_id} declara leer`,
        blocked_reason: 'shared_contract_collision',
      });
    }
    if (writesWhatOtherReads(other, task)) {
      conflicts.push({
        check: 'SHARED_CONTRACT',
        with: other.task_id,
        direction: `${other.task_id} escribe contrato que ${task.task_id} declara leer`,
        blocked_reason: 'shared_contract_collision',
      });
    }
  }
  return conflicts;
}
