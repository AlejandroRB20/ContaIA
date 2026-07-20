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
 * Un Administrador de plataforma (sin Membership de Empresa) satisface
 * cualquier verificacion de Rol, al operar en su propio plano de
 * autorizacion (docs/05_SYSTEM_DOMAIN_MODEL.md, contexto "Administration").
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

    if (request.user?.isPlatformAdmin) {
      return true;
    }

    if (!request.membership || !requiredRoles.includes(request.membership.roleName)) {
      throw new InsufficientPermissionException();
    }

    return true;
  }
}
