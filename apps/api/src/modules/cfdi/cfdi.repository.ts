import type { Cfdi, Prisma } from '@contaia/database';
import { Injectable } from '@nestjs/common';

import type { ExtractedCfdiAggregate } from './cfdi-aggregate.types';
import { ViolacionDeInvarianteError } from './cfdi.errors';

/**
 * Cabecera del agregado CFDI (AD-10.1.2). `create()` — nunca
 * `upsert({ update: {} })` (D-007): un `INSERT` que viola la restricción
 * única `(documentId, companyId)` o `(companyId, folioFiscal)` **siempre**
 * lanza y aborta la transacción — es el detector de colisión fiable en el
 * que se apoya toda la estrategia de concurrencia (criterio 59).
 *
 * Cada método recibe el `tx` de la Transacción A (`E5-S2-T06`)
 * explícitamente, nunca el cliente Prisma global: esta cabecera, sus hijos
 * (`E5-S2-T03`), la transición terminal de `Document` (`E5-S2-T04`) y el
 * cierre del `Job` (`E5-S2-T05`) deben compartir un único commit.
 */
@Injectable()
export class CfdiRepository {
  /**
   * Crea la cabecera `Cfdi` a partir del encabezado de un
   * `ExtractedCfdiAggregate`. `documentId`/`companyId` son contexto de
   * persistencia — deliberadamente ausentes del agregado extraído
   * (`E5-S2-T01`): el parser nunca los conoce ni los produce.
   *
   * El `findUnique` previo es una **guarda de invariante**, no una rama de
   * reutilización (D-007, derogación de AD-10.1): bajo la transacción
   * única, hallar un `Cfdi` existente para este `(documentId, companyId)`
   * mientras el `Document` sigue en `PROCESSING` es un estado imposible
   * (Addendum §10.0.2). Nunca se completa el agregado sobre él, nunca se
   * compara su contenido, nunca se continúa el flujo normal con su valor —
   * su única salida no nominal es lanzar `ViolacionDeInvarianteError` y
   * abortar con rollback; el `catch` externo de la Transacción A
   * (`E5-S2-T06`) la escala como incidente, nunca como éxito silencioso.
   */
  async create(
    tx: Prisma.TransactionClient,
    documentId: string,
    companyId: string,
    aggregate: ExtractedCfdiAggregate,
  ): Promise<Cfdi> {
    const existing = await tx.cfdi.findUnique({
      where: { documentId_companyId: { documentId, companyId } },
    });

    if (existing) {
      throw new ViolacionDeInvarianteError('cfdi_preexistente_con_document_processing');
    }

    return tx.cfdi.create({
      data: {
        companyId,
        documentId,
        folioFiscal: aggregate.folioFiscal,
        rfcEmisor: aggregate.rfcEmisor,
        rfcReceptor: aggregate.rfcReceptor,
        issuedAt: aggregate.issuedAt,
        subtotal: aggregate.subtotal,
        total: aggregate.total,
        currency: aggregate.currency,
        tipoComprobante: aggregate.tipoComprobante,
        ambiguousFields: [...aggregate.ambiguousFields],
      },
    });
  }
}
