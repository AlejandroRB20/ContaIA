import { buildDeterministicJobId } from './job-id.util';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_COMPANY_ID = '99999999-9999-9999-9999-999999999999';
const DOCUMENT_ID = '44444444-4444-4444-4444-444444444444';
const OTHER_DOCUMENT_ID = '55555555-5555-5555-5555-555555555555';
const TYPE = 'XML_EXTRACTION';
const OTHER_TYPE = 'OTHER_TYPE';

// Formato UUIDv5: version nibble '5', variant nibble en [8,9,a,b]
// (RFC 4122 §4.1.1/§4.1.3).
const UUID_V5_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('buildDeterministicJobId', () => {
  it('produce el mismo id para los mismos argumentos (determinismo)', () => {
    const first = buildDeterministicJobId(COMPANY_ID, DOCUMENT_ID, TYPE);
    const second = buildDeterministicJobId(COMPANY_ID, DOCUMENT_ID, TYPE);

    expect(first).toBe(second);
  });

  it('produce un UUID con formato v5 valido (version y variant correctos)', () => {
    const id = buildDeterministicJobId(COMPANY_ID, DOCUMENT_ID, TYPE);

    expect(id).toMatch(UUID_V5_PATTERN);
  });

  it('produce ids distintos para companyId distinto (aislamiento tenant)', () => {
    const id = buildDeterministicJobId(COMPANY_ID, DOCUMENT_ID, TYPE);
    const otherId = buildDeterministicJobId(OTHER_COMPANY_ID, DOCUMENT_ID, TYPE);

    expect(id).not.toBe(otherId);
  });

  it('produce ids distintos para documentId distinto', () => {
    const id = buildDeterministicJobId(COMPANY_ID, DOCUMENT_ID, TYPE);
    const otherId = buildDeterministicJobId(COMPANY_ID, OTHER_DOCUMENT_ID, TYPE);

    expect(id).not.toBe(otherId);
  });

  it('produce ids distintos para type distinto', () => {
    const id = buildDeterministicJobId(COMPANY_ID, DOCUMENT_ID, TYPE);
    const otherId = buildDeterministicJobId(COMPANY_ID, DOCUMENT_ID, OTHER_TYPE);

    expect(id).not.toBe(otherId);
  });

  it('no confunde entradas que serían ambiguas con concatenación simple', () => {
    const first = buildDeterministicJobId(COMPANY_ID, DOCUMENT_ID, 'AB:C');
    const second = buildDeterministicJobId(COMPANY_ID, DOCUMENT_ID, 'A:BC');

    expect(first).not.toBe(second);
  });

  it('normaliza UUIDs y el tipo para reintentos semánticamente iguales', () => {
    const canonical = buildDeterministicJobId(COMPANY_ID, DOCUMENT_ID, TYPE);
    const variant = buildDeterministicJobId(
      `  ${COMPANY_ID.toUpperCase()}  `,
      ` ${DOCUMENT_ID.toUpperCase()} `,
      ` ${TYPE.toLowerCase()} `,
    );

    expect(variant).toBe(canonical);
  });

  it('rechaza UUIDs inválidos en vez de generar una clave de idempotencia inesperada', () => {
    expect(() => buildDeterministicJobId('ab', DOCUMENT_ID, TYPE)).toThrow(TypeError);
    expect(() => buildDeterministicJobId(COMPANY_ID, 'bc', TYPE)).toThrow(TypeError);
  });

  // Valores de referencia calculados con la implementacion instalada y
  // verificados de forma independiente contra el paquete `uuid` (funcion
  // v5) durante el desarrollo de este bloque — fijan el algoritmo, no solo
  // su auto-consistencia.
  it('coincide con los valores de referencia conocidos (regresion del algoritmo)', () => {
    expect(buildDeterministicJobId(COMPANY_ID, DOCUMENT_ID, TYPE)).toBe(
      '7ed644cc-7d3b-5ace-ba50-686941f7c7f4',
    );
    expect(buildDeterministicJobId(OTHER_COMPANY_ID, DOCUMENT_ID, TYPE)).toBe(
      '7f2a222f-bcd0-53a5-aa5c-2c86b80462fa',
    );
    expect(buildDeterministicJobId(COMPANY_ID, OTHER_DOCUMENT_ID, TYPE)).toBe(
      '05b068c9-b096-58dd-89a7-c4419b117fa4',
    );
    expect(buildDeterministicJobId(COMPANY_ID, DOCUMENT_ID, OTHER_TYPE)).toBe(
      '08ce12fe-ed68-5693-b0ce-6c4feac8fbf3',
    );
  });
});
