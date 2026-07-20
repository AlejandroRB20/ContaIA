import { decryptSecret, encryptSecret } from './encryption.util';

const KEY = 'test-encryption-key-32-characters-min';

describe('encryption.util', () => {
  it('cifra y descifra un secreto correctamente (roundtrip)', () => {
    const plainText = 'JBSWY3DPEHPK3PXP';
    const cipherText = encryptSecret(plainText, KEY);

    expect(cipherText).not.toBe(plainText);
    expect(decryptSecret(cipherText, KEY)).toBe(plainText);
  });

  it('produce cifrados distintos para el mismo secreto (IV aleatorio)', () => {
    const plainText = 'JBSWY3DPEHPK3PXP';

    expect(encryptSecret(plainText, KEY)).not.toBe(encryptSecret(plainText, KEY));
  });

  it('lanza un error si el formato del texto cifrado es invalido', () => {
    expect(() => decryptSecret('formato-invalido', KEY)).toThrow();
  });

  it('lanza un error si la clave de descifrado es incorrecta (autenticacion GCM)', () => {
    const cipherText = encryptSecret('secreto', KEY);

    expect(() => decryptSecret(cipherText, 'otra-clave-completamente-distinta-32c')).toThrow();
  });
});
