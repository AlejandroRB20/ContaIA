import { XmlPreValidationError } from './xml-pre-validation.errors';

/**
 * `E5-S3-T03` — Prevalidaciones de seguridad sobre el Buffer XML
 * (Addendum §5.3, paso 7 del pipeline de §7).
 *
 * **Función pura, sin NestJS y sin `fast-xml-parser`.** Se ejecuta *antes* de
 * que exista un `XMLParser`: su propósito es que ningún documento no confiable
 * llegue al parser sin haber pasado los controles de bytes. No es un
 * `@Injectable` porque no tiene estado ni dependencias, y porque ningún
 * consumidor la inyecta todavía — el worker que la invocará es Sprint 4.
 * Mantenerla como función pura la hace probable sin `Test.createTestingModule`
 * y sin arrancar el contenedor de Nest (mismo patrón que `job-id.util.ts`).
 *
 * **No registra nada.** Sin `Logger`, sin `console`, sin efectos. El logging
 * correlacionado (`jobId`, `documentId`) es responsabilidad del worker, fuera
 * de esta función: un log aquí no tendría contexto y arriesgaría filtrar
 * contenido fiscal.
 *
 * **Frontera con `E5-S3-T04`.** Aquí se decide únicamente sobre *bytes y
 * texto previos al parseo*. Todo lo que exige un árbol parseado — buen
 * formado, profundidad, conteo de nodos, conteo de atributos, raíz única,
 * opciones de `XMLParser` — pertenece a `E5-S3-T04` y no se anticipa.
 *
 * **Frontera con Sprint 4.** Esta función solo lanza `XmlPreValidationError`.
 * No traduce a `XML_INVALID`, no ejecuta la Transacción C y no envuelve nada
 * en `UnrecoverableError` (AD-11) — esa clasificación externa es del worker.
 */

/** Límites de seguridad inyectados por el llamador. */
export interface XmlSecurityLimits {
  /**
   * Tamaño máximo admitido del Buffer, en bytes. Límite **inclusivo**:
   * `byteLength === maxFileSizeBytes` se acepta, `+ 1` se rechaza (Addendum
   * §5.3.1, "no exceda"). Se recibe como parámetro y no desde la
   * configuración central: `XML_MAX_FILE_SIZE_BYTES` (Addendum §10.3) todavía
   * no existe en `@contaia/config`, y su creación pertenece a otra tarea.
   */
  readonly maxFileSizeBytes: number;
}

/** Resultado de una prevalidación superada. */
export interface PreValidatedXml {
  /**
   * **La misma referencia** que se recibió, sin normalizar ni mutar. El
   * pipeline calcula el SHA-256 sobre los bytes originales *antes* de
   * normalizar (§7 paso 6): devolver solo el texto haría irrecuperable ese
   * checksum.
   */
  readonly originalBuffer: Buffer;
  /** Texto UTF-8 validado, sin BOM. Es lo que consumirá `E5-S3-T04`. */
  readonly xmlText: string;
  /** Tamaño del Buffer **original**, incluido el BOM si lo había. */
  readonly byteLength: number;
  /** `true` si el Buffer original comenzaba con BOM UTF-8 (fue normalizado). */
  readonly hadUtf8Bom: boolean;
}

const BOM_UTF32_BE = [0x00, 0x00, 0xfe, 0xff] as const;
const BOM_UTF32_LE = [0xff, 0xfe, 0x00, 0x00] as const;
const BOM_UTF8 = [0xef, 0xbb, 0xbf] as const;
const BOM_UTF16_BE = [0xfe, 0xff] as const;
const BOM_UTF16_LE = [0xff, 0xfe] as const;

/**
 * Whitespace **de XML** (space, tab, CR, LF) — explícito, no `\s` de
 * JavaScript: `\s` incluye U+FEFF y NBSP, de modo que `trimStart()` se
 * comería un segundo BOM residual o un NBSP inicial y dejaría pasar como
 * "XML" algo que no empieza por `<`. Fail-closed.
 */
const XML_WHITESPACE_INICIAL = /^[ \t\r\n]+/;

/**
 * Declaración XML inicial. Anclada al inicio (solo tras whitespace XML) para
 * no interpretar como declaración un `encoding=` que aparezca en cualquier
 * otro punto del documento (p. ej. dentro de un atributo o de texto).
 */
const PROLOGO_XML = /^[ \t\r\n]*<\?xml\b[\s\S]*?\?>/;

/**
 * `encoding="..."` o `encoding='...'` dentro del prólogo ya acotado. La
 * retrorreferencia `\1` exige que la comilla de cierre sea la misma que la de
 * apertura y deja el valor siempre en un único grupo (2).
 */
