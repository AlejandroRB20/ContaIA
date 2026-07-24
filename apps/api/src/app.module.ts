import type { ServerConfig } from '@contaia/config/server';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { CommonModule } from './common/common.module';
import { ConfigModule, SERVER_CONFIG } from './config/config.module';
import { HealthModule } from './health/health.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthenticationModule } from './modules/authentication/authentication.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { RolesPermissionsModule } from './modules/roles-permissions/roles-permissions.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule,
    CommonModule,
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRootAsync({
      inject: [SERVER_CONFIG],
      useFactory: (config: ServerConfig) => [
        {
          ttl: config.RATE_LIMIT_TTL_SECONDS * 1000,
          limit: config.RATE_LIMIT_MAX_REQUESTS,
        },
      ],
    }),
    HealthModule,
    OrganizationsModule,
    CompaniesModule,
    AuthenticationModule,
    UsersModule,
    RolesPermissionsModule,
    AuditModule,
    DocumentsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
