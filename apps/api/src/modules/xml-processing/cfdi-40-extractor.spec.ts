import { XMLParser } from 'fast-xml-parser';

import {
  detectCfdiVersion,
  extractCfdiHeader,
  extractCfdiConcepts,
  splitQualifiedName,
  extendNamespaceScope,
  resolveNamespacePrefix,
  type NamespaceScope,
} from './cfdi-40-extractor';
import { CfdiExtractionError, type CfdiExtractionErrorCode } from './cfdi-extraction.errors';

/** Mismas opciones seguras exactas de `E5-S3-T04` — no se repite su validación aquí. */
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
  maxNestedTags: 50,
});

const analizar = (xml: string): unknown => parser.parse(xml);

/**
 * Datos fiscales sintéticos incrustados en fixtures, para comprobar que
 * jamás aparecen en el mensaje de un error. No son reales.
 */
const RFC_FICTICIO = 'XAXX010101000';
const UUID_FICTICIO = '11111111-2222-3333-4444-555555555555';

/** CFDI 4.0 completo y válido — prefijo estándar, namespace oficial. */
const CFDI_VALIDO =
  `<?xml version="1.0" encoding="UTF-8"?>` +
  `<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" Total="1160.00">` +
  `<cfdi:Emisor Rfc="${RFC_FICTICIO}"/>` +
  `<cfdi:Complemento><tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" UUID="${UUID_FICTICIO}"/></cfdi:Complemento>` +
  `</cfdi:Comprobante>`;

function capturar(fn: () => unknown): CfdiExtractionError {
  try {
    fn();
  } catch (error) {
    if (error instanceof CfdiExtractionError) {
      return error;
    }
    throw error;
  }
  throw new Error('Se esperaba un CfdiExtractionError y no se lanzó ninguno.');
}

function esperarRechazo(xml: string, code: CfdiExtractionErrorCode): CfdiExtractionError {
  const error = capturar(() => detectCfdiVersion(analizar(xml)));
  expect(error).toBeInstanceOf(CfdiExtractionError);
  expect(error.name).toBe('CfdiExtractionError');
  expect(error.code).toBe(code);
  expect(error.message).not.toContain('<');
  expect(error.message).not.toContain(RFC_FICTICIO);
  expect(error.message).not.toContain(UUID_FICTICIO);
  return error;
}

describe('detectCfdiVersion — casos válidos', () => {
  it('1. acepta cfdi:Comprobante con namespace oficial y Version="4.0"', () => {
    const resultado = detectCfdiVersion(analizar(CFDI_VALIDO));
    expect(resultado.localName).toBe('Comprobante');
    expect(resultado.namespaceUri).toBe('http://www.sat.gob.mx/cfd/4');
    expect(resultado.version).toBe('4.0');
  });

  it('2. acepta un prefijo alternativo que resuelve al namespace oficial', () => {
    const xml =
      '<c:Comprobante xmlns:c="http://www.sat.gob.mx/cfd/4" Version="4.0"><c:Emisor Rfc="A"/></c:Comprobante>';
    const resultado = detectCfdiVersion(analizar(xml));
    expect(resultado.namespaceUri).toBe('http://www.sat.gob.mx/cfd/4');
  });

  it('3. acepta el namespace por defecto (sin prefijo) cuando es el oficial', () => {
    const xml =
      '<Comprobante xmlns="http://www.sat.gob.mx/cfd/4" Version="4.0"><Emisor Rfc="A"/></Comprobante>';
    const resultado = detectCfdiVersion(analizar(xml));
    expect(resultado.localName).toBe('Comprobante');
    expect(resultado.namespaceUri).toBe('http://www.sat.gob.mx/cfd/4');
  });

  it('4. preserva los atributos de la raíz como string', () => {
    const resultado = detectCfdiVersion(analizar(CFDI_VALIDO));
    expect(resultado.attributes['Total']).toBe('1160.00');
    expect(typeof resultado.attributes['Version']).toBe('string');
  });

  it('5. Version permanece string, nunca se convierte', () => {
    const resultado = detectCfdiVersion(analizar(CFDI_VALIDO));
    expect(resultado.version).toBe('4.0');
    expect(typeof resultado.version).toBe('string');
  });

  it('6. children conserva el orden y es la misma referencia del árbol', () => {
    const xml =
      '<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0"><cfdi:A/><cfdi:B/><cfdi:C/></cfdi:Comprobante>';
    const arbol = analizar(xml) as Array<Record<string, unknown>>;
    const resultado = detectCfdiVersion(arbol);
    const raiz = arbol.find((e) => 'cfdi:Comprobante' in e)!;
    expect(resultado.children).toBe(raiz['cfdi:Comprobante']);
    const nombres = (resultado.children as Array<Record<string, unknown>>).map(
      (hijo) => Object.keys(hijo)[0],
    );
    expect(nombres).toEqual(['cfdi:A', 'cfdi:B', 'cfdi:C']);
  });

  it('7. declaraciones xmlns se interpretan correctamente en namespaceScope', () => {
    const resultado = detectCfdiVersion(analizar(CFDI_VALIDO));
    expect(resolveNamespacePrefix(resultado.namespaceScope, 'cfdi')).toBe(
      'http://www.sat.gob.mx/cfd/4',
    );
  });

  it('8. una reasignación de prefijo en un descendiente no altera la resolución de la raíz', () => {
    const xml =
      '<a:Comprobante xmlns:a="http://www.sat.gob.mx/cfd/4" Version="4.0">' +
      '<a:Complemento><a:Otro xmlns:a="urn:otro-namespace-completamente-distinto"/></a:Complemento>' +
      '</a:Comprobante>';
    const resultado = detectCfdiVersion(analizar(xml));
    expect(resultado.namespaceUri).toBe('http://www.sat.gob.mx/cfd/4');
  });

  it('9. el resultado no contiene ningún dato fiscal extraído', () => {
    const resultado = detectCfdiVersion(analizar(CFDI_VALIDO)) as unknown as Record<
      string,
      unknown
    >;
    expect(resultado).not.toHaveProperty('folioFiscal');
    expect(resultado).not.toHaveProperty('rfcEmisor');
    expect(resultado).not.toHaveProperty('rfcReceptor');
    expect(resultado).not.toHaveProperty('concepts');
    expect(resultado).not.toHaveProperty('cfdiTaxes');
    expect(Object.keys(resultado).sort()).toEqual(
      ['attributes', 'children', 'localName', 'namespaceScope', 'namespaceUri', 'version'].sort(),
    );
  });
});

