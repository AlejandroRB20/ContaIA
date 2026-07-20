import { RoleName, UserStatus } from '@contaia/database';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { Response } from 'express';

import type { EmailSender } from '../../../common/email/email-sender.interface';
import { hashPassword } from '../../../common/security/argon2.util';
import type { MembershipsRepository } from '../../roles-permissions/repositories/memberships.repository';
import type { UsersRepository } from '../../users/repositories/users.repository';
import type { AuthTokensRepository } from '../repositories/auth-tokens.repository';
import type { SessionsRepository } from '../repositories/sessions.repository';

import { AuthService } from './auth.service';
import type { MfaService } from './mfa.service';
import type { TokenService } from './token.service';

const CONTEXT = { correlationId: 'test-correlation-id', ipAddress: '127.0.0.1' };
const CONFIG = {
  PASSWORD_RESET_TOKEN_TTL_MINUTES: 30,
  EMAIL_VERIFICATION_TOKEN_TTL_HOURS: 24,
} as never;

function buildService(overrides: {
  usersRepository?: Partial<jest.Mocked<UsersRepository>>;
  tokenService?: Partial<jest.Mocked<TokenService>>;
  membershipsRepository?: Partial<jest.Mocked<MembershipsRepository>>;
  mfaService?: Partial<jest.Mocked<MfaService>>;
}) {
  const usersRepository = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    ...overrides.usersRepository,
  } as unknown as jest.Mocked<UsersRepository>;

  const sessionsRepository = {} as jest.Mocked<SessionsRepository>;
  const authTokensRepository = {
    createEmailVerification: jest.fn(),
  } as unknown as jest.Mocked<AuthTokensRepository>;
  const membershipsRepository = {
    findAllForUser: jest.fn().mockResolvedValue([]),
    ...overrides.membershipsRepository,
  } as unknown as jest.Mocked<MembershipsRepository>;
  const tokenService = {
    issueTokens: jest.fn(),
    setAuthCookies: jest.fn(),
    signMfaChallengeToken: jest.fn(),
    ...overrides.tokenService,
  } as unknown as jest.Mocked<TokenService>;
  const mfaService = { ...overrides.mfaService } as unknown as jest.Mocked<MfaService>;
  const events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;
  const emailSender = { send: jest.fn() } as unknown as jest.Mocked<EmailSender>;
  const res = {} as Response;

  const service = new AuthService(
    usersRepository,
    sessionsRepository,
    authTokensRepository,
    membershipsRepository,
    tokenService,
    mfaService,
    events,
    emailSender,
    CONFIG,
  );

  return { service, usersRepository, tokenService, membershipsRepository, mfaService, events, res };
}

