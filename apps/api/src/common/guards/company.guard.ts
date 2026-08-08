import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Request } from 'express';

import { MembershipsRepository } from '../../modules/roles-permissions/repositories/memberships.repository';
import { AUTH_EVENTS, PlatformAdminCompanyAccessDeniedEvent } from '../events/auth.events';
import { MembershipNotFoundException } from '../exceptions/auth.exceptions';

/**
 * Resuelve y valida la Membership del usuario autenticado contra el
 * `companyId` explicito de la ruta — nunca una "empresa activa" implicita
 * (docs/08_API_DESIGN.md seccion 5, docs/11_SECURITY_ARCHITECTURE.md
 * seccion 11, paso 3-4).
 *
 * D-010 — punto central fail-closed de autorizacion company-scoped.
 * `isPlatformAdmin` NO otorga bypass aqui: un Administrador de plataforma
 * sin Membership recibe exactamente el mismo 403 que cualquier otro usuario
 * sin Membership. Esto restringe (sin derogar) la lectura de D-002 — "ve
 * todas las Empresas (todas si es de plataforma)" describe visibilidad de
 * agregado de plataforma, nunca autorizacion de escritura/lectura sobre una
 * ruta company-scoped. La proteccion vive en este guard, no en que cada
 * controlador recuerde usar `@Company()` — ese decorador sigue existiendo
 * como defensa en profundidad (`company.decorator.ts`), pero un endpoint
 * nuevo que solo aplique `CompanyGuard` ya queda protegido sin depender de
 * el. La unica vía futura de acceso sin Membership es el contexto de
 * soporte JIT (API-0053, no implementado) — hasta entonces esta rama
 * siempre deniega.
 */
@Injectable()
export class CompanyGuard implements CanActivate {
  constructor(
    private readonly membershipsRepository: MembershipsRepository,
    private readonly events: EventEmitter2,
  ) {}

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

    const membership = await this.membershipsRepository.findActiveByUserAndCompany(
      request.user.id,
      companyId,
    );

    if (!membership) {
      if (request.user.isPlatformAdmin) {
        this.events.emit(
          AUTH_EVENTS.PLATFORM_ADMIN_COMPANY_ACCESS_DENIED,
          new PlatformAdminCompanyAccessDeniedEvent(request.user.id, companyId, {
            correlationId: request.correlationId,
            ipAddress: request.ip,
            deviceInfo: request.header('User-Agent'),
          }),
        );
      }
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
