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

  describe('configuracion central de XML/BullMQ (Addendum §10.3, E5-S4-T09)', () => {
    it('aplica los 14 defaults MVP cuando estan ausentes — ningun consumidor necesita su propio default', () => {
      const config = loadServerConfig(validEnv);

      expect(config.XML_MAX_FILE_SIZE_BYTES).toBe(10485760);
      expect(config.XML_MAX_DEPTH).toBe(50);
      expect(config.XML_MAX_NODE_COUNT).toBe(100000);
      expect(config.XML_MAX_ATTRIBUTE_COUNT).toBe(50000);
      expect(config.JOBS_RECONCILIATION_ENABLED).toBe(true);
      expect(config.JOBS_RECONCILIATION_INTERVAL_MS).toBe(300000);
      expect(config.JOBS_STALE_QUEUED_MS).toBe(600000);
      expect(config.JOBS_STALE_PROCESSING_MS).toBe(900000);
      expect(config.JOBS_ATTEMPTS).toBe(3);
      expect(config.JOBS_BACKOFF_DELAY_MS).toBe(5000);
      expect(config.JOBS_REMOVE_ON_COMPLETE_COUNT).toBe(1000);
      expect(config.JOBS_REMOVE_ON_COMPLETE_AGE_SECONDS).toBe(86400);
      expect(config.JOBS_REMOVE_ON_FAIL_COUNT).toBe(5000);
      expect(config.JOBS_REMOVE_ON_FAIL_AGE_SECONDS).toBe(604800);
    });

    it('JOBS_ATTEMPTS fuera de rango hace fallar el arranque completo de la aplicacion', () => {
      resetServerConfigCache();

      expect(() => loadServerConfig({ ...validEnv, JOBS_ATTEMPTS: '99' })).toThrow(/JOBS_ATTEMPTS/);
    });

    it('XML_MAX_DEPTH no numerico hace fallar el arranque completo de la aplicacion', () => {
      resetServerConfigCache();

      expect(() => loadServerConfig({ ...validEnv, XML_MAX_DEPTH: 'no-numero' })).toThrow(
        /XML_MAX_DEPTH/,
      );
    });
  });
});
