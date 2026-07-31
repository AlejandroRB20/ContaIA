import { prisma, Prisma } from '@contaia/database';
import { Injectable, Logger } from '@nestjs/common';
import { UnrecoverableError } from 'bullmq';

import { DocumentsRepository } from '../documents/documents.repository';
import { JobsRepository } from '../jobs/jobs.repository';

import type { ExtractedCfdiAggregate } from './cfdi-aggregate.types';
import { CfdiConceptRepository } from './cfdi-concept.repository';
import { CfdiTaxRepository } from './cfdi-tax.repository';
import {
  AgregadoNoVerificadoError,
  TransicionNoConfirmadaError,
  ViolacionDeInvarianteError,
} from './cfdi.errors';
import { CfdiRepository } from './cfdi.repository';

export interface PersistCfdiAggregateInput {
  readonly documentId: string;
  readonly companyId: string;
  readonly jobId: string;
  /** SHA-256 calculado por el worker sobre los bytes descargados en este intento (AD-6). */
  readonly checksumSha256: string;
  readonly aggregate: ExtractedCfdiAggregate;
}

export interface PersistCfdiAggregateResult {
  readonly cfdiId: string;
  readonly documentId: string;
  readonly companyId: string;
}

/**
 * `E5-S2-T06`. Transacción A única (D-007, Addendum AD-10.1.2/§7 paso 10):
 * orquesta `CfdiRepository` (`E5-S2-T02`), `CfdiConceptRepository`/
 * `CfdiTaxRepository` (`E5-S2-T03`), `DocumentsRepository.markAsProcessed`
 * (`E5-S2-T04`) y `JobsRepository.markAsCompleted` (`E5-S2-T05`) dentro de
 * una única `prisma.$transaction` interactiva — nunca la forma de arreglo,
 * que no permite ramificar sobre un resultado intermedio. Todos los
 * repositorios reciben el mismo `tx` de este callback; ninguno abre su
 * propia transacción ni usa el cliente global.
 *
 * **Divergencia deliberada frente al pseudocódigo ilustrativo de AD-10.1.2:**
 * el pseudocódigo persiste el checksum con un `tx.document.update` propio,
 * antes de los hijos, y la transición terminal `Document` con un
 * `tx.document.updateMany` posterior — dos escrituras separadas. La
 * implementación real de `E5-S2-T04` (auditada, `PASSED`,
 * `docs/engineering/audits/E5-S2-T04_FINAL_AUDIT.md`) combinó ambas en una
 * sola llamada — `DocumentsRepository.markAsProcessed(tx, id, companyId,
 * checksumSha256)` — que persiste `checksumSha256` en la MISMA operación
 * atómica que la transición `PROCESSING → PROCESSED`. `DocumentsRepository`
 * no expone ningún método para escribir el checksum por separado; usar
 * `markAsProcessed` es el único punto de persistencia del checksum en esta
 * orquestación, consistente con el contrato ya implementado y auditado — no
 * se reintroduce una escritura separada que ningún repositorio expone.
 *
 * **Ningún `try/catch` envuelve el callback transaccional.** Dentro de
 * `prisma.$transaction(async (tx) => {...})` no hay captura alguna — ningún
 * `P2002`, `ViolacionDeInvarianteError`, `TransicionNoConfirmadaError` ni
 * `AgregadoNoVerificadoError` se captura ahí, se deja propagar para que
 * `prisma.$transaction` revierta todo el intento (rollback total, D-007
 * Regla 3/4). La clasificación **de negocio** de la excepción (AD-10.2,
 * casos A–G) sigue siendo responsabilidad exclusiva del futuro `catch`
 * externo del worker/processor (`XmlProcessingModule`, fuera de alcance de
 * `E5-S2-T06`/`E5-S2-T09`).
 *
 * **`E5-S2-T09`:** `persist()` encadena un único `.catch()` sobre la
 * *promesa* que devuelve `$transaction(...)` — nunca dentro del callback —
 * exclusivamente para emitir un log mínimo de observabilidad (puntos de
 * enganche, sin formato definitivo hasta Sprint 8) y relanzar el mismo
 * `error` recibido sin envolverlo, transformarlo ni cambiar su
 * clasificación de recuperabilidad. Para cuando ese `.catch()` se ejecuta,
 * Prisma ya abortó/revirtió la transacción — esta rama no participa del
 * rollback, solo lo observa después de ocurrido.
 */
