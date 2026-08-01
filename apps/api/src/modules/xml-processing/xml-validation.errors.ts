/**
 * Error tipado de la validación estructural XML (`E5-S3-T04`, Addendum §5).
 * Una sola clase con `code` discriminante — mismo patrón ya auditado de
 * `XmlPreValidationError` (`xml-pre-validation.errors.ts`) y de `StorageError`.
 *
 * **Frontera con Sprint 4 (AD-11).** Esta clase es un error *interno* de la
 * validación estructural. `E5-S3-T04` no traduce a `XML_INVALID`, no ejecuta
 * la Transacción C y no envuelve nada en `UnrecoverableError` de BullMQ — esa
 * clasificación externa pertenece al worker (Sprint 4). `code` es la única
 * señal que el worker debe inspeccionar para decidir la traducción.
 *
 * **Sanitización.** Mensajes constantes por `code`: nunca interpolan el XML,
 * nombres de tag, nombres o valores de atributo, ni el mensaje nativo de
 * `fast-xml-parser` — verificado empíricamente que ese mensaje nativo puede
 * incluir fragmentos literales del documento (p. ej. `Context: "<a x="1>...`
 * en errores de atributo mal formado, o el nombre exacto de una propiedad
 * peligrosa en el error de seguridad de la librería).
 */
export type XmlValidationErrorCode =
  | 'XML_SYNTAX_INVALID'
  | 'XML_STRUCTURE_INVALID'
  | 'XML_DEPTH_EXCEEDED'
  | 'XML_NODE_LIMIT_EXCEEDED'
  | 'XML_ATTRIBUTE_LIMIT_EXCEEDED'
  | 'XML_DANGEROUS_PROPERTY';

/**
 * Mensaje público por `code`. Constantes, sin interpolación — ver la nota de
 * sanitización arriba. El contrato observable es `code`, nunca el mensaje.
 */
const MENSAJES: Readonly<Record<XmlValidationErrorCode, string>> = {
  XML_SYNTAX_INVALID: 'El archivo no es un documento XML sintácticamente válido.',
  XML_STRUCTURE_INVALID: 'El documento XML no tiene una única raíz de elemento.',
  XML_DEPTH_EXCEEDED: 'El documento XML excede la profundidad máxima permitida.',
  XML_NODE_LIMIT_EXCEEDED: 'El documento XML excede el número máximo de nodos permitido.',
  XML_ATTRIBUTE_LIMIT_EXCEEDED: 'El documento XML excede el número máximo de atributos permitido.',
  XML_DANGEROUS_PROPERTY: 'El documento XML declara un nombre de propiedad no permitido.',
};

/**
 * Rechazo de la validación estructural XML posterior al parseo. Nunca se
 * lanza por un fallo de programación del llamador (límite inválido o entrada
 * que no es un `string`): esos usan `RangeError`/`TypeError` nativos, para
 * que un defecto del código no se confunda jamás con un documento inválido.
 */
export class XmlValidationError extends Error {
  constructor(public readonly code: XmlValidationErrorCode) {
    super(MENSAJES[code]);
    this.name = 'XmlValidationError';
  }
}
