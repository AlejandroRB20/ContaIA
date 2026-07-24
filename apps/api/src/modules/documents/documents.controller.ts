import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
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
import { DocumentResponseDto } from './dto/document-response.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';

/**
 * docs/08_API_DESIGN.md seccion 9.5 — Documents y CFDI. Bloque A de
 * EWO-005: unicamente API-0023 (iniciar carga). Rutas futuras de este
 * grupo (API-0024 a API-0028) mezclaran forma company-scoped y forma
 * plana `/documents/{documentId}` (sin companyId en el path, mismo patron
 * de `MembershipsController` para `/memberships/{id}`) — por eso no hay
 * `@Controller({ path: 'companies' })` a nivel de clase ni guards a nivel
 * de clase: cada ruta futura declarara su propia cadena de guards.
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
}
