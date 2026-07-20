import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import { MembershipsRepository } from '../../modules/roles-permissions/repositories/memberships.repository';
import { MembershipNotFoundException } from '../exceptions/auth.exceptions';

/**
 * Resuelve y valida la Membership del usuario autenticado contra el
 * `companyId` explicito de la ruta — nunca una "empresa activa" implicita
 * (docs/08_API_DESIGN.md seccion 5, docs/11_SECURITY_ARCHITECTURE.md
 * seccion 11, paso 3-4). Un Administrador de plataforma (`isPlatformAdmin`)
 * no requiere Membership — ve todas las Empresas (docs/04_BUSINESS_RULES.md
 * seccion 5.1: "Administrador | Las suyas (todas si es de plataforma)").
 */
@Injectable()
export class CompanyGuard implements CanActivate {
  constructor(private readonly membershipsRepository: MembershipsRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const companyId = request.params.companyId;

    if (!request.user) {
      throw new MembershipNotFoundException();
    }

    if (!companyId || typeof companyId !== 'string') {
      // Endpoint no aplica CompanyGuard sin :companyId en la ruta — error de
      // configuracion del controlador, no de autorizacion del usuario.
      throw new MembershipNotFoundException();
    }

    if (request.user.isPlatformAdmin) {
      return true;
    }

    const membership = await this.membershipsRepository.findActiveByUserAndCompany(
      request.user.id,
      companyId,
    );

    if (!membership) {
      throw new MembershipNotFoundException();
    }

    request.membership = {
      id: membership.id,
      companyId: membership.companyId,
      roleId: membership.roleId,
      roleName: membership.role.name,
      isOwner: membership.isOwner,
    };

    return true;
  }
}
