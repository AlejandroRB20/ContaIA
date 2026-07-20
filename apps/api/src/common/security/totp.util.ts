import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';

/**
 * TOTP estandar (RFC 6238), compatible con Google Authenticator, Microsoft
 * Authenticator, Authy y cualquier app TOTP estandar (BR-AUTH-002,
 * docs/20_BACKEND_IMPLEMENTATION_PLAN.md seccion 10).
 */
export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function buildTotpAuthUrl(secret: string, accountEmail: string, issuer: string): string {
  return authenticator.keyuri(accountEmail, issuer, secret);
}

export async function generateTotpQrCodeDataUrl(otpAuthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpAuthUrl);
}

export function verifyTotpToken(secret: string, token: string): boolean {
  return authenticator.verify({ token, secret });
}
