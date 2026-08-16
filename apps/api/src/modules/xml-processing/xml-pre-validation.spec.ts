import { preValidateXmlBuffer, type XmlSecurityLimits } from './xml-pre-validation';
import { XmlPreValidationError, type XmlPreValidationErrorCode } from './xml-pre-validation.errors';

/** Límite holgado por defecto: ninguna prueba salvo las de tamaño depende de él. */
const LIMITES: XmlSecurityLimits = { maxFileSizeBytes: 10_485_760 };

/**
 * Datos fiscales sintéticos incrustados en los fixtures para comprobar que
 * jamás aparecen en el mensaje de un error (BR-SEC-003). No son reales.
 */
const RFC_FICTICIO = 'XAXX010101000';
const UUID_FICTICIO = '11111111-2222-3333-4444-555555555555';

const CFDI_VALIDO =
  `<?xml version="1.0" encoding="UTF-8"?>` +
  `<cfdi:Comprobante Total="1160.00">` +
  `<cfdi:Emisor Rfc="${RFC_FICTICIO}"/>` +
  `<cfdi:Complemento><tfd:TimbreFiscalDigital UUID="${UUID_FICTICIO}"/></cfdi:Complemento>` +
  `</cfdi:Comprobante>`;

const utf8 = (texto: string): Buffer => Buffer.from(texto, 'utf8');

const conBom = (texto: string): Buffer =>
  Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), utf8(texto)]);

/**
 * Ejecuta `fn` y devuelve el `XmlPreValidationError` lanzado. Falla la prueba
 * si no se lanza ninguno o si el error es de otro tipo — así una prueba nunca
 * "pasa" porque se lanzó un error distinto del esperado.
 */
function capturar(fn: () => unknown): XmlPreValidationError {
  try {
    fn();
  } catch (error) {
    if (error instanceof XmlPreValidationError) {
      return error;
    }

    throw error;
  }

  throw new Error('Se esperaba un XmlPreValidationError y no se lanzó ninguno.');
}

/**
 * Aserción compartida por todos los casos inválidos: el error es de la clase
 * esperada, su `code` es exacto, y su mensaje no filtra ni marcado XML ni
 * datos fiscales.
 */
function esperarRechazo(buffer: Buffer, code: XmlPreValidationErrorCode): void {
  const error = capturar(() => preValidateXmlBuffer(buffer, LIMITES));

  expect(error).toBeInstanceOf(XmlPreValidationError);
  expect(error.name).toBe('XmlPreValidationError');
  expect(error.code).toBe(code);
  expect(error.message).not.toContain('<');
  expect(error.message).not.toContain(RFC_FICTICIO);
  expect(error.message).not.toContain(UUID_FICTICIO);
}

