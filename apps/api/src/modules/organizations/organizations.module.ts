import { Module } from '@nestjs/common';

import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { OrganizationsRepository } from './repositories/organizations.repository';

/**
 * Alcance minimo de EWO-003 (BR-ORG-001/002) — ver
 * docs/engineering/EWO-003_COMPANY_REPORT.md para las decisiones de
 * alcance. `MembershipsRepository` llega del `CommonModule` global.
 */
@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrganizationsRepository],
  exports: [OrganizationsRepository],
})
export class OrganizationsModule {}
