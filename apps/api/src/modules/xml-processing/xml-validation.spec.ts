import { readFileSync } from 'fs';
import { join } from 'path';

import { XMLParser, XMLValidator } from 'fast-xml-parser';

import { validateXml, type XmlValidationLimits, type ValidatedXml } from './xml-validation';
import { XmlValidationError, type XmlValidationErrorCode } from './xml-validation.errors';

/** Límites holgados por defecto: solo las pruebas de límites dependen de valores ajustados. */
const LIMITES: XmlValidationLimits = { maxDepth: 20, maxNodeCount: 500, maxAttributeCount: 500 };

/**
 * Datos fiscales sintéticos incrustados en un fixture, para comprobar que
 * jamás aparecen en el mensaje de un error. No son reales.
 */
const RFC_FICTICIO = 'XAXX010101000';

const CFDI_LIKE =
  `<?xml version="1.0" encoding="UTF-8"?>` +
  `<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" Total="1160.00">` +
  `<cfdi:Emisor Rfc="${RFC_FICTICIO}" Nombre="Emisor de Prueba"/>` +
  `<cfdi:Conceptos>` +
  `<cfdi:Concepto Descripcion="Concepto Uno" ClaveProdServ="01010101"/>` +
  `<cfdi:Concepto Descripcion="Concepto Dos" ClaveProdServ="01010101"/>` +
  `</cfdi:Conceptos>` +
  `</cfdi:Comprobante>`;

/** Construye una cadena de `n` tags anidados (el primero es la raíz). */
function anidar(n: number): string {
  let apertura = '';
  let cierre = '';
  for (let i = 0; i < n; i += 1) {
    apertura += `<t${i}>`;
    cierre = `</t${i}>${cierre}`;
  }
  return `${apertura}x${cierre}`;
}

/** Construye una raíz con `n` hijos hermanos directos (nodeCount total = n + 1). */
function conHijosHermanos(n: number): string {
  let hijos = '';
  for (let i = 0; i < n; i += 1) {
    hijos += `<h${i}/>`;
  }
  return `<raiz>${hijos}</raiz>`;
}

/** Construye una raíz con `n` atributos propios. */
function conAtributos(n: number): string {
  let atributos = '';
  for (let i = 0; i < n; i += 1) {
    atributos += ` a${i}="${i}"`;
  }
  return `<raiz${atributos}>x</raiz>`;
}

/**
 * Ejecuta `fn` y devuelve el `XmlValidationError` lanzado. Falla la prueba si
 * no se lanza ninguno o si el error es de otro tipo.
 */
function capturar(fn: () => unknown): XmlValidationError {
  try {
    fn();
  } catch (error) {
    if (error instanceof XmlValidationError) {
      return error;
    }

    throw error;
  }

  throw new Error('Se esperaba un XmlValidationError y no se lanzó ninguno.');
}

/**
 * Aserción compartida por los casos inválidos: el error es de la clase
 * esperada, su `code` es exacto, y su mensaje no filtra fragmentos del XML.
 */
function esperarRechazo(
  xmlText: string,
  limits: XmlValidationLimits,
  code: XmlValidationErrorCode,
): XmlValidationError {
  const error = capturar(() => validateXml(xmlText, limits));

  expect(error).toBeInstanceOf(XmlValidationError);
  expect(error.name).toBe('XmlValidationError');
  expect(error.code).toBe(code);
  expect(error.message).not.toContain('<');
  expect(error.message).not.toContain(RFC_FICTICIO);

  return error;
}

