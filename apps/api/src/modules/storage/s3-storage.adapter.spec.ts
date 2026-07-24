import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { S3StorageAdapter } from './s3-storage.adapter';
import { StorageError } from './storage.errors';

// Los factories de jest.mock no referencian variables externas (evita el
// error de "out-of-scope variable" del hoisting de ts-jest): cada uno crea
// sus propios jest.fn() y se configuran despues del import, mismo patron
// que health.service.spec.ts (`(checkDatabaseConnection as jest.Mock)...`).
jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');
  return { ...actual, S3Client: jest.fn() };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: jest.fn() }));

const send = jest.fn();

const CONFIG = {
  endpoint: 'minio-host',
  port: 9123,
  bucket: 'contaia-documents',
  accessKeyId: 'access-key-value',
  secretAccessKey: 'super-secret-key-value',
};

function buildAdapter(): S3StorageAdapter {
  return new S3StorageAdapter(CONFIG);
}

describe('S3StorageAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (S3Client as unknown as jest.Mock).mockImplementation(() => ({ send }));
  });

  describe('construccion', () => {
    it('configura el cliente S3 con endpoint, region, forcePathStyle y credenciales — sin conectarse', () => {
      buildAdapter();

      expect(S3Client).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'http://minio-host:9123',
          forcePathStyle: true,
          credentials: {
            accessKeyId: 'access-key-value',
            secretAccessKey: 'super-secret-key-value',
          },
        }),
      );
      expect(send).not.toHaveBeenCalled();
      expect(getSignedUrl).not.toHaveBeenCalled();
    });
  });

  describe('getPresignedUploadUrl', () => {
    it('firma un PutObjectCommand con el bucket, key y content type correctos', async () => {
      (getSignedUrl as jest.Mock).mockResolvedValue(
        'https://minio-host:9123/contaia-documents/doc-key?signature=...',
      );
      const adapter = buildAdapter();

      const result = await adapter.getPresignedUploadUrl(
        'company/1/doc-key.xml',
        'application/xml',
      );

      expect(getSignedUrl).toHaveBeenCalledTimes(1);
      const [, command, options] = (getSignedUrl as jest.Mock).mock.calls[0];
      expect(command).toBeInstanceOf(PutObjectCommand);
      expect(command.input).toEqual({
        Bucket: 'contaia-documents',
        Key: 'company/1/doc-key.xml',
        ContentType: 'application/xml',
      });
      expect(options).toEqual({ expiresIn: 300 });
      expect(result.url).toBe('https://minio-host:9123/contaia-documents/doc-key?signature=...');
    });

    it('la URL expira en una ventana corta y conservadora', async () => {
      (getSignedUrl as jest.Mock).mockResolvedValue('https://example.test/upload');
      const adapter = buildAdapter();
      const before = Date.now();

      const result = await adapter.getPresignedUploadUrl('key', 'application/xml');

      const expectedMs = before + 300_000;
      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMs - 1000);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedMs + 5000);
    });

    it('transforma un fallo del SDK en STORAGE_OPERATION_FAILED, sin exponer el error crudo', async () => {
      (getSignedUrl as jest.Mock).mockRejectedValue(
        new Error('connect ECONNREFUSED 127.0.0.1:9123'),
      );
      const adapter = buildAdapter();

      await expect(adapter.getPresignedUploadUrl('key', 'application/xml')).rejects.toMatchObject({
        code: 'STORAGE_OPERATION_FAILED',
      });
    });
  });

  describe('getPresignedDownloadUrl', () => {
    it('firma un GetObjectCommand con el bucket y key correctos', async () => {
      (getSignedUrl as jest.Mock).mockResolvedValue(
        'https://minio-host:9123/contaia-documents/doc-key?signature=...',
      );
      const adapter = buildAdapter();

      await adapter.getPresignedDownloadUrl('company/1/doc-key.xml');

      const [, command, options] = (getSignedUrl as jest.Mock).mock.calls[0];
      expect(command).toBeInstanceOf(GetObjectCommand);
      expect(command.input).toEqual({ Bucket: 'contaia-documents', Key: 'company/1/doc-key.xml' });
      expect(options).toEqual({ expiresIn: 300 });
    });

    it('la URL expira en una ventana corta y conservadora', async () => {
      (getSignedUrl as jest.Mock).mockResolvedValue('https://example.test/download');
      const adapter = buildAdapter();
      const before = Date.now();

      const result = await adapter.getPresignedDownloadUrl('key');

      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 300_000 - 1000);
    });

    it('transforma un fallo del SDK en STORAGE_OPERATION_FAILED', async () => {
      (getSignedUrl as jest.Mock).mockRejectedValue(new Error('boom'));
      const adapter = buildAdapter();

      await expect(adapter.getPresignedDownloadUrl('key')).rejects.toMatchObject({
        code: 'STORAGE_OPERATION_FAILED',
      });
    });
  });

  describe('exists', () => {
    it('devuelve true cuando HEAD responde correctamente', async () => {
      send.mockResolvedValue({ ContentLength: 1024 });
      const adapter = buildAdapter();

      const result = await adapter.exists('key');

      expect(result).toBe(true);
      const command = send.mock.calls[0][0];
      expect(command).toBeInstanceOf(HeadObjectCommand);
      expect(command.input).toEqual({ Bucket: 'contaia-documents', Key: 'key' });
    });

    it('devuelve false unicamente cuando el objeto no existe (404 / NotFound)', async () => {
      send.mockRejectedValue({ name: 'NotFound', $metadata: { httpStatusCode: 404 } });
      const adapter = buildAdapter();

      const result = await adapter.exists('key-inexistente');

      expect(result).toBe(false);
    });

    it('NO devuelve false ante acceso denegado (403) — propaga el error', async () => {
      send.mockRejectedValue({ name: 'Forbidden', $metadata: { httpStatusCode: 403 } });
      const adapter = buildAdapter();

      await expect(adapter.exists('key')).rejects.toMatchObject({
        code: 'STORAGE_OPERATION_FAILED',
      });
    });

    it('NO devuelve false ante un error de red — propaga el error', async () => {
      send.mockRejectedValue(new Error('connect ETIMEDOUT'));
      const adapter = buildAdapter();

      await expect(adapter.exists('key')).rejects.toMatchObject({
        code: 'STORAGE_OPERATION_FAILED',
      });
    });
  });

  describe('deleteObject', () => {
    it('elimina con el bucket y key correctos', async () => {
      send.mockResolvedValue({});
      const adapter = buildAdapter();

      await adapter.deleteObject('company/1/doc-key.xml');

      const command = send.mock.calls[0][0];
      expect(command).toBeInstanceOf(DeleteObjectCommand);
      expect(command.input).toEqual({ Bucket: 'contaia-documents', Key: 'company/1/doc-key.xml' });
    });

    it('es idempotente: eliminar un objeto ya ausente no falla (S3/MinIO responde 204 igualmente)', async () => {
      send.mockResolvedValue({});
      const adapter = buildAdapter();

      await expect(adapter.deleteObject('key-ya-eliminado')).resolves.toBeUndefined();
    });

    it('transforma un fallo del SDK en STORAGE_OPERATION_FAILED', async () => {
      send.mockRejectedValue(new Error('boom'));
      const adapter = buildAdapter();

      await expect(adapter.deleteObject('key')).rejects.toMatchObject({
        code: 'STORAGE_OPERATION_FAILED',
      });
    });
  });

  describe('seguridad', () => {
    it('ningun StorageError expone las credenciales configuradas', async () => {
      send.mockRejectedValue(new Error('boom'));
      const adapter = buildAdapter();

      try {
        await adapter.exists('key');
        throw new Error('no deberia llegar aqui');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        const serialized =
          JSON.stringify(error) + (error as Error).message + (error as Error).stack;
        expect(serialized).not.toContain(CONFIG.accessKeyId);
        expect(serialized).not.toContain(CONFIG.secretAccessKey);
      }
    });

    it('el resultado de una URL prefirmada no expone metadata cruda del SDK', async () => {
      (getSignedUrl as jest.Mock).mockResolvedValue('https://example.test/signed');
      const adapter = buildAdapter();

      const result = await adapter.getPresignedUploadUrl('key', 'application/xml');

      expect(Object.keys(result).sort()).toEqual(['expiresAt', 'url']);
    });
  });
});
