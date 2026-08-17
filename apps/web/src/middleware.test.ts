import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { middleware } from './middleware';

const SESSION_COOKIE = 'contaia_access_token';

function requestFor(pathname: string, withSession = false): NextRequest {
  const headers = withSession ? { cookie: `${SESSION_COOKIE}=token-value` } : undefined;
  return new NextRequest(new URL(pathname, 'http://localhost:3000'), { headers });
}

function isRedirect(response: Response): boolean {
  return response.headers.has('location');
}

describe('middleware', () => {
  it('permite /demo como ruta publica sin cookie de sesion', () => {
    const response = middleware(requestFor('/demo'));
    expect(isRedirect(response)).toBe(false);
  });

  it('permite subrutas de /demo como publicas sin cookie de sesion', () => {
    const response = middleware(requestFor('/demo/lo-que-sea'));
    expect(isRedirect(response)).toBe(false);
  });

  it('NO trata /demo-private como publica solo por compartir el prefijo /demo', () => {
    const response = middleware(requestFor('/demo-private'));
    expect(isRedirect(response)).toBe(true);
    expect(response.headers.get('location')).toContain('/acceso/iniciar-sesion');
  });

  it('redirige a login una ruta protegida real sin cookie de sesion', () => {
    const response = middleware(requestFor('/acme/inicio'));
    expect(isRedirect(response)).toBe(true);
    expect(response.headers.get('location')).toContain('/acceso/iniciar-sesion');
    expect(response.headers.get('location')).toContain('next=%2Facme%2Finicio');
  });

  it('deja pasar una ruta protegida cuando existe cookie de sesion', () => {
    const response = middleware(requestFor('/acme/inicio', true));
    expect(isRedirect(response)).toBe(false);
  });
});
