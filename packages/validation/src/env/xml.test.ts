import { describe, expect, it } from 'vitest';

import { xmlEnvSchema } from './xml';

describe('xmlEnvSchema', () => {
  it('aplica los defaults MVP de Addendum §10.3 cuando todo esta ausente', () => {
    expect(xmlEnvSchema.parse({})).toEqual({
      XML_MAX_FILE_SIZE_BYTES: 10485760,
      XML_MAX_DEPTH: 50,
      XML_MAX_NODE_COUNT: 100000,
      XML_MAX_ATTRIBUTE_COUNT: 50000,
    });
  });

  it('acepta un valor numerico dentro de rango', () => {
    expect(xmlEnvSchema.parse({ XML_MAX_DEPTH: '100' }).XML_MAX_DEPTH).toBe(100);
  });

  it.each([
    ['XML_MAX_FILE_SIZE_BYTES', '1023'],
    ['XML_MAX_FILE_SIZE_BYTES', '104857601'],
    ['XML_MAX_DEPTH', '4'],
    ['XML_MAX_DEPTH', '201'],
    ['XML_MAX_NODE_COUNT', '99'],
    ['XML_MAX_NODE_COUNT', '1000001'],
    ['XML_MAX_ATTRIBUTE_COUNT', '99'],
    ['XML_MAX_ATTRIBUTE_COUNT', '500001'],
  ])('%s fuera de rango (%s) falla el arranque (fail-fast)', (key, value) => {
    expect(() => xmlEnvSchema.parse({ [key]: value })).toThrow();
  });

  it.each([
    'XML_MAX_FILE_SIZE_BYTES',
    'XML_MAX_DEPTH',
    'XML_MAX_NODE_COUNT',
    'XML_MAX_ATTRIBUTE_COUNT',
  ])('%s no numerico falla el arranque', (key) => {
    expect(() => xmlEnvSchema.parse({ [key]: 'no-numero' })).toThrow();
  });

  it.each(['XML_MAX_DEPTH', 'XML_MAX_NODE_COUNT', 'XML_MAX_ATTRIBUTE_COUNT'])(
    '%s con decimal (no entero) falla el arranque',
    (key) => {
      expect(() => xmlEnvSchema.parse({ [key]: '10.5' })).toThrow();
    },
  );
});
