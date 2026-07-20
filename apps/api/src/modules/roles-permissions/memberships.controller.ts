import { RoleName } from '@contaia/database';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { Company } from '../../common/decorators/company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticationGuard } from '../../common/guards/authentication.guard';
import { CompanyGuard } from '../../common/guards/company.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import type {
  RequestMembership,
  RequestUser,
} from '../../common/interfaces/request-context.interface';

import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateMembershipRoleDto } from './dto/update-membership-role.dto';
import { MembershipsService } from './services/memberships.service';

/**
 * `docs/08_API_DESIGN.md` seccion 9.1/9.3 — invitaciones y gestion de
 * Membership. Las rutas de invitacion son company-scoped (`CompanyGuard` +
 * `@Permissions('users.invite')`); las de mutar/revocar una Membership
 * concreta usan la forma plana `/memberships/{id}` del catalogo de
 * endpoints — la autorizacion (Administrador de esa empresa) se valida
 * dentro de `MembershipsService`, ya que el `companyId` no viaja en esa
 * ruta. `AuthenticationGuard` se aplica por ruta (no a nivel de clase)
 * porque el preview de invitacion (WF-0004) es publico — el invitado debe
 * poder ver Empresa/Rol/quien invita antes de registrarse o iniciar sesion.
 */
@ApiTags('memberships')
@Controller({ version: '1' })
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get('invitations/:token')
  @ApiOperation({ summary: 'Consultar una invitacion antes de aceptarla (publico)' })
  async previewInvitation(@Param('token') token: string) {
    return this.membershipsService.previewInvitation(token);
  }

  @Post('companies/:companyId/invitations')
  @UseGuards(AuthenticationGuard, CompanyGuard, PermissionGuard)
  @Permissions('users.invite')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Invitar un usuario a la empresa (BR-USR-001)' })
  async invite(
    @Company() company: RequestMembership,
    @CurrentUser() user: RequestUser,
    @Body() dto: InviteUserDto,
    @Req() req: Request,
  ): Promise<{ invited: true }> {
    await this.membershipsService.inviteUser(
      company.companyId,
      dto.email,
      dto.role,
      user.id,
      this.buildContext(req),
    );
    return { invited: true };
  }

  @Get('companies/:companyId/memberships')
  @UseGuards(AuthenticationGuard, CompanyGuard, RoleGuard)
  @Roles(RoleName.ADMINISTRADOR, RoleName.SUPERVISOR)
  @ApiOperation({ summary: 'Listar Membresías de la Empresa (API-0016)' })
  async listMembers(@Param('companyId') companyId: string) {
    return this.membershipsService.listMembersForCompany(companyId);
  }

  @Post('invitations/:token/accept')
  @UseGuards(AuthenticationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aceptar una invitacion' })
  async accept(
    @CurrentUser() user: RequestUser,
    @Param('token') token: string,
    @Req() req: Request,
  ): Promise<{ accepted: true }> {
    await this.membershipsService.acceptInvitation(token, user.id, this.buildContext(req));
    return { accepted: true };
  }

  @Post('invitations/:token/decline')
  @UseGuards(AuthenticationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rechazar una invitacion (WF-0004)' })
  async decline(
    @CurrentUser() user: RequestUser,
    @Param('token') token: string,
    @Req() req: Request,
  ): Promise<{ declined: true }> {
    await this.membershipsService.declineInvitation(token, user.id, this.buildContext(req));
    return { declined: true };
  }

  @Patch('memberships/:membershipId')
  @UseGuards(AuthenticationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cambiar el rol de una Membership (BR-PERM-002)' })
  async updateRole(
    @CurrentUser() user: RequestUser,
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdateMembershipRoleDto,
    @Headers('if-match') ifMatch: string | undefined,
    @Req() req: Request,
  ): Promise<{ updated: true }> {
    const expectedVersion = this.parseIfMatch(ifMatch);
    await this.membershipsService.updateRole(
      membershipId,
      dto.role,
      expectedVersion,
      user.id,
      this.buildContext(req),
    );
    return { updated: true };
  }

  @Delete('memberships/:membershipId')
  @UseGuards(AuthenticationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revocar una Membership' })
  async revoke(
    @CurrentUser() user: RequestUser,
    @Param('membershipId') membershipId: string,
    @Req() req: Request,
  ): Promise<{ revoked: true }> {
    await this.membershipsService.revoke(membershipId, user.id, this.buildContext(req));
    return { revoked: true };
  }

  private parseIfMatch(ifMatch: string | undefined): number {
    const parsed = Number(ifMatch);
    if (!ifMatch || Number.isNaN(parsed)) {
      throw new BadRequestException('Encabezado If-Match requerido con la version actual.');
    }
    return parsed;
  }

  private buildContext(req: Request) {
    return {
      correlationId: req.correlationId,
      ipAddress: req.ip,
      deviceInfo: req.header('User-Agent'),
    };
  }
}
