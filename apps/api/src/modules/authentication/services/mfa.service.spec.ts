import type { EventEmitter2 } from '@nestjs/event-emitter';
import { authenticator } from 'otplib';

import { AUTH_EVENTS } from '../../../common/events/auth.events';
import { hashPassword } from '../../../common/security/argon2.util';
import { encryptSecret } from '../../../common/security/encryption.util';
import type { UsersRepository } from '../../users/repositories/users.repository';
import type { MfaRecoveryCodesRepository } from '../repositories/mfa-recovery-codes.repository';

import { MfaService } from './mfa.service';

const CONTEXT = { correlationId: 'test-correlation-id', ipAddress: '127.0.0.1' };
const MFA_ENCRYPTION_KEY = 'test_only_mfa_encryption_key_32_characters_min';
const CONFIG = { MFA_ENCRYPTION_KEY } as never;

function buildService(overrides: {
  usersRepository?: Partial<jest.Mocked<UsersRepository>>;
  mfaRecoveryCodesRepository?: Partial<jest.Mocked<MfaRecoveryCodesRepository>>;
}) {
  const usersRepository = {
    findById: jest.fn(),
    enableMfa: jest.fn(),
    disableMfa: jest.fn(),
    ...overrides.usersRepository,
  } as unknown as jest.Mocked<UsersRepository>;

  const mfaRecoveryCodesRepository = {
    replaceAllForUser: jest.fn(),
    deleteAllForUser: jest.fn(),
    ...overrides.mfaRecoveryCodesRepository,
  } as unknown as jest.Mocked<MfaRecoveryCodesRepository>;

  const events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

  const service = new MfaService(usersRepository, mfaRecoveryCodesRepository, events, CONFIG);

  return { service, usersRepository, mfaRecoveryCodesRepository, events };
}

describe('MfaService', () => {
  describe('confirmSetupFromStoredSecret', () => {
    it('activa MFA, genera codigos de recuperacion y emite auth.mfa_enabled', async () => {
      const secret = authenticator.generateSecret();
      const encrypted = encryptSecret(secret, MFA_ENCRYPTION_KEY);
      const validCode = authenticator.generate(secret);

      const { service, usersRepository, mfaRecoveryCodesRepository, events } = buildService({
        usersRepository: {
          findById: jest.fn().mockResolvedValue({ id: 'user-1', mfaSecretEncrypted: encrypted }),
        },
      });

      const recoveryCodes = await service.confirmSetupFromStoredSecret(
        'user-1',
        validCode,
        CONTEXT,
      );

      expect(recoveryCodes).toHaveLength(10);
      expect(usersRepository.enableMfa).toHaveBeenCalledWith('user-1');
      expect(mfaRecoveryCodesRepository.replaceAllForUser).toHaveBeenCalled();
      expect(events.emit).toHaveBeenCalledWith(
        AUTH_EVENTS.MFA_ENABLED,
        expect.objectContaining({ userId: 'user-1', context: CONTEXT }),
      );
    });

    it('rechaza un codigo TOTP invalido sin activar MFA', async () => {
      const secret = authenticator.generateSecret();
      const encrypted = encryptSecret(secret, MFA_ENCRYPTION_KEY);

      const { service, usersRepository, events } = buildService({
        usersRepository: {
          findById: jest.fn().mockResolvedValue({ id: 'user-1', mfaSecretEncrypted: encrypted }),
        },
      });

      await expect(
        service.confirmSetupFromStoredSecret('user-1', '000000', CONTEXT),
      ).rejects.toThrow();

      expect(usersRepository.enableMfa).not.toHaveBeenCalled();
      expect(events.emit).not.toHaveBeenCalled();
    });
  });

  describe('disableWithPasswordConfirmation', () => {
    it('desactiva MFA y emite auth.mfa_disabled cuando la contraseña es correcta', async () => {
      const passwordHash = await hashPassword('Sup3r$ecreto123');
      const { service, usersRepository, mfaRecoveryCodesRepository, events } = buildService({
        usersRepository: {
          findById: jest.fn().mockResolvedValue({ id: 'user-1', passwordHash }),
        },
      });

      await service.disableWithPasswordConfirmation('user-1', 'Sup3r$ecreto123', CONTEXT);

      expect(usersRepository.disableMfa).toHaveBeenCalledWith('user-1');
      expect(mfaRecoveryCodesRepository.deleteAllForUser).toHaveBeenCalledWith('user-1');
      expect(events.emit).toHaveBeenCalledWith(
        AUTH_EVENTS.MFA_DISABLED,
        expect.objectContaining({ userId: 'user-1', context: CONTEXT }),
      );
    });

    it('rechaza una contraseña incorrecta sin desactivar MFA', async () => {
      const passwordHash = await hashPassword('Sup3r$ecreto123');
      const { service, usersRepository, events } = buildService({
        usersRepository: {
          findById: jest.fn().mockResolvedValue({ id: 'user-1', passwordHash }),
        },
      });

      await expect(
        service.disableWithPasswordConfirmation('user-1', 'contraseña-incorrecta', CONTEXT),
      ).rejects.toThrow();

      expect(usersRepository.disableMfa).not.toHaveBeenCalled();
      expect(events.emit).not.toHaveBeenCalled();
    });
  });
});
