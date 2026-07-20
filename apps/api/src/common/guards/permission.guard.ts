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

    if (request.user?.isPlatformAdmin) {
      return true;
    }

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
