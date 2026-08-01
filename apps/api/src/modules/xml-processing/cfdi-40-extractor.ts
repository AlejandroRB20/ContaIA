import { CfdiExtractionError } from './cfdi-extraction.errors';

/**
 * `E5-S3-T05` — Detección de la raíz CFDI 4.0 sobre el árbol ya validado por
 * `E5-S3-T04` (Addendum §5.3ter, AD-8).
 *
 * **Función pura, sin NestJS.** Mismo patrón que `xml-pre-validation.ts` y
 * `xml-validation.ts`: ningún consumidor la inyecta todavía (el worker es
 * Sprint 4), sin estado, sin `Logger`, sin `console`.
 *
 * **Frontera con `E5-S3-T04`.** Recibe `parsedXml` — el árbol `preserveOrder`
 * ya devuelto por `validateXml`, con buena formación y límites estructurales
 * ya garantizados. No vuelve a invocar `fast-xml-parser`, no valida sintaxis
 * y no vuelve a contar profundidad, nodos ni atributos — todo eso ya ocurrió.
 *
 * **Frontera con `E5-S3-T06`–`T09` (alcance estrecho, decisión vinculante).**
 * Esta función identifica la raíz, resuelve su namespace, confirma que es un
 * `Comprobante` CFDI 4.0 y expone el ámbito de namespaces para que las tareas
 * siguientes resuelvan sus propios elementos descendientes. **No lee ningún
 * dato fiscal**: ni `UUID`, ni `RfcEmisor`/`RfcReceptor`, ni `SubTotal`/
 * `Total`, ni `Moneda`, ni `Fecha`, ni `TipoDeComprobante`, ni conceptos, ni
 * impuestos, ni el Timbre Fiscal Digital. Extraer esos campos es competencia
 * exclusiva de `E5-S3-T06` (encabezado), `E5-S3-T07` (conceptos), `E5-S3-T08`
 * (impuestos) y `E5-S3-T09` (ambiguos) — nunca se adelanta aquí.
 *
 * **Frontera con Sprint 4.** Esta función solo lanza `CfdiExtractionError`. No
 * traduce a `rejectionReason`, no ejecuta la Transacción C y no envuelve nada
 * en `UnrecoverableError` (AD-11) — esa clasificación externa es del worker.
 *
 * **Identidad por namespace URI, nunca por prefijo (hallazgo determinante del
 * análisis previo, verificado empíricamente contra `fast-xml-parser`
 * `5.10.1`).** El prefijo de un elemento XML es arbitrario: un CFDI 4.0
 * legítimo puede declarar `xmlns:cfdi`, `xmlns:c`, o un namespace por defecto
 * sin ningún prefijo (`xmlns=`), y los tres son igual de válidos. Un
 * documento falsificado puede declarar `xmlns:cfdi` apuntando a un namespace
 * inventado. Por eso `startsWith('cfdi:')` o cualquier comparación de texto
 * sobre el nombre del tag **nunca** es un criterio de identidad válido — la
 * única fuente de verdad es el URI al que el prefijo resuelve, verificado
 * contra el ámbito de namespaces real del documento (`xmlns`/`xmlns:prefijo`,
 * con herencia y reasignación por ámbito, igual que exige la especificación
 * XML de namespaces).
 *
 * **Namespace de CFDI 3.3 reconocido deliberadamente (resuelve `I-12`).** AD-8
 * exige que un CFDI 3.3 real se rechace como `UNSUPPORTED_CFDI_VERSION`, no
 * como `CFDI_STRUCTURE_INVALID` — es un CFDI real, solo de una versión no
 * soportada. Un CFDI 3.3 real declara el namespace de `cfd/3`, no el de
 * `cfd/4`. Por eso el conjunto de namespaces reconocidos como "familia CFDI"
 * incluye ambos; un namespace fuera de ese conjunto (falso o ajeno) sí es
 * `CFDI_STRUCTURE_INVALID`. Reconocer `cfd/3` no equivale a aceptarlo: solo
 * cambia qué código de error produce el rechazo posterior por versión.
 *
 * **Precedencia determinista.** La raíz (nombre local y namespace) se valida
 * *antes* que la versión. Un documento que no es un `Comprobante` — o cuyo
 * namespace no es de la familia CFDI — se rechaza con `CFDI_STRUCTURE_INVALID`
 * incluso si declara `Version="3.3"` o `Version="4.0"`: no tendría sentido
 * describir un documento ajeno como "versión de CFDI no soportada".
 *
 * **Comparación exacta de `Version`, nunca normalizada.** Se acepta
 * únicamente el string `"4.0"`. `"4"`, `"4.00"`, `" 4.0 "`, `"v4.0"` o
 * cualquier otra variante de formato se tratan como una versión distinta, no
 * como una forma alternativa de 4.0 — normalizar sería fijar un criterio
 * fiscal sin fuente validada (`CLAUDE.md` regla 6).
 */

