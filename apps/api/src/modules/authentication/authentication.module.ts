import { Module } from '@nestjs/common';

import { AuthenticationController } from './authentication.controller';
import { AuthTokensRepository } from './repositories/auth-tokens.repository';
import { MfaRecoveryCodesRepository } from './repositories/mfa-recovery-codes.repository';
import { AuthService } from './services/auth.service';
import { MfaService } from './services/mfa.service';
import { TokenService } from './services/token.service';

/**
 * `UsersRepository`, `SessionsRepository`, `MembershipsRepository`,
 * `JwtService` y `EMAIL_SENDER` llegan del `CommonModule` global (evita el
 * ciclo Authentication <-> Roles & Permissions, y permite que
 * `RolesPermissionsModule` tambien inyecte `EMAIL_SENDER` sin importar este
 * modulo).
 */
@Module({
  controllers: [AuthenticationController],
  providers: [
    AuthService,
    MfaService,
    TokenService,
    AuthTokensRepository,
    MfaRecoveryCodesRepository,
  ],
  exports: [TokenService],
})
export class AuthenticationModule {}
