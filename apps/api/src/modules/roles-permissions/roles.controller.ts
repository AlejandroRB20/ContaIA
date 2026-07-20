import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Company } from '../../common/decorators/company.decorator';
import { AuthenticationGuard } from '../../common/guards/authentication.guard';
import { CompanyGuard } from '../../common/guards/company.guard';
import type { RequestMembership } from '../../common/interfaces/request-context.interface';

import { RolesService } from './services/roles.service';

@ApiTags('roles')
@Controller({ version: '1' })
@UseGuards(AuthenticationGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('roles')
  @ApiOperation({ summary: 'Catalogo de los seis roles oficiales' })
  async listRoles() {
    return this.rolesService.listRoles();
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Catalogo de permisos granulares' })
  async listPermissions() {
    return this.rolesService.listPermissions();
  }

  @Get('companies/:companyId/my-permissions')
  @UseGuards(CompanyGuard)
  @ApiOperation({
    summary: 'Claves de permiso del Rol del usuario autenticado en esta empresa',
  })
  async listMyPermissions(
    @Company() company: RequestMembership,
  ): Promise<{ permissions: string[] }> {
    const permissions = await this.rolesService.getPermissionKeysForRole(company.roleId);
    return { permissions };
  }
}
