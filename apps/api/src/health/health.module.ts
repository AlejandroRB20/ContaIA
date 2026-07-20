import { Module } from '@nestjs/common';

import { RedisService } from '../redis/redis.service';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { VersionController } from './version.controller';

@Module({
  controllers: [HealthController, VersionController],
  providers: [HealthService, RedisService],
})
export class HealthModule {}
