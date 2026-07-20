import type { ServerConfig } from '@contaia/config/server';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { CookieOptions, Response } from 'express';

import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE_PATH,
  CSRF_TOKEN_COOKIE,
} from '../../../common/security/cookie.constants';
import { generateOpaqueToken, hashOpaqueToken } from '../../../common/security/token.util';
import { SERVER_CONFIG } from '../../../config/config.module';
import type { AccessTokenPayload } from '../interfaces/jwt-payload.interface';
import { SessionsRepository } from '../repositories/sessions.repository';

const MFA_CHALLENGE_TTL_SECONDS = 300;

interface MfaChallengePayload {
  sub: string;
  type: 'mfa_challenge';
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  sessionId: string;
}

export interface SessionRequestContext {
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Emite y rota el par access/refresh token, alineado con la decision de
 * arquitectura de docs/20_BACKEND_IMPLEMENTATION_PLAN.md (seccion 2/18):
 * JWT de acceso de corta duracion + refresh token aleatorio (no JWT)
 * hasheado en BD. Ambos viajan en cookies HttpOnly/Secure/SameSite=Lax
 * (nunca localStorage, docs/19_FRONTEND_IMPLEMENTATION_PLAN.md seccion 10).
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly sessionsRepository: SessionsRepository,
    @Inject(SERVER_CONFIG) private readonly config: ServerConfig,
  ) {}

  async issueTokens(
    userId: string,
    activeCompanyId: string | undefined,
    membershipId: string | undefined,
    context: SessionRequestContext,
    rememberMe = false,
  ): Promise<IssuedTokens> {
    const refreshToken = generateOpaqueToken();
    const refreshTokenHash = hashOpaqueToken(refreshToken);
    const ttlDays = rememberMe ? this.config.REFRESH_TOKEN_TTL_DAYS : 1;
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    const session = await this.sessionsRepository.create({
      userId,
      refreshTokenHash,
      expiresAt,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
    });

    const accessToken = await this.signAccessToken(
      userId,
      session.id,
      activeCompanyId,
      membershipId,
    );
    const csrfToken = generateOpaqueToken();

    return { accessToken, refreshToken, csrfToken, sessionId: session.id };
  }

  async rotateRefreshToken(
    previousSessionId: string,
    userId: string,
    activeCompanyId: string | undefined,
    membershipId: string | undefined,
    context: SessionRequestContext,
  ): Promise<IssuedTokens> {
    const refreshToken = generateOpaqueToken();
    const refreshTokenHash = hashOpaqueToken(refreshToken);
    const expiresAt = new Date(
      Date.now() + this.config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    const session = await this.sessionsRepository.create({
      userId,
      refreshTokenHash,
      expiresAt,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      rotatedFromId: previousSessionId,
    });
    await this.sessionsRepository.revoke(previousSessionId);

    const accessToken = await this.signAccessToken(
      userId,
      session.id,
      activeCompanyId,
      membershipId,
    );
    const csrfToken = generateOpaqueToken();

    return { accessToken, refreshToken, csrfToken, sessionId: session.id };
  }

  async signMfaChallengeToken(userId: string): Promise<string> {
    const payload: MfaChallengePayload = { sub: userId, type: 'mfa_challenge' };
    return this.jwtService.signAsync(payload, { expiresIn: MFA_CHALLENGE_TTL_SECONDS });
  }

  async verifyMfaChallengeToken(token: string): Promise<string> {
    try {
      const payload = await this.jwtService.verifyAsync<MfaChallengePayload>(token);
      if (payload.type !== 'mfa_challenge') {
        throw new UnauthorizedException('Token de verificación inválido.');
      }
      return payload.sub;
    } catch {
      throw new UnauthorizedException('El código de verificación expiró. Inicia sesión de nuevo.');
    }
  }

  setAuthCookies(res: Response, tokens: IssuedTokens): void {
    const base: CookieOptions = {
      httpOnly: true,
      secure: this.config.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: this.config.SESSION_COOKIE_DOMAIN,
    };

    res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
      ...base,
      maxAge: this.config.JWT_ACCESS_TTL_SECONDS * 1000,
      path: '/',
    });
    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      ...base,
      maxAge: this.config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
      path: REFRESH_TOKEN_COOKIE_PATH,
    });
    res.cookie(CSRF_TOKEN_COOKIE, tokens.csrfToken, {
      httpOnly: false,
      secure: this.config.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: this.config.SESSION_COOKIE_DOMAIN,
      maxAge: this.config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  clearAuthCookies(res: Response): void {
    res.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: REFRESH_TOKEN_COOKIE_PATH });
    res.clearCookie(CSRF_TOKEN_COOKIE, { path: '/' });
  }

  private async signAccessToken(
    userId: string,
    sessionId: string,
    activeCompanyId: string | undefined,
    membershipId: string | undefined,
  ): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: userId,
      sid: sessionId,
      activeCompanyId,
      membershipId,
    };
    return this.jwtService.signAsync(payload, {
      expiresIn: this.config.JWT_ACCESS_TTL_SECONDS,
    });
  }
}
