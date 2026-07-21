import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import { PlatformAdminWithoutSupportAccessException } from '../exceptions/auth.exceptions';
import type { RequestMembership } from '../interfaces/request-context.interface';

/**
 * Extrae la Membership de la solicitud o lanza 403 si no existe (escenario
 * de Administrador de plataforma sin flujo de soporte — BR-SEC-004).
 * Exportada para pruebas unitarias directas.
 */
export function extractMembership(request: Request): RequestMembership {
  if (!request.membership) {
    throw new PlatformAdminWithoutSupportAccessException();
  }

  return request.membership;
}

/**
 * Inyecta la Membership resuelta por `CompanyGuard` para la empresa de la
 * ruta. Si el usuario es Administrador de plataforma (sin Membership), lanza
 * 403 — el acceso a datos de empresa requiere el flujo de soporte auditado
 * (BR-SEC-004, BR-AUD-003, API-0053) que aun no esta implementado.
 */
export const Company = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestMembership => {
    return extractMembership(ctx.switchToHttp().getRequest<Request>());
  },
);
