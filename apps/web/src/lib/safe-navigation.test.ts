import { describe, expect, it } from 'vitest';

import { resolveDestination, safeInternalPath } from './safe-navigation';

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

describe('resolveDestination', () => {
  const memberships = [{ companyId: 'B' }];

  it('caso 1 — cambio manual sin next aterriza en el inicio de la Empresa elegida', () => {
    expect(resolveDestination(null, 'B', memberships)).toBe('/B/inicio');
  });

  it('caso 2 — conserva un deep link interno válido de la Empresa elegida', () => {
    expect(resolveDestination('/B/documentos/123', 'B', memberships)).toBe('/B/documentos/123');
  });

  it('caso 3 — descarta un deep link que pertenece a otra Empresa', () => {
    expect(resolveDestination('/A/documentos/123', 'B', memberships)).toBe('/B/inicio');
  });

  it('caso 4 — descarta una ruta externa', () => {
    expect(resolveDestination('https://google.com', 'B', memberships)).toBe('/B/inicio');
  });

  it('caso 5 — descarta una ruta inválida', () => {
    expect(resolveDestination('//evil.com', 'B', memberships)).toBe('/B/inicio');
  });

  it('caso 6 — descarta el destino si no existe Membership activa para la Empresa elegida', () => {
    expect(resolveDestination('/B/documentos/123', 'B', [])).toBe('/B/inicio');
  });
});
