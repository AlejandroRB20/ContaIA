import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticationGuard } from '../../common/guards/authentication.guard';
import type { RequestUser } from '../../common/interfaces/request-context.interface';

import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationsService } from './organizations.service';

/**
 * docs/08_API_DESIGN.md seccion 9.2 (API-0009/API-0010) — alcance minimo de
 * Organization (BR-ORG-001/002). Sin `companyId` en la ruta: la
 * autorizacion de `GET /organizations/:organizationId` no depende de
 * `CompanyGuard` (que resuelve Membership contra un `companyId`, no un
 * `organizationId`) — se valida dentro de `OrganizationsService`, mismo
 * patron que las rutas planas de `MembershipsController`.
 */
@ApiTags('organizations')
@Controller({ path: 'organizations', version: '1' })
@UseGuards(AuthenticationGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una Organización (BR-ORG-001)' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateOrganizationDto,
    @Req() req: Request,
  ) {
    return this.organizationsService.createOrganization(dto.name, user.id, this.buildContext(req));
  }

  @Get(':organizationId')
  @ApiOperation({ summary: 'Consultar una Organización y sus Companies accesibles (BR-ORG-002)' })
  async findOne(@CurrentUser() user: RequestUser, @Param('organizationId') organizationId: string) {
    return this.organizationsService.getOrganization(organizationId, user.id);
  }

  private buildContext(req: Request) {
    return {
      correlationId: req.correlationId,
      ipAddress: req.ip,
      deviceInfo: req.header('User-Agent'),
    };
  }
}
