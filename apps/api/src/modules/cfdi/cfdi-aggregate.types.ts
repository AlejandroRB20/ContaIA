/**
 * Contrato entre el parser CFDI (Sprint 3, `XmlProcessingModule`) y la
 * persistencia del agregado (Sprint 2, `CfdiRepository`/
 * `CfdiConceptRepository`/`CfdiTaxRepository`) — EWO-005 Bloque E, Addendum
 * AD-10.1: "el worker construye el resultado de la extracción en memoria,
 * de forma determinista, antes de persistir nada". Es la única fuente de
 * verdad de qué hijos debe tener el `Cfdi` en un intento del worker;
 * `AD-10.1` compara lo persistido contra este mismo agregado antes de la
 * transición terminal.
 *
 * Sin dependencia de Prisma: los identificadores (`id`, `companyId`,
 * `cfdiId`, `cfdiConceptId`), el discriminador `conceptSlot`, `scope` y los
 * timestamps son responsabilidad exclusiva de la capa de persistencia — el
 * parser nunca los conoce ni los produce.
 */

export const EXTRACTED_TAX_TYPES = ['TRANSFER', 'WITHHOLDING'] as const;

/** Espeja el enum `CfdiTaxType` de `schema.prisma` sin importar el cliente de Prisma. */
export type ExtractedTaxType = (typeof EXTRACTED_TAX_TYPES)[number];

/**
 * Impuesto extraído de un `<cfdi:Impuesto>`, a nivel comprobante o a nivel
 * concepto (AD-5 §4.5.2).
 *
 * `scope` y `conceptSlot` deliberadamente **no** se modelan aquí: son
 * derivables de la posición estructural de este impuesto dentro de
 * {@link ExtractedCfdiAggregate} — el arreglo `cfdiTaxes` de nivel
 * comprobante (`scope = 'CFDI'`, `conceptSlot = 0`), o el arreglo `taxes` de
 * un {@link ExtractedConcept} (`scope = 'CONCEPT'`, `conceptSlot` igual a la
 * `position` de ese concepto) — y la capa de persistencia los asigna al
 * escribir. Incluirlos como campo propio de este tipo permitiría construir
 * un estado inválido (p. ej. un impuesto con `scope: 'CONCEPT'` dentro del
 * arreglo `cfdiTaxes` de nivel comprobante) que el CHECK
 * `cfdi_taxes_scope_concept_check` ya prohíbe a nivel de base de datos
 * (AD-5 §4.5.2); omitirlos hace ese estado irrepresentable en el tipo.
 */
export interface ExtractedTax {
  /** Orden dentro de su contenedor (1-based); reinicia por contenedor. */
  readonly position: number;
  readonly type: ExtractedTaxType;
  /**
   * Clave SAT del impuesto (`001` = ISR, `002` = IVA, `003` = IEPS). Texto
   * libre — sin catálogo SAT hardcodeado (`CLAUDE.md` regla 6).
   */
  readonly impuesto: string;
  /** `Tasa`, `Cuota` o `Exento`. Texto libre — sin catálogo SAT hardcodeado. */
  readonly tipoFactor: string;
  /**
   * Cadena decimal exacta, nunca `number`/`float` (BR-GLB-004, mismo
   * contrato de `docs/08_API_DESIGN.md` §"Importes y monedas"). `null`
   * cuando `tipoFactor = 'Exento'`.
   */
  readonly tasaOCuota: string | null;
  /** Cadena decimal exacta (BR-GLB-004). `null` cuando no aplica al nivel del impuesto. */
  readonly base: string | null;
  /** Cadena decimal exacta (BR-GLB-004). `null` cuando no aplica al nivel del impuesto. */
  readonly importe: string | null;
}

/**
 * Concepto extraído de un `<cfdi:Concepto>` (AD-5 §4.5.1). Los
 * identificadores (`id`, `companyId`, `cfdiId`) y los timestamps son
 * generados por la persistencia, nunca por el parser.
 */
