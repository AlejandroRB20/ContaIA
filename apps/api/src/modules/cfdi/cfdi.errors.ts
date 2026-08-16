/**
 * Errores tipados de la Transacción A (D-007, Addendum AD-10.1.2/AD-10.2).
 * `E5-S2-T07` reconcilia aquí, en un solo módulo, cada clase que las tareas
 * anteriores necesitaron lanzar antes de que esta tarjeta existiera
 * formalmente (`ViolacionDeInvarianteError` en `E5-S2-T02`,
 * `TransicionNoConfirmadaError` en `E5-S2-T04`, `AgregadoNoVerificadoError`
 * en `E5-S2-T06`) — mismo patrón de solape necesario ya usado en Sprint 1.
 * Ninguna de las tres estructuras cambia en esta reconciliación: los
 * repositorios que las lanzan (`CfdiRepository`, `DocumentsRepository`,
 * `JobsRepository`, `PersistCfdiAggregateService`) ya están auditados y
 * `PASSED`/`RESOLVED` sobre la forma actual.
 *
 * **Integración real con BullMQ (verificada contra la versión instalada,
 * `bullmq@5.81.1`, `node_modules/.pnpm/bullmq@5.81.1.../dist/esm/classes/errors/`):**
 * el paquete exporta únicamente `UnrecoverableError` — no existe ninguna
 * clase `RecoverableError`, en ninguna versión de `bullmq` publicada hasta
 * la fecha. El pseudocódigo ilustrativo del Addendum (AD-10.1.2) usa
 * `throw new RecoverableError()` como notación de intención ("aborta la tx
 * → recuperable"), no como una API real a implementar. Conforme a AD-11,
 * "recuperable" no requiere ninguna clase propia: significa exactamente
 * "relanzar el error nativo sin envolverlo en `UnrecoverableError`" — las
 * tres clases de este archivo, cualquier `Prisma.PrismaClientKnownRequestError`
 * (p. ej. `P2002`) y cualquier error de infraestructura transitorio ya
 * cumplen esa condición por el simple hecho de no ser `UnrecoverableError`.
 * No se crea ninguna clase local `RecoverableError` ni `UnrecoverableError`
 * — serían semántica duplicada de una librería ya instalada. El futuro
 * `catch` externo del worker/processor (`XmlProcessingModule`, AD-11, fuera
 * de alcance de `E5-S2-T07`) debe `import { UnrecoverableError } from
 * 'bullmq'` directamente cuando clasifique un error como permanente.
 */

/**
 * Razón estructurada de una violación de invariante bajo D-007 (Addendum
 * §10.0.2): una combinación de estado que la transacción única de la
 * Transacción A hace irrealizable por el camino normal.
 *
 * `cfdi_preexistente_con_document_processing` es el caso que AD-10.1.2
 * describe explícitamente y que da nombre a la clase: un `Cfdi` ya existe
 * para el mismo `(documentId, companyId)` mientras el `Document` sigue en
 * `PROCESSING` — detectado por la guarda de invariante de
 * `CfdiRepository.create()` (`E5-S2-T02`).
 *
 * `concept_tax_correspondence_mismatch` se añadió en `E5-S2-T03` (corrección
 * de auditoría `H-T03-01`): el emparejamiento por índice entre `concepts` y
 * `createdConcepts` en `CfdiTaxRepository.upsertConceptTaxes` es un contrato
 * interno entre dos repositorios de la misma transacción, no un dato fiscal
 * inválido — la misma familia de "estado imposible bajo la transacción
 * única" que ya cubre esta clase, no un caso nuevo de reconciliación.
 *
 * Las demás combinaciones de §10.0.2 (`Job` no `COMPLETED`, `Document =
 * PROCESSED` sin `Cfdi`, etc.) se detectan y arbitran **fuera** de la
 * transacción, por evidencia positiva (AD-10.2) — no son violaciones de
 * invariante *dentro* de la Transacción A y no se anticipan en esta unión.
 */
export type ViolacionDeInvarianteRazon =
  'cfdi_preexistente_con_document_processing' | 'concept_tax_correspondence_mismatch';

/**
 * Estado imposible bajo la transacción única de D-007 (Addendum §10.0.2):
 * nunca se resuelve reutilizando el dato encontrado, ni marcando éxito, ni
 * mediante heurística estructural — únicamente rollback, incidente (`ERROR`)
 * y escalado a revisión (AD-10.1.2, nota derogatoria de AD-10.1). `razon` es
 * la única señal que el `catch` externo de la Transacción A debe inspeccionar
 * para distinguir esta rama de un `P2002`, de `TransicionNoConfirmadaError`
 * o de un error recuperable común. Tiene su **propia** rama en el
 * pseudocódigo de AD-10.1.2 (`esViolacionDeInvariante(e)` → incidente
 * `ERROR` + escalado, ni Transacción C ni transición terminal ni éxito) —
 * distinta de `esRecuperable(e)`, `esP2002(e)` y `esTransicionNoConfirmada(e)`;
 * la clasificación final de esa rama (si BullMQ debe o no reintentar el Job)
 * es responsabilidad del futuro `catch` externo (AD-11), fuera de alcance de
 * `E5-S2-T07`. Nunca es, ni envuelve, `UnrecoverableError` de BullMQ.
 */