/** Namespace URI oficial de CFDI 4.0 (AD-8). Única versión aceptada. */
const NAMESPACE_CFDI_40 = 'http://www.sat.gob.mx/cfd/4';

/**
 * Namespace de CFDI 3.3. Reconocido únicamente para distinguir "CFDI real de
 * versión no soportada" de "documento que no es CFDI en absoluto" (`I-12`).
 * Nunca se acepta como válido — solo determina el `code` del rechazo.
 */
const NAMESPACE_CFDI_33 = 'http://www.sat.gob.mx/cfd/3';

const NAMESPACES_CFDI_CONOCIDOS: ReadonlySet<string> = new Set([
  NAMESPACE_CFDI_40,
  NAMESPACE_CFDI_33,
]);

/** Único valor aceptado del atributo `Version`. Comparación exacta, sin normalizar. */
const VERSION_SOPORTADA = '4.0';

/** Nombre local exacto (case-sensitive) del elemento raíz de un CFDI. */
const LOCAL_NAME_COMPROBANTE = 'Comprobante';

/** Clave de agrupación de atributos en el árbol `preserveOrder` (mismo formato que T04). */
const CLAVE_ATRIBUTOS = ':@';

const PREFIJO_ATRIBUTO = '@_';
const ATRIBUTO_XMLNS_DEFECTO = `${PREFIJO_ATRIBUTO}xmlns`;
const PREFIJO_ATRIBUTO_XMLNS_CON_PREFIJO = `${PREFIJO_ATRIBUTO}xmlns:`;

type NodoPreserveOrder = Record<string, unknown>;

/**
 * Ámbito de resolución de namespaces, enlazado a su ámbito padre — el mismo
 * modelo de la especificación XML de namespaces: un binding declarado en un
 * elemento aplica a ese elemento y a sus descendientes, hasta que un
 * descendiente lo reasigne para su propio subárbol. La clave `''` es el
 * namespace por defecto (`xmlns=`, sin prefijo).
 *
 * `E5-S3-T05` solo construye y resuelve el ámbito de la raíz. Se expone para
 * que `E5-S3-T06`–`T09` extiendan el ámbito al descender por `children`, sin
 * reimplementar esta resolución.
 */
export interface NamespaceScope {
  readonly bindings: Readonly<Record<string, string>>;
  readonly parent: NamespaceScope | null;
}

/**
 * Elemento raíz de un CFDI 4.0 ya confirmado. No contiene ningún dato fiscal
 * extraído — es la entrada estructural mínima que `E5-S3-T06`–`T09` necesitan
 * para empezar a leer el encabezado, los conceptos, los impuestos y el TFD.
 */
export interface CfdiRootElement {
  /** Nombre local del elemento raíz, siempre `'Comprobante'` en un resultado válido. */
  readonly localName: string;
  /** Namespace URI efectivo de la raíz, siempre `NAMESPACE_CFDI_40` en un resultado válido. */
  readonly namespaceUri: string;
  /** Valor exacto del atributo `Version`, siempre `'4.0'` en un resultado válido. */
  readonly version: string;
  /**
   * Atributos propios de la raíz, sin el prefijo `@_` y sin las
   * declaraciones `xmlns`/`xmlns:prefijo` (esas viven en `namespaceScope`).
   * Valores siempre `string` — el árbol de origen nunca los convierte.
   */
  readonly attributes: Readonly<Record<string, string>>;
  /** Hijos de la raíz en el árbol `preserveOrder`, misma referencia, mismo orden. */
  readonly children: readonly unknown[];
  /** Ámbito de namespaces de la raíz, para que `E5-S3-T06`–`T09` lo extiendan al descender. */
  readonly namespaceScope: NamespaceScope;
}

