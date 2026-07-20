import type { ServerConfig } from '@contaia/config/server';
import { RoleName, UserStatus } from '@contaia/database';
import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Response } from 'express';

import { EMAIL_SENDER, type EmailSender } from '../../../common/email/email-sender.interface';
import {
  AUTH_EVENTS,
  EmailVerifiedEvent,
  LoginFailedEvent,
  PasswordChangedEvent,
  PasswordResetRequestedEvent,
  SessionRevokedEvent,
  UserLoggedInEvent,
  UserRegisteredEvent,
} from '../../../common/events/auth.events';
import {
  AccountNotActiveException,
  AccountNotVerifiedException,
  EmailAlreadyRegisteredException,
  InvalidCredentialsException,
  InvalidOrExpiredTokenException,
} from '../../../common/exceptions/auth.exceptions';
import { hashPassword, verifyPassword } from '../../../common/security/argon2.util';
import { generateOpaqueToken, hashOpaqueToken } from '../../../common/security/token.util';
import { SERVER_CONFIG } from '../../../config/config.module';
import { MembershipsRepository } from '../../roles-permissions/repositories/memberships.repository';
import { UsersRepository } from '../../users/repositories/users.repository';
import type { LoginDto } from '../dto/login.dto';
import type { RegisterDto } from '../dto/register.dto';
import { AuthTokensRepository } from '../repositories/auth-tokens.repository';
import { SessionsRepository } from '../repositories/sessions.repository';

import { MfaService } from './mfa.service';
import { type IssuedTokens, TokenService, type SessionRequestContext } from './token.service';

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
}

export interface LoginResult {
  mfaRequired: false;
  mfaEnrollmentRequired: false;
  user: PublicUser;
}

export interface MfaChallengeResult {
  mfaRequired: true;
  mfaEnrollmentRequired: false;
  mfaChallengeToken: string;
}

/**
 * BR-AUTH-002: un Usuario con al menos una Membership activa en un Rol
 * distinto de Estudiante no puede completar el login sin MFA — si todavia
 * no lo tiene activado, debe enrolarse ahora mismo (sin sesion real hasta
 * terminar), no solo se le ofrece como opcion voluntaria despues.
 */
export interface MfaEnrollmentRequiredResult {
  mfaRequired: false;
  mfaEnrollmentRequired: true;
  mfaChallengeToken: string;
}

interface RequestAuditContext extends SessionRequestContext {
  correlationId: string;
  /**
   * Duplica `userAgent` bajo el nombre que esperan los eventos de dominio
   * (`BaseAuditContext.deviceInfo`, escrito en `AuditLog.device_info`) —
   * `SessionRequestContext.userAgent` alimenta la tabla `Session`
   * (columna distinta); antes de este campo, todo evento `auth.*` grababa
   * `deviceInfo` como `undefined` por el desajuste de nombre.
   */
  deviceInfo?: string;
}

