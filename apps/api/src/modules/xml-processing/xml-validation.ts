import { XMLParser, XMLValidator } from 'fast-xml-parser';

import { XmlValidationError } from './xml-validation.errors';

/**
 * `E5-S3-T04` — Validación estructural del XML ya prevalidado por `E5-S3-T03`
 * (Addendum §5.2/§5.3, paso 8 del pipeline de §7).
 *
 * **Función pura, sin NestJS.** Mismo patrón que `xml-pre-validation.ts`:
 * ningún consumidor la inyecta todavía (el worker es Sprint 4), no tiene
 * estado ni dependencias, y no registra nada (sin `Logger`, sin `console`).
 *
 * **Frontera con `E5-S3-T03`.** Recibe únicamente `xmlText` — el texto UTF-8
 * ya validado (tamaño, BOM, encoding, ausencia fail-closed de
 * `DOCTYPE`/`ENTITY`). Nunca recibe el `Buffer` original y no repite ninguno
 * de esos controles.
 *
 * **Frontera con `E5-S3-T05`.** Esta función solo confirma que el documento
 * es XML bien formado con una única raíz de elemento y que no excede los
 * límites estructurales. No detecta versión de CFDI, no valida que la raíz
 * sea `cfdi:Comprobante` y no extrae ningún dato fiscal — eso pertenece al
 * extractor de `E5-S3-T05`.
 *
 * **Frontera con Sprint 4.** Esta función solo lanza `XmlValidationError`. No
 * traduce a `XML_INVALID`, no ejecuta la Transacción C y no envuelve nada en
 * `UnrecoverableError` (AD-11) — esa clasificación externa es del worker.
 *
 * **Dos fases obligatorias (corrección del hallazgo `ALTO` de la auditoría
 * `FAILED` de 2026-08-01).** La validación ocurre en dos pasadas distintas y
 * no intercambiables:
 *
 * 1. **Barrera sintáctica** — `XMLValidator.validate()` sobre el texto, antes
 *    de cualquier parseo. Es quien garantiza la buena formación.
 * 2. **Parseo estructural** — `XMLParser.parse()` y el recorrido iterativo,
 *    que aplican los límites de profundidad, nodos y atributos.
 *
 * La fase 1 es indispensable, y no una redundancia: verificado empíricamente
 * contra la versión instalada que `XMLParser.parse(xmlText)` de un solo
 * argumento **no es un validador de buena formación** — acepta en silencio
 * tags sin cerrar, tags mal anidados, XML truncado y texto significativo
 * fuera de la raíz (este último se descarta del árbol sin dejar rastro).
 * Confiar solo en el parseo permitiría que un CFDI truncado avanzara al
 * extractor con conceptos perdidos silenciosamente, violando BR-XML-001.
 *
 * **Coste aceptado de la doble pasada.** Medido sobre un documento de 10 MB
 * (el máximo que `XML_MAX_FILE_SIZE_BYTES` permite llegar hasta aquí):
 * ~527 ms de validación frente a ~1036 ms de parseo — un sobrecoste de
 * aproximadamente el 50 % del parseo. Se acepta deliberadamente: la
 * alternativa es admitir documentos mal formados. El coste está acotado por
 * el límite de tamaño que `E5-S3-T03` ya impuso antes de llegar aquí.
 *
 * **Deuda técnica declarada.** `XMLValidator` está marcado `@deprecated` en
 * `5.10.1`; el mantenedor remite al paquete separado `fast-xml-validator`.
 * Se adopta igualmente porque es la única opción que cumple el objetivo
 * literal de `E5-S3-T04` **sin agregar una dependencia nueva** (
 * `fast-xml-validator@1.4.1` arrastraría tres paquetes transitivos
 * adicionales). Sigue presente y funcional en la versión instalada. Si una
 * versión mayor futura lo eliminara, la migración a `fast-xml-validator`
 * queda registrada como la ruta prevista — ver Addendum §5.3bis.
 */

/** Límites estructurales inyectados por el llamador. */
export interface XmlValidationLimits {
  /** Profundidad máxima admitida. La raíz cuenta como profundidad 1. */
  readonly maxDepth: number;
  /** Número máximo de elementos (tags) admitido en todo el documento. */
  readonly maxNodeCount: number;
  /** Número máximo de atributos admitido, sumado en todo el documento. */
  readonly maxAttributeCount: number;
}

