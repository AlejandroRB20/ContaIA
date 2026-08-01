import { XMLParser } from 'fast-xml-parser';

import {
  detectCfdiVersion,
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