describe('detectCfdiVersion — casos inválidos: estructura', () => {
  it('10. rechaza si parsedXml no es un array', () => {
    esperarRechazoEstructura({} as unknown);
    esperarRechazoEstructura(null);
    esperarRechazoEstructura('no es un array');
  });

  it('11. rechaza un árbol preserveOrder con forma inesperada (mockeado)', () => {
    // No reproducible con fast-xml-parser real (siempre produce objetos
    // anidados en arrays) — defensa de tipos, igual que en xml-validation.ts.
    esperarRechazoEstructura([42, 'texto-suelto']);
  });

  it('12. rechaza si no hay ninguna raíz de elemento', () => {
    esperarRechazo('', 'CFDI_STRUCTURE_INVALID');
  });

  it('13. rechaza una raíz distinta de Comprobante', () => {
    esperarRechazo(
      '<cfdi:Factura xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0"/>',
      'CFDI_STRUCTURE_INVALID',
    );
  });

  it('15. rechaza un Comprobante sin ningún namespace efectivo', () => {
    esperarRechazo('<Comprobante Version="4.0"/>', 'CFDI_STRUCTURE_INVALID');
  });

  it('23. rechaza un prefijo no declarado en ningún ámbito', () => {
    esperarRechazo('<zzz:Comprobante Version="4.0"/>', 'CFDI_STRUCTURE_INVALID');
  });

  it('24. rechaza una raíz con más de una clave de tag (forma inesperada, mockeada)', () => {
    esperarRechazoEstructura([{ 'a:Comprobante': [], 'b:Otro': [] }]);
  });

  it('24b. rechaza una raíz cuyos hijos no son un array (forma inesperada, mockeada)', () => {
    esperarRechazoEstructura([
      {
        'cfdi:Comprobante': 'no-es-array',
        ':@': { '@_xmlns:cfdi': 'http://www.sat.gob.mx/cfd/4', '@_Version': '4.0' },
      },
    ]);
  });

  it('25. rechaza un nombre local con casing incorrecto', () => {
    esperarRechazo(
      '<cfdi:comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0"/>',
      'CFDI_STRUCTURE_INVALID',
    );
  });

  it('26. rechaza el namespace oficial asociado a otro nombre local', () => {
    esperarRechazo(
      '<cfdi:Emisor xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0"/>',
      'CFDI_STRUCTURE_INVALID',
    );
  });

  function esperarRechazoEstructura(arbol: unknown): void {
    const error = capturar(() => detectCfdiVersion(arbol));
    expect(error.code).toBe('CFDI_STRUCTURE_INVALID');
  }
});

describe('detectCfdiVersion — casos inválidos: namespace', () => {
  it('14. rechaza un prefijo "cfdi" que resuelve a un namespace falso', () => {
    esperarRechazo(
      '<cfdi:Comprobante xmlns:cfdi="http://ejemplo.com/falso" Version="4.0"/>',
      'CFDI_STRUCTURE_INVALID',
    );
  });

  it('16. rechaza un namespace no oficial (aunque el localName sea correcto)', () => {
    esperarRechazo(
      '<Comprobante xmlns="urn:no-es-cfdi-en-absoluto" Version="4.0"/>',
      'CFDI_STRUCTURE_INVALID',
    );
  });

  it('no usa startsWith("cfdi:") como criterio: un prefijo "cfdi" con namespace correcto pero localName incorrecto se rechaza igual', () => {
    esperarRechazo(
      '<cfdi:factura xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0"/>',
      'CFDI_STRUCTURE_INVALID',
    );
  });
});

