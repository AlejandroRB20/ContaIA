import { CfdiTaxScope, type CfdiConcept, type CfdiTax, type Prisma } from '@contaia/database';
import { Injectable } from '@nestjs/common';

import type { ExtractedConcept, ExtractedTax } from './cfdi-aggregate.types';
import { ViolacionDeInvarianteError } from './cfdi.errors';

/**
 * Contexto de persistencia de un grupo de impuestos — deriva `scope` y
 * `conceptSlot`, nunca los recibe como parámetro suelto independiente del
 * contenedor real (AD-5 §4.5.2, CHECK `cfdi_taxes_scope_concept_check`).
 */
interface TaxGroupContext {
  readonly scope: CfdiTaxScope;
  readonly conceptSlot: number;
  readonly cfdiConceptId: string | null;
}

/**
 * Hijos "impuesto" del agregado CFDI (AD-5 §4.5.2, AD-10.1.2). `upsert` por
 * la identidad declarativa `(companyId, cfdiId, conceptSlot, position)` —
 * mismo motivo que `CfdiConceptRepository`: la identidad no depende de si la
 * fila fue creada o reutilizada, solo de su posición dentro de un `cfdiId`
 * ya garantizado nuevo por la guarda de invariante de `E5-S2-T02`.
 *
 * Cada método recibe el `tx` de la Transacción A (`E5-S2-T06`)
 * explícitamente, nunca el cliente Prisma global — nunca abre su propia
 * transacción.
 */
@Injectable()
export class CfdiTaxRepository {
  /**
   * Impuestos de nivel comprobante (`<cfdi:Impuestos>` en la raíz del CFDI,
   * `aggregate.cfdiTaxes`). `scope = CFDI`, `conceptSlot = 0`,
   * `cfdiConceptId = null` — impuestos por diseño, no leídos de ninguna
   * entrada externa (`ExtractedTax` no tiene `scope` ni `conceptSlot`, ver
   * `cfdi-aggregate.types.ts`).
   */
  async upsertComprobanteTaxes(
    tx: Prisma.TransactionClient,
    cfdiId: string,
    companyId: string,
    taxes: readonly ExtractedTax[],
  ): Promise<CfdiTax[]> {
    return this.upsertTaxes(tx, cfdiId, companyId, taxes, {
      scope: CfdiTaxScope.CFDI,
      conceptSlot: 0,
      cfdiConceptId: null,
    });
  }

  /**
   * Impuestos de nivel concepto (`<cfdi:Concepto><cfdi:Impuestos>`,
   * `concept.taxes` de cada `ExtractedConcept`). `scope = CONCEPT`,
   * `conceptSlot` derivado de `concept.position` (nunca aceptado como
   * parámetro suelto), `cfdiConceptId` tomado del `CfdiConcept` real que
   * `CfdiConceptRepository.upsertMany` ya persistió en esta misma
   * transacción.
   *
   * `concepts` y `createdConcepts` deben tener la misma longitud, el mismo
   * orden, **y la misma `position` en cada índice** — contrato que
   * `CfdiConceptRepository.upsertMany` garantiza (retorna en el mismo orden
   * que recibió), pero que aquí se verifica explícitamente en vez de
   * asumirse: un desajuste de longitud, un índice faltante, o un
   * `createdConcepts[index].position` distinto de `concepts[index].position`
   * indicaría un uso incorrecto del contrato entre ambos repositorios, no un
   * dato fiscal inválido, y nunca debe emparejar el `conceptSlot` de un
   * concepto con el `cfdiConceptId` de otro por un desajuste silencioso de
   * índice (AD-5 §4.5.2, corrección de auditoría `H-T03-01`). La validación
   * completa de los tres criterios se agota **antes** de la primera
   * escritura — ningún `upsert` se ejecuta si cualquier par diverge, incluso
   * si la divergencia aparece en un índice posterior a pares válidos.
   */
  async upsertConceptTaxes(
    tx: Prisma.TransactionClient,
    cfdiId: string,
    companyId: string,
    concepts: readonly ExtractedConcept[],
    createdConcepts: readonly CfdiConcept[],
  ): Promise<CfdiTax[]> {
    if (concepts.length !== createdConcepts.length) {
      throw new ViolacionDeInvarianteError(
        'concept_tax_correspondence_mismatch',
        `concepts (${concepts.length}) y createdConcepts (${createdConcepts.length}) deben tener la misma longitud y el mismo orden; no se persistió ningún impuesto de concepto.`,
      );
    }

    // Validación completa y previa de la correspondencia posicional — un
    // unico `map` sincrono (sin `await`) que agota los N pares antes de que
    // el `for…await` de escritura, más abajo, ejecute el primer `upsert`.
    // Si cualquier índice diverge, `map` lanza de inmediato y ningún `upsert`
    // llegó a invocarse — incluso cuando índices anteriores sí habrían
    // emparejado correctamente.
    const pairs = concepts.map((concept, index) => {
      const createdConcept = createdConcepts[index];
      if (!createdConcept) {
        throw new ViolacionDeInvarianteError(
          'concept_tax_correspondence_mismatch',
          `falta createdConcepts[${index}] correspondiente a concepts[${index}] (position=${concept.position}); no se persistió ningún impuesto de concepto.`,
        );
      }
      if (createdConcept.position !== concept.position) {
        throw new ViolacionDeInvarianteError(
          'concept_tax_correspondence_mismatch',
          `createdConcepts[${index}] tiene position=${createdConcept.position}, pero concepts[${index}] (fuente) tiene position=${concept.position}; el emparejamiento por índice no corresponde. No se persistió ningún impuesto de concepto.`,
        );
      }
      return { concept, createdConcept };
    });

    const created: CfdiTax[] = [];

    for (const { concept, createdConcept } of pairs) {
      const rows = await this.upsertTaxes(tx, cfdiId, companyId, concept.taxes, {
        scope: CfdiTaxScope.CONCEPT,
        conceptSlot: concept.position,
        cfdiConceptId: createdConcept.id,
      });
      created.push(...rows);
    }

    return created;
  }

  /**
   * Secuencial (`for…await`, no `Promise.all`) — mismo orden que el
   * pseudocódigo de referencia de AD-10.1.2 — para mantener el orden
   * determinista de escritura dentro de la conexión única de la transacción
   * interactiva.
   */
  private async upsertTaxes(
    tx: Prisma.TransactionClient,
    cfdiId: string,
    companyId: string,
    taxes: readonly ExtractedTax[],
    context: TaxGroupContext,
  ): Promise<CfdiTax[]> {
    const created: CfdiTax[] = [];

    for (const tax of taxes) {
      const row = await tx.cfdiTax.upsert({
        where: {
          companyId_cfdiId_conceptSlot_position: {
            companyId,
            cfdiId,
            conceptSlot: context.conceptSlot,
            position: tax.position,
          },
        },
        create: {
          companyId,
          cfdiId,
          cfdiConceptId: context.cfdiConceptId,
          scope: context.scope,
          conceptSlot: context.conceptSlot,
          position: tax.position,
          type: tax.type,
          impuesto: tax.impuesto,
          tipoFactor: tax.tipoFactor,
          tasaOCuota: tax.tasaOCuota,
          base: tax.base,
          importe: tax.importe,
        },
        update: {
          cfdiConceptId: context.cfdiConceptId,
          scope: context.scope,
          type: tax.type,
          impuesto: tax.impuesto,
          tipoFactor: tax.tipoFactor,
          tasaOCuota: tax.tasaOCuota,
          base: tax.base,
          importe: tax.importe,
        },
      });
      created.push(row);
    }

    return created;
  }
}
