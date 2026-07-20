import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { VersionResponseDto } from './dto/health-response.dto';
import { HealthService } from './health.service';

/** GET /api/v1/version (docs/20_BACKEND_IMPLEMENTATION_PLAN.md seccion 5). */
@ApiTags('version')
@Controller('version')
export class VersionController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Version desplegada del backend y ambiente actual' })
  @ApiResponse({ status: 200, type: VersionResponseDto })
  getVersion(): ReturnType<HealthService['getVersion']> {
    return this.healthService.getVersion();
  }
}