describe('detectCfdiVersion — casos inválidos: versión', () => {
  it('17. rechaza si Version está ausente', () => {
    esperarRechazo(
      '<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4"/>',
      'CFDI_STRUCTURE_INVALID',
    );
  });

  it('18. rechaza Version="3.3" (CFDI real, versión no soportada — AD-8)', () => {
    esperarRechazo(
      '<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/3" Version="3.3"/>',
      'UNSUPPORTED_CFDI_VERSION',
    );
  });

  it.each([
    ['4', '<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4"/>'],
    ['4.00', '<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.00"/>'],
    ['4 .0', '<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4 .0"/>'],
    ['v4.0', '<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="v4.0"/>'],
  ])('19-21. rechaza Version=%s sin normalizar (UNSUPPORTED_CFDI_VERSION)', (_caso, xml) => {
    esperarRechazo(xml, 'UNSUPPORTED_CFDI_VERSION');
  });

  /**
   * Hallazgo empírico: `Version=" 4.0 "` (con espacios *al inicio o al
   * final*) NO llega distinto a `detectCfdiVersion` — `E5-S3-T04` ya
   * configuró `trimValues: true` (inmutable, no se toca en esta tarea), y esa
   * opción de `fast-xml-parser` recorta también los valores de atributo, no
   * solo el texto de los tags. Verificado empíricamente: el árbol que
   * `detectCfdiVersion` recibe ya trae `"4.0"`, indistinguible del caso
   * válido — no es una normalización que T05 realice ni pueda evitar. Un
   * espacio *interior* (`"4 .0"`, arriba) sí sobrevive intacto y sí se
   * rechaza, lo que confirma que la comparación de T05 sigue siendo exacta
   * sobre lo que efectivamente recibe.
   */
  it('espacios al inicio/final de Version ya llegan recortados por trimValues de E5-S3-T04 (no es normalización de T05)', () => {
    const resultado = detectCfdiVersion(
      analizar('<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version=" 4.0 "/>'),
    );
    expect(resultado.version).toBe('4.0');
  });

  it('22. rechaza si Version no es string (mockeado — no reproducible con el parser real)', () => {
    const error = capturar(() =>
      detectCfdiVersion([
        {
          'cfdi:Comprobante': [],
          ':@': { '@_xmlns:cfdi': 'http://www.sat.gob.mx/cfd/4', '@_Version': 4.0 },
        },
      ]),
    );
    expect(error.code).toBe('CFDI_STRUCTURE_INVALID');
  });

  it('un namespace conocido (cfd/3) con localName incorrecto sigue siendo CFDI_STRUCTURE_INVALID', () => {
    esperarRechazo(
      '<cfdi:Factura xmlns:cfdi="http://www.sat.gob.mx/cfd/3" Version="3.3"/>',
      'CFDI_STRUCTURE_INVALID',
    );
  });
});

describe('detectCfdiVersion — sanitización de errores', () => {
  it('27. el error nunca contiene el namespace ni la versión recibidos', () => {
    const error = esperarRechazo(
      '<cfdi:Comprobante xmlns:cfdi="http://namespace-controlado-por-el-atacante.example/v9"/>',
      'CFDI_STRUCTURE_INVALID',
    );
    expect(error.message).not.toContain('namespace-controlado-por-el-atacante');
    expect(error.message).not.toContain('v9');
  });

  it('27b. el error de versión no soportada nunca contiene la versión recibida', () => {
    const error = esperarRechazo(
      '<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="9.9.9-controlada"/>',
      'UNSUPPORTED_CFDI_VERSION',
    );
    expect(error.message).not.toContain('9.9.9');
  });

  it('28. RFC y UUID ficticios del fixture nunca aparecen en un rechazo estructural', () => {
    const xmlInvalido = CFDI_VALIDO.replace('Version="4.0"', 'Version="3.3-invalida"');
    esperarRechazo(xmlInvalido, 'UNSUPPORTED_CFDI_VERSION');
  });
});

describe('splitQualifiedName — utilidad de namespaces', () => {
  it('separa prefijo y nombre local cuando hay prefijo', () => {
    expect(splitQualifiedName('cfdi:Comprobante')).toEqual({
      prefix: 'cfdi',
      localName: 'Comprobante',
    });
  });

  it('devuelve prefijo vacío cuando no hay prefijo', () => {
    expect(splitQualifiedName('Comprobante')).toEqual({ prefix: '', localName: 'Comprobante' });
  });
});

