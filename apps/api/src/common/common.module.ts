import type { ServerConfig } from '@contaia/config/server';
import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { SERVER_CONFIG } from '../config/config.module';
import { SessionsRepository } from '../modules/authentication/repositories/sessions.repository';
import { MembershipsRepository } from '../modules/roles-permissions/repositories/memberships.repository';
import { RolesRepository } from '../modules/roles-permissions/repositories/roles.repository';
import { UsersRepository } from '../modules/users/repositories/users.repository';

import { EMAIL_SENDER } from './email/email-sender.interface';
import { LoggingEmailSender } from './email/logging-email-sender';
import { AuthenticationGuard } from './guards/authentication.guard';
import { CompanyGuard } from './guards/company.guard';
import { OwnershipGuard } from './guards/ownership.guard';
import { PermissionGuard } from './guards/permission.guard';
import { RoleGuard } from './guards/role.guard';

/**
 * Modulo global (EWO-002): repositorios, guards y `EMAIL_SENDER` compartidos
 * por todos los modulos de dominio, para evitar dependencias circulares
 * entre Authentication <-> Roles & Permissions <-> Users al resolver las
 * clases usadas por `@UseGuards(...)`. Los repositorios no tienen
 * dependencias propias (usan el cliente Prisma singleton de
 * `@contaia/database` directamente) — proveerlos aqui una sola vez es
 * seguro y evita instancias duplicadas.
 *
 * `EMAIL_SENDER` se agrego aqui (en vez de solo en `AuthenticationModule`,
 * donde vivia originalmente) porque `MembershipsService` (en
 * `RolesPermissionsModule`, un modulo hermano que no importa
 * `AuthenticationModule`) tambien lo inyecta para las invitaciones — sin
 * esto, `Test.createTestingModule({ imports: [AppModule] })` (y el arranque
 * real del backend) fallaba con "Nest can't resolve dependencies of
 * MembershipsService... Symbol(EMAIL_SENDER)", detectado al corregir
 * `test:integration`.
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [SERVER_CONFIG],
      useFactory: (config: ServerConfig) => ({ secret: config.JWT_ACCESS_SECRET }),
    }),
  ],
  providers: [
    UsersRepository,
    SessionsRepository,
    MembershipsRepository,
    RolesRepository,
    AuthenticationGuard,
    CompanyGuard,
    RoleGuard,
    PermissionGuard,
    OwnershipGuard,
    { provide: EMAIL_SENDER, useClass: LoggingEmailSender },
  ],
  exports: [
    JwtModule,
    UsersRepository,
    SessionsRepository,
    MembershipsRepository,
    RolesRepository,
    AuthenticationGuard,
    CompanyGuard,
    RoleGuard,
    PermissionGuard,
    OwnershipGuard,
    EMAIL_SENDER,
  ],
})
export class CommonModule {}
