import { randomBytes, randomInt, timingSafeEqual, createHash } from 'node:crypto';

/**
 * Tokens opacos de alta entropia (refresh token, tokens de un solo uso de
 * verificacion de correo / reset de contraseña / invitacion). Se hashean con
 * SHA-256 antes de persistirse — a diferencia de una contraseña, ya tienen
 * suficiente entropia (256 bits) y no requieren Argon2id (docs/engineering/
 * EWO-002_AUTH_REPORT.md, decisiones de alcance).
 */
export function generateOpaqueToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Comparacion en tiempo constante para evitar ataques de temporizacion al
 * validar hashes/tokens (EWO-002, "Timing Attack Protection").
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'hex');
  const bufferB = Buffer.from(b, 'hex');

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return timingSafeEqual(bufferA, bufferB);
}

const RECOVERY_CODE_LENGTH = 10;
const RECOVERY_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Codigos de recuperacion MFA legibles (sin caracteres ambiguos como 0/O,
 * 1/I) — formato "XXXXX-XXXXX".
 */
export function generateMfaRecoveryCode(): string {
  let code = '';
  for (let i = 0; i < RECOVERY_CODE_LENGTH; i += 1) {
    code += RECOVERY_CODE_ALPHABET[randomInt(RECOVERY_CODE_ALPHABET.length)];
  }
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

export function generateMfaRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => generateMfaRecoveryCode());
}