describe('extendNamespaceScope / resolveNamespacePrefix — utilidad de ámbito', () => {
  it('resuelve el namespace por defecto con prefijo vacío', () => {
    const scope = extendNamespaceScope(null, { '@_xmlns': 'urn:x' });
    expect(resolveNamespacePrefix(scope, '')).toBe('urn:x');
  });

  it('resuelve un prefijo declarado', () => {
    const scope = extendNamespaceScope(null, { '@_xmlns:a': 'urn:a' });
    expect(resolveNamespacePrefix(scope, 'a')).toBe('urn:a');
  });

  it('sube al ámbito padre cuando el prefijo no está en el propio', () => {
    const padre: NamespaceScope = { bindings: { a: 'urn:a' }, parent: null };
    const hijo = extendNamespaceScope(padre, { '@_xmlns:b': 'urn:b' });
    expect(resolveNamespacePrefix(hijo, 'a')).toBe('urn:a');
    expect(resolveNamespacePrefix(hijo, 'b')).toBe('urn:b');
  });

  it('un binding en el hijo reasigna (shadows) el mismo prefijo del padre', () => {
    const padre: NamespaceScope = { bindings: { a: 'urn:padre' }, parent: null };
    const hijo = extendNamespaceScope(padre, { '@_xmlns:a': 'urn:hijo' });
    expect(resolveNamespacePrefix(hijo, 'a')).toBe('urn:hijo');
  });

  it('devuelve undefined si el prefijo nunca se declaró en ningún ámbito', () => {
    const scope = extendNamespaceScope(null, {});
    expect(resolveNamespacePrefix(scope, 'inexistente')).toBeUndefined();
  });

  it('ignora atributos que no son declaraciones de namespace', () => {
    const scope = extendNamespaceScope(null, { '@_Version': '4.0', '@_xmlns:a': 'urn:a' });
    expect(resolveNamespacePrefix(scope, '')).toBeUndefined();
    expect(resolveNamespacePrefix(scope, 'a')).toBe('urn:a');
  });

  it('ignora valores no-string en los atributos (defensivo, no reproducible con el parser real)', () => {
    const scope = extendNamespaceScope(null, { '@_xmlns:a': 42 });
    expect(resolveNamespacePrefix(scope, 'a')).toBeUndefined();
  });

  it('trata rawAttributes ausente/no-objeto como ausencia de bindings', () => {
    const scope = extendNamespaceScope(null, undefined);
    expect(resolveNamespacePrefix(scope, '')).toBeUndefined();
    const scope2 = extendNamespaceScope(null, 'no-es-un-objeto');
    expect(resolveNamespacePrefix(scope2, '')).toBeUndefined();
  });
});

describe('detectCfdiVersion — resistencia a contaminación de Object.prototype (hallazgo MEDIO corregido)', () => {
  const PROPIEDAD_CONTAMINADA = 'cfdi';

  afterEach(() => {
    // Garantizado incluso si una aserción anterior falla dentro del `it` —
    // ningún otro test debe heredar esta contaminación.
    delete (Object.prototype as Record<string, unknown>)[PROPIEDAD_CONTAMINADA];
  });

  it('rechaza cfdi:Comprobante sin xmlns:cfdi declarado aunque Object.prototype.cfdi apunte al namespace oficial', () => {
    (Object.prototype as Record<string, unknown>)[PROPIEDAD_CONTAMINADA] =
      'http://www.sat.gob.mx/cfd/4';

    const error = capturar(() => detectCfdiVersion(analizar('<cfdi:Comprobante Version="4.0"/>')));

    expect(error.code).toBe('CFDI_STRUCTURE_INVALID');
  });

  it('resolveNamespacePrefix nunca encuentra un binding heredado de Object.prototype', () => {
    (Object.prototype as Record<string, unknown>)[PROPIEDAD_CONTAMINADA] =
      'http://www.sat.gob.mx/cfd/4';

    const scope = extendNamespaceScope(null, {});

    expect(resolveNamespacePrefix(scope, PROPIEDAD_CONTAMINADA)).toBeUndefined();
  });
});

describe('resolveNamespacePrefix — propiedad propia vs. heredada', () => {
  it('una propiedad heredada por prototipo nunca cuenta como binding', () => {
    const prototipoContaminado = { a: 'urn:heredado-nunca-declarado' };
    const bindings = Object.create(prototipoContaminado) as Record<string, string>;
    const scope: NamespaceScope = { bindings, parent: null };

    expect(resolveNamespacePrefix(scope, 'a')).toBeUndefined();
  });

  it('una propiedad propia sí cuenta, aunque el prototipo declare la misma clave', () => {
    const prototipoContaminado = { a: 'urn:heredado-nunca-declarado' };
    const bindings = Object.create(prototipoContaminado) as Record<string, string>;
    bindings['a'] = 'urn:propio-declarado-en-el-xml';
    const scope: NamespaceScope = { bindings, parent: null };

    expect(resolveNamespacePrefix(scope, 'a')).toBe('urn:propio-declarado-en-el-xml');
  });
});

