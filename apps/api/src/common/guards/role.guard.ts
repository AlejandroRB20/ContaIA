import type { RoleName } from '@contaia/database';
import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { ROLES_METADATA_KEY } from '../decorators/roles.decorator';
import { InsufficientPermissionException } from '../exceptions/auth.exceptions';

/**
 * Autorizacion por Rol (BR-ROL-001/003: "validacion de rol en el endpoint,
 * no solo ocultar el boton"). Denegar por defecto (BR-PERM-001): si el
 * controlador no declara `@Roles(...)`, este guard no restringe nada — la
 * ausencia de metadata no es un "permitir todo" implicito en otros guards.
 *
 * D-010 — sin bypass por `isPlatformAdmin`. Ninguna ruta company-scoped
 * actual aplica este guard fuera del contexto ya resuelto por `CompanyGuard`
 * (que deniega antes de llegar aqui a un Administrador de plataforma sin
 * Membership); un flujo genuinamente platform-scoped (sin `companyId` en la
 * ruta) nunca depende de `request.membership` y por tanto nunca pasa por
 * este guard con `@Roles(...)` declarado. Mantener el bypass aqui habria
 * sido exactamente el patron que D-010 prohibe: autorizacion company-scoped
 * derivada unicamente de `isPlatformAdmin`.
 */
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[] | undefined>(
      ROLES_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    if (!request.membership || !requiredRoles.includes(request.membership.roleName)) {
      throw new InsufficientPermissionException();
    }

    return true;
  }
}