/** Resultado de una validación estructural superada. */
export interface ValidatedXml {
  /**
   * Árbol `preserveOrder` devuelto por `fast-xml-parser`, sin tipar en
   * detalle: la librería no publica un tipo público estable para esta forma.
   * `E5-S3-T05` debe validar/convertir explícitamente su forma al leerlo.
   */
  readonly parsedXml: unknown;
  /** Profundidad máxima real encontrada (raíz = 1). */
  readonly depth: number;
  /** Número total de elementos contados (incluida la raíz; `#text` no cuenta). */
  readonly nodeCount: number;
  /** Número total de atributos contados en todo el documento. */
  readonly attributeCount: number;
}

/** Clave de agrupación de atributos en el árbol `preserveOrder`. */
const CLAVE_ATRIBUTOS = ':@';
/** Clave de un nodo de texto en el árbol `preserveOrder`. */
const CLAVE_TEXTO = '#text';

type NodoPreserveOrder = Record<string, unknown>;

function esEnteroPositivoFinito(valor: number): boolean {
  return Number.isInteger(valor) && Number.isFinite(valor) && valor > 0;
}

/**
 * Un nodo del array `preserveOrder` es "de texto" si su única clave es
 * `#text`. No debe contarse como elemento ni recorrerse como hijo.
 */
function esNodoDeTexto(valor: unknown): boolean {
  if (valor === null || typeof valor !== 'object') {
    return true;
  }

  const claves = Object.keys(valor as NodoPreserveOrder);
  return claves.length === 1 && claves[0] === CLAVE_TEXTO;
}

/**
 * Una entrada del array de nivel superior es "de elemento" (una raíz XML
 * real) si tiene alguna clave propia que no sea `:@`, no sea `#text` y no
 * empiece por `?` — esto último excluye la declaración `<?xml ... ?>` y
 * cualquier processing instruction, que `fast-xml-parser` representa como
 * una entrada más del mismo array de nivel superior, no como parte de la
 * raíz.
 */
function esEntradaDeElemento(entrada: unknown): entrada is NodoPreserveOrder {
  if (entrada === null || typeof entrada !== 'object') {
    return false;
  }

  return Object.keys(entrada as NodoPreserveOrder).some(
    (clave) => clave !== CLAVE_ATRIBUTOS && clave !== CLAVE_TEXTO && !clave.startsWith('?'),
  );
}

/**
 * Opciones de la barrera sintáctica. Explícitas y alineadas con las del
 * `XMLParser` de la fase 2 — en particular `allowBooleanAttributes: false`,
 * para que ambas fases coincidan en qué es un atributo aceptable y ningún
 * documento pueda pasar una y fallar la otra por criterios distintos.
 */
const OPCIONES_VALIDACION_SINTACTICA: { allowBooleanAttributes: boolean; unpairedTags: string[] } =
  {
    allowBooleanAttributes: false,
    unpairedTags: [],
  };

/**
 * Fase 1 — barrera de buena formación, previa a cualquier parseo.
 *
 * Verificado empíricamente contra `fast-xml-parser` `5.10.1` que rechaza los
 * ocho casos obligatorios: texto vacío, solo whitespace, tag sin cerrar, tags
 * mal anidados, XML truncado, atributo sin cerrar, múltiples raíces y texto
 * significativo fuera de la raíz (tanto antes como después). Verificado
 * también que **no** impone un límite de profundidad propio (300 niveles
 * pasan), de modo que no interfiere con el contrato de `XML_MAX_DEPTH`, que
 * sigue siendo competencia exclusiva de la fase 2.
 *
 * **No altera `xmlText`** — `validate()` no muta su entrada y aquí se pasa
 * tal cual se recibió de `E5-S3-T03`.
 *
 * **Todo fallo se colapsa en `XML_SYNTAX_INVALID`, deliberadamente.** El
 * `code` que devuelve el validador (`InvalidXml`, `InvalidTag`, `InvalidAttr`,
 * `InvalidChar`) **no** separa de forma estable un problema de sintaxis de uno
 * de estructura: `InvalidXml` cubre por igual el texto vacío, un tag sin
 * cerrar, múltiples raíces y texto sobrante al final. Derivar
 * `XML_STRUCTURE_INVALID` de esos códigos exigiría además leer el `msg`, y ese
 * mensaje **contiene contenido controlado por quien sube el archivo** (nombres
 * de tag y de atributo literales, verificado empíricamente) y su redacción no
 * es estable entre versiones. Se descarta por completo `msg`, `line` y `col`:
 * de la respuesta del validador solo se usa el hecho binario de si pasó.
 */
