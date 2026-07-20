import { ForbiddenException } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { CSRF_TOKEN_COOKIE, CSRF_TOKEN_HEADER } from './cookie.constants';
import { timingSafeEqualHex } from './token.util';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Rutas que establecen una sesion nueva (o preceden a que exista una) —
 * todavia no hay cookie CSRF que validar en ellas (EWO-002, seccion
 * Seguridad: "CSRF token en mutaciones desde cookie de sesion").
 */
const CSRF_EXEMPT_SUFFIXES = [
  '/auth/register',
  '/auth/login',
  '/auth/mfa/verify',
  '/auth/mfa/recovery-codes/verify',
  '/auth/mfa/enrollment/setup',
  '/auth/mfa/enrollment/enable',
  '/auth/verify-email',
  '/auth/verify-email/resend',
  '/auth/password-reset/request',
  '/auth/password-reset/confirm',
];

/**
 * CSRF de doble cookie: la cookie `contaia_csrf_token` (no HttpOnly, legible
 * por JS del mismo origen) debe coincidir con el encabezado `X-CSRF-Token`
 * en toda mutacion autenticada. Protege las cookies HttpOnly de sesion
 * (access/refresh token) contra solicitudes forzadas desde otro origen.
 */
export function csrfProtectionMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  if (CSRF_EXEMPT_SUFFIXES.some((suffix) => req.path.endsWith(suffix))) {
    next();
    return;
  }

  const cookieToken = req.cookies?.[CSRF_TOKEN_COOKIE] as string | undefined;
  const headerToken = req.header(CSRF_TOKEN_HEADER);

  if (!cookieToken || !headerToken || cookieToken.length !== headerToken.length) {
    throw new ForbiddenException('Token CSRF invalido o ausente.');
  }

  const isValid = timingSafeEqualHex(
    Buffer.from(cookieToken).toString('hex'),
    Buffer.from(headerToken).toString('hex'),
  );

  if (!isValid) {
    throw new ForbiddenException('Token CSRF invalido o ausente.');
  }

  next();
}
