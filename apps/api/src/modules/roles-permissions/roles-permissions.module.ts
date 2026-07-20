import { Module } from '@nestjs/common';

import { CompaniesModule } from '../companies/companies.module';

import { MembershipsController } from './memberships.controller';
import { InvitationsRepository } from './repositories/invitations.repository';
import { RolesController } from './roles.controller';
import { MembershipsService } from './services/memberships.service';
import { RolesService } from './services/roles.service';

/** `MembershipsRepository`/`RolesRepository`/`UsersRepository` llegan del `CommonModule` global. */
@Module({
  imports: [CompaniesModule],
  controllers: [MembershipsController, RolesController],
  providers: [MembershipsService, RolesService, InvitationsRepository],
  exports: [MembershipsService, RolesService],
})
export class RolesPermissionsModule {}
