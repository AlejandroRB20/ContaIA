import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { HealthResponseDto, ReadinessResponseDto } from './dto/health-response.dto';
import { HealthService } from './health.service';

/**
 * GET /api/v1/health y GET /api/v1/health/readiness
 * (docs/20_BACKEND_IMPLEMENTATION_PLAN.md seccion 5).
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness: confirma que el proceso del backend esta vivo' })
  @ApiResponse({ status: 200, type: HealthResponseDto })
  getHealth(): ReturnType<HealthService['getHealth']> {
    return this.healthService.getHealth();
  }

  @Get('readiness')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Readiness: disponibilidad real de PostgreSQL (critica) y Redis (no critica)',
  })
  @ApiResponse({ status: 200, type: ReadinessResponseDto })
  getReadiness(): ReturnType<HealthService['getReadiness']> {
    return this.healthService.getReadiness();
  }
}
