import { StorageError } from './storage.errors';
import type { PresignedUrl, StorageAdapter } from './storage.interface';

/**
 * Adapter activo cuando STORAGE_ENABLED=false — permite arrancar la
 * aplicacion sin MinIO/S3 disponible. Nunca construye un cliente S3 ni
 * intenta conectarse; cualquier operacion falla de inmediato con un error
 * controlado (STORAGE_DISABLED), nunca con un timeout de red.
 */
export class DisabledStorageAdapter implements StorageAdapter {
  async getPresignedUploadUrl(_key: string, _contentType: string): Promise<PresignedUrl> {
    throw this.disabledError();
  }

  async getPresignedDownloadUrl(_key: string): Promise<PresignedUrl> {
    throw this.disabledError();
  }

  async exists(_key: string): Promise<boolean> {
    throw this.disabledError();
  }

  async deleteObject(_key: string): Promise<void> {
    throw this.disabledError();
  }

  private disabledError(): StorageError {
    return new StorageError(
      'STORAGE_DISABLED',
      'El almacenamiento de objetos esta deshabilitado (STORAGE_ENABLED=false).',
    );
  }
}