const DECLARACION_ENCODING = /\bencoding\s*=\s*(["'])([^"']*)\1/i;

/**
 * `<!DOCTYPE` y `<!ENTITY` tolerando casing y whitespace entre `<!` y la
 * palabra clave (XML lo permite). Sin flag `g`: `test()` queda sin estado.
 */
const DOCTYPE = /<!\s*DOCTYPE/i;
const ENTITY = /<!\s*ENTITY/i;

function empiezaCon(buffer: Buffer, firma: readonly number[]): boolean {
  if (buffer.byteLength < firma.length) {
    return false;
  }

  return firma.every((byte, indice) => buffer[indice] === byte);
}

/**
 * Valida el Buffer XML descargado antes de cualquier parseo.
 *
 * El orden de los controles es parte del contrato de seguridad, no una
 * preferencia de estilo:
 *
 * 0. Precondiciones de programación (entrada y límite) — antes que nada, para
 *    que un defecto del llamador nunca se disfrace de documento inválido.
 * 1. Buffer vacío.
 * 2. Tamaño máximo.
 * 3. BOM sobre **bytes crudos** (UTF-32/UTF-16 rechazados, UTF-8 retirado).
 * 4. Byte `NUL` sobre bytes crudos — indispensable y **no** redundante con el
 *    paso 5: `U+0000` es UTF-8 *válido*, así que un UTF-16LE sin BOM con
 *    contenido ASCII (`3C 00 3F 00 ...`) atraviesa un decodificador UTF-8
 *    estricto sin error. Sin este control, un `<!ENTITY` podría ocultarse de
 *    un escaneo hecho solo sobre el texto decodificado.
 * 5. Decodificación UTF-8 estricta.
 * 6. Declaración de encoding.
 * 7. `DOCTYPE`/`ENTITY` sobre el texto completo.
 * 8. Forma mínima de XML.
 *
 * @throws {TypeError} si `buffer` no es un `Buffer` (defecto del llamador).
 * @throws {RangeError} si `maxFileSizeBytes` no es un entero positivo finito
 *   (defecto del llamador). Se comprueba **antes** de usarlo: `byteLength >
 *   NaN` es `false`, de modo que un límite `NaN` desactivaría en silencio el
 *   control de tamaño.
 * @throws {XmlPreValidationError} si el documento no supera algún control.
 */
export function preValidateXmlBuffer(buffer: Buffer, limits: XmlSecurityLimits): PreValidatedXml {
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('preValidateXmlBuffer requiere un Buffer.');
  }

  if (!Number.isInteger(limits.maxFileSizeBytes) || limits.maxFileSizeBytes <= 0) {
    throw new RangeError('XmlSecurityLimits.maxFileSizeBytes debe ser un entero positivo finito.');
  }

  if (buffer.byteLength === 0) {
    throw new XmlPreValidationError('XML_EMPTY');
  }

  if (buffer.byteLength > limits.maxFileSizeBytes) {
    throw new XmlPreValidationError('XML_TOO_LARGE');
  }

  // UTF-32 antes que UTF-16: `FF FE` es prefijo de `FF FE 00 00`, así que
  // comprobar UTF-16 LE primero clasificaría mal todo UTF-32 LE.
  if (empiezaCon(buffer, BOM_UTF32_BE) || empiezaCon(buffer, BOM_UTF32_LE)) {
    throw new XmlPreValidationError('XML_ENCODING_UNSUPPORTED');
  }

  let hadUtf8Bom = false;
  let contenido = buffer;

  if (empiezaCon(buffer, BOM_UTF8)) {
    hadUtf8Bom = true;
    // `subarray` es una vista sin copia y sin escritura: el Buffer original
    // no se modifica y su referencia se devuelve intacta.
    contenido = buffer.subarray(BOM_UTF8.length);
  } else if (empiezaCon(buffer, BOM_UTF16_BE) || empiezaCon(buffer, BOM_UTF16_LE)) {
    throw new XmlPreValidationError('XML_ENCODING_UNSUPPORTED');
  }

  if (contenido.includes(0)) {
    throw new XmlPreValidationError('XML_INVALID_BYTES');
  }

  let xmlText: string;
  try {
    // `fatal: true` es el punto crítico: `Buffer.toString('utf8')` sustituye
    // en silencio las secuencias inválidas por U+FFFD, convirtiendo entrada
    // corrupta en texto aparentemente válido (falla abierta).
    // `ignoreBOM: true` evita un segundo retiro de BOM ya normalizado arriba.
    xmlText = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(contenido);
  } catch {
    // El error nativo se descarta deliberadamente: su mensaje puede incluir
    // bytes del documento.
    throw new XmlPreValidationError('XML_INVALID_BYTES');
  }

  const prologo = PROLOGO_XML.exec(xmlText);
  if (prologo !== null) {
    const declaracion = DECLARACION_ENCODING.exec(prologo[0]);
    if (declaracion !== null) {
      // El `?? ''` es inalcanzable en la práctica —si la expresión casó, el
      // grupo 2 capturó—, pero `noUncheckedIndexedAccess` lo exige.
      const valor = (declaracion[2] ?? '').trim().toLowerCase();
      if (valor !== 'utf-8') {
        throw new XmlPreValidationError('XML_ENCODING_UNSUPPORTED');
      }
    }
  }

  // Política fail-closed (Addendum §5.3.4): se escanea el documento completo
  // y se rechaza aunque la cadena aparezca dentro de un comentario o de una
  // sección CDATA. Distinguir el contexto exigiría parsear contenido no
  // confiable — exactamente lo que esta función existe para evitar. Un CFDI
  // legítimo no contiene estas cadenas.
  // Precedencia determinista: DOCTYPE antes que ENTITY.
  if (DOCTYPE.test(xmlText)) {
    throw new XmlPreValidationError('XML_DOCTYPE_FORBIDDEN');
  }

  if (ENTITY.test(xmlText)) {
    throw new XmlPreValidationError('XML_ENTITY_DECLARATION_FORBIDDEN');
  }

  // Solo se exige el primer carácter: JSON, PDF, ZIP y texto plano quedan
  // fuera. HTML también empieza por `<` y no se intenta distinguir aquí —
  // la validación de raíz CFDI y de sintaxis pertenece a T04/T05.
  // Un contenido que queda vacío tras retirar BOM y whitespace usa
  // `XML_FORMAT_INVALID`, no `XML_EMPTY`: el Buffer original no estaba vacío.
  if (!xmlText.replace(XML_WHITESPACE_INICIAL, '').startsWith('<')) {
    throw new XmlPreValidationError('XML_FORMAT_INVALID');
  }

  return {
    originalBuffer: buffer,
    xmlText,
    byteLength: buffer.byteLength,
    hadUtf8Bom,
  };
}
