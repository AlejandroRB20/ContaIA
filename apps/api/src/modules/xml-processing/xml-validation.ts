import { XMLParser } from 'fast-xml-parser';

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
 * **Hallazgo empírico determinante (verificado contra `fast-xml-parser`
 * `5.10.1` instalado, no supuesto).** `XMLParser.parse(xmlText)` de un solo
 * argumento —la única forma no deprecated, Decisión 4— **no es un validador
 * de buena formación**. Tolera en silencio, sin lanzar y a veces con pérdida
 * silenciosa de contenido: tags sin cerrar, tags mal anidados, XML truncado
 * (falta el cierre de la raíz) y texto significativo fuera de la raíz — este
 * último se descarta sin dejar rastro alguno en el árbol resultante. Solo
 * lanza de forma nativa ante: atributo mal formado (comilla sin cerrar),
 * nombre de tag reservado (`__proto__`/`constructor`/`prototype`),
 * `DOCTYPE` múltiple, y `maxNestedTags` excedido. Esta función **no**
 * reintroduce `XMLValidator` ni `fast-xml-validator` para cerrar esa brecha
 * (fuera de alcance de esta tarea, Decisión 4) — queda documentada como
 * limitación conocida del diseño aprobado, no oculta. Ver
 * `xml-validation.spec.ts`, bloque "comportamiento real de fast-xml-parser",
 * para la evidencia caso por caso.
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
    // Parseo único (Decisión 4): nunca `XMLValidator.validate()`, nunca la
    // sobrecarga deprecated de dos argumentos.
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
