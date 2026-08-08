import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { RolesRepository } from '../../modules/roles-permissions/repositories/roles.repository';
import { PERMISSIONS_METADATA_KEY } from '../decorators/permissions.decorator';
import { InsufficientPermissionException } from '../exceptions/auth.exceptions';

/**
 * Autorizacion granular por Permission (EWO-002: "No hardcodear permisos").
 * Las claves de permiso de un Rol se resuelven siempre contra el catalogo
 * Role/Permission/RolePermission — nunca una lista fija en el codigo.
 *
 * D-010 — opera exclusivamente sobre el contexto empresarial ya resuelto
 * (`request.membership`). Sin bypass por `isPlatformAdmin`: en toda ruta
 * company-scoped, `CompanyGuard` ya deniega antes de llegar aqui a un
 * Administrador de plataforma sin Membership (fail-closed en el punto
 * central) — este guard no necesita, ni debe, repetir esa decision con un
 * criterio distinto.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rolesRepository: RolesRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[] | undefined>(
      PERMISSIONS_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    if (!request.membership) {
      throw new InsufficientPermissionException();
    }

    const grantedKeys = await this.rolesRepository.findPermissionKeysForRole(
      request.membership.roleId,
    );
    const grantedSet = new Set(grantedKeys);
    const hasAll = requiredPermissions.every((key) => grantedSet.has(key));

    if (!hasAll) {
      throw new InsufficientPermissionException();
    }

    return true;
  }
}
