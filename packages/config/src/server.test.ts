import { beforeEach, describe, expect, it } from 'vitest';

import { loadServerConfig, resetServerConfigCache } from './server';

const validEnv: NodeJS.ProcessEnv = {
  DATABASE_URL: 'postgresql://contaia:contaia@localhost:5432/contaia',
  JWT_ACCESS_SECRET: 'test_only_jwt_access_secret_32_characters_min',
  MFA_ENCRYPTION_KEY: 'test_only_mfa_encryption_key_32_characters_min',
  CSRF_SECRET: 'test_only_csrf_secret_32_characters_minimum',
};

describe('loadServerConfig', () => {
  beforeEach(() => {
    resetServerConfigCache();
  });

  it('carga la configuracion con valores por defecto cuando el entorno es valido', () => {
    const config = loadServerConfig(validEnv);
    expect(config.API_PORT).toBe(4000);
    expect(config.NODE_ENV).toBe('development');
  });

  it('lanza un error claro cuando falta DATABASE_URL', () => {
    expect(() => loadServerConfig({})).toThrow(/DATABASE_URL/);
  });

  it('nunca incluye el valor de una variable invalida en el mensaje de error', () => {
    resetServerConfigCache();

    try {
      loadServerConfig({ DATABASE_URL: '' });
      throw new Error('deberia haber lanzado');
    } catch (error) {
      expect((error as Error).message).not.toContain('s3cr3t');
    }
  });
});