@Injectable()
export class PersistCfdiAggregateService {
  /**
   * `E5-S2-T09`. Puntos mínimos de enganche para observabilidad — sin
   * formato definitivo (Sprint 8): inicio del intento, commit exitoso, y
   * cada clasificación de error que este método puede distinguir por
   * `instanceof`. Mismo patrón de `Logger` ya usado en `JobsService`/
   * `DocumentsService`/`BullMqJobsQueueAdapter` (`new Logger(ClassName.name)`,
   * sin inyección por constructor). Nunca registra `aggregate` (XML/RFC/
   * montos/folio) ni ningún objeto `Error` completo — solo identificadores
   * de contexto y, en el error, su clasificación y el `name` del error.
   */
  private readonly logger = new Logger(PersistCfdiAggregateService.name);

  constructor(
    private readonly cfdiRepository: CfdiRepository,
    private readonly cfdiConceptRepository: CfdiConceptRepository,
    private readonly cfdiTaxRepository: CfdiTaxRepository,
    private readonly documentsRepository: DocumentsRepository,
    private readonly jobsRepository: JobsRepository,
  ) {}

  async persist(input: PersistCfdiAggregateInput): Promise<PersistCfdiAggregateResult> {
    const context = `companyId=${input.companyId}, documentId=${input.documentId}, jobId=${input.jobId}`;
    this.logger.log(`cfdi.persistence.transaction.started (${context}).`);

    const result = await prisma
      .$transaction(async (tx) => {
        // 1) + 2) Guarda de invariante + create() — CfdiRepository.create()
        // encapsula ambas: findUnique previo (si existe, lanza
        // ViolacionDeInvarianteError sin leer ni reutilizar su contenido) y
        // tx.cfdi.create() (nunca upsert). Secuencial, primer paso.
        const cfdi = await this.cfdiRepository.create(
          tx,
          input.documentId,
          input.companyId,
          input.aggregate,
        );

        // 4) Hijos — conceptos. Antes que los impuestos: CfdiTaxRepository
        // necesita los `id` reales de los conceptos ya persistidos para
        // derivar `cfdiConceptId` de los impuestos de nivel concepto (riesgo
        // documentado explícitamente en la tarjeta de E5-S2-T03: "el orden de
        // invocación real — concepts → comprobante-taxes → concept-taxes —
        // coincide con lo asumido aquí").
        const createdConcepts = await this.cfdiConceptRepository.upsertMany(
          tx,
          cfdi.id,
          input.companyId,
          input.aggregate.concepts,
        );

        // 5) Hijos — impuestos. Orden exacto: comprobante primero, concepto
        // después (mismo orden documentado en la tarjeta de E5-S2-T03).
        await this.cfdiTaxRepository.upsertComprobanteTaxes(
          tx,
          cfdi.id,
          input.companyId,
          input.aggregate.cfdiTaxes,
        );
        await this.cfdiTaxRepository.upsertConceptTaxes(
          tx,
          cfdi.id,
          input.companyId,
          input.aggregate.concepts,
          createdConcepts,
        );

        // 6) Relectura y verificación estructural — verificaciones 3–7 de
        // AD-10.1. Consulta NUEVA contra la tabla (no reutiliza los arreglos
        // ya devueltos por los upserts): el propósito de "releer" es detectar
        // una divergencia real entre lo persistido y el agregado esperado,
        // no reconfirmar lo que el propio camino de escritura ya asumió.
        await this.verifyPersistedAggregate(tx, cfdi.id, input.companyId, input.aggregate);

        // 7) Transición terminal condicional `Document PROCESSING→PROCESSED`,
        // con el checksum en la misma operación atómica (ver nota de cabecera
        // sobre la divergencia deliberada frente al pseudocódigo). Lanza
        // TransicionNoConfirmadaError('document', count) si count !== 1 — se
        // deja propagar, nunca se captura aquí.
        await this.documentsRepository.markAsProcessed(
          tx,
          input.documentId,
          input.companyId,
          input.checksumSha256,
        );

        // 8) Cierre del Job — comprobación de count OBLIGATORIA, igual que el
        // paso anterior (sin ella, el Document quedaría PROCESSED con el Job
        // sin cerrar: la divergencia que motivó D-007). `result` exactamente
        // como especifica el pseudocódigo de AD-10.1.2.
        await this.jobsRepository.markAsCompleted(tx, input.jobId, input.companyId, {
          resourceType: 'cfdi',
          resourceId: cfdi.id,
          documentId: input.documentId,
        });

        // 9) Retornar el agregado — único commit: cabecera + hijos + checksum
        // + Document PROCESSED + Job COMPLETED, confirmados juntos al salir
        // de este callback sin haber lanzado.
        return { cfdiId: cfdi.id, documentId: input.documentId, companyId: input.companyId };
      })
      .catch((error: unknown) => {
        // `.catch()` sobre la promesa de `$transaction`, nunca un `try/catch`
        // dentro del callback — Prisma ya abortó/revirtió la transacción
        // internamente antes de que esta rama se ejecute; solo clasifica
        // para el log y relanza el mismo objeto de error sin envolverlo,
        // transformarlo ni ocultarlo (ningún `P2002` ni
        // `PrismaClientKnownRequestError` se captura de forma definitiva).
        this.logTransactionFailure(error, context);
        throw error;
      });

    // Log de commit DESPUÉS de que `$transaction(...)` resolvió con éxito —
    // nunca dentro del callback (E5-S2-T09): solo aquí es correcto afirmar
    // que el commit ocurrió.
    this.logger.log(
      `cfdi.persistence.transaction.committed (${context}, cfdiId=${result.cfdiId}).`,
    );

    return result;
  }

