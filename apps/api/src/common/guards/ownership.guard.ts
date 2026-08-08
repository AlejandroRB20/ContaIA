import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import { InsufficientPermissionException } from '../exceptions/auth.exceptions';

/**
 * Exige `isOwner=true` en la Membership resuelta — reservado a operaciones
 * que dependen especificamente de quien es propietario (por ejemplo,
 * transferir propiedad), nunca usado para ampliar permisos tecnicos
 * generales (BR-PERM-003: el atributo propietario no otorga capacidad
 * tecnica adicional sobre las de cualquier Administrador).
 *
 * D-010 — sin bypass por `isPlatformAdmin`. Exige `request.membership`
 * (resuelto por `CompanyGuard`, que ya deniega antes de aqui a un
 * Administrador de plataforma sin Membership) con `isOwner=true`.
 */
@Injectable()
export class OwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (!request.membership?.isOwner) {
      throw new InsufficientPermissionException();
    }

    return true;
  }
}