function validarBuenaFormacion(xmlText: string): void {
  // `XMLValidator` es `@deprecated` en 5.10.1 — deuda declarada y justificada
  // en el encabezado de este archivo y en Addendum §5.3bis.
  const resultado = XMLValidator.validate(xmlText, OPCIONES_VALIDACION_SINTACTICA);

  if (resultado !== true) {
    throw new XmlValidationError('XML_SYNTAX_INVALID');
  }
}

const MENSAJE_NATIVO_PROPIEDAD_PELIGROSA = '[SECURITY] Invalid name';
const MENSAJE_NATIVO_PROFUNDIDAD_EXCEDIDA = 'Maximum nested tags exceeded';

/**
 * Clasifica el error nativo de `fast-xml-parser` en un `code` estable,
 * descartando el mensaje original —verificado empíricamente que puede
 * incluir fragmentos literales del documento (nombre de tag reservado,
 * contexto crudo del XML en errores de atributo mal formado)—.
 *
 * La distinción se apoya en el texto del error porque `fast-xml-parser` no
 * expone un código de error estructurado para estos casos (a diferencia de
 * `XMLValidator.validate()`, deprecated y fuera de alcance). Encapsulado
 * aquí, en una única función interna, para que el acoplamiento a un mensaje
 * de una dependencia externa quede aislado y probado explícitamente.
 */
function clasificarErrorNativo(error: unknown): XmlValidationError {
  const mensaje = error instanceof Error ? error.message : '';

  if (mensaje.startsWith(MENSAJE_NATIVO_PROPIEDAD_PELIGROSA)) {
    return new XmlValidationError('XML_DANGEROUS_PROPERTY');
  }

  if (mensaje === MENSAJE_NATIVO_PROFUNDIDAD_EXCEDIDA) {
    return new XmlValidationError('XML_DEPTH_EXCEEDED');
  }

  return new XmlValidationError('XML_SYNTAX_INVALID');
}

interface ResultadoRecorrido {
  readonly depth: number;
  readonly nodeCount: number;
  readonly attributeCount: number;
}

/**
 * Recorrido iterativo con stack explícito (sin recursión, para no arriesgar
 * un stack overflow con XML adversarial). Complejidad O(n): una sola pasada,
 * con corte inmediato en cuanto se supera cualquier límite.
 *
 * Recorre únicamente referencias del árbol ya construido por
 * `fast-xml-parser` — no copia ninguna estructura. Solo itera con
 * `Object.keys()`, que devuelve exclusivamente claves propias enumerables:
 * nunca se leen `__proto__`/`constructor`/`prototype` como propiedades
 * heredadas. Además, `fast-xml-parser` ya rechaza esos tres nombres como
 * nombre de tag antes de que el árbol exista (verificado empíricamente,
 * incondicional, no configurable) — este recorrido no depende de esa
 * garantía para ser seguro, pero se beneficia de ella.
 */
function recorrerArbol(raiz: NodoPreserveOrder, limits: XmlValidationLimits): ResultadoRecorrido {
  let profundidadMaxima = 0;
  let nodeCount = 0;
  let attributeCount = 0;

  const stack: Array<{ nodo: NodoPreserveOrder; profundidad: number }> = [
    { nodo: raiz, profundidad: 1 },
  ];

  while (stack.length > 0) {
    const actual = stack.pop();
    if (actual === undefined) {
      break;
    }

    nodeCount += 1;
    if (nodeCount > limits.maxNodeCount) {
      throw new XmlValidationError('XML_NODE_LIMIT_EXCEEDED');
    }

    if (actual.profundidad > profundidadMaxima) {
      profundidadMaxima = actual.profundidad;
    }

    // Esta verificación —no `maxNestedTags`— es quien aplica el límite
    // contractual exacto. Verificado empíricamente: con `maxNestedTags: N`,
    // la librería acepta nativamente hasta `N + 1` niveles y solo lanza en
    // `N + 2` — un corte nativo más laxo que `limits.maxDepth`. `maxNestedTags`
    // sigue siendo valioso porque corta durante el parseo, antes de construir
    // el árbol completo, acotando el peor caso de memoria a un nivel extra;
    // pero el corte exacto en `limits.maxDepth` (inclusive, `+ 1` rechaza) lo
    // garantiza únicamente este recorrido posterior.
    if (profundidadMaxima > limits.maxDepth) {
      throw new XmlValidationError('XML_DEPTH_EXCEEDED');
    }

    const atributos = actual.nodo[CLAVE_ATRIBUTOS];
    if (atributos !== null && typeof atributos === 'object') {
      attributeCount += Object.keys(atributos as NodoPreserveOrder).length;
      if (attributeCount > limits.maxAttributeCount) {
        throw new XmlValidationError('XML_ATTRIBUTE_LIMIT_EXCEEDED');
      }
    }

    for (const clave of Object.keys(actual.nodo)) {
      if (clave === CLAVE_ATRIBUTOS) {
        continue;
      }

      const hijos = actual.nodo[clave];
      if (!Array.isArray(hijos)) {
        continue;
      }

      for (const hijo of hijos) {
        if (esNodoDeTexto(hijo)) {
          continue;
        }

        stack.push({ nodo: hijo as NodoPreserveOrder, profundidad: actual.profundidad + 1 });
      }
    }
  }

  return { depth: profundidadMaxima, nodeCount, attributeCount };
}

