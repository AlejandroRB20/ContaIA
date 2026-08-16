/**
 * Error tipado de la detección de CFDI 4.0 (`E5-S3-T05`, Addendum §5.3ter).
 * Una sola clase con `code` discriminante — mismo patrón ya auditado de
 * `XmlValidationError` (`xml-validation.errors.ts`) y `XmlPreValidationError`.
 *
 * **Frontera con Sprint 4 (AD-11).** Esta clase es un error *interno* de la
 * detección de versión. `E5-S3-T05` no traduce a `UNSUPPORTED_CFDI_VERSION`/
 * `CFDI_STRUCTURE_INVALID` como `rejectionReason`, no ejecuta la Transacción C
 * y no envuelve nada en `UnrecoverableError` de BullMQ — esa clasificación
 * externa pertenece al worker (Sprint 4). `code` es la única señal que el
 * worker debe inspeccionar para decidir la traducción.
 *
 * **Sanitización.** Mensajes constantes por `code`: nunca interpolan el
 * namespace recibido, la versión recibida, el nombre de tag, ni ningún dato
 * fiscal (RFC, UUID, importes) — ninguno de los cuales `E5-S3-T05` lee, pero
 * que podrían llegar igualmente en atributos vecinos del mismo elemento raíz.
 */
export type CfdiExtractionErrorCode = 'CFDI_STRUCTURE_INVALID' | 'UNSUPPORTED_CFDI_VERSION';

/**
 * Mensaje público por `code`. Constantes, sin interpolación — ver la nota de
 * sanitización arriba. El contrato observable es `code`, nunca el mensaje.
 */
const MENSAJES: Readonly<Record<CfdiExtractionErrorCode, string>> = {
  CFDI_STRUCTURE_INVALID: 'El documento no tiene la estructura de un comprobante CFDI.',
  UNSUPPORTED_CFDI_VERSION: 'La versión del comprobante no está soportada.',
};

/**
 * Rechazo de la detección de CFDI 4.0. Nunca se lanza por un fallo de
 * programación del llamador — `detectCfdiVersion` no recibe parámetros de
 * configuración que puedan ser inválidos, a diferencia de `preValidateXmlBuffer`
 * o `validateXml`.
 */
export class CfdiExtractionError extends Error {
  constructor(public readonly code: CfdiExtractionErrorCode) {
    super(MENSAJES[code]);
    this.name = 'CfdiExtractionError';
  }
}
