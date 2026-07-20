import { describe, expect, it } from 'vitest';

import { databaseEnvSchema } from './database';
import { serverEnvSchema } from './server';
import { sharedEnvSchema } from './shared';

describe('sharedEnvSchema', () => {
  it('aplica NODE_ENV=development por defecto', () => {
    const result = sharedEnvSchema.parse({});
    expect(result.NODE_ENV).toBe('development');
  });

  it('rechaza un NODE_ENV no reconocido', () => {
    expect(() => sharedEnvSchema.parse({ NODE_ENV: 'no-existe' })).toThrow();
  });
});

describe('databaseEnvSchema', () => {
  it('requiere DATABASE_URL', () => {
    expect(() => databaseEnvSchema.parse({})).toThrow();
  });

  it('acepta una DATABASE_URL valida', () => {
    const result = databaseEnvSchema.parse({
      DATABASE_URL: 'postgresql://contaia:contaia@localhost:5432/contaia',
    });
    expect(result.DATABASE_URL).toContain('postgresql://');
  });
});

describe('serverEnvSchema', () => {
  it('convierte CORS_ORIGINS separado por comas en un arreglo', () => {
    const result = serverEnvSchema.parse({
      CORS_ORIGINS: 'http://localhost:3000, http://localhost:3001',
      JWT_ACCESS_SECRET: 'test_only_jwt_access_secret_32_characters_min',
      MFA_ENCRYPTION_KEY: 'test_only_mfa_encryption_key_32_characters_min',
      CSRF_SECRET: 'test_only_csrf_secret_32_characters_minimum',
    });
    expect(result.CORS_ORIGINS).toEqual(['http://localhost:3000', 'http://localhost:3001']);
  });
});