function comoRegistro(valor: unknown): NodoPreserveOrder {
  if (valor === null || typeof valor !== 'object') {
    return {};
  }
  return valor as NodoPreserveOrder;
}

/**
 * Una entrada del array de nivel superior es "de elemento" (una raíz XML
 * real) si tiene alguna clave propia que no sea `:@`, no sea `#text` y no
 * empiece por `?` — mismo criterio ya auditado en `xml-validation.ts`, que
 * excluye la declaración `<?xml ... ?>` y cualquier processing instruction.
 */
function esEntradaDeElemento(entrada: unknown): entrada is NodoPreserveOrder {
  if (entrada === null || typeof entrada !== 'object') {
    return false;
  }

  return Object.keys(entrada as NodoPreserveOrder).some(
    (clave) => clave !== CLAVE_ATRIBUTOS && clave !== '#text' && !clave.startsWith('?'),
  );
}

/**
 * Separa un nombre de tag calificado en prefijo y nombre local. Sin prefijo
 * (`"Comprobante"`) devuelve `prefix: ''` — la misma convención que usa el
 * namespace por defecto en {@link NamespaceScope}.
 */
export function splitQualifiedName(tagName: string): { prefix: string; localName: string } {
  const indice = tagName.indexOf(':');
  if (indice === -1) {
    return { prefix: '', localName: tagName };
  }
  return { prefix: tagName.slice(0, indice), localName: tagName.slice(indice + 1) };
}

/**
 * Construye un ámbito de namespaces a partir de los atributos crudos
 * (`@_`-prefijados) de un elemento, extendiendo el ámbito del padre. Lee
 * únicamente `@_xmlns` y `@_xmlns:prefijo` — cualquier otro atributo se
 * ignora aquí (se extrae por separado como atributo propio del elemento).
 *
 * Exportada para que `E5-S3-T06`–`T09` extiendan el ámbito al descender por
 * `children`, sin reimplementar esta lectura.
 */
export function extendNamespaceScope(
  parent: NamespaceScope | null,
  rawAttributes: unknown,
): NamespaceScope {
  const atributos = comoRegistro(rawAttributes);
  const bindings: Record<string, string> = {};

  for (const [clave, valor] of Object.entries(atributos)) {
    if (typeof valor !== 'string') {
      continue;
    }

    if (clave === ATRIBUTO_XMLNS_DEFECTO) {
      bindings[''] = valor;
    } else if (clave.startsWith(PREFIJO_ATRIBUTO_XMLNS_CON_PREFIJO)) {
      bindings[clave.slice(PREFIJO_ATRIBUTO_XMLNS_CON_PREFIJO.length)] = valor;
    }
  }

  return { bindings, parent };
}

/**
 * Resuelve un prefijo contra un ámbito, subiendo por los ámbitos padre si no
 * se encuentra en el propio — igual que la resolución de namespaces de XML.
 * Devuelve `undefined` si el prefijo nunca fue declarado en ningún ámbito
 * ascendente (namespace no declarado, nunca se infiere ni se asume).
 */
export function resolveNamespacePrefix(scope: NamespaceScope, prefix: string): string | undefined {
  let actual: NamespaceScope | null = scope;

  while (actual !== null) {
    if (prefix in actual.bindings) {
      return actual.bindings[prefix];
    }
    actual = actual.parent;
  }

  return undefined;
}

/**
 * Extrae los atributos propios de un elemento (sin `@_`, sin declaraciones
 * `xmlns`), descartando cualquier valor que no sea `string` — defensivo, no
 * reproducible con `fast-xml-parser` real (`parseAttributeValue: false`
 * garantiza que todo atributo es texto).
 */
