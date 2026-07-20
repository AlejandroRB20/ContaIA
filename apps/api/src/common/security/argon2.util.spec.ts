import { hashPassword, verifyPassword } from './argon2.util';

describe('argon2.util', () => {
  it('produce un hash Argon2id que verifica correctamente la contraseña original', async () => {
    const hash = await hashPassword('Sup3r$ecret!');

    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword(hash, 'Sup3r$ecret!')).resolves.toBe(true);
  });

  it('rechaza una contraseña incorrecta', async () => {
    const hash = await hashPassword('Sup3r$ecret!');

    await expect(verifyPassword(hash, 'contraseña-incorrecta')).resolves.toBe(false);
  });

  it('nunca produce el mismo hash dos veces para la misma contraseña (salt aleatorio)', async () => {
    const hashA = await hashPassword('Sup3r$ecret!');
    const hashB = await hashPassword('Sup3r$ecret!');

    expect(hashA).not.toBe(hashB);
  });
});
