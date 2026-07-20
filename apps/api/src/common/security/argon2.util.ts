import * as argon2 from 'argon2';

/**
 * Hashing de contraseñas con Argon2id (BR-SEC-002, EWO-002) — nunca en texto
 * plano ni con un hash de proposito general. Parametros por defecto de la
 * libreria (RFC 9106 recomienda variante id sobre las demas).
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return argon2.hash(plainPassword, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, plainPassword: string): Promise<boolean> {
  return argon2.verify(hash, plainPassword);
}