function extraerAtributosPropios(rawAttributes: unknown): Record<string, string> {
  const atributos = comoRegistro(rawAttributes);
  const resultado: Record<string, string> = {};

  for (const [clave, valor] of Object.entries(atributos)) {
    if (!clave.startsWith(PREFIJO_ATRIBUTO)) {
      continue;
    }
    if (clave === ATRIBUTO_XMLNS_DEFECTO || clave.startsWith(PREFIJO_ATRIBUTO_XMLNS_CON_PREFIJO)) {
      continue;
    }
    if (typeof valor === 'string') {
      resultado[clave.slice(PREFIJO_ATRIBUTO.length)] = valor;
    }
  }

  return resultado;
}

/**
 * Detecta si el árbol `preserveOrder` ya validado por `E5-S3-T04` representa
 * un CFDI 4.0 y devuelve su elemento raíz estructural.
 *
 * @throws {CfdiExtractionError} con `code`:
 *   - `CFDI_STRUCTURE_INVALID` si `parsedXml` no tiene la forma esperada, si
 *     no hay exactamente una raíz de elemento, si el nombre local no es
 *     `Comprobante`, si el namespace efectivo no es de la familia CFDI
 *     conocida (§ "Namespace de CFDI 3.3 reconocido deliberadamente" arriba),
 *     o si `Version` está ausente o no es `string`.
 *   - `UNSUPPORTED_CFDI_VERSION` si la raíz es un `Comprobante` CFDI
 *     reconocido pero `Version` es distinto de `"4.0"` exactamente.
 */
export function detectCfdiVersion(parsedXml: unknown): CfdiRootElement {
  if (!Array.isArray(parsedXml)) {
    throw new CfdiExtractionError('CFDI_STRUCTURE_INVALID');
  }

  const raices = parsedXml.filter(esEntradaDeElemento);
  if (raices.length !== 1) {
    throw new CfdiExtractionError('CFDI_STRUCTURE_INVALID');
  }

  const raiz = raices[0];
  if (raiz === undefined) {
    // Inalcanzable: `raices.length === 1` ya lo garantiza; `noUncheckedIndexedAccess`
    // exige la comprobación explícita de todos modos (mismo patrón de T04).
    throw new CfdiExtractionError('CFDI_STRUCTURE_INVALID');
  }

  const clavesTag = Object.keys(raiz).filter((clave) => clave !== CLAVE_ATRIBUTOS);
  const nombreCalificado = clavesTag[0];
  if (clavesTag.length !== 1 || nombreCalificado === undefined) {
    throw new CfdiExtractionError('CFDI_STRUCTURE_INVALID');
  }

  const hijos = raiz[nombreCalificado];
  if (!Array.isArray(hijos)) {
    throw new CfdiExtractionError('CFDI_STRUCTURE_INVALID');
  }

  const atributosCrudos = raiz[CLAVE_ATRIBUTOS];
  const namespaceScope = extendNamespaceScope(null, atributosCrudos);
  const { prefix, localName } = splitQualifiedName(nombreCalificado);

  if (localName !== LOCAL_NAME_COMPROBANTE) {
    throw new CfdiExtractionError('CFDI_STRUCTURE_INVALID');
  }

  const namespaceUri = resolveNamespacePrefix(namespaceScope, prefix);
  if (namespaceUri === undefined || !NAMESPACES_CFDI_CONOCIDOS.has(namespaceUri)) {
    throw new CfdiExtractionError('CFDI_STRUCTURE_INVALID');
  }

  const attributes = extraerAtributosPropios(atributosCrudos);
  const version = attributes['Version'];

  if (typeof version !== 'string') {
    throw new CfdiExtractionError('CFDI_STRUCTURE_INVALID');
  }

  if (version !== VERSION_SOPORTADA) {
    throw new CfdiExtractionError('UNSUPPORTED_CFDI_VERSION');
  }

  return { localName, namespaceUri, version, attributes, children: hijos, namespaceScope };
}
