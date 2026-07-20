import type { ServerConfig } from '@contaia/config/server';
import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { AUTH_EVENTS, MfaDisabledEvent, MfaEnabledEvent } from '../../../common/events/auth.events';
import {
  InvalidCredentialsException,
  InvalidMfaCodeException,
} from '../../../common/exceptions/auth.exceptions';
import { verifyPassword } from '../../../common/security/argon2.util';
import { decryptSecret, encryptSecret } from '../../../common/security/encryption.util';
import { generateMfaRecoveryCodes, hashOpaqueToken } from '../../../common/security/token.util';
import {
  buildTotpAuthUrl,
  generateTotpQrCodeDataUrl,
  generateTotpSecret,
  verifyTotpToken,
} from '../../../common/security/totp.util';
import { SERVER_CONFIG } from '../../../config/config.module';
import { UsersRepository } from '../../users/repositories/users.repository';
import { MfaRecoveryCodesRepository } from '../repositories/mfa-recovery-codes.repository';

export interface MfaAuditContext {
  correlationId: string;
  ipAddress?: string;
  deviceInfo?: string;
}

export interface MfaSetupResult {
  otpAuthUrl: string;
  qrCodeDataUrl: string;
  /** Secreto en claro — se devuelve una sola vez para que el usuario lo
   * pueda introducir manualmente si no puede escanear el QR. */
  secret: string;
}

/**
 * TOTP completo (BR-AUTH-002, docs/20_BACKEND_IMPLEMENTATION_PLAN.md
 * seccion 10) — obligatorio para Administrador/Contador/Auxiliar/
 * Supervisor/Auditor, opcional para Estudiante (ver brain/DECISIONS.md).
 */
@Injectable()
export class MfaService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly mfaRecoveryCodesRepository: MfaRecoveryCodesRepository,
    private readonly events: EventEmitter2,
    @Inject(SERVER_CONFIG) private readonly config: ServerConfig,
  ) {}

  async beginSetup(userId: string, accountEmail: string): Promise<MfaSetupResult> {
    const secret = generateTotpSecret();
    const encrypted = encryptSecret(secret, this.config.MFA_ENCRYPTION_KEY);
    await this.usersRepository.setMfaSecret(userId, encrypted);

    const otpAuthUrl = buildTotpAuthUrl(secret, accountEmail, this.config.MFA_ISSUER_NAME);
    const qrCodeDataUrl = await generateTotpQrCodeDataUrl(otpAuthUrl);

    return { otpAuthUrl, qrCodeDataUrl, secret };
  }

  /**
   * Confirma el codigo TOTP inicial y activa MFA, generando codigos de
   * recuperacion. Relee el secreto cifrado ya persistido por `beginSetup`
   * desde la base de datos — nunca confia en un secreto enviado por el
   * cliente.
   */
  async confirmSetupFromStoredSecret(
    userId: string,
    code: string,
    context: MfaAuditContext,
  ): Promise<string[]> {
    const user = await this.usersRepository.findById(userId);
    if (!user?.mfaSecretEncrypted) {
      throw new InvalidMfaCodeException();
    }

    this.verifyCodeAgainstEncryptedSecret(user.mfaSecretEncrypted, code);

    await this.usersRepository.enableMfa(userId);
    const recoveryCodes = generateMfaRecoveryCodes();
    await this.mfaRecoveryCodesRepository.replaceAllForUser(
      userId,
      recoveryCodes.map((code_) => hashOpaqueToken(code_)),
    );

    this.events.emit(AUTH_EVENTS.MFA_ENABLED, new MfaEnabledEvent(userId, context));

    return recoveryCodes;
  }

  /** Exige confirmar la contraseña actual antes de desactivar MFA. */
  async disableWithPasswordConfirmation(
    userId: string,
    password: string,
    context: MfaAuditContext,
  ): Promise<void> {
    const user = await this.usersRepository.findById(userId);
    if (!user || !(await verifyPassword(user.passwordHash, password))) {
      throw new InvalidCredentialsException();
    }

    await this.usersRepository.disableMfa(userId);
    await this.mfaRecoveryCodesRepository.deleteAllForUser(userId);

    this.events.emit(AUTH_EVENTS.MFA_DISABLED, new MfaDisabledEvent(userId, context));
  }

  async regenerateRecoveryCodes(userId: string): Promise<string[]> {
    const recoveryCodes = generateMfaRecoveryCodes();
    await this.mfaRecoveryCodesRepository.replaceAllForUser(
      userId,
      recoveryCodes.map((code) => hashOpaqueToken(code)),
    );
    return recoveryCodes;
  }

  verifyLoginCode(encryptedSecret: string, code: string): void {
    this.verifyCodeAgainstEncryptedSecret(encryptedSecret, code);
  }

  async verifyRecoveryCode(userId: string, recoveryCode: string): Promise<void> {
    const codeHash = hashOpaqueToken(recoveryCode.trim().toUpperCase());
    const record = await this.mfaRecoveryCodesRepository.findUnusedByUserAndHash(userId, codeHash);

    if (!record) {
      throw new InvalidMfaCodeException();
    }

    await this.mfaRecoveryCodesRepository.markUsed(record.id);
  }

  private verifyCodeAgainstEncryptedSecret(encryptedSecret: string, code: string): void {
    const secret = decryptSecret(encryptedSecret, this.config.MFA_ENCRYPTION_KEY);
    if (!verifyTotpToken(secret, code)) {
      throw new InvalidMfaCodeException();
    }
  }
}
