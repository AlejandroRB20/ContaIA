import { Module } from '@nestjs/common';

import { AuditRepository } from './audit.repository';
import { AuditService } from './audit.service';

@Module({
  providers: [AuditService, AuditRepository],
})
export class AuditModule {}
