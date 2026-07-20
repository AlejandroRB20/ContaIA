import { UserStatus } from '@contaia/database';
import type { ExecutionContext } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';

import type { SessionsRepository } from '../../modules/authentication/repositories/sessions.repository';
import type { UsersRepository } from '../../modules/users/repositories/users.repository';

import { AuthenticationGuard } from './authentication.guard';

function buildContext(
  request: Partial<{
    cookies: Record<string, string>;
    header: (name: string) => string | undefined;
  }>,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ cookies: {}, header: () => undefined, ...request }),
    }),
  } as unknown as ExecutionContext;
}

describe('AuthenticationGuard', () => {
  let jwtService: jest.Mocked<JwtService>;
  let sessionsRepository: jest.Mocked<SessionsRepository>;
  let usersRepository: jest.Mocked<UsersRepository>;
  let guard: AuthenticationGuard;

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn() } as unknown as jest.Mocked<JwtService>;
    sessionsRepository = {
      findActiveById: jest.fn(),
    } as unknown as jest.Mocked<SessionsRepository>;
    usersRepository = { findById: jest.fn() } as unknown as jest.Mocked<UsersRepository>;

    guard = new AuthenticationGuard(jwtService, sessionsRepository, usersRepository);
  });

  it('rechaza la solicitud si no hay token (ni cookie ni encabezado Authorization)', async () => {
    await expect(guard.canActivate(buildContext({}))).rejects.toThrow();
  });

  it('rechaza si el JWT no es valido', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));

    await expect(
      guard.canActivate(buildContext({ cookies: { contaia_access_token: 'bad-token' } })),
    ).rejects.toThrow();
  });

  it('rechaza si la Session ya fue revocada', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', sid: 'session-1' });
    sessionsRepository.findActiveById.mockResolvedValue(null);

    await expect(
      guard.canActivate(buildContext({ cookies: { contaia_access_token: 'token' } })),
    ).rejects.toThrow();
  });

  it('rechaza si el Usuario ya no esta activo', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', sid: 'session-1' });
    sessionsRepository.findActiveById.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
    } as never);
    usersRepository.findById.mockResolvedValue({
      id: 'user-1',
      accountStatus: UserStatus.SUSPENDED,
    } as never);

    await expect(
      guard.canActivate(buildContext({ cookies: { contaia_access_token: 'token' } })),
    ).rejects.toThrow();
  });

  it('permite el acceso y adjunta request.user cuando todo es valido', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', sid: 'session-1' });
    sessionsRepository.findActiveById.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
    } as never);
    usersRepository.findById.mockResolvedValue({
      id: 'user-1',
      email: 'user@contaia.demo',
      isPlatformAdmin: false,
      accountStatus: UserStatus.ACTIVE,
    } as never);

    const request: Record<string, unknown> = { cookies: { contaia_access_token: 'token' } };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({
      id: 'user-1',
      email: 'user@contaia.demo',
      isPlatformAdmin: false,
      sessionId: 'session-1',
    });
  });
});
