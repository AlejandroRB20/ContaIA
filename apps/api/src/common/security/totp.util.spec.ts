import { authenticator } from 'otplib';

import { buildTotpAuthUrl, generateTotpSecret, verifyTotpToken } from './totp.util';

describe('totp.util', () => {
  it('genera un secreto TOTP valido', () => {
    const secret = generateTotpSecret();

    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(secret.length).toBeGreaterThan(10);
  });

  it('construye una URL otpauth:// con emisor y cuenta', () => {
    const secret = generateTotpSecret();
    const url = buildTotpAuthUrl(secret, 'usuario@contaia.demo', 'ContaIA');

    expect(url).toContain('otpauth://totp/');
    expect(url).toContain('ContaIA');
    expect(url).toContain(encodeURIComponent('usuario@contaia.demo'));
  });

  it('verifica un codigo TOTP valido generado con el mismo secreto', () => {
    const secret = generateTotpSecret();
    const validCode = authenticator.generate(secret);

    expect(verifyTotpToken(secret, validCode)).toBe(true);
  });

  it('rechaza un codigo TOTP invalido', () => {
    const secret = generateTotpSecret();

    expect(verifyTotpToken(secret, '000000')).toBe(false);
  });
});
