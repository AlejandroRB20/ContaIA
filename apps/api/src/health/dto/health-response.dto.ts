import type {
  HealthCheckResult,
  HealthResponseData,
  ReadinessCheckResult,
  ReadinessResponseData,
  ServiceStatus,
  VersionResponseData,
} from '@contaia/types';
import { ApiProperty } from '@nestjs/swagger';

export class HealthCheckResultDto implements HealthCheckResult {
  @ApiProperty({ enum: ['ok', 'degraded', 'down'] })
  status!: ServiceStatus;

  @ApiProperty({ example: 'process' })
  service!: string;
}

export class HealthResponseDto implements HealthResponseData {
  @ApiProperty({ enum: ['ok', 'degraded', 'down'] })
  status!: ServiceStatus;

  @ApiProperty({ example: 42 })
  uptimeSeconds!: number;

  @ApiProperty({ type: [HealthCheckResultDto] })
  checks!: HealthCheckResultDto[];
}

export class ReadinessCheckResultDto extends HealthCheckResultDto implements ReadinessCheckResult {
  @ApiProperty({ example: true })
  critical!: boolean;
}

export class ReadinessResponseDto implements ReadinessResponseData {
  @ApiProperty({ enum: ['ok', 'degraded', 'down'] })
  status!: ServiceStatus;

  @ApiProperty({ type: [ReadinessCheckResultDto] })
  checks!: ReadinessCheckResultDto[];
}

export class VersionResponseDto implements VersionResponseData {
  @ApiProperty({ example: '0.1.0' })
  version!: string;

  @ApiProperty({ example: 'development' })
  environment!: string;

  @ApiProperty({ example: null, required: false, nullable: true })
  gitCommit?: string | null;
}
