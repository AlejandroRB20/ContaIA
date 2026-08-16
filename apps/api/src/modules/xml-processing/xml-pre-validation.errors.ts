/**
 * Error tipado de las prevalidaciones de seguridad del Buffer XML
 * (`E5-S3-T03`, Addendum §5.3). Una sola clase con `code` discriminante —
 * mismo patrón ya auditado de `StorageError` (`storage.errors.ts`), no una
 * clase por causa: las siete condiciones pertenecen a una única categoría
 * semántica ("el pre-parseo rechazó el documento") y ninguna exige un tipo
 * propio para que el llamador reaccione distinto.
 *
 * **Frontera con Sprint 4 (AD-11).** Esta clase es un error *interno* de la
 * prevalidación. `E5-S3-T03` no traduce a `XML_INVALID`, no ejecuta la
 * Transacción C y no envuelve nada en `UnrecoverableError` de BullMQ — esa
 * clasificación externa pertenece al worker (Sprint 4). `code` es la única
 * señal que el worker debe inspeccionar para decidir la traducción.
 *
 * **Sanitización.** Los mensajes son constantes fijas por `code`: nunca
 * interpolan el documento, ni fragmentos suyos, ni el Buffer, ni tamaños, ni
 * el valor de un `encoding` declarado (texto controlado por quien sube el
 * archivo), ni ningún dato fiscal (RFC, UUID, sellos, certificados, montos).
 * Tampoco envuelven el error original de una decodificación fallida, cuyo
 * mensaje nativo puede incluir bytes del documento. El diagnóstico
 * cuantitativo (tamaño real, límite aplicado) lo tiene el llamador, que sí
 * puede registrarlo con su propio contexto correlacionado.
 */
export type XmlPreValidationErrorCode =
  | 'XML_EMPTY'
  | 'XML_TOO_LARGE'
  | 'XML_ENCODING_UNSUPPORTED'
  | 'XML_INVALID_BYTES'
  | 'XML_DOCTYPE_FORBIDDEN'
  | 'XML_ENTITY_DECLARATION_FORBIDDEN'
  | 'XML_FORMAT_INVALID';

/**
 * Mensaje público por `code`. Constantes, sin interpolación — ver la nota de
 * sanitización arriba. Cambiar uno de estos textos no cambia la semántica:
 * el contrato observable es `code`, nunca el mensaje.
 */
const MENSAJES: Readonly<Record<XmlPreValidationErrorCode, string>> = {
  XML_EMPTY: 'El archivo recibido no contiene datos.',
  XML_TOO_LARGE: 'El archivo recibido excede el tamaño máximo permitido.',
  XML_ENCODING_UNSUPPORTED: 'La codificación del archivo no está soportada; se requiere UTF-8.',
  XML_INVALID_BYTES: 'El archivo contiene bytes que no forman texto UTF-8 válido.',
  XML_DOCTYPE_FORBIDDEN: 'El archivo declara un DOCTYPE, no permitido por política de seguridad.',
  XML_ENTITY_DECLARATION_FORBIDDEN:
    'El archivo declara entidades XML, no permitido por política de seguridad.',
  XML_FORMAT_INVALID: 'El archivo no tiene la forma de un documento XML.',
};

/**
 * Rechazo de una prevalidación de seguridad previa al parseo. Nunca se lanza
 * por un fallo de programación del llamador (límite inválido o entrada que no
 * es un `Buffer`): esos usan `RangeError`/`TypeError` nativos, para que un
 * defecto del código no se confunda jamás con un documento inválido del
 * usuario.
 */
export class XmlPreValidationError extends Error {
  constructor(public readonly code: XmlPreValidationErrorCode) {
    super(MENSAJES[code]);
    this.name = 'XmlPreValidationError';
  }
}
