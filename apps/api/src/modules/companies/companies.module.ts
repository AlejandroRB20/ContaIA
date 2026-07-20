import { Module } from '@nestjs/common';

import { OrganizationsModule } from '../organizations/organizations.module';

import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { CompaniesRepository } from './repositories/companies.repository';

/**
 * EWO-002 dejo solo la resolucion minima de Company para
 * Membership/Invitation (`CompaniesRepository.findById`). EWO-003 agrega el
 * controller publico de CRUD (docs/08_API_DESIGN.md API-0011 a API-0014,
 * BR-EMP-001/003) — ver docs/engineering/EWO-003_COMPANY_REPORT.md.
 * `MembershipsRepository`/`RolesRepository`/`UsersRepository` llegan del
 * `CommonModule` global.
 */
@Module({
  imports: [OrganizationsModule],
  controllers: [CompaniesController],
  providers: [CompaniesService, CompaniesRepository],
  exports: [CompaniesRepository],
})
export class CompaniesModule {}
