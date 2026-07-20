import { UserStatus } from '@contaia/database';
import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import type { AccessTokenPayload } from '../../modules/authentication/interfaces/jwt-payload.interface';
import { SessionsRepository } from '../../modules/authentication/repositories/sessions.repository';
import { UsersRepository } from '../../modules/users/repositories/users.repository';
import { SessionRevokedException } from '../exceptions/auth.exceptions';
import { ACCESS_TOKEN_COOKIE } from '../security/cookie.constants';

/**
 * Autenticacion (docs/08_API_DESIGN.md seccion 6: "autenticarse prueba
 * quien eres"). Valida el access token JWT, confirma que su Session no fue
 * revocada, y confirma que el Usuario sigue activo — nunca confia solo en
 * la firma del JWT sin revalidar contra la base de datos.
 */
@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly sessionsRepository: SessionsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new SessionRevokedException();
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new SessionRevokedException();
    }

    const session = await this.sessionsRepository.findActiveById(payload.sid);
    if (!session || session.userId !== payload.sub) {
      throw new SessionRevokedException();
    }

    const user = await this.usersRepository.findById(payload.sub);
    if (!user || user.accountStatus !== UserStatus.ACTIVE) {
      throw new SessionRevokedException();
    }

    request.user = {
      id: user.id,
      email: user.email,
      isPlatformAdmin: user.isPlatformAdmin,
      sessionId: session.id,
    };

    return true;
  }

  private extractToken(request: Request): string | undefined {
    const cookieToken = request.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined;
    if (cookieToken) {
      return cookieToken;
    }

    const authHeader = request.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice('Bearer '.length);
    }

    return undefined;
  }
}