/**
 * Valida estructuralmente el `xmlText` ya aprobado por `E5-S3-T03`.
 *
 * @throws {TypeError} si `xmlText` no es un `string` (defecto del llamador).
 * @throws {RangeError} si algún límite no es un entero positivo finito
 *   (defecto del llamador) — comprobado antes de usarlo, mismo motivo que en
 *   `preValidateXmlBuffer`: un límite `NaN`/`Infinity` desactivaría el
 *   control correspondiente en silencio.
 * @throws {XmlValidationError} si el documento no supera algún control.
 */
export function validateXml(xmlText: string, limits: XmlValidationLimits): ValidatedXml {
  if (typeof xmlText !== 'string') {
    throw new TypeError('validateXml requiere un string.');
  }

  if (!esEnteroPositivoFinito(limits.maxDepth)) {
    throw new RangeError('XmlValidationLimits.maxDepth debe ser un entero positivo finito.');
  }

  if (!esEnteroPositivoFinito(limits.maxNodeCount)) {
    throw new RangeError('XmlValidationLimits.maxNodeCount debe ser un entero positivo finito.');
  }

  if (!esEnteroPositivoFinito(limits.maxAttributeCount)) {
    throw new RangeError(
      'XmlValidationLimits.maxAttributeCount debe ser un entero positivo finito.',
    );
  }

  // Fase 1 — buena formación. Debe ejecutarse antes del parseo: si falla,
  // `XMLParser.parse()` no llega a invocarse.
  validarBuenaFormacion(xmlText);

  // Fase 2 — parseo estructural y límites.
  const parser = new XMLParser({
    preserveOrder: true,
    ignoreAttributes: false,
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
    allowBooleanAttributes: false,
    processEntities: false,
    removeNSPrefix: false,
    stopNodes: [],
    commentPropName: false,
    cdataPropName: false,
    strictReservedNames: true,
    maxNestedTags: limits.maxDepth,
  });

  let parsedXml: unknown;
  try {
    // Un solo `parse`, con un solo argumento: la validación ya ocurrió en la
    // fase 1, de modo que la sobrecarga deprecated `parse(xml, options)` —que
    // volvería a validar dentro del propio parseo— sigue sin usarse.
    parsedXml = parser.parse(xmlText);
  } catch (error) {
    throw clasificarErrorNativo(error);
  }

  if (!Array.isArray(parsedXml)) {
    // No reproducible empíricamente con `preserveOrder: true` y entrada
    // `string` (siempre devuelve un array o lanza) — defensa de tipos porque
    // `XMLParser.parse()` está tipado `any`, no una rama alcanzable conocida.
    throw new XmlValidationError('XML_STRUCTURE_INVALID');
  }

  const raices = parsedXml.filter(esEntradaDeElemento);
  if (raices.length !== 1) {
    throw new XmlValidationError('XML_STRUCTURE_INVALID');
  }

  const raiz = raices[0];
  if (raiz === undefined) {
    // Inalcanzable: `raices.length === 1` ya lo garantiza; `noUncheckedIndexedAccess`
    // exige la comprobación explícita de todos modos.
    throw new XmlValidationError('XML_STRUCTURE_INVALID');
  }

  const { depth, nodeCount, attributeCount } = recorrerArbol(raiz, limits);

  return { parsedXml, depth, nodeCount, attributeCount };
}