describe('detectCfdiVersion — no vuelve a parsear ni a validar', () => {
  /**
   * Se comprueba la línea de import real (no una búsqueda de substring sobre
   * todo el archivo), porque la documentación JSDoc del módulo menciona
   * deliberadamente "fast-xml-parser" y "Logger" en prosa, para explicar por
   * qué no se usan — un `toContain` ingenuo sobre el archivo completo
   * produciría un falso positivo con esa misma prosa.
   */
  function leerImportsDeProduccion(): string[] {
    const fs = jest.requireActual<typeof import('fs')>('fs');
    const path = jest.requireActual<typeof import('path')>('path');
    const fuente = fs.readFileSync(path.join(__dirname, 'cfdi-40-extractor.ts'), 'utf8');
    return fuente.split('\n').filter((linea) => linea.trim().startsWith('import'));
  }

  it('no importa fast-xml-parser en el módulo de producción', () => {
    const imports = leerImportsDeProduccion();
    expect(imports).toEqual(["import { CfdiExtractionError } from './cfdi-extraction.errors';"]);
  });

  it('no registra nada (sin console.*, sin uso real de Logger)', () => {
    const fs = jest.requireActual<typeof import('fs')>('fs');
    const path = jest.requireActual<typeof import('path')>('path');
    const fuente = fs.readFileSync(path.join(__dirname, 'cfdi-40-extractor.ts'), 'utf8');
    expect(fuente).not.toMatch(/\bconsole\s*\./);
    expect(fuente).not.toMatch(/\bnew Logger\s*\(/);
    expect(fuente).not.toMatch(/from ['"]@nestjs\/common['"]/);
  });
});

/**
 * `E5-S3-T06` — extracción de encabezado. RFC y UUID ficticios distintos de
 * los de `detectCfdiVersion` arriba, para no confundir ambas suites.
 */
describe('extractCfdiHeader', () => {
  const RFC_EMISOR = 'AAA010101AA1';
  const RFC_RECEPTOR = 'BBB020202BB2';
  const UUID_TIMBRE = '11111111-2222-3333-4444-555555555555';
  const TFD_11_NAMESPACE_URI = 'http://www.sat.gob.mx/TimbreFiscalDigital';

  /**
   * Constructor de fixture con overrides — cada override en `null` elimina
   * ese elemento/atributo por completo, en vez de dejarlo vacío, para
   * simular ausencia real (no un valor vacío).
   */
  function construirCfdi(overrides?: {
    fecha?: string | null;
    subTotal?: string | null;
    total?: string | null;
    moneda?: string | null;
    tipoDeComprobante?: string | null;
    emisor?: string | null;
    receptor?: string | null;
    complemento?: string | null;
  }): string {
    const atributosEncabezado = [
      overrides?.fecha !== null ? `Fecha="${overrides?.fecha ?? '2026-07-15T10:30:00'}"` : '',
      overrides?.subTotal !== null ? `SubTotal="${overrides?.subTotal ?? '1000.00'}"` : '',
      overrides?.total !== null ? `Total="${overrides?.total ?? '1160.00'}"` : '',
      overrides?.moneda !== null ? `Moneda="${overrides?.moneda ?? 'MXN'}"` : '',
      overrides?.tipoDeComprobante !== null
        ? `TipoDeComprobante="${overrides?.tipoDeComprobante ?? 'I'}"`
        : '',
    ]
      .filter(Boolean)
      .join(' ');

    const emisor =
      overrides?.emisor !== null
        ? (overrides?.emisor ?? `<cfdi:Emisor Rfc="${RFC_EMISOR}" NombreEmisor="Fuera del MVP"/>`)
        : '';
    const receptor =
      overrides?.receptor !== null
        ? (overrides?.receptor ?? `<cfdi:Receptor Rfc="${RFC_RECEPTOR}" UsoCFDI="G03"/>`)
        : '';
    const complemento =
      overrides?.complemento !== null
        ? (overrides?.complemento ??
          `<cfdi:Complemento><tfd:TimbreFiscalDigital xmlns:tfd="${TFD_11_NAMESPACE_URI}" UUID="${UUID_TIMBRE}"/></cfdi:Complemento>`)
        : '';

    return (
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" ${atributosEncabezado}>` +
      `${emisor}${receptor}${complemento}` +
      `</cfdi:Comprobante>`
    );
  }

  function extraerHeader(xml: string) {
    return extractCfdiHeader(detectCfdiVersion(analizar(xml)));
  }

  function esperarRechazoHeader(xml: string): CfdiExtractionError {
    const error = capturar(() => extraerHeader(xml));
    expect(error.code).toBe('CFDI_STRUCTURE_INVALID');
    return error;
  }

  it('extrae los 8 campos obligatorios de un CFDI 4.0 completo y válido', () => {
    const resultado = extraerHeader(construirCfdi());

    expect(resultado).toEqual({
      folioFiscal: UUID_TIMBRE,
      rfcEmisor: RFC_EMISOR,
      rfcReceptor: RFC_RECEPTOR,
      issuedAtLocal: '2026-07-15T10:30:00',
      subtotal: '1000.00',
      total: '1160.00',
      currency: 'MXN',
      tipoComprobante: 'I',
    });
  });

  it('subtotal y total nunca son number, siempre string', () => {
    const resultado = extraerHeader(construirCfdi());
    expect(typeof resultado.subtotal).toBe('string');
    expect(typeof resultado.total).toBe('string');
  });

  it('un campo fuera del MVP presente (NombreEmisor, UsoCFDI) no provoca fallo', () => {
    // Ya incrustados por defecto en construirCfdi(); si esto lanzara, la
    // extracción estaría fallando por un campo que debe ignorarse en silencio.
    expect(() => extraerHeader(construirCfdi())).not.toThrow();
  });

  it.each([
    ['Fecha', { fecha: null }],
    ['SubTotal', { subTotal: null }],
    ['Total', { total: null }],
    ['Moneda', { moneda: null }],
    ['TipoDeComprobante', { tipoDeComprobante: null }],
    ['Emisor completo', { emisor: null }],
    ['Receptor completo', { receptor: null }],
    ['Complemento completo (con el Timbre dentro)', { complemento: null }],
  ])('rechaza cuando %s está ausente → CFDI_STRUCTURE_INVALID', (_nombre, overrides) => {
    esperarRechazoHeader(construirCfdi(overrides));
  });

  it('rechaza cuando Emisor no tiene Rfc', () => {
    esperarRechazoHeader(construirCfdi({ emisor: '<cfdi:Emisor NombreEmisor="Sin RFC"/>' }));
  });

  it('rechaza cuando Receptor no tiene Rfc', () => {
    esperarRechazoHeader(construirCfdi({ receptor: '<cfdi:Receptor UsoCFDI="G03"/>' }));
  });

  it('rechaza cuando Complemento no contiene TimbreFiscalDigital', () => {
    esperarRechazoHeader(construirCfdi({ complemento: '<cfdi:Complemento></cfdi:Complemento>' }));
  });

  it('rechaza cuando el Timbre no tiene UUID', () => {
    esperarRechazoHeader(
      construirCfdi({
        complemento: `<cfdi:Complemento><tfd:TimbreFiscalDigital xmlns:tfd="${TFD_11_NAMESPACE_URI}"/></cfdi:Complemento>`,
      }),
    );
  });

  it.each([
    ['4', '2026-07-15'],
    ['4b', '2026-07-15 10:30:00'],
    ['4c', '2026-07-15T10:30'],
    ['4d', '15-07-2026T10:30:00'],
    ['4e', '2026-07-15T10:30:00Z'],
    ['4f', ''],
  ])('rechaza Fecha con forma inválida (caso %s) sin convertir a Date', (_caso, fechaInvalida) => {
    const error = esperarRechazoHeader(construirCfdi({ fecha: fechaInvalida }));
    // La prohibición D-009 se verifica indirectamente: el único efecto
    // observable posible de una conversión sería `error.message` conteniendo
    // un ISO-8601 con offset o un objeto Date serializado — nunca ocurre,
    // porque `exigirCadenaObligatoria`/el patrón de forma rechazan antes de
    // cualquier intento de `new Date(...)`.
    expect(error.message).not.toMatch(/GMT|UTC|Invalid Date/);
  });

  it('acepta Fecha con forma AAAA-MM-DDThh:mm:ss exacta, preservada sin modificar', () => {
    const resultado = extraerHeader(construirCfdi({ fecha: '2026-01-05T00:00:00' }));
    expect(resultado.issuedAtLocal).toBe('2026-01-05T00:00:00');
    expect(typeof resultado.issuedAtLocal).toBe('string');
  });

  it.each([
    ['demasiado corto', '11111111-2222-3333-4444-55555555555'],
    ['demasiado largo', '11111111-2222-3333-4444-5555555555555'],
    ['sin guiones (36 chars pero forma incorrecta)', '111111112222333344445555555555555x'],
  ])('rechaza un UUID con forma inválida (%s)', (_caso, uuidInvalido) => {
    esperarRechazoHeader(
      construirCfdi({
        complemento: `<cfdi:Complemento><tfd:TimbreFiscalDigital xmlns:tfd="${TFD_11_NAMESPACE_URI}" UUID="${uuidInvalido}"/></cfdi:Complemento>`,
      }),
    );
  });

  it('resuelve el Timbre por URI aunque el prefijo declarado sea distinto de "tfd"', () => {
    const resultado = extraerHeader(
      construirCfdi({
        complemento: `<cfdi:Complemento><x:TimbreFiscalDigital xmlns:x="${TFD_11_NAMESPACE_URI}" UUID="${UUID_TIMBRE}"/></cfdi:Complemento>`,
      }),
    );
    expect(resultado.folioFiscal).toBe(UUID_TIMBRE);
  });

  it('rechaza un Timbre cuyo prefijo "tfd" apunta a un namespace falso', () => {
    esperarRechazoHeader(
      construirCfdi({
        complemento: `<cfdi:Complemento><tfd:TimbreFiscalDigital xmlns:tfd="http://ejemplo.com/falso" UUID="${UUID_TIMBRE}"/></cfdi:Complemento>`,
      }),
    );
  });

  it('nunca reporta el UUID en el mensaje de un error de estructura', () => {
    const error = esperarRechazoHeader(construirCfdi({ complemento: null }));
    expect(error.message).not.toContain(UUID_TIMBRE);
  });
});

describe('extractCfdiConcepts', () => {
  const RFC_EMISOR = 'AAA010101AA1';
  const RFC_RECEPTOR = 'BBB020202BB2';
  const UUID_TIMBRE = '99999999-8888-7777-6666-555555555555';
  const TFD_11_NAMESPACE_URI = 'http://www.sat.gob.mx/TimbreFiscalDigital';
  const NAMESPACE_CFDI_40 = 'http://www.sat.gob.mx/cfd/4';

  const CAMPOS_CONCEPTO_VALIDO: Readonly<Record<string, string>> = {
    ClaveProdServ: '01010101',
    Cantidad: '1.000000',
    ClaveUnidad: 'H87',
    Descripcion: 'Servicio de prueba',
    ValorUnitario: '100.00',
    Importe: '100.00',
    ObjetoImp: '02',
  };

  /** Un `<cfdi:Concepto>` mínimo válido (7 campos obligatorios), con overrides/omisiones. */
  function conceptoValido(overrides?: Record<string, string>, omitir?: string): string {
    const atributos: Record<string, string> = { ...CAMPOS_CONCEPTO_VALIDO, ...overrides };
    if (omitir !== undefined) {
      delete atributos[omitir];
    }
    const attrs = Object.entries(atributos)
      .map(([clave, valor]) => `${clave}="${valor}"`)
      .join(' ');
    return `<cfdi:Concepto ${attrs}/>`;
  }

  /**
   * CFDI 4.0 completo y válido (encabezado ya correcto, `extractCfdiHeader`
   * no es el objeto de esta suite), con `conceptosInnerXml` incrustado
   * literalmente como contenido de `<cfdi:Conceptos>`. `null` omite el nodo
   * `Conceptos` por completo — ausencia real, no un nodo vacío.
   */
  function construirCfdiConConceptos(conceptosInnerXml: string | null): string {
    const conceptos =
      conceptosInnerXml !== null ? `<cfdi:Conceptos>${conceptosInnerXml}</cfdi:Conceptos>` : '';
    return (
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<cfdi:Comprobante xmlns:cfdi="${NAMESPACE_CFDI_40}" Version="4.0" Fecha="2026-07-15T10:30:00" SubTotal="100.00" Total="116.00" Moneda="MXN" TipoDeComprobante="I">` +
      `<cfdi:Emisor Rfc="${RFC_EMISOR}"/>` +
      `<cfdi:Receptor Rfc="${RFC_RECEPTOR}"/>` +
      conceptos +
      `<cfdi:Complemento><tfd:TimbreFiscalDigital xmlns:tfd="${TFD_11_NAMESPACE_URI}" UUID="${UUID_TIMBRE}"/></cfdi:Complemento>` +
      `</cfdi:Comprobante>`
    );
  }

  function extraerConceptos(xml: string) {
    return extractCfdiConcepts(detectCfdiVersion(analizar(xml)));
  }

  function esperarRechazoConceptos(xml: string): CfdiExtractionError {
    const error = capturar(() => extraerConceptos(xml));
    expect(error.code).toBe('CFDI_STRUCTURE_INVALID');
    return error;
  }

  it('1. extrae un único concepto válido con position = 1 y taxes: []', () => {
    const resultado = extraerConceptos(construirCfdiConConceptos(conceptoValido()));

    expect(resultado).toEqual([
      {
        position: 1,
        claveProdServ: '01010101',
        noIdentificacion: null,
        cantidad: '1.000000',
        claveUnidad: 'H87',
        unidad: null,
        descripcion: 'Servicio de prueba',
        valorUnitario: '100.00',
        importe: '100.00',
        descuento: null,
        objetoImp: '02',
        taxes: [],
      },
    ]);
  });

  it('2-3. extrae múltiples conceptos preservando el orden de aparición como position contigua', () => {
    const xml = construirCfdiConConceptos(
      conceptoValido({ ClaveProdServ: '10101001', Descripcion: 'Primero' }) +
        conceptoValido({ ClaveProdServ: '10101002', Descripcion: 'Segundo' }) +
        conceptoValido({ ClaveProdServ: '10101003', Descripcion: 'Tercero' }),
    );

    const resultado = extraerConceptos(xml);

    expect(resultado.map((concepto) => concepto.position)).toEqual([1, 2, 3]);
    expect(resultado.map((concepto) => concepto.descripcion)).toEqual([
      'Primero',
      'Segundo',
      'Tercero',
    ]);
  });

  it('4. acepta un prefijo alternativo para Conceptos/Concepto que resuelve al namespace oficial', () => {
    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<c:Comprobante xmlns:c="${NAMESPACE_CFDI_40}" Version="4.0" Fecha="2026-07-15T10:30:00" SubTotal="100.00" Total="116.00" Moneda="MXN" TipoDeComprobante="I">` +
      `<c:Emisor Rfc="${RFC_EMISOR}"/>` +
      `<c:Receptor Rfc="${RFC_RECEPTOR}"/>` +
      `<c:Conceptos><c:Concepto ClaveProdServ="01010101" Cantidad="1.000000" ClaveUnidad="H87" Descripcion="Servicio" ValorUnitario="100.00" Importe="100.00" ObjetoImp="02"/></c:Conceptos>` +
      `<c:Complemento><tfd:TimbreFiscalDigital xmlns:tfd="${TFD_11_NAMESPACE_URI}" UUID="${UUID_TIMBRE}"/></c:Complemento>` +
      `</c:Comprobante>`;

    const resultado = extraerConceptos(xml);

    expect(resultado).toHaveLength(1);
    expect(resultado[0]?.claveProdServ).toBe('01010101');
  });

  it('5. rechaza cuando Conceptos resuelve a un namespace falso, aunque el localName sea correcto', () => {
    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<cfdi:Comprobante xmlns:cfdi="${NAMESPACE_CFDI_40}" Version="4.0" Fecha="2026-07-15T10:30:00" SubTotal="100.00" Total="116.00" Moneda="MXN" TipoDeComprobante="I">` +
      `<cfdi:Emisor Rfc="${RFC_EMISOR}"/>` +
      `<cfdi:Receptor Rfc="${RFC_RECEPTOR}"/>` +
      `<cfdi:Conceptos xmlns:cfdi="http://ejemplo.com/falso">${conceptoValido()}</cfdi:Conceptos>` +
      `<cfdi:Complemento><tfd:TimbreFiscalDigital xmlns:tfd="${TFD_11_NAMESPACE_URI}" UUID="${UUID_TIMBRE}"/></cfdi:Complemento>` +
      `</cfdi:Comprobante>`;

    esperarRechazoConceptos(xml);
  });

  it('6a. rechaza cuando Conceptos está ausente por completo', () => {
    esperarRechazoConceptos(construirCfdiConConceptos(null));
  });

  it('6b. rechaza cuando Conceptos está presente pero vacío (cero Concepto)', () => {
    esperarRechazoConceptos(construirCfdiConConceptos(''));
  });

  it.each(Object.keys(CAMPOS_CONCEPTO_VALIDO))(
    '7. rechaza un concepto incompleto: falta el campo obligatorio %s',
    (campo) => {
      esperarRechazoConceptos(construirCfdiConConceptos(conceptoValido(undefined, campo)));
    },
  );

  it('8a. campos opcionales ausentes (NoIdentificacion, Unidad, Descuento) se leen como null', () => {
    const resultado = extraerConceptos(construirCfdiConConceptos(conceptoValido()));

    expect(resultado[0]?.noIdentificacion).toBeNull();
    expect(resultado[0]?.unidad).toBeNull();
    expect(resultado[0]?.descuento).toBeNull();
  });

  it('8b. campos opcionales presentes se conservan tal cual', () => {
    const resultado = extraerConceptos(
      construirCfdiConConceptos(
        conceptoValido({ NoIdentificacion: 'SKU-1', Unidad: 'Hora', Descuento: '10.00' }),
      ),
    );

    expect(resultado[0]?.noIdentificacion).toBe('SKU-1');
    expect(resultado[0]?.unidad).toBe('Hora');
    expect(resultado[0]?.descuento).toBe('10.00');
  });

  it('9. cantidad, valorUnitario, importe y descuento son siempre string, nunca number', () => {
    const resultado = extraerConceptos(
      construirCfdiConConceptos(conceptoValido({ Descuento: '5.50' })),
    );

    expect(typeof resultado[0]?.cantidad).toBe('string');
    expect(typeof resultado[0]?.valorUnitario).toBe('string');
    expect(typeof resultado[0]?.importe).toBe('string');
    expect(typeof resultado[0]?.descuento).toBe('string');
  });

  it('10. un <cfdi:Impuestos> presente dentro del Concepto se ignora — taxes siempre [] (E5-S3-T08 no adelantado)', () => {
    const xmlConImpuestos = construirCfdiConConceptos(
      `<cfdi:Concepto ${Object.entries(CAMPOS_CONCEPTO_VALIDO)
        .map(([clave, valor]) => `${clave}="${valor}"`)
        .join(' ')}>` +
        `<cfdi:Impuestos><cfdi:Traslados><cfdi:Traslado Base="100.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="16.00"/></cfdi:Traslados></cfdi:Impuestos>` +
        `</cfdi:Concepto>`,
    );

    const resultado = extraerConceptos(xmlConImpuestos);

    expect(resultado[0]?.taxes).toEqual([]);
  });

  it('12a. un concepto inválido en medio de varios aborta toda la extracción — nunca deja un hueco en position', () => {
    const xml = construirCfdiConConceptos(
      conceptoValido({ ClaveProdServ: '10101001' }) +
        conceptoValido(undefined, 'ClaveProdServ') +
        conceptoValido({ ClaveProdServ: '10101003' }),
    );

    esperarRechazoConceptos(xml);
  });

  it('12b. el mensaje de rechazo por Conceptos ausente nunca contiene marcado ni datos del comprobante', () => {
    const error = esperarRechazoConceptos(construirCfdiConConceptos(null));
    expect(error.message).not.toContain('<');
    expect(error.message).not.toContain(RFC_EMISOR);
  });

  it('12c. compone con extractCfdiHeader sobre la misma raíz ya resuelta, sin interferencia entre ambas', () => {
    const root = detectCfdiVersion(analizar(construirCfdiConConceptos(conceptoValido())));

    const header = extractCfdiHeader(root);
    const conceptos = extractCfdiConcepts(root);

    expect(header.rfcEmisor).toBe(RFC_EMISOR);
    expect(header.rfcReceptor).toBe(RFC_RECEPTOR);
    expect(conceptos).toHaveLength(1);
    expect(conceptos[0]?.claveProdServ).toBe('01010101');
  });
});
