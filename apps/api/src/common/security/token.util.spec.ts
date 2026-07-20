import {
  generateMfaRecoveryCode,
  generateMfaRecoveryCodes,
  generateOpaqueToken,
  hashOpaqueToken,
  timingSafeEqualHex,
} from './token.util';

describe('token.util', () => {
  it('genera tokens opacos unicos de 64 caracteres hexadecimales (256 bits)', () => {
    const tokenA = generateOpaqueToken();
    const tokenB = generateOpaqueToken();

    expect(tokenA).toHaveLength(64);
    expect(tokenA).toMatch(/^[a-f0-9]+$/);
    expect(tokenA).not.toBe(tokenB);
  });

  it('hashOpaqueToken es determinista (mismo input -> mismo hash)', () => {
    const token = generateOpaqueToken();

    expect(hashOpaqueToken(token)).toBe(hashOpaqueToken(token));
    expect(hashOpaqueToken(token)).toHaveLength(64);
  });

  it('timingSafeEqualHex compara correctamente hashes iguales y distintos', () => {
    const hashA = hashOpaqueToken('a');
    const hashB = hashOpaqueToken('b');

    expect(timingSafeEqualHex(hashA, hashA)).toBe(true);
    expect(timingSafeEqualHex(hashA, hashB)).toBe(false);
  });

  it('genera codigos de recuperacion MFA con el formato XXXXX-XXXXX', () => {
    const code = generateMfaRecoveryCode();

    expect(code).toMatch(/^[A-Z0-9]{5}-[A-Z0-9]{5}$/);
  });

  it('genera 10 codigos de recuperacion unicos por defecto', () => {
    const codes = generateMfaRecoveryCodes();

    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
  });
});
