import type { NextFunction, Request } from 'express';

import { csrfProtectionMiddleware } from './csrf.middleware';

function buildRequest(path: string): Request {
  return {
    method: 'POST',
    path,
    cookies: {},
    header: jest.fn(),
  } as unknown as Request;
}

describe('csrfProtectionMiddleware', () => {
  it.each([
    '/api/v1/auth/mfa/recovery-codes/verify',
    '/api/v1/auth/mfa/enrollment/setup',
    '/api/v1/auth/mfa/enrollment/enable',
  ])('permite %s antes de que exista una cookie CSRF', (path) => {
    const next = jest.fn() as NextFunction;

    csrfProtectionMiddleware(buildRequest(path), {} as never, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('sigue exigiendo CSRF para mutaciones autenticadas', () => {
    const next = jest.fn() as NextFunction;

    expect(() =>
      csrfProtectionMiddleware(buildRequest('/api/v1/auth/logout'), {} as never, next),
    ).toThrow('Token CSRF invalido o ausente.');
    expect(next).not.toHaveBeenCalled();
  });
});
