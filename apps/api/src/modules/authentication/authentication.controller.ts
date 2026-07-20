import { loadServerConfig } from '@contaia/config/server';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticationGuard } from '../../common/guards/authentication.guard';
import type { RequestUser } from '../../common/interfaces/request-context.interface';
import { REFRESH_TOKEN_COOKIE } from '../../common/security/cookie.constants';

import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import {
  MfaChallengeVerifyDto,
  MfaDisableDto,
  MfaEnableDto,
  MfaEnrollmentEnableDto,
  MfaEnrollmentSetupDto,
  MfaRecoveryCodeLoginDto,
} from './dto/mfa.dto';
import { PasswordResetConfirmDto } from './dto/password-reset-confirm.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AuthService } from './services/auth.service';
import { MfaService } from './services/mfa.service';

const authRateLimitConfig = loadServerConfig();

/**
 * `/api/v1/auth/*` — grupo Identity de docs/08_API_DESIGN.md (seccion 9.1),
 * extendido con MFA/sesiones per EWO-002. Limite de tasa mas estricto que
 * el resto de la API (docs/08_API_DESIGN.md seccion 19: "Auth endpoints
 * subject to a stricter rate limit"), sobre el `ThrottlerGuard` global ya
 * registrado en `AppModule`.
 */
@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
@Throttle({
  default: {
    limit: authRateLimitConfig.AUTH_RATE_LIMIT_MAX_REQUESTS,
    ttl: authRateLimitConfig.AUTH_RATE_LIMIT_TTL_SECONDS * 1000,
  },
})
export class AuthenticationController {
  constructor(
    private readonly authService: AuthService,
    private readonly mfaService: MfaService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una cuenta de Usuario (BR-AUTH-001)' })
  async register(@Body() dto: RegisterDto, @Req() req: Request): Promise<{ registered: true }> {
    await this.authService.register(dto, this.buildContext(req));
    return { registered: true };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar correo (BR-AUTH-001)' })
  async verifyEmail(@Body() dto: VerifyEmailDto, @Req() req: Request): Promise<{ verified: true }> {
    await this.authService.verifyEmail(dto.token, this.buildContext(req));
    return { verified: true };
  }

  @Post('verify-email/resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reenviar verificacion de correo' })
  async resendVerification(@Body() dto: ResendVerificationDto): Promise<{ sent: true }> {
    await this.authService.resendVerification(dto.email);
    return { sent: true };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesion (BR-AUTH-002/003)' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(dto, this.buildContext(req), res);
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Completar login con TOTP (BR-AUTH-002)' })
  async verifyMfa(
    @Body() dto: MfaChallengeVerifyDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.completeMfaLogin(
      dto.mfaChallengeToken,
      dto.code,
      this.buildContext(req),
      res,
    );
  }

  @Post('mfa/recovery-codes/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Completar login con codigo de recuperacion MFA' })
  async verifyMfaRecoveryCode(
    @Body() dto: MfaRecoveryCodeLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.completeMfaLoginWithRecoveryCode(
      dto.mfaChallengeToken,
      dto.recoveryCode,
      this.buildContext(req),
      res,
    );
  }

  @Post('mfa/enrollment/setup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generar secreto TOTP + QR para enrolamiento forzoso (BR-AUTH-002, sin sesion)',
  })
  async setupMfaEnrollment(@Body() dto: MfaEnrollmentSetupDto) {
    return this.authService.beginMfaEnrollment(dto.mfaChallengeToken);
  }