describe('AuthService', () => {
  describe('register', () => {
    it('rechaza el registro si ya existe una cuenta con ese correo', async () => {
      const { service, usersRepository } = buildService({
        usersRepository: { findByEmail: jest.fn().mockResolvedValue({ id: 'existing' }) },
      });

      await expect(
        service.register(
          {
            email: 'existe@contaia.demo',
            password: 'Sup3r$ecreto123',
            firstName: 'A',
            lastName: 'B',
          },
          CONTEXT,
        ),
      ).rejects.toThrow();

      expect(usersRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('rechaza credenciales invalidas si el usuario no existe (sin revelar cual fallo)', async () => {
      const { service } = buildService({
        usersRepository: { findByEmail: jest.fn().mockResolvedValue(null) },
      });

      await expect(
        service.login({ email: 'nadie@contaia.demo', password: 'x' }, CONTEXT, {} as Response),
      ).rejects.toThrow();
    });

    it('rechaza el login si la cuenta no ha verificado su correo (BR-AUTH-001)', async () => {
      const passwordHash = await hashPassword('Sup3r$ecreto123');
      const { service } = buildService({
        usersRepository: {
          findByEmail: jest.fn().mockResolvedValue({
            id: 'user-1',
            passwordHash,
            emailVerified: false,
            accountStatus: UserStatus.PENDING_VERIFICATION,
            mfaEnabled: false,
          }),
        },
      });

      await expect(
        service.login(
          { email: 'user@contaia.demo', password: 'Sup3r$ecreto123' },
          CONTEXT,
          {} as Response,
        ),
      ).rejects.toThrow();
    });

    it('devuelve mfaRequired=true sin emitir tokens cuando el usuario tiene MFA activo', async () => {
      const passwordHash = await hashPassword('Sup3r$ecreto123');
      const { service, tokenService } = buildService({
        usersRepository: {
          findByEmail: jest.fn().mockResolvedValue({
            id: 'user-1',
            passwordHash,
            emailVerified: true,
            accountStatus: UserStatus.ACTIVE,
            mfaEnabled: true,
          }),
        },
        tokenService: {
          signMfaChallengeToken: jest.fn().mockResolvedValue('mfa-challenge-token'),
        },
      });

      const result = await service.login(
        { email: 'user@contaia.demo', password: 'Sup3r$ecreto123' },
        CONTEXT,
        {} as Response,
      );

      expect(result).toEqual({
        mfaRequired: true,
        mfaEnrollmentRequired: false,
        mfaChallengeToken: 'mfa-challenge-token',
      });
      expect(tokenService.issueTokens).not.toHaveBeenCalled();
    });

    it('inicia sesion directamente cuando MFA no esta activo y no hay Membership que lo exija', async () => {
      const passwordHash = await hashPassword('Sup3r$ecreto123');
      const { service, tokenService } = buildService({
        usersRepository: {
          findByEmail: jest.fn().mockResolvedValue({
            id: 'user-1',
            email: 'user@contaia.demo',
            firstName: 'Nombre',
            lastName: 'Apellido',
            passwordHash,
            emailVerified: true,
            accountStatus: UserStatus.ACTIVE,
            mfaEnabled: false,
          }),
        },
        tokenService: {
          issueTokens: jest.fn().mockResolvedValue({
            accessToken: 'a',
            refreshToken: 'r',
            csrfToken: 'c',
            sessionId: 'session-1',
          }),
        },
      });

      const result = await service.login(
        { email: 'user@contaia.demo', password: 'Sup3r$ecreto123' },
        CONTEXT,
        {} as Response,
      );

      expect(result.mfaRequired).toBe(false);
      expect(result.mfaEnrollmentRequired).toBe(false);
      expect(tokenService.issueTokens).toHaveBeenCalled();
      expect(tokenService.setAuthCookies).toHaveBeenCalled();
    });

    it('inicia sesion directamente cuando MFA no esta activo y todas las Membership son Estudiante', async () => {
      const passwordHash = await hashPassword('Sup3r$ecreto123');
      const { service, tokenService } = buildService({
        usersRepository: {
          findByEmail: jest.fn().mockResolvedValue({
            id: 'user-1',
            email: 'user@contaia.demo',
            firstName: 'Nombre',
            lastName: 'Apellido',
            passwordHash,
            emailVerified: true,
            accountStatus: UserStatus.ACTIVE,
            mfaEnabled: false,
          }),
        },
        membershipsRepository: {
          findAllForUser: jest.fn().mockResolvedValue([{ role: { name: RoleName.ESTUDIANTE } }]),
        },
        tokenService: {
          issueTokens: jest.fn().mockResolvedValue({
            accessToken: 'a',
            refreshToken: 'r',
            csrfToken: 'c',
            sessionId: 'session-1',
          }),
        },
      });

      const result = await service.login(
        { email: 'user@contaia.demo', password: 'Sup3r$ecreto123' },
        CONTEXT,
        {} as Response,
      );

      expect(result.mfaEnrollmentRequired).toBe(false);
      expect(tokenService.issueTokens).toHaveBeenCalled();
    });

    it('exige enrolamiento de MFA (BR-AUTH-002) cuando el usuario tiene una Membership con Rol distinto de Estudiante y MFA no esta activo', async () => {
      const passwordHash = await hashPassword('Sup3r$ecreto123');
      const { service, tokenService } = buildService({
        usersRepository: {
          findByEmail: jest.fn().mockResolvedValue({
            id: 'user-1',
            email: 'user@contaia.demo',
            passwordHash,
            emailVerified: true,
            accountStatus: UserStatus.ACTIVE,
            mfaEnabled: false,
          }),
        },
        membershipsRepository: {
          findAllForUser: jest.fn().mockResolvedValue([{ role: { name: RoleName.CONTADOR } }]),
        },
        tokenService: {
          signMfaChallengeToken: jest.fn().mockResolvedValue('mfa-enrollment-token'),
        },
      });

      const result = await service.login(
        { email: 'user@contaia.demo', password: 'Sup3r$ecreto123' },
        CONTEXT,
        {} as Response,
      );

      expect(result).toEqual({
        mfaRequired: false,
        mfaEnrollmentRequired: true,
        mfaChallengeToken: 'mfa-enrollment-token',
      });
      expect(tokenService.issueTokens).not.toHaveBeenCalled();
    });
  });

  describe('completeMfaEnrollment', () => {
    it('establece la sesion solo despues de confirmar el TOTP de enrolamiento', async () => {
      const { service, usersRepository, tokenService, mfaService } = buildService({
        usersRepository: {
          findById: jest.fn().mockResolvedValue({
            id: 'user-1',
            email: 'user@contaia.demo',
            firstName: 'Nombre',
            lastName: 'Apellido',
            emailVerified: true,
            mfaEnabled: false,
          }),
        },
        tokenService: {
          verifyMfaChallengeToken: jest.fn().mockResolvedValue('user-1'),
          issueTokens: jest.fn().mockResolvedValue({
            accessToken: 'a',
            refreshToken: 'r',
            csrfToken: 'c',
            sessionId: 'session-1',
          }),
        },
        mfaService: {
          confirmSetupFromStoredSecret: jest.fn().mockResolvedValue(['CODE1', 'CODE2']),
        },
      });

      const result = await service.completeMfaEnrollment(
        'mfa-enrollment-token',
        '123456',
        CONTEXT,
        {} as Response,
      );

      expect(usersRepository.findById).toHaveBeenCalledWith('user-1');
      expect(mfaService.confirmSetupFromStoredSecret).toHaveBeenCalledWith(
        'user-1',
        '123456',
        CONTEXT,
      );
      expect(tokenService.issueTokens).toHaveBeenCalled();
      expect(result.recoveryCodes).toEqual(['CODE1', 'CODE2']);
      expect(result.mfaRequired).toBe(false);
      expect(result.mfaEnrollmentRequired).toBe(false);
    });
  });
});
