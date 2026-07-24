import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

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

import { DocumentsService } from './documents.service';
import { DocumentDetailResponseDto } from './dto/document-detail-response.dto';
import { DocumentResponseDto } from './dto/document-response.dto';
import { ListDocumentsQueryDto } from './dto/list-documents-query.dto';
import { PaginatedDocumentsResponseDto } from './dto/paginated-documents-response.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';

/**
 * docs/08_API_DESIGN.md seccion 9.5 — Documents y CFDI. Bloque A: API-0023
 * (iniciar carga). Bloque B: API-0024 (listado, company-scoped) y API-0025
 * (consulta individual, ruta plana). Sin `@Controller({ path: 'companies' })`
 * ni guards a nivel de clase porque las rutas mezclan forma company-scoped
 * (`companies/:companyId/documents`) y forma plana (`documents/:documentId`,
 * sin companyId en el path, mismo patron de `MembershipsController` para
 * `/memberships/{id}`) — cada ruta declara su propia cadena de guards.
 */
@ApiTags('documents')
@Controller({ version: '1' })
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('companies/:companyId/documents')
  @UseGuards(AuthenticationGuard, CompanyGuard, PermissionGuard)
  @Permissions('document.upload')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Iniciar la carga de un Documento (BR-DOC-001, BR-DOC-002, API-0023)' })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Documento creado en PENDING_UPLOAD; URL prefirmada de carga generada.',
    type: DocumentResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Body invalido.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Sesion invalida o ausente.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sin Membership vigente en la Empresa o sin el permiso document.upload.',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'El almacenamiento de objetos no esta disponible.',
  })
  async initiateUpload(
    @Company() company: RequestMembership,
    @CurrentUser() user: RequestUser,
    @Body() dto: UploadDocumentDto,
  ): Promise<DocumentResponseDto> {
    const result = await this.documentsService.initiateUpload(company.companyId, user.id, dto);

    return {
      documentId: result.documentId,
      uploadUrl: result.uploadUrl,
      expiresAt: result.expiresAt,
      status: result.status,
    };
  }

  @Get('companies/:companyId/documents')
  @UseGuards(AuthenticationGuard, CompanyGuard, PermissionGuard)
  @Permissions('document.read')
  @ApiOperation({ summary: 'Listar Documentos de la Empresa, paginado (API-0024)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Listado paginado de Documentos de la Empresa.',
    type: PaginatedDocumentsResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Parametros de query invalidos.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Sesion invalida o ausente.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sin Membership vigente en la Empresa o sin el permiso document.read.',
  })
  async list(
    @Company() company: RequestMembership,
    @Query() query: ListDocumentsQueryDto,
  ): Promise<PaginatedDocumentsResponseDto> {
    return this.documentsService.listForCompany(company.companyId, query);
  }

  @Get('documents/:documentId')
  @UseGuards(AuthenticationGuard)
  @ApiOperation({
    summary: 'Consultar un Documento por id, tenant-safe (API-0025)',
    description:
      'Ruta plana (sin companyId en el path) — la autorizacion tenant y el permiso document.read se resuelven dentro del servicio, no via CompanyGuard.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Documento encontrado.',
    type: DocumentDetailResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Sesion invalida o ausente.' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description:
      'Documento inexistente o el actor no tiene Membership activa con document.read en su Empresa (mismo codigo en ambos casos, para no filtrar existencia).',
  })
  async getById(
    @Param('documentId') documentId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<DocumentDetailResponseDto> {
    return this.documentsService.getById(documentId, user.id);
  }
}
