import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import { InsufficientPermissionException } from '../exceptions/auth.exceptions';

/**
 * Exige `isOwner=true` en la Membership resuelta — reservado a operaciones
 * que dependen especificamente de quien es propietario (por ejemplo,
 * transferir propiedad), nunca usado para ampliar permisos tecnicos
 * generales (BR-PERM-003: el atributo propietario no otorga capacidad
 * tecnica adicional sobre las de cualquier Administrador).
 */
@Injectable()
export class OwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (request.user?.isPlatformAdmin) {
      return true;
    }

    if (!request.membership?.isOwner) {
      throw new InsufficientPermissionException();
    }

    return true;
  }
}