export class ViolacionDeInvarianteError extends Error {
  constructor(
    public readonly razon: ViolacionDeInvarianteRazon,
    detalle?: string,
  ) {
    super(
      detalle === undefined
        ? `Violación de invariante detectada bajo D-007: ${razon}`
        : `Violación de invariante detectada bajo D-007: ${razon} — ${detalle}`,
    );
    this.name = 'ViolacionDeInvarianteError';
  }
}

/**
 * La transición terminal condicional `Document PROCESSING → PROCESSED` (o la
 * transición `Job → COMPLETED`) devolvió un `count` distinto de 1 dentro de
 * la Transacción A (D-007, Addendum §10.0.2/AD-10.1.2). Cualquier valor
 * distinto de 1 aborta la transacción completa (rollback total) sin declarar
 * éxito parcial: `count === 0` indica que otro worker ya cerró la entidad;
 * `count > 1` sería imposible con clave primaria en el `WHERE`, pero la
 * aserción explícita protege ante un `WHERE` mal construido en el futuro.
 *
 * `recurso` identifica qué entidad no confirmó — restringido en tiempo de
 * compilación a exactamente `'document' | 'job'`, las dos únicas transiciones
 * terminales condicionales dentro de la Transacción A (AD-10.1.2: `Document
 * PROCESSING→PROCESSED` y `Job→COMPLETED`; ninguna otra entidad transiciona
 * dentro de esta transacción) — para que el `catch` externo pueda
 * discriminar la causa antes de entrar en AD-10.2. `count` se registra para
 * diagnóstico (log + escalado), nunca para ramificar la lógica de negocio.
 * Ambos campos son de solo lectura (`readonly`) y quedan expuestos de forma
 * estable en la instancia, junto con un mensaje distinguible que incluye
 * `recurso` y `count` literalmente.
 *
 * Tiene su **propia** rama en el pseudocódigo de AD-10.1.2
 * (`esTransicionNoConfirmada(e)` → AD-10.2) — distinta de
 * `esViolacionDeInvariante(e)` (incidente + escalado directo, nunca
 * AD-10.2), pero con el **mismo destino de arbitraje** que un `P2002`
 * (`esP2002(e)` → AD-10.2 también): ambas ramas se resuelven por evidencia
 * positiva sobre consultas nuevas, fuera de la transacción abortada. Nunca
 * se confunde con un error recuperable genérico ni con `UnrecoverableError`
 * de BullMQ.
 */
export class TransicionNoConfirmadaError extends Error {
  constructor(
    public readonly recurso: 'document' | 'job',
    public readonly count: number,
  ) {
    super(
      `Transición terminal no confirmada para '${recurso}': updateMany devolvió count=${count} (se esperaba exactamente 1). Rollback total.`,
    );
    this.name = 'TransicionNoConfirmadaError';
  }
}

/**
 * El agregado releído dentro de la Transacción A (`E5-S2-T06`) no coincide
 * con el `ExtractedCfdiAggregate` esperado en este intento — verificaciones
 * 3–7 de AD-10.1 (conteos y posiciones de `CfdiConcept`/`CfdiTax` contra lo
 * que el worker construyó en memoria antes de persistir nada). El Addendum
 * (AD-10.1.2, pseudocódigo) etiqueta esta condición como **recuperable**
 * ("`throw new RecoverableError()` // aborta la tx (rollback) → recuperable"),
 * tabla de AD-11 ("Agregado no verificable (AD-10.1)", fila de errores
 * recuperables) — ver la nota de reconciliación con BullMQ al inicio de este
 * archivo: ningún `RecoverableError` existe ni se crea; esta clase, lanzada
 * y dejada propagar sin envolverla en `UnrecoverableError`, ya satisface por
 * sí misma la condición de "recuperable" para el futuro `catch` externo.
 *
 * Semánticamente distinta de `ViolacionDeInvarianteError` (estado imposible,
 * incidente + escalado, nunca recuperable sin más) y de
 * `TransicionNoConfirmadaError` (transición terminal sin confirmar, AD-10.2)
 * — las tres son mutuamente excluyentes y distinguibles por `instanceof`, y
 * ninguna captura, transforma ni oculta un `P2002` ni ningún otro
 * `Prisma.PrismaClientKnownRequestError`: todas se lanzan hacia afuera de un
 * bloque sin `try/catch` (`persist-cfdi-aggregate.ts`) para que
 * `prisma.$transaction` revierta el intento completo.
 *
 * `verificacion` identifica cuál de las verificaciones 3–7 de AD-10.1 falló,
 * para diagnóstico — nunca para ramificar lógica de negocio dentro de la
 * transacción.
 */
export class AgregadoNoVerificadoError extends Error {
  constructor(
    public readonly verificacion:
      | 'concept_count'
      | 'concept_positions'
      | 'cfdi_tax_count'
      | 'cfdi_tax_positions'
      | 'concept_tax_count'
      | 'concept_tax_positions',
    detalle: string,
  ) {
    super(
      `Verificación estructural del agregado CFDI falló (AD-10.1, ${verificacion}): ${detalle}`,
    );
    this.name = 'AgregadoNoVerificadoError';
  }
}
