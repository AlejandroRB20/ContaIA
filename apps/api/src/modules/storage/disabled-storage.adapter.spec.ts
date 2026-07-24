import { DisabledStorageAdapter } from './disabled-storage.adapter';
import { StorageError } from './storage.errors';

describe('DisabledStorageAdapter', () => {
  const adapter = new DisabledStorageAdapter();

  it('getPresignedUploadUrl falla con STORAGE_DISABLED', async () => {
    await expect(adapter.getPresignedUploadUrl('key', 'application/xml')).rejects.toMatchObject({
      code: 'STORAGE_DISABLED',
    });
  });

  it('getPresignedDownloadUrl falla con STORAGE_DISABLED', async () => {
    await expect(adapter.getPresignedDownloadUrl('key')).rejects.toMatchObject({
      code: 'STORAGE_DISABLED',
    });
  });

  it('exists falla con STORAGE_DISABLED (no devuelve false)', async () => {
    await expect(adapter.exists('key')).rejects.toMatchObject({ code: 'STORAGE_DISABLED' });
  });

  it('getMetadata falla con STORAGE_DISABLED (no devuelve null)', async () => {
    await expect(adapter.getMetadata('key')).rejects.toMatchObject({ code: 'STORAGE_DISABLED' });
  });

  it('deleteObject falla con STORAGE_DISABLED', async () => {
    await expect(adapter.deleteObject('key')).rejects.toMatchObject({ code: 'STORAGE_DISABLED' });
  });

  it('todos los errores son instancias de StorageError con mensaje generico', async () => {
    try {
      await adapter.exists('key');
      throw new Error('no deberia llegar aqui');
    } catch (error) {
      expect(error).toBeInstanceOf(StorageError);
      expect((error as StorageError).message).toBe(
        'El almacenamiento de objetos esta deshabilitado (STORAGE_ENABLED=false).',
      );
    }
  });
});