  /**
   * Clasifica el error únicamente para elegir el log a emitir — nunca para
   * ramificar lógica de negocio ni para cambiar qué se relanza (`persist()`
   * siempre relanza el mismo `error` recibido, sin excepción). Cubre las
   * tres clases de dominio reconciliadas en `E5-S2-T07`
   * (`ViolacionDeInvarianteError`/`TransicionNoConfirmadaError`/
   * `AgregadoNoVerificadoError`), `UnrecoverableError` de BullMQ (rama
   * defensiva: nada dentro de esta transacción la construye hoy — ver nota
   * de reconciliación de BullMQ en `cfdi.errors.ts`), errores de Prisma ya
   * anticipados como recuperables por AD-10.1.2/AD-11 (`P2002` de carrera) y,
   * por último, cualquier error no reconocido.
   */
  private logTransactionFailure(error: unknown, context: string): void {
    if (error instanceof ViolacionDeInvarianteError) {
      this.logger.error(
        `cfdi.persistence.transaction.failed.invariant (${context}, razon=${error.razon}).`,
      );
    } else if (error instanceof TransicionNoConfirmadaError) {
      this.logger.warn(
        `cfdi.persistence.transaction.failed.transition (${context}, recurso=${error.recurso}, count=${error.count}).`,
      );
    } else if (error instanceof AgregadoNoVerificadoError) {
      this.logger.warn(
        `cfdi.persistence.transaction.failed.verification (${context}, verificacion=${error.verificacion}).`,
      );
    } else if (error instanceof UnrecoverableError) {
      this.logger.error(`cfdi.persistence.transaction.failed.unrecoverable (${context}).`);
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      this.logger.warn(
        `cfdi.persistence.transaction.failed.recoverable (${context}, code=${error.code}).`,
      );
    } else {
      const name = error instanceof Error ? error.name : 'UnknownError';
      this.logger.error(
        `cfdi.persistence.transaction.failed.unexpected (${context}, error=${name}).`,
      );
    }
  }

