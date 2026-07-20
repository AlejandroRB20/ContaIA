import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;

/**
 * Cifrado simetrico en reposo del secreto TOTP (User.mfaSecretEncrypted) —
 * no puede hashearse porque debe recuperarse en claro para generar/verificar
 * codigos. `MFA_ENCRYPTION_KEY` se deriva a una clave de 32 bytes via SHA-256;
 * candidato a un gestor de claves real en produccion
 * (docs/11_SECURITY_ARCHITECTURE.md seccion 14 — pendiente de KMS).
 */
function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

export function encryptSecret(plainText: string, encryptionKey: string): string {
  const key = deriveKey(encryptionKey);
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
}

export function decryptSecret(cipherText: string, encryptionKey: string): string {
  const [ivHex, authTagHex, encryptedHex] = cipherText.split(':');
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Formato de secreto cifrado invalido.');
  }

  const key = deriveKey(encryptionKey);
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