  @Post('mfa/enrollment/enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirmar TOTP de enrolamiento forzoso y establecer la sesion (BR-AUTH-002)',
  })
  async enableMfaEnrollment(
    @Body() dto: MfaEnrollmentEnableDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.completeMfaEnrollment(
      dto.mfaChallengeToken,
      dto.code,
      this.buildContext(req),
      res,
    );
  }

  @Post('mfa/setup')
  @UseGuards(AuthenticationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generar secreto TOTP + QR (requiere sesion activa)' })
  async setupMfa(@CurrentUser() user: RequestUser) {
    return this.mfaService.beginSetup(user.id, user.email);
  }

  @Post('mfa/enable')
  @UseGuards(AuthenticationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar TOTP y activar MFA' })
  async enableMfa(
    @CurrentUser() user: RequestUser,
    @Body() dto: MfaEnableDto,
    @Req() req: Request,
  ) {
    const recoveryCodes = await this.mfaService.confirmSetupFromStoredSecret(
      user.id,
      dto.code,
      this.buildContext(req),
    );
    return { enabled: true, recoveryCodes };
  }

  @Post('mfa/disable')
  @UseGuards(AuthenticationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar MFA' })
  async disableMfa(
    @CurrentUser() user: RequestUser,
    @Body() dto: MfaDisableDto,
    @Req() req: Request,
  ) {
    await this.mfaService.disableWithPasswordConfirmation(
      user.id,
      dto.password,
      this.buildContext(req),
    );
    return { disabled: true };
  }

  @Post('mfa/recovery-codes/regenerate')
  @UseGuards(AuthenticationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerar codigos de recuperacion MFA' })
  async regenerateRecoveryCodes(@CurrentUser() user: RequestUser) {
    const recoveryCodes = await this.mfaService.regenerateRecoveryCodes(user.id);
    return { recoveryCodes };
  }

  @Post('logout')
  @UseGuards(AuthenticationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar la sesion actual (BR-AUTH-004)' })
  async logout(
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ loggedOut: true }> {
    await this.authService.logout(user.id, user.sessionId, this.buildContext(req), res);
    return { loggedOut: true };
  }

  @Post('logout-all')
  @UseGuards(AuthenticationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar todas las sesiones activas' })
  async logoutAll(
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ loggedOut: true }> {
    await this.authService.logoutAll(user.id, this.buildContext(req), res);
    return { loggedOut: true };
  }

  @Get('sessions')
  @UseGuards(AuthenticationGuard)
  @ApiOperation({ summary: 'Listar sesiones activas del usuario' })
  async listSessions(@CurrentUser() user: RequestUser) {
    return this.authService.listSessions(user.id);
  }

  @Delete('sessions/:id')
  @UseGuards(AuthenticationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revocar una sesion especifica' })
  async revokeSession(
    @CurrentUser() user: RequestUser,
    @Param('id') sessionId: string,
    @Req() req: Request,
  ): Promise<{ revoked: true }> {
    await this.authService.revokeSession(user.id, sessionId, this.buildContext(req));
    return { revoked: true };
  }

  @Post('change-password')
  @UseGuards(AuthenticationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cambiar contraseña desde el perfil (requiere contraseña actual)' })
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ): Promise<{ changed: true }> {
    await this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
      this.buildContext(req),
    );
    return { changed: true };
  }

  @Post('password-reset/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar recuperacion de contraseña' })
  async requestPasswordReset(
    @Body() dto: PasswordResetRequestDto,
    @Req() req: Request,
  ): Promise<{ requested: true }> {
    await this.authService.requestPasswordReset(dto.email, this.buildContext(req));
    return { requested: true };
  }

  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar nueva contraseña (BR-SEC-002)' })
  async confirmPasswordReset(
    @Body() dto: PasswordResetConfirmDto,
    @Req() req: Request,
  ): Promise<{ reset: true }> {
    await this.authService.confirmPasswordReset(dto.token, dto.newPassword, this.buildContext(req));
    return { reset: true };
  }

  @Post('session/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar sesion (rotacion de refresh token)' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ refreshed: true }> {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    if (!refreshToken) {
      throw new UnauthorizedException('No hay una sesión para renovar.');
    }

    await this.authService.refreshSession(refreshToken, this.buildContext(req), res);
    return { refreshed: true };
  }

  private buildContext(req: Request) {
    const userAgent = req.header('User-Agent');
    return {
      correlationId: req.correlationId,
      ipAddress: req.ip,
      userAgent,
      deviceInfo: userAgent,
    };
  }
}