describe('preValidateXmlBuffer — precondiciones de programación', () => {
  it('lanza TypeError si la entrada no es un Buffer', () => {
    expect(() => preValidateXmlBuffer('<r/>' as unknown as Buffer, LIMITES)).toThrow(TypeError);
  });

  it.each([
    ['cero', 0],
    ['negativo', -1],
    ['decimal', 1024.5],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('lanza RangeError si maxFileSizeBytes es %s', (_caso, maxFileSizeBytes) => {
    expect(() => preValidateXmlBuffer(utf8(CFDI_VALIDO), { maxFileSizeBytes })).toThrow(RangeError);
  });

  it('no clasifica un límite inválido como error de documento', () => {
    expect(() =>
      preValidateXmlBuffer(utf8(CFDI_VALIDO), { maxFileSizeBytes: Number.NaN }),
    ).not.toThrow(XmlPreValidationError);
  });
});

describe('preValidateXmlBuffer — documentos válidos', () => {
  it('acepta UTF-8 sin BOM', () => {
    const resultado = preValidateXmlBuffer(utf8(CFDI_VALIDO), LIMITES);

    expect(resultado.xmlText).toBe(CFDI_VALIDO);
    expect(resultado.hadUtf8Bom).toBe(false);
  });

  it('acepta UTF-8 con BOM, lo normaliza y lo reporta', () => {
    const buffer = conBom(CFDI_VALIDO);
    const resultado = preValidateXmlBuffer(buffer, LIMITES);

    expect(resultado.hadUtf8Bom).toBe(true);
    expect(resultado.xmlText).toBe(CFDI_VALIDO);
    expect(resultado.xmlText.startsWith('﻿')).toBe(false);
    expect(resultado.byteLength).toBe(buffer.byteLength);
  });

  it('acepta un documento sin declaración de encoding', () => {
    const xml = '<?xml version="1.0"?><r/>';

    expect(preValidateXmlBuffer(utf8(xml), LIMITES).xmlText).toBe(xml);
  });

  it('acepta encoding="UTF-8" con comillas dobles', () => {
    expect(() =>
      preValidateXmlBuffer(utf8('<?xml version="1.0" encoding="UTF-8"?><r/>'), LIMITES),
    ).not.toThrow();
  });

  it("acepta encoding='utf-8' con comillas simples y casing distinto", () => {
    expect(() =>
      preValidateXmlBuffer(utf8("<?xml version='1.0' encoding='utf-8'?><r/>"), LIMITES),
    ).not.toThrow();
  });

  it('acepta whitespace antes del prólogo', () => {
    expect(() =>
      preValidateXmlBuffer(utf8('  \n\t<?xml version="1.0"?><r/>'), LIMITES),
    ).not.toThrow();
  });

  it('acepta un comentario antes de la raíz sin confundirlo con una declaración', () => {
    expect(() =>
      preValidateXmlBuffer(utf8('<?xml version="1.0"?><!-- comentario --><r/>'), LIMITES),
    ).not.toThrow();
  });

  it('acepta acentos y ñ en UTF-8 multibyte', () => {
    const xml = '<r><n>Añón Gutiérrez Muñoz</n></r>';

    expect(preValidateXmlBuffer(utf8(xml), LIMITES).xmlText).toBe(xml);
  });

  it('acepta las referencias de entidad predefinidas', () => {
    const xml = '<r>&amp;&lt;&gt;&quot;&apos;</r>';

    expect(preValidateXmlBuffer(utf8(xml), LIMITES).xmlText).toBe(xml);
  });

  it('acepta referencias numéricas decimales y hexadecimales', () => {
    const xml = '<r>&#38;&#x26;</r>';

    expect(preValidateXmlBuffer(utf8(xml), LIMITES).xmlText).toBe(xml);
  });

  it('acepta un documento de tamaño exactamente igual al límite (límite inclusivo)', () => {
    const buffer = utf8(CFDI_VALIDO);

    expect(() =>
      preValidateXmlBuffer(buffer, { maxFileSizeBytes: buffer.byteLength }),
    ).not.toThrow();
  });

  it('devuelve exactamente la misma referencia del Buffer original', () => {
    const buffer = conBom(CFDI_VALIDO);

    expect(preValidateXmlBuffer(buffer, LIMITES).originalBuffer).toBe(buffer);
  });

  it('no muta el Buffer recibido ni siquiera al retirar el BOM', () => {
    const buffer = conBom(CFDI_VALIDO);
    const copia = Buffer.from(buffer);

    preValidateXmlBuffer(buffer, LIMITES);

    expect(buffer.equals(copia)).toBe(true);
  });

  it('reporta byteLength del Buffer original, con BOM incluido', () => {
    const sinBom = utf8(CFDI_VALIDO);
    const resultado = preValidateXmlBuffer(conBom(CFDI_VALIDO), LIMITES);

    expect(resultado.byteLength).toBe(sinBom.byteLength + 3);
  });
});

describe('preValidateXmlBuffer — tamaño', () => {
  it('rechaza un Buffer vacío', () => {
    esperarRechazo(Buffer.alloc(0), 'XML_EMPTY');
  });

  it('rechaza un documento de tamaño límite + 1', () => {
    const buffer = utf8(CFDI_VALIDO);
    const error = capturar(() =>
      preValidateXmlBuffer(buffer, { maxFileSizeBytes: buffer.byteLength - 1 }),
    );

    expect(error.code).toBe('XML_TOO_LARGE');
  });
});

describe('preValidateXmlBuffer — BOM y encoding', () => {
  it.each([
    ['UTF-16 LE', [0xff, 0xfe]],
    ['UTF-16 BE', [0xfe, 0xff]],
    ['UTF-32 LE', [0xff, 0xfe, 0x00, 0x00]],
    ['UTF-32 BE', [0x00, 0x00, 0xfe, 0xff]],
  ])('rechaza un BOM %s', (_caso, bom) => {
    esperarRechazo(Buffer.concat([Buffer.from(bom), utf8('<r/>')]), 'XML_ENCODING_UNSUPPORTED');
  });

  it('rechaza UTF-16 LE sin BOM por sus bytes NUL intercalados', () => {
    // Sin este control el documento pasaría: U+0000 es UTF-8 válido, así que
    // un decodificador estricto no lo rechaza.
    esperarRechazo(Buffer.from('<?xml version="1.0"?><r/>', 'utf16le'), 'XML_INVALID_BYTES');
  });

  it('rechaza un byte NUL embebido', () => {
    esperarRechazo(
      Buffer.concat([utf8('<r>'), Buffer.from([0x00]), utf8('</r>')]),
      'XML_INVALID_BYTES',
    );
  });

  it('rechaza una secuencia UTF-8 malformada', () => {
    esperarRechazo(
      Buffer.from([0x3c, 0x72, 0x3e, 0xc3, 0x28, 0x3c, 0x2f, 0x72, 0x3e]),
      'XML_INVALID_BYTES',
    );
  });

  it.each([['UTF-16'], ['ISO-8859-1'], ['windows-1252']])(
    'rechaza el encoding declarado %s',
    (encoding) => {
      esperarRechazo(
        utf8(`<?xml version="1.0" encoding="${encoding}"?><r/>`),
        'XML_ENCODING_UNSUPPORTED',
      );
    },
  );

  it('no interpreta un encoding= fuera del prólogo como declaración', () => {
    expect(() =>
      preValidateXmlBuffer(utf8('<?xml version="1.0"?><r encoding="UTF-16"/>'), LIMITES),
    ).not.toThrow();
  });
});

describe('preValidateXmlBuffer — formato mínimo', () => {
  it.each([
    ['JSON', '{"total":1160.00}'],
    ['texto plano', 'esto no es un documento xml'],
    ['PDF', '%PDF-1.7 objeto'],
    ['solo whitespace', '   \n\t  '],
  ])('rechaza %s', (_caso, contenido) => {
    esperarRechazo(utf8(contenido), 'XML_FORMAT_INVALID');
  });

  it('rechaza una firma ZIP', () => {
    esperarRechazo(
      Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), utf8('datos')]),
      'XML_FORMAT_INVALID',
    );
  });

  it('rechaza un Buffer que solo contiene el BOM UTF-8, sin clasificarlo como vacío', () => {
    // El Buffer original no está vacío: `XML_EMPTY` sería incorrecto.
    esperarRechazo(Buffer.from([0xef, 0xbb, 0xbf]), 'XML_FORMAT_INVALID');
  });
});