describe('validateXml — precondiciones de programación', () => {
  it('lanza TypeError si xmlText no es un string', () => {
    expect(() => validateXml(123 as unknown as string, LIMITES)).toThrow(TypeError);
  });

  it.each([
    ['cero', 0],
    ['negativo', -1],
    ['decimal', 3.5],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('lanza RangeError si maxDepth es %s', (_caso, maxDepth) => {
    expect(() => validateXml('<a/>', { ...LIMITES, maxDepth })).toThrow(RangeError);
  });

  it.each([
    ['cero', 0],
    ['negativo', -1],
    ['decimal', 3.5],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('lanza RangeError si maxNodeCount es %s', (_caso, maxNodeCount) => {
    expect(() => validateXml('<a/>', { ...LIMITES, maxNodeCount })).toThrow(RangeError);
  });

  it.each([
    ['cero', 0],
    ['negativo', -1],
    ['decimal', 3.5],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('lanza RangeError si maxAttributeCount es %s', (_caso, maxAttributeCount) => {
    expect(() => validateXml('<a/>', { ...LIMITES, maxAttributeCount })).toThrow(RangeError);
  });

  it('no clasifica un límite inválido como error de documento', () => {
    expect(() => validateXml('<a/>', { ...LIMITES, maxDepth: Number.NaN })).not.toThrow(
      XmlValidationError,
    );
  });
});

describe('validateXml — documentos válidos', () => {
  it('acepta un XML mínimo bien formado', () => {
    const resultado: ValidatedXml = validateXml('<a/>', LIMITES);
    expect(resultado.depth).toBe(1);
    expect(resultado.nodeCount).toBe(1);
    expect(resultado.attributeCount).toBe(0);
  });

  it('acepta un CFDI-like con namespaces y conserva el prefijo', () => {
    const resultado = validateXml(CFDI_LIKE, LIMITES);
    const raiz = (resultado.parsedXml as Array<Record<string, unknown>>).find(
      (entrada) => 'cfdi:Comprobante' in entrada,
    );
    expect(raiz).toBeDefined();
  });

  it('preserva los atributos, incluido el RFC, sin alterarlos', () => {
    const resultado = validateXml(CFDI_LIKE, LIMITES);
    const texto = JSON.stringify(resultado.parsedXml);
    expect(texto).toContain(RFC_FICTICIO);
  });

  it('mantiene los valores de atributo como string (parseAttributeValue: false)', () => {
    const resultado = validateXml('<a n="00123"/>', LIMITES);
    const raiz = (resultado.parsedXml as Array<Record<string, unknown>>)[0]!;
    const atributos = raiz[':@'] as Record<string, unknown>;
    expect(atributos['@_n']).toBe('00123');
  });

  it('mantiene los valores de texto como string (parseTagValue: false)', () => {
    const resultado = validateXml('<a>00123</a>', LIMITES);
    const raiz = (resultado.parsedXml as Array<Record<string, unknown>>)[0]!;
    const hijos = raiz['a'] as Array<Record<string, unknown>>;
    expect(hijos[0]!['#text']).toBe('00123');
  });

  it('preserva ceros a la izquierda en un atributo tipo folio', () => {
    const resultado = validateXml('<a folio="00042"/>', LIMITES);
    const raiz = (resultado.parsedXml as Array<Record<string, unknown>>)[0]!;
    const atributos = raiz[':@'] as Record<string, unknown>;
    expect(atributos['@_folio']).toBe('00042');
  });

  it('conserva el orden de elementos repetidos (preserveOrder)', () => {
    const resultado = validateXml('<a><c>1</c><c>2</c><c>3</c></a>', LIMITES);
    const raiz = (resultado.parsedXml as Array<Record<string, unknown>>)[0]!;
    const hijosA = raiz['a'] as Array<Record<string, unknown>>;
    const valores = hijosA.map(
      (hijo) => (hijo['c'] as Array<Record<string, unknown>>)[0]!['#text'],
    );
    expect(valores).toEqual(['1', '2', '3']);
  });

  it('acepta un tag autocerrado', () => {
    const resultado = validateXml('<a><b/></a>', LIMITES);
    expect(resultado.nodeCount).toBe(2);
    expect(resultado.depth).toBe(2);
  });

  it('ignora comentarios (commentPropName: false) — no cuentan como nodo', () => {
    const resultado = validateXml('<a><!--comentario--><b>1</b></a>', LIMITES);
    expect(resultado.nodeCount).toBe(2);
  });

  it('fusiona CDATA como texto (cdataPropName: false) — no cuenta como nodo', () => {
    const resultado = validateXml('<a><![CDATA[hola]]></a>', LIMITES);
    expect(resultado.nodeCount).toBe(1);
    const raiz = (resultado.parsedXml as Array<Record<string, unknown>>)[0]!;
    const hijos = raiz['a'] as Array<Record<string, unknown>>;
    expect(hijos[0]!['#text']).toBe('hola');
  });

  it('preserva un prefijo de namespace alternativo (removeNSPrefix: false)', () => {
    const resultado = validateXml('<ns2:raiz xmlns:ns2="urn:x"><ns2:hijo/></ns2:raiz>', LIMITES);
    const raiz = (resultado.parsedXml as Array<Record<string, unknown>>)[0]!;
    expect(raiz).toHaveProperty('ns2:raiz');
  });

  it('acepta una estructura moderada dentro de los límites', () => {
    const resultado = validateXml(conHijosHermanos(20), {
      maxDepth: 10,
      maxNodeCount: 50,
      maxAttributeCount: 50,
    });
    expect(resultado.nodeCount).toBe(21);
    expect(resultado.depth).toBe(2);
  });

  it('acepta profundidad exactamente igual al límite', () => {
    const resultado = validateXml(anidar(5), {
      maxDepth: 5,
      maxNodeCount: 50,
      maxAttributeCount: 50,
    });
    expect(resultado.depth).toBe(5);
  });

  it('acepta el número de nodos exactamente igual al límite', () => {
    // 1 raíz + 9 hermanos = 10 nodos.
    const resultado = validateXml(conHijosHermanos(9), {
      maxDepth: 10,
      maxNodeCount: 10,
      maxAttributeCount: 50,
    });
    expect(resultado.nodeCount).toBe(10);
  });

  it('acepta el número de atributos exactamente igual al límite', () => {
    const resultado = validateXml(conAtributos(10), {
      maxDepth: 10,
      maxNodeCount: 50,
      maxAttributeCount: 10,
    });
    expect(resultado.attributeCount).toBe(10);
  });
});

describe('validateXml — raíz y estructura básica', () => {
  it('la declaración <?xml ...?> no cuenta como una segunda raíz', () => {
    const resultado = validateXml('<?xml version="1.0" encoding="UTF-8"?><a>1</a>', LIMITES);
    expect(resultado.nodeCount).toBe(1);
  });
});

describe('validateXml — buena formación (hallazgo ALTO corregido)', () => {
  /**
   * Los cuatro primeros casos son exactamente los que la auditoría `FAILED`
   * de 2026-08-01 marcó como hallazgo `ALTO`: `XMLParser.parse()` de un solo
   * argumento los aceptaba en silencio, permitiendo que un CFDI truncado o
   * con contenido descartado avanzara al extractor (violación de
   * BR-XML-001). La barrera sintáctica previa (`XMLValidator.validate()`,
   * fase 1) los rechaza ahora. Verificado empíricamente antes de escribir
   * estas pruebas — no se asumió el comportamiento.
   */
  it.each([
    ['tag sin cerrar', '<a><b>texto'],
    ['tags mal anidados', '<a><b></a></b>'],
    ['XML truncado (falta el cierre de la raíz)', '<a><b>texto</b>'],
    ['texto significativo antes de la raíz', 'hola<a></a>'],
    ['texto significativo después de la raíz', '<a></a>hola'],
    ['atributo sin cerrar', '<a x="1></a>'],
    ['múltiples raíces', '<a></a><b></b>'],
    ['texto vacío', ''],
    ['solo whitespace', '   \n\t  '],
    ['texto plano sin ningún tag', 'contenido plano, no es xml en absoluto'],
  ])('rechaza %s con XML_SYNTAX_INVALID', (_caso, xmlText) => {
    esperarRechazo(xmlText, LIMITES, 'XML_SYNTAX_INVALID');
  });

  it('no descarta contenido en silencio: el texto fuera de la raíz ya no se pierde, se rechaza', () => {
    // Antes de la corrección, "hola" desaparecía del árbol sin error alguno.
    const error = capturar(() => validateXml('hola<a></a>', LIMITES));
    expect(error.code).toBe('XML_SYNTAX_INVALID');
    expect(error.message).not.toContain('hola');
  });
});

describe('validateXml — límites estructurales excedidos', () => {
  it('rechaza profundidad límite + 1 con XML_DEPTH_EXCEEDED', () => {
    esperarRechazo(
      anidar(6),
      { maxDepth: 5, maxNodeCount: 50, maxAttributeCount: 50 },
      'XML_DEPTH_EXCEEDED',
    );
  });

  it('rechaza nodos límite + 1 con XML_NODE_LIMIT_EXCEEDED', () => {
    // 1 raíz + 10 hermanos = 11 nodos, límite 10.
    esperarRechazo(
      conHijosHermanos(10),
      { maxDepth: 10, maxNodeCount: 10, maxAttributeCount: 50 },
      'XML_NODE_LIMIT_EXCEEDED',
    );
  });

  it('rechaza atributos límite + 1 con XML_ATTRIBUTE_LIMIT_EXCEEDED', () => {
    esperarRechazo(
      conAtributos(11),
      { maxDepth: 10, maxNodeCount: 50, maxAttributeCount: 10 },
      'XML_ATTRIBUTE_LIMIT_EXCEEDED',
    );
  });
});

describe('validateXml — propiedades peligrosas (prototype pollution)', () => {
  /**
   * Verificado empíricamente: `fast-xml-parser` rechaza estos tres nombres
   * como nombre de TAG de forma incondicional (no configurable). No hay
   * forma de desactivar este rechazo ni razón para intentarlo.
   */
  it.each(['__proto__', 'constructor', 'prototype'])(
    'rechaza "%s" como nombre de tag con XML_DANGEROUS_PROPERTY',
    (nombrePeligroso) => {
      esperarRechazo(
        `<${nombrePeligroso}>1</${nombrePeligroso}>`,
        LIMITES,
        'XML_DANGEROUS_PROPERTY',
      );
    },
  );

  /**
   * Verificado empíricamente: como nombre de ATRIBUTO, la librería no
   * rechaza ni renombra estos nombres — el prefijo `attributeNamePrefix`
   * (`@_`) ya transforma `__proto__` en la clave literal `@___proto__` y
   * `constructor` en `@_constructor`, ninguna de las cuales coincide con la
   * propiedad especial de JavaScript ni con un miembro heredado de
   * `Object.prototype`. No hay contaminación real posible por esta vía, así
   * que esta prueba documenta la ACEPTACIÓN real — no se inventa un
   * `XML_DANGEROUS_PROPERTY` que la librería no produce.
   */
  it.each(['__proto__', 'constructor', 'prototype'])(
    'acepta "%s" como nombre de ATRIBUTO — la librería lo neutraliza con el prefijo "@_", no lo rechaza',
    (nombrePeligroso) => {
      const resultado = validateXml(`<a ${nombrePeligroso}="1">x</a>`, LIMITES);
      const raiz = (resultado.parsedXml as Array<Record<string, unknown>>)[0]!;
      const atributos = raiz[':@'] as Record<string, unknown>;
      expect(atributos[`@_${nombrePeligroso}`]).toBe('1');
    },
  );

  it('renombra "toString" como nombre de tag con el prefijo por defecto, sin lanzar', () => {
    const resultado = validateXml('<toString>1</toString>', LIMITES);
    const raiz = (resultado.parsedXml as Array<Record<string, unknown>>)[0]!;
    expect(raiz).toHaveProperty('__toString');
  });

  it('el mensaje sanitizado de XML_DANGEROUS_PROPERTY nunca contiene el nombre reservado', () => {
    const error = esperarRechazo('<__proto__>1</__proto__>', LIMITES, 'XML_DANGEROUS_PROPERTY');
    expect(error.message).not.toContain('__proto__');
  });
});

describe('validateXml — sanitización de mensajes con contenido controlado', () => {
  it('el mensaje del validador, que incluye el nombre del tag, no llega al error final', () => {
    // Verificado empíricamente: para un tag sin cerrar, `XMLValidator` produce
    // `msg: "Invalid '[ \"SECRETO...\", \"b\"]' found."` — es decir, interpola
    // el nombre literal del tag, que es contenido controlado por quien sube el
    // archivo. El error sanitizado debe omitirlo por completo.
    const error = esperarRechazo(
      `<SECRETO_${RFC_FICTICIO}><b>texto`,
      LIMITES,
      'XML_SYNTAX_INVALID',
    );
    expect(error.message).not.toContain('SECRETO');
    expect(error.message).not.toContain(RFC_FICTICIO);
    expect(error.message).not.toContain('Invalid');
    expect(error.message).not.toContain('found');
  });

  it('el error final no expone línea ni columna del validador', () => {
    const error = esperarRechazo('<a x="1></a>', LIMITES, 'XML_SYNTAX_INVALID');
    expect(error.message).not.toMatch(/line|col|\d+:\d+/i);
    expect(error).not.toHaveProperty('line');
    expect(error).not.toHaveProperty('col');
  });
});

describe('validateXml — DOCTYPE/ENTITY pasado directamente (defensa en profundidad, sin duplicar T03)', () => {
  /**
   * `E5-S3-T03` ya rechaza fail-closed cualquier `<!DOCTYPE`/`<!ENTITY` en el
   * texto antes de que `E5-S3-T04` exista en el flujo real. Esta prueba
   * simula un bypass hipotético: verificado empíricamente que, con
   * `processEntities: false`, la librería NO lanza y NO expande la entidad
   * (permanece literal en el texto) — la ausencia de expansión, no un
   * rechazo explícito, es la defensa real de esta capa ante ese escenario.
   */
  it('no expande una entidad declarada en un DOCTYPE (processEntities: false)', () => {
    const resultado = validateXml('<!DOCTYPE a [<!ENTITY x "1">]><a>&x;</a>', LIMITES);
    const raiz = (resultado.parsedXml as Array<Record<string, unknown>>)[0]!;
    const hijos = raiz['a'] as Array<Record<string, unknown>>;
    expect(hijos[0]!['#text']).toBe('&x;');
  });
});

describe('validateXml — clasificación del throw nativo de maxNestedTags', () => {
  /**
   * Verificado empíricamente (ver exploración previa a la implementación):
   * con `maxNestedTags: N`, la librería acepta nativamente hasta `N + 1`
   * niveles y solo lanza en `N + 2`. Esta prueba usa una profundidad de
   * `maxDepth + 2` específicamente para que sea el `catch` nativo — no el
   * recorrido posterior — quien clasifique el error, ejercitando la rama de
   * `clasificarErrorNativo` para "Maximum nested tags exceeded".
   */
  it('clasifica el throw nativo de maxNestedTags como XML_DEPTH_EXCEEDED', () => {
    esperarRechazo(
      anidar(7),
      { maxDepth: 5, maxNodeCount: 50, maxAttributeCount: 50 },
      'XML_DEPTH_EXCEEDED',
    );
  });
});

describe('validateXml — guardas de tipos no reproducibles con fast-xml-parser real (parser mockeado)', () => {
  /**
   * Estas tres guardas defensivas existen porque `XMLParser.parse()` está
   * tipado `any` en `fast-xml-parser`, no porque la librería real produzca
   * estas formas — verificado empíricamente que no lo hace (siempre
   * objetos anidados en arrays). Se ejercitan aquí mockeando
   * `XMLParser.prototype.parse` para devolver una forma hipotética
   * malformada, únicamente para probar la robustez del propio código ante
   * un valor de retorno inesperado — no se afirma que la librería real
   * produzca esto.
   */
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rechaza con XML_STRUCTURE_INVALID si el parser devolviera algo que no es un array', () => {
    jest.spyOn(XMLParser.prototype, 'parse').mockReturnValueOnce({});
    esperarRechazo('<a/>', LIMITES, 'XML_STRUCTURE_INVALID');
  });

  it('descarta una entrada de nivel superior que no es un objeto (no cuenta como raíz)', () => {
    jest.spyOn(XMLParser.prototype, 'parse').mockReturnValueOnce(['texto-suelto', { a: [] }]);
    const resultado = validateXml('<a/>', LIMITES);
    expect(resultado.nodeCount).toBe(1);
  });

  it('descarta un hijo que no es un objeto durante el recorrido (no cuenta como nodo)', () => {
    jest.spyOn(XMLParser.prototype, 'parse').mockReturnValueOnce([{ a: [null] }]);
    const resultado = validateXml('<a/>', LIMITES);
    expect(resultado.nodeCount).toBe(1);
  });

  it('ignora una clave hija cuyo valor no es un array (no recorre ni cuenta)', () => {
    jest.spyOn(XMLParser.prototype, 'parse').mockReturnValueOnce([{ a: 'no-es-array' }]);
    const resultado = validateXml('<a/>', LIMITES);
    expect(resultado.nodeCount).toBe(1);
    expect(resultado.attributeCount).toBe(0);
  });

  /**
   * Defensa en profundidad tras la corrección del hallazgo `ALTO`: la barrera
   * sintáctica ya rechaza cero y múltiples raíces antes de llegar aquí, de
   * modo que esta comprobación posterior al parseo dejó de ser alcanzable con
   * entrada real. Se conserva —y se prueba mockeada— para que la invariante
   * de raíz única siga garantizada aunque la fase 1 cambiara o fallara.
   */
  it('mantiene la invariante de raíz única aunque la fase 1 dejara pasar múltiples raíces', () => {
    jest.spyOn(XMLParser.prototype, 'parse').mockReturnValueOnce([{ a: [] }, { b: [] }]);
    esperarRechazo('<a/>', LIMITES, 'XML_STRUCTURE_INVALID');
  });

  /**
   * Igual que arriba: con la barrera sintáctica delante, los errores de
   * sintaxis ya no llegan al `catch` del parseo, así que el caso por defecto
   * de `clasificarErrorNativo` dejó de ser alcanzable con entrada real. Se
   * conserva porque un error nativo no anticipado nunca debe propagarse crudo.
   */
  it('clasifica como XML_SYNTAX_INVALID cualquier error nativo no reconocido del parseo', () => {
    jest.spyOn(XMLParser.prototype, 'parse').mockImplementationOnce(() => {
      throw new Error('fallo interno inesperado con <fragmento controlado>');
    });

    const error = esperarRechazo('<a/>', LIMITES, 'XML_SYNTAX_INVALID');
    expect(error.message).not.toContain('fragmento controlado');
    expect(error.message).not.toContain('fallo interno');
  });
});

describe('validateXml — orden de las dos fases y número de invocaciones', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('la validación sintáctica ocurre ANTES del parseo', () => {
    const orden: string[] = [];
    jest.spyOn(XMLValidator, 'validate').mockImplementation(() => {
      orden.push('validate');
      return true;
    });
    jest.spyOn(XMLParser.prototype, 'parse').mockImplementation(() => {
      orden.push('parse');
      return [{ a: [] }];
    });

    validateXml('<a/>', LIMITES);

    expect(orden).toEqual(['validate', 'parse']);
  });

  it('XMLParser.parse NO se ejecuta si la validación sintáctica falla', () => {
    const espiaParse = jest.spyOn(XMLParser.prototype, 'parse');

    esperarRechazo('<a><b>texto', LIMITES, 'XML_SYNTAX_INVALID');

    expect(espiaParse).not.toHaveBeenCalled();
  });

  it('en un documento válido, validate y parse se invocan exactamente una vez cada uno', () => {
    const espiaValidate = jest.spyOn(XMLValidator, 'validate');
    const espiaParse = jest.spyOn(XMLParser.prototype, 'parse');

    validateXml(CFDI_LIKE, LIMITES);

    expect(espiaValidate).toHaveBeenCalledTimes(1);
    expect(espiaParse).toHaveBeenCalledTimes(1);
  });

  it('no se usa la sobrecarga deprecated parse(xml, validationOptions) — parse recibe un solo argumento', () => {
    const espiaParse = jest.spyOn(XMLParser.prototype, 'parse');

    validateXml(CFDI_LIKE, LIMITES);

    expect(espiaParse.mock.calls[0]).toHaveLength(1);
  });

  it('importa solo XMLParser y XMLValidator; nunca XMLBuilder ni fast-xml-validator', () => {
    const fuente = readFileSync(join(__dirname, 'xml-validation.ts'), 'utf8');

    const lineaImport = fuente
      .split('\n')
      .find((linea) => linea.startsWith('import') && linea.includes(`'fast-xml-parser'`));
    expect(lineaImport).toBe(`import { XMLParser, XMLValidator } from 'fast-xml-parser';`);

    // `fast-xml-validator` solo puede aparecer en prosa (la deuda declarada),
    // nunca como import ni como dependencia instalada.
    expect(fuente).not.toMatch(/^import[^\n]*fast-xml-validator/m);
    expect(fuente).not.toContain('XMLBuilder');

    const packageJson = readFileSync(join(__dirname, '../../../package.json'), 'utf8');
    expect(packageJson).not.toContain('fast-xml-validator');
  });
});