  private async verifyPersistedAggregate(
    tx: Prisma.TransactionClient,
    cfdiId: string,
    companyId: string,
    aggregate: ExtractedCfdiAggregate,
  ): Promise<void> {
    const persistedConcepts = await tx.cfdiConcept.findMany({
      where: { cfdiId, companyId },
      select: { position: true },
    });

    if (persistedConcepts.length !== aggregate.concepts.length) {
      throw new AgregadoNoVerificadoError(
        'concept_count',
        `persistidos=${persistedConcepts.length}, esperados=${aggregate.concepts.length}`,
      );
    }

    assertExactPositionSet(
      persistedConcepts.map((c) => c.position),
      aggregate.concepts.length,
      'concept_positions',
      `CfdiConcept del cfdiId=${cfdiId}`,
    );

    const persistedTaxes = await tx.cfdiTax.findMany({
      where: { cfdiId, companyId },
      select: { conceptSlot: true, position: true },
    });

    const comprobanteTaxes = persistedTaxes.filter((t) => t.conceptSlot === 0);
    if (comprobanteTaxes.length !== aggregate.cfdiTaxes.length) {
      throw new AgregadoNoVerificadoError(
        'cfdi_tax_count',
        `persistidos (conceptSlot=0)=${comprobanteTaxes.length}, esperados=${aggregate.cfdiTaxes.length}`,
      );
    }

    assertExactPositionSet(
      comprobanteTaxes.map((t) => t.position),
      aggregate.cfdiTaxes.length,
      'cfdi_tax_positions',
      `CfdiTax del conceptSlot=0 (cfdiId=${cfdiId})`,
    );

    for (const concept of aggregate.concepts) {
      const taxesDeEsteConcepto = persistedTaxes.filter((t) => t.conceptSlot === concept.position);

      if (taxesDeEsteConcepto.length !== concept.taxes.length) {
        throw new AgregadoNoVerificadoError(
          'concept_tax_count',
          `conceptSlot=${concept.position}: persistidos=${taxesDeEsteConcepto.length}, esperados=${concept.taxes.length}`,
        );
      }

      assertExactPositionSet(
        taxesDeEsteConcepto.map((t) => t.position),
        concept.taxes.length,
        'concept_tax_positions',
        `CfdiTax del conceptSlot=${concept.position} (cfdiId=${cfdiId})`,
      );
    }
  }
}

/**
 * Verificación 4 y 7 de AD-10.1: el conjunto de `position` de un contenedor
 * debe ser exactamente `{1, 2, …, n}` — sin huecos ni duplicados. Un `Set`
 * de tamaño `n` cuyo máximo es `n` basta para probarlo: cualquier hueco o
 * duplicado produce un `Set` de tamaño distinto de `n`, o un máximo distinto
 * de `n` con tamaño `n` (posiciones fuera de rango compensando un duplicado).
 */
function assertExactPositionSet(
  positions: readonly number[],
  expectedCount: number,
  verificacion: 'concept_positions' | 'cfdi_tax_positions' | 'concept_tax_positions',
  contexto: string,
): void {
  const unique = new Set(positions);
  const max = positions.length === 0 ? 0 : Math.max(...positions);

  if (unique.size !== expectedCount || max !== expectedCount) {
    throw new AgregadoNoVerificadoError(
      verificacion,
      `${contexto}: posiciones=[${[...positions].sort((a, b) => a - b).join(',')}], se esperaba exactamente {1..${expectedCount}} sin huecos ni duplicados`,
    );
  }
}