describe('preValidateXmlBuffer — DOCTYPE (fail-closed)', () => {
  it.each([
    ['simple', '<!DOCTYPE r><r/>'],
    ['con DTD interna', '<!DOCTYPE r [<!ELEMENT r EMPTY>]><r/>'],
    ['SYSTEM', '<!DOCTYPE r SYSTEM "http://ejemplo.invalido/r.dtd"><r/>'],
    ['PUBLIC', '<!DOCTYPE r PUBLIC "-//X//DTD//ES" "r.dtd"><r/>'],
    ['casing mixto', '<!DocTyPe r><r/>'],
    ['minúsculas', '<!doctype r><r/>'],
    ['con espacio tras <!', '<!   DOCTYPE r><r/>'],
    ['con tabulador tras <!', '<!\tDOCTYPE r><r/>'],
    ['con salto de línea tras <!', '<!\nDOCTYPE r><r/>'],
  ])('rechaza DOCTYPE %s', (_caso, xml) => {
    esperarRechazo(utf8(xml), 'XML_DOCTYPE_FORBIDDEN');
  });

  it('rechaza DOCTYPE dentro de un comentario', () => {
    esperarRechazo(utf8('<r><!-- <!DOCTYPE x> --></r>'), 'XML_DOCTYPE_FORBIDDEN');
  });

  it('rechaza DOCTYPE dentro de una sección CDATA', () => {
    esperarRechazo(utf8('<r><![CDATA[<!DOCTYPE x>]]></r>'), 'XML_DOCTYPE_FORBIDDEN');
  });

  it('rechaza Billion Laughs por su DOCTYPE, sin expandir ninguna entidad', () => {
    const billionLaughs =
      '<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY lol "lol">' +
      '<!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">' +
      '<!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">' +
      ']><lolz>&lol3;</lolz>';

    esperarRechazo(utf8(billionLaughs), 'XML_DOCTYPE_FORBIDDEN');
  });
});