function toPublicUser(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    emailVerified: user.emailVerified,
    mfaEnabled: user.mfaEnabled,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly sessionsRepository: SessionsRepository,
    private readonly authTokensRepository: AuthTokensRepository,
    private readonly membershipsRepository: MembershipsRepository,
    private readonly tokenService: TokenService,
    private readonly mfaService: MfaService,
    private readonly events: EventEmitter2,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
    @Inject(SERVER_CONFIG) private readonly config: ServerConfig,
  ) {}

  async register(dto: RegisterDto, context: RequestAuditContext): Promise<void> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new EmailAlreadyRegisteredException();
    }

    const passwordHash = await hashPassword(dto.password);
    const user = await this.usersRepository.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
    });

    await this.sendEmailVerification(user.id, user.email);

    this.events.emit(
      AUTH_EVENTS.USER_REGISTERED,
      new UserRegisteredEvent(user.id, user.email, context),
    );
  }

  async verifyEmail(token: string, context: RequestAuditContext): Promise<void> {
    const tokenHash = hashOpaqueToken(token);
    const record = await this.authTokensRepository.findValidEmailVerification(tokenHash);
    if (!record) {
      throw new InvalidOrExpiredTokenException();
    }

    await this.authTokensRepository.markEmailVerificationUsed(record.id);
    await this.usersRepository.markEmailVerified(record.userId);

    this.events.emit(AUTH_EVENTS.EMAIL_VERIFIED, new EmailVerifiedEvent(record.userId, context));
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.usersRepository.findByEmail(email);
    // Respuesta identica exista o no la cuenta (docs/11_SECURITY_ARCHITECTURE.md
    // seccion 6: "prevencion de enumeracion de cuentas").
    if (!user || user.emailVerified) {
      return;
    }

    await this.sendEmailVerification(user.id, user.email);
  }

  async login(
    dto: LoginDto,
    context: RequestAuditContext,
    res: Response,
  ): Promise<LoginResult | MfaChallengeResult | MfaEnrollmentRequiredResult> {
    const user = await this.usersRepository.findByEmail(dto.email);

    if (!user) {
      // Hash ficticio para que el tiempo de respuesta no revele si el
      // correo existe (docs/11_SECURITY_ARCHITECTURE.md seccion 6).
      await verifyPassword(
        '$argon2id$v=19$m=65536,t=3,p=4$MDAwMDAwMDAwMDAwMDAwMA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        dto.password,
      ).catch(() => false);
      this.events.emit(
        AUTH_EVENTS.LOGIN_FAILED,
        new LoginFailedEvent(dto.email, 'USER_NOT_FOUND', context),
      );
      throw new InvalidCredentialsException();
    }

    const passwordValid = await verifyPassword(user.passwordHash, dto.password);
    if (!passwordValid) {
      this.events.emit(
        AUTH_EVENTS.LOGIN_FAILED,
        new LoginFailedEvent(dto.email, 'INVALID_PASSWORD', context),
      );
      throw new InvalidCredentialsException();
    }

    if (!user.emailVerified) {
      throw new AccountNotVerifiedException();
    }

    if (user.accountStatus !== UserStatus.ACTIVE) {
      throw new AccountNotActiveException();
    }

    if (user.mfaEnabled) {
      const mfaChallengeToken = await this.tokenService.signMfaChallengeToken(user.id);
      return { mfaRequired: true, mfaEnrollmentRequired: false, mfaChallengeToken };
    }

    if (await this.userRequiresMfa(user.id)) {
      const mfaChallengeToken = await this.tokenService.signMfaChallengeToken(user.id);
      return { mfaRequired: false, mfaEnrollmentRequired: true, mfaChallengeToken };
    }

    const tokens = await this.establishSession(user.id, context, res, dto.rememberMe);

    this.events.emit(
      AUTH_EVENTS.USER_LOGGED_IN,
      new UserLoggedInEvent(user.id, tokens.sessionId, context),
    );

    return { mfaRequired: false, mfaEnrollmentRequired: false, user: toPublicUser(user) };
  }

  async completeMfaLogin(
    mfaChallengeToken: string,
    code: string,
    context: RequestAuditContext,
    res: Response,
  ): Promise<LoginResult> {
    const userId = await this.tokenService.verifyMfaChallengeToken(mfaChallengeToken);
    const user = await this.usersRepository.findById(userId);
    if (!user || !user.mfaEnabled || !user.mfaSecretEncrypted) {
      throw new InvalidCredentialsException();
    }

    this.mfaService.verifyLoginCode(user.mfaSecretEncrypted, code);
    const tokens = await this.establishSession(user.id, context, res);

    this.events.emit(
      AUTH_EVENTS.USER_LOGGED_IN,
      new UserLoggedInEvent(user.id, tokens.sessionId, context),
    );

    return { mfaRequired: false, mfaEnrollmentRequired: false, user: toPublicUser(user) };
  }

  /**
   * Genera el secreto TOTP + QR para el enrolamiento forzoso (BR-AUTH-002)
   * — usa el `mfaChallengeToken` emitido por `login()` en vez de una sesion
   * real, porque todavia no existe ninguna (el Usuario no puede tener
   * acceso a datos reales sin MFA activo, BR-AUTH-002).
   */
  async beginMfaEnrollment(mfaChallengeToken: string) {
    const userId = await this.tokenService.verifyMfaChallengeToken(mfaChallengeToken);
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new InvalidCredentialsException();
    }

    return this.mfaService.beginSetup(user.id, user.email);
  }

  /**
   * Confirma el TOTP del enrolamiento forzoso y, solo entonces, establece
   * la sesion real — nunca antes de que MFA quede activo.
   */
  async completeMfaEnrollment(
    mfaChallengeToken: string,
    code: string,
    context: RequestAuditContext,
    res: Response,
  ): Promise<LoginResult & { recoveryCodes: string[] }> {
    const userId = await this.tokenService.verifyMfaChallengeToken(mfaChallengeToken);
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new InvalidCredentialsException();
    }

    const recoveryCodes = await this.mfaService.confirmSetupFromStoredSecret(
      user.id,
      code,
      context,
    );
    const tokens = await this.establishSession(user.id, context, res);

    this.events.emit(
      AUTH_EVENTS.USER_LOGGED_IN,
      new UserLoggedInEvent(user.id, tokens.sessionId, context),
    );

    return {
      mfaRequired: false,
      mfaEnrollmentRequired: false,
      user: toPublicUser({ ...user, mfaEnabled: true }),
      recoveryCodes,
    };
  }

  /** BR-AUTH-002: obligatorio para cualquier Rol distinto de Estudiante, en cualquier Empresa. */
  private async userRequiresMfa(userId: string): Promise<boolean> {
    const memberships = await this.membershipsRepository.findAllForUser(userId);
    return memberships.some((membership) => membership.role.name !== RoleName.ESTUDIANTE);
  }

  async completeMfaLoginWithRecoveryCode(
    mfaChallengeToken: string,
    recoveryCode: string,
    context: RequestAuditContext,
    res: Response,
  ): Promise<LoginResult> {
    const userId = await this.tokenService.verifyMfaChallengeToken(mfaChallengeToken);
    const user = await this.usersRepository.findById(userId);
    if (!user || !user.mfaEnabled) {
      throw new InvalidCredentialsException();
    }

    await this.mfaService.verifyRecoveryCode(user.id, recoveryCode);
    const tokens = await this.establishSession(user.id, context, res);

    this.events.emit(
      AUTH_EVENTS.USER_LOGGED_IN,
      new UserLoggedInEvent(user.id, tokens.sessionId, context),
    );

    return { mfaRequired: false, mfaEnrollmentRequired: false, user: toPublicUser(user) };
  }

  async refreshSession(
    refreshToken: string,
    context: RequestAuditContext,
    res: Response,
  ): Promise<void> {
    const refreshTokenHash = hashOpaqueToken(refreshToken);
    const session = await this.sessionsRepository.findActiveByRefreshTokenHash(refreshTokenHash);
    if (!session) {
      throw new InvalidOrExpiredTokenException();
    }

    const memberships = await this.membershipsRepository.findAllForUser(session.userId);
    const firstMembership = memberships[0];

    const tokens = await this.tokenService.rotateRefreshToken(
      session.id,
      session.userId,
      firstMembership?.companyId,
      firstMembership?.id,
      context,
    );

    this.tokenService.setAuthCookies(res, tokens);
  }

  async logout(
    userId: string,
    sessionId: string,
    context: RequestAuditContext,
    res: Response,
  ): Promise<void> {
    await this.sessionsRepository.revoke(sessionId);
    this.tokenService.clearAuthCookies(res);

    this.events.emit(
      AUTH_EVENTS.SESSION_REVOKED,
      new SessionRevokedEvent(userId, sessionId, 'LOGOUT', context),
    );
  }

  async logoutAll(userId: string, context: RequestAuditContext, res: Response): Promise<void> {
    await this.sessionsRepository.revokeAllForUser(userId);
    this.tokenService.clearAuthCookies(res);

    this.events.emit(
      AUTH_EVENTS.SESSION_REVOKED,
      new SessionRevokedEvent(userId, 'ALL', 'LOGOUT_ALL', context),
    );
  }

  async listSessions(userId: string) {
    const sessions = await this.sessionsRepository.findActiveByUserId(userId);
    return sessions.map((session) => ({
      id: session.id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      expiresAt: session.expiresAt,
    }));
  }

  async revokeSession(
    userId: string,
    sessionId: string,
    context: RequestAuditContext,
  ): Promise<void> {
    const session = await this.sessionsRepository.findActiveById(sessionId);
    if (!session || session.userId !== userId) {
      throw new InvalidOrExpiredTokenException();
    }

    await this.sessionsRepository.revoke(sessionId);

    this.events.emit(
      AUTH_EVENTS.SESSION_REVOKED,
      new SessionRevokedEvent(userId, sessionId, 'REVOKED_BY_USER', context),
    );
  }

  async requestPasswordReset(email: string, context: RequestAuditContext): Promise<void> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      // Anti-enumeracion: siempre responde con exito.
      return;
    }

    const token = generateOpaqueToken();
    const tokenHash = hashOpaqueToken(token);
    const expiresAt = new Date(
      Date.now() + this.config.PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000,
    );

    await this.authTokensRepository.createPasswordReset(user.id, tokenHash, expiresAt);

    await this.emailSender.send({
      to: user.email,
      subject: 'Recupera tu contraseña de ContaIA',
      body: `Usa este token para restablecer tu contraseña (vence en ${this.config.PASSWORD_RESET_TOKEN_TTL_MINUTES} minutos): ${token}`,
    });

    this.events.emit(
      AUTH_EVENTS.PASSWORD_RESET_REQUESTED,
      new PasswordResetRequestedEvent(email, context),
    );
  }

  async confirmPasswordReset(
    token: string,
    newPassword: string,
    context: RequestAuditContext,
  ): Promise<void> {
    const tokenHash = hashOpaqueToken(token);
    const record = await this.authTokensRepository.findValidPasswordReset(tokenHash);
    if (!record) {
      throw new InvalidOrExpiredTokenException();
    }

    const passwordHash = await hashPassword(newPassword);
    await this.usersRepository.updatePassword(record.userId, passwordHash);
    await this.authTokensRepository.markPasswordResetUsed(record.id);
    // Cambiar la contraseña revoca todas las sesiones activas (buena
    // practica estandar — un atacante con una sesion robada pierde acceso).
    await this.sessionsRepository.revokeAllForUser(record.userId);

    this.events.emit(
      AUTH_EVENTS.PASSWORD_CHANGED,
      new PasswordChangedEvent(record.userId, context),
    );
  }

  private async establishSession(
    userId: string,
    context: RequestAuditContext,
    res: Response,
    rememberMe = false,
  ): Promise<IssuedTokens> {
    const memberships = await this.membershipsRepository.findAllForUser(userId);
    const firstMembership = memberships[0];

    const tokens = await this.tokenService.issueTokens(
      userId,
      firstMembership?.companyId,
      firstMembership?.id,
      context,
      rememberMe,
    );

    this.tokenService.setAuthCookies(res, tokens);
    return tokens;
  }

  private async sendEmailVerification(userId: string, email: string): Promise<void> {
    const token = generateOpaqueToken();
    const tokenHash = hashOpaqueToken(token);
    const expiresAt = new Date(
      Date.now() + this.config.EMAIL_VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000,
    );

    await this.authTokensRepository.createEmailVerification(userId, tokenHash, expiresAt);

    await this.emailSender.send({
      to: email,
      subject: 'Verifica tu correo en ContaIA',
      body: `Usa este token para verificar tu correo (vence en ${this.config.EMAIL_VERIFICATION_TOKEN_TTL_HOURS} horas): ${token}`,
    });
  }
}
