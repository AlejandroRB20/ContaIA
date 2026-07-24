import { Injectable } from '@nestjs/common';

import { MembershipsRepository } from '../roles-permissions/repositories/memberships.repository';
import { RolesRepository } from '../roles-permissions/repositories/roles.repository';

import { DocumentNotFoundException } from './documents.errors';

/**
 * Autorizacion para rutas planas de Documents (sin `companyId` en el path,
 * ej. `GET /documents/{documentId}`) donde `CompanyGuard` no puede
 * aplicarse — depende de `request.params.companyId`, inexistente en esas
 * rutas. Replica el criterio efectivo de `CompanyGuard` + `PermissionGuard`
 * combinados (Membership activa + permiso en el Rol de esa Membership),
 * reutilizando los mismos repositorios globales que esos guards ya usan
 * (`MembershipsRepository`/`RolesRepository`, provistos por `CommonModule`
 * — ningun import de modulo nuevo requerido).
 *
 * Deliberadamente NO distingue Administrador de plataforma: sin Membership
 * propia en la Empresa del Documento, no hay acceso — mismo resultado neto
 * que en rutas company-scoped, donde `@Company()` bloquea a un
 * Administrador de plataforma sin Membership con 403
 * (`PlatformAdminWithoutSupportAccessException`, ver `company.decorator.ts`)
 * salvo el flujo de soporte (API-0053, no implementado). Aqui se devuelve
 * el mismo `DocumentNotFoundException` (404) uniforme que cualquier otro
 * actor sin acceso, en vez de un 403 especifico, para no filtrar la
 * existencia del Documento (Bloque B de EWO-005, seccion 15).
 */
@Injectable()
export class DocumentsAuthorizationService {
  constructor(
    private readonly membershipsRepository: MembershipsRepository,
    private readonly rolesRepository: RolesRepository,
  ) {}

  async assertHasPermission(
    actorUserId: string,
    companyId: string,
    permissionKey: string,
  ): Promise<void> {
    const membership = await this.membershipsRepository.findActiveByUserAndCompany(
      actorUserId,
      companyId,
    );

    if (!membership) {
      throw new DocumentNotFoundException();
    }

    const permissionKeys = await this.rolesRepository.findPermissionKeysForRole(membership.roleId);

    if (!permissionKeys.includes(permissionKey)) {
      throw new DocumentNotFoundException();
    }
  }
}
