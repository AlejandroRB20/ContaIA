import type { ServerConfig } from '@contaia/config/server';

import { DisabledStorageAdapter } from './disabled-storage.adapter';
import { S3StorageAdapter } from './s3-storage.adapter';
import { createStorageAdapter } from './storage.module';

function buildConfig(overrides: Partial<ServerConfig>): ServerConfig {
  return {
    STORAGE_ENABLED: false,
    STORAGE_ENDPOINT: undefined,
    STORAGE_PORT: undefined,
    STORAGE_BUCKET: undefined,
    STORAGE_ACCESS_KEY: undefined,
    STORAGE_SECRET_KEY: undefined,
    ...overrides,
  } as ServerConfig;
}

describe('createStorageAdapter', () => {
  describe('STORAGE_ENABLED=false (deshabilitado)', () => {
    it('registra DisabledStorageAdapter y no exige el resto de variables', () => {
      const adapter = createStorageAdapter(buildConfig({ STORAGE_ENABLED: false }));

      expect(adapter).toBeInstanceOf(DisabledStorageAdapter);
    });
  });

  describe('STORAGE_ENABLED=true con configuracion valida', () => {
    it('registra S3StorageAdapter', () => {
      const adapter = createStorageAdapter(
        buildConfig({
          STORAGE_ENABLED: true,
          STORAGE_ENDPOINT: 'minio-host',
          STORAGE_PORT: 9123,
          STORAGE_BUCKET: 'contaia-documents',
          STORAGE_ACCESS_KEY: 'access-key',
          STORAGE_SECRET_KEY: 'secret-key',
        }),
      );

      expect(adapter).toBeInstanceOf(S3StorageAdapter);
    });
  });

  describe('STORAGE_ENABLED=true con configuracion incompleta', () => {
    it.each([
      ['STORAGE_ENDPOINT', { STORAGE_ENDPOINT: undefined }],
      ['STORAGE_PORT', { STORAGE_PORT: undefined }],
      ['STORAGE_BUCKET', { STORAGE_BUCKET: undefined }],
      ['STORAGE_ACCESS_KEY', { STORAGE_ACCESS_KEY: undefined }],
      ['STORAGE_SECRET_KEY', { STORAGE_SECRET_KEY: undefined }],
    ])('falla con STORAGE_CONFIGURATION_ERROR si falta %s', (_label, override) => {
      const config = buildConfig({
        STORAGE_ENABLED: true,
        STORAGE_ENDPOINT: 'minio-host',
        STORAGE_PORT: 9123,
        STORAGE_BUCKET: 'contaia-documents',
        STORAGE_ACCESS_KEY: 'access-key',
        STORAGE_SECRET_KEY: 'secret-key',
        ...override,
      });

      expect(() => createStorageAdapter(config)).toThrow(
        expect.objectContaining({ code: 'STORAGE_CONFIGURATION_ERROR' }),
      );
    });

    it('el mensaje de error no expone ningun valor de configuracion', () => {
      const config = buildConfig({ STORAGE_ENABLED: true, STORAGE_ACCESS_KEY: 'super-secret-key' });

      try {
        createStorageAdapter(config);
        throw new Error('no deberia llegar aqui');
      } catch (error) {
        expect((error as Error).message).not.toContain('super-secret-key');
      }
    });
  });
});
