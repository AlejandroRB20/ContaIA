import {
  BadRequestException,
  Body,
  Controller,
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
import { AuthenticationGuard } from '../../common/guards/authentication.guard';
import { CompanyGuard } from '../../common/guards/company.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import type {
  RequestMembership,
  RequestUser,
} from '../../common/interfaces/request-context.interface';

import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UpdateFiscalProfileDto } from './dto/update-fiscal-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

/**
 * docs/08_API_DESIGN.md seccion 9.2 (API-0011 a API-0014). `POST /companies`
 * y `GET /companies` no llevan `companyId` en la ruta (no existe todavia
 * Membresia que resolver) — solo `AuthenticationGuard`. Las rutas
 * `:companyId` reusan el mismo trio de guards que el resto del backend
 * (`CompanyGuard` + `PermissionGuard`) contra los permisos ya sembrados
 * `company.read`/`company.update` (seed.ts) — nunca un `RoleGuard` ad-hoc,
 * para no hardcodear la regla de autorizacion (BR-EMP-003, BR-CFG-001) por
 * fuera del catalogo Role/Permission/RolePermission.
 */
@ApiTags('companies')
@Controller({ path: 'companies', version: '1' })
@UseGuards(AuthenticationGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una Empresa (BR-EMP-001)' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateCompanyDto,
    @Req() req: Request,
  ) {
    return this.companiesService.createCompany(user.id, dto, this.buildContext(req));
  }

  @Get()
  @ApiOperation({ summary: 'Listar las Empresas del usuario autenticado' })
  async findAllForUser(@CurrentUser() user: RequestUser) {
    return this.companiesService.listForUser(user.id);
  }

  @Get(':companyId')
  @UseGuards(CompanyGuard, PermissionGuard)
  @Permissions('company.read')
  @ApiOperation({ summary: 'Consultar datos generales de la Empresa' })
  async findOne(@Param('companyId') companyId: string, @Company() membership: RequestMembership) {
    const company = await this.companiesService.getCompany(companyId);
    return { ...company, role: membership.roleName, isOwner: membership.isOwner };
  }

  @Patch(':companyId')
  @UseGuards(CompanyGuard, PermissionGuard)
  @Permissions('company.update')
  @ApiOperation({
    summary: 'Actualizar datos generales de la Empresa (BR-EMP-003, BR-CFG-001/002)',
  })
  async update(
    @CurrentUser() user: RequestUser,
    @Company() membership: RequestMembership,
    @Param('companyId') companyId: string,
    @Body() dto: UpdateCompanyDto,
    @Headers('if-match') ifMatch: string | undefined,
    @Req() req: Request,
  ) {
    const expectedVersion = this.parseIfMatch(ifMatch);
    const updated = await this.companiesService.updateCompany(
      companyId,
      dto,
      expectedVersion,
      user.id,
      this.buildContext(req),
    );
    return { ...updated, role: membership.roleName, isOwner: membership.isOwner };
  }

  @Patch(':companyId/fiscal-profile')
  @UseGuards(CompanyGuard, PermissionGuard)
  @Permissions('company.fiscal.update')
  @ApiOperation({ summary: 'Actualizar el perfil fiscal de la Empresa (EWO-003 sección 5.7)' })
  async updateFiscalProfile(
    @CurrentUser() user: RequestUser,
    @Param('companyId') companyId: string,
    @Body() dto: UpdateFiscalProfileDto,
    @Headers('if-match') ifMatch: string | undefined,
    @Req() req: Request,
  ) {
    const expectedVersion = this.parseIfMatch(ifMatch);
    return this.companiesService.updateFiscalProfile(
      companyId,
      dto,
      expectedVersion,
      user.id,
      this.buildContext(req),
    );
  }

  @Patch(':companyId/address')
  @UseGuards(CompanyGuard, PermissionGuard)
  @Permissions('company.fiscal.update')
  @ApiOperation({ summary: 'Actualizar el domicilio fiscal de la Empresa (EWO-003 sección 5.7)' })
  async updateAddress(
    @CurrentUser() user: RequestUser,
    @Param('companyId') companyId: string,
    @Body() dto: UpdateAddressDto,
    @Headers('if-match') ifMatch: string | undefined,
    @Req() req: Request,
  ) {
    const expectedVersion = this.parseIfMatch(ifMatch);
    return this.companiesService.updateAddress(
      companyId,
      dto,
      expectedVersion,
      user.id,
      this.buildContext(req),
    );
  }

  @Patch(':companyId/settings')
  @UseGuards(CompanyGuard, PermissionGuard)
  @Permissions('company.settings.update')
  @ApiOperation({
    summary: 'Actualizar la configuración regional de la Empresa (EWO-003 sección 5.8)',
  })
  async updateSettings(
    @CurrentUser() user: RequestUser,
    @Param('companyId') companyId: string,
    @Body() dto: UpdateSettingsDto,
    @Headers('if-match') ifMatch: string | undefined,
    @Req() req: Request,
  ) {
    const expectedVersion = this.parseIfMatch(ifMatch);
    return this.companiesService.updateSettings(
      companyId,
      dto,
      expectedVersion,
      user.id,
      this.buildContext(req),
    );
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