export interface ExtractedConcept {
  /** Orden original del concepto en el XML (1-based). */
  readonly position: number;
  readonly claveProdServ: string;
  readonly noIdentificacion: string | null;
  /** Cadena decimal exacta (BR-GLB-004). */
  readonly cantidad: string;
  readonly claveUnidad: string;
  readonly unidad: string | null;
  readonly descripcion: string;
  /** Cadena decimal exacta (BR-GLB-004). */
  readonly valorUnitario: string;
  /** Cadena decimal exacta (BR-GLB-004). */
  readonly importe: string;
  /** Cadena decimal exacta (BR-GLB-004). `null` si no aplica descuento. */
  readonly descuento: string | null;
  /** Clave SAT de objeto de impuesto (`01`, `02`, `03`). Texto libre — sin catálogo SAT hardcodeado. */
  readonly objetoImp: string;
  /**
   * Impuestos de este concepto (`<cfdi:Concepto><cfdi:Impuestos>`); nivel
   * `CONCEPT` al persistirse, con `conceptSlot` igual a `position` de este
   * mismo concepto.
   */
  readonly taxes: readonly ExtractedTax[];
}

/**
 * Resultado completo y determinista de extraer un CFDI 4.0 — construido en
 * memoria, antes de persistir nada (AD-10.1). Única fuente de verdad de qué
 * hijos debe tener el `Cfdi` en este intento del worker (principio 6 de
 * §10.0.1); las verificaciones estructurales de AD-10.1 (conteos y
 * posiciones de `CfdiConcept`/`CfdiTax`) comparan lo persistido contra este
 * mismo agregado.
 *
 * Los ocho campos de encabezado listados abajo son los campos obligatorios
 * del agregado (`docs/engineering/EWO-005_BLOCK_E_ARCHITECTURE_ADDENDUM.md`
 * §3.3): un campo obligatorio ausente o ambiguo nunca produce un
 * `ExtractedCfdiAggregate` — rechaza el documento completo con
 * `CFDI_STRUCTURE_INVALID` antes de que este tipo pueda construirse.
 */
export interface ExtractedCfdiAggregate {
  readonly folioFiscal: string;
  readonly rfcEmisor: string;
  readonly rfcReceptor: string;
  /**
   * Fecha y hora **local** de expedición del CFDI (atributo `Fecha`), tal
   * como viene en el XML: formato `AAAA-MM-DDThh:mm:ss`, **sin offset** —
   * el SAT define ese atributo como la hora local del lugar de expedición y
   * no incorpora zona horaria en el valor (D-009, Addendum §5.3ter).
   *
   * Se conserva como **string exacto**, nunca como `Date`. Convertirlo
   * produciría un instante dependiente de la zona horaria del proceso que
   * ejecuta el worker —verificado: `new Date('2026-07-15T10:30:00')` da
   * `16:30:00Z` en `America/Mexico_City` y `10:30:00Z` en UTC—, lo que
   * rompería la extracción determinista de AD-10.1 y obligaría a asumir una
   * zona implícita que `docs/08_API_DESIGN.md` prohíbe. Por eso quedan
   * prohibidos `new Date()`, `Date.parse()`, añadir `Z`, interpretar como
   * UTC, fijar una zona concreta o normalizar el valor de cualquier forma.
   *
   * La validación de la forma estructural es responsabilidad de
   * `E5-S3-T06` (extracción del encabezado): esta corrección define
   * únicamente el contrato y **no** implementa la extracción.
   */
  readonly issuedAtLocal: string;
  /** Cadena decimal exacta (BR-GLB-004). */
  readonly subtotal: string;
  /** Cadena decimal exacta (BR-GLB-004). */
  readonly total: string;
  /** Moneda ISO 4217 (ej. MXN, USD) tal como la declara el comprobante. */
  readonly currency: string;
  /**
   * Código `I`/`E`/`T`/`N`/`P` del `TipoDeComprobante`. Texto libre — sin
   * catálogo SAT hardcodeado (`CLAUDE.md` regla 6).
   */
  readonly tipoComprobante: string;
  /**
   * Campos no determinables marcados explícitamente (BR-XML-002), nunca
   * inferidos. Lista vacía cuando la extracción fue completa. Nunca incluye
   * uno de los ocho campos obligatorios de encabezado: su ausencia o
   * ambigüedad rechaza el documento completo en vez de registrarse aquí
   * (Addendum §3.3).
   */
  readonly ambiguousFields: readonly string[];
  readonly concepts: readonly ExtractedConcept[];
  /**
   * Impuestos a nivel comprobante (`<cfdi:Impuestos>`); nivel `CFDI` al
   * persistirse, con `conceptSlot = 0`.
   */
  readonly cfdiTaxes: readonly ExtractedTax[];
}
