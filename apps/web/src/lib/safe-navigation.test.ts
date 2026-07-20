import { describe, expect, it } from 'vitest';

import { safeInternalPath } from './safe-navigation';

describe('safeInternalPath', () => {
  it('acepta rutas internas, incluidas sus consultas', () => {
    expect(safeInternalPath('/empresa-1/inicio?tab=resumen')).toBe('/empresa-1/inicio?tab=resumen');
  });

  it.each([
    null,
    '',
    'https://example.com',
    '//example.com',
    '/\\example.com',
    'javascript:alert(1)',
  ])('usa la ruta de respaldo para destinos no confiables: %s', (destination) => {
    expect(safeInternalPath(destination)).toBe('/');
  });
});