describe('preValidateXmlBuffer — declaraciones ENTITY (fail-closed)', () => {
  it.each([
    ['interna', '<?xml version="1.0"?><!ENTITY x "y"><r/>'],
    ['externa SYSTEM', '<?xml version="1.0"?><!ENTITY ext SYSTEM "file:///etc/passwd"><r/>'],
    [
      'externa PUBLIC',
      '<?xml version="1.0"?><!ENTITY ext PUBLIC "-//X//EN" "http://x.invalido/e"><r/>',
    ],
    ['paramétrica', '<?xml version="1.0"?><!ENTITY % p "valor"><r/>'],
    ['casing mixto', '<?xml version="1.0"?><!EnTiTy x "y"><r/>'],
    ['con espacio tras <!', '<?xml version="1.0"?><!  ENTITY x "y"><r/>'],
    ['con salto de línea tras <!', '<?xml version="1.0"?><!\nENTITY x "y"><r/>'],
  ])('rechaza una declaración ENTITY %s', (_caso, xml) => {
    esperarRechazo(utf8(xml), 'XML_ENTITY_DECLARATION_FORBIDDEN');
  });

  it('rechaza ENTITY dentro de un comentario', () => {
    esperarRechazo(utf8('<r><!-- <!ENTITY x "y"> --></r>'), 'XML_ENTITY_DECLARATION_FORBIDDEN');
  });

  it('rechaza ENTITY dentro de una sección CDATA', () => {
    esperarRechazo(utf8('<r><![CDATA[<!ENTITY x "y">]]></r>'), 'XML_ENTITY_DECLARATION_FORBIDDEN');
  });
});

describe('preValidateXmlBuffer — precedencia determinista', () => {
  it('reporta DOCTYPE cuando el documento contiene DOCTYPE y ENTITY', () => {
    esperarRechazo(utf8('<!DOCTYPE r [<!ENTITY x "y">]><r/>'), 'XML_DOCTYPE_FORBIDDEN');
  });

  it('reporta el BOM no soportado antes que el DOCTYPE que lo sigue', () => {
    esperarRechazo(
      Buffer.concat([Buffer.from([0xfe, 0xff]), utf8('<!DOCTYPE r><r/>')]),
      'XML_ENCODING_UNSUPPORTED',
    );
  });

  it('reporta el tamaño antes que cualquier control de contenido', () => {
    const buffer = utf8('<!DOCTYPE r><r/>');
    const error = capturar(() => preValidateXmlBuffer(buffer, { maxFileSizeBytes: 1 }));

    expect(error.code).toBe('XML_TOO_LARGE');
  });
});
