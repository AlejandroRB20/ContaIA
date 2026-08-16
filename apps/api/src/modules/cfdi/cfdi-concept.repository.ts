import type { CfdiConcept, Prisma } from '@contaia/database';
import { Injectable } from '@nestjs/common';

import type { ExtractedConcept } from './cfdi-aggregate.types';

/**
 * Hijos "concepto" del agregado CFDI (AD-5 §4.5.1, AD-10.1.2). `upsert` por
 * la identidad declarativa `(companyId, cfdiId, position)` — a diferencia
 * de la cabecera (`CfdiRepository`, `E5-S2-T02`), aquí `upsert` **sí** es
 * correcto: la identidad de un concepto no depende de si la fila fue creada
 * o reutilizada, solo de su posición dentro de un `cfdiId` ya garantizado
 * nuevo por la guarda de invariante de `E5-S2-T02` (AD-10.1.2).
 *
 * Cada método recibe el `tx` de la Transacción A (`E5-S2-T06`)
 * explícitamente, nunca el cliente Prisma global — nunca abre su propia
 * transacción.
 */
@Injectable()
export class CfdiConceptRepository {
  /**
   * Persiste todos los conceptos de un `Cfdi` ya creado en esta misma
   * transacción. Secuencial (`for…await`, no `Promise.all`) — mismo orden
   * que el pseudocódigo de referencia de AD-10.1.2 — para mantener el orden
   * determinista de escritura y evitar cualquier ambigüedad de intercalado
   * dentro de la conexión única de la transacción interactiva.
   *
   * Retorna las filas creadas/actualizadas **en el mismo orden** que
   * `concepts` — contrato del que depende `CfdiTaxRepository.upsertConceptTaxes`
   * (`E5-S2-T03`) para emparejar cada concepto con el `id` real que la base
   * de datos generó.
   */
  async upsertMany(
    tx: Prisma.TransactionClient,
    cfdiId: string,
    companyId: string,
    concepts: readonly ExtractedConcept[],
  ): Promise<CfdiConcept[]> {
    const created: CfdiConcept[] = [];

    for (const concept of concepts) {
      const row = await tx.cfdiConcept.upsert({
        where: {
          companyId_cfdiId_position: { companyId, cfdiId, position: concept.position },
        },
        create: {
          companyId,
          cfdiId,
          position: concept.position,
          claveProdServ: concept.claveProdServ,
          noIdentificacion: concept.noIdentificacion,
          cantidad: concept.cantidad,
          claveUnidad: concept.claveUnidad,
          unidad: concept.unidad,
          descripcion: concept.descripcion,
          valorUnitario: concept.valorUnitario,
          importe: concept.importe,
          descuento: concept.descuento,
          objetoImp: concept.objetoImp,
        },
        update: {
          claveProdServ: concept.claveProdServ,
          noIdentificacion: concept.noIdentificacion,
          cantidad: concept.cantidad,
          claveUnidad: concept.claveUnidad,
          unidad: concept.unidad,
          descripcion: concept.descripcion,
          valorUnitario: concept.valorUnitario,
          importe: concept.importe,
          descuento: concept.descuento,
          objetoImp: concept.objetoImp,
        },
      });
      created.push(row);
    }

    return created;
  }
}
