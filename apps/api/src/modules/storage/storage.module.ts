import type { ServerConfig } from '@contaia/config/server';
import { Module, type Provider } from '@nestjs/common';

import { SERVER_CONFIG } from '../../config/config.module';

import { DisabledStorageAdapter } from './disabled-storage.adapter';
import { S3StorageAdapter } from './s3-storage.adapter';
import { StorageError } from './storage.errors';
import { STORAGE_ADAPTER, type StorageAdapter } from './storage.interface';

/**
 * Construye el StorageAdapter activo segun STORAGE_ENABLED. Exportada por
 * separado del provider de NestJS para poder probarla sin bootstrap del
 * modulo. Cuando STORAGE_ENABLED=true, valida que la configuracion este
 * completa antes de construir el cliente S3 — falla rapido al arrancar la
 * aplicacion (mismo principio que `loadServerConfig`), en vez de fallar
 * en el primer uso real del almacenamiento.
 */
export function createStorageAdapter(config: ServerConfig): StorageAdapter {
  if (!config.STORAGE_ENABLED) {
    return new DisabledStorageAdapter();
  }

  const { STORAGE_ENDPOINT, STORAGE_PORT, STORAGE_BUCKET, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY } =
    config;

  if (
    !STORAGE_ENDPOINT ||
    !STORAGE_PORT ||
    !STORAGE_BUCKET ||
    !STORAGE_ACCESS_KEY ||
    !STORAGE_SECRET_KEY
  ) {
    throw new StorageError(
      'STORAGE_CONFIGURATION_ERROR',
      'STORAGE_ENABLED=true requiere STORAGE_ENDPOINT, STORAGE_PORT, STORAGE_BUCKET, ' +
        'STORAGE_ACCESS_KEY y STORAGE_SECRET_KEY completos.',
    );
  }

  return new S3StorageAdapter({
    endpoint: STORAGE_ENDPOINT,
    port: STORAGE_PORT,
    bucket: STORAGE_BUCKET,
    accessKeyId: STORAGE_ACCESS_KEY,
    secretAccessKey: STORAGE_SECRET_KEY,
  });
}

const storageAdapterProvider: Provider = {
  provide: STORAGE_ADAPTER,
  useFactory: createStorageAdapter,
  inject: [SERVER_CONFIG],
};

/**
 * Modulo de almacenamiento de objetos S3-compatible (EWO-005, Paso 2 del
 * plan). Expone unicamente el token `STORAGE_ADAPTER` — ningun consumidor
 * debe importar `S3StorageAdapter`/`DisabledStorageAdapter` directamente.
 * No depende de Prisma, DocumentsModule ni BullMQ. No se registra en
 * `AppModule` en este paso: nada lo consume todavia (DocumentsModule,
 * fase posterior, sera quien lo importe).
 */
@Module({
  providers: [storageAdapterProvider],
  exports: [STORAGE_ADAPTER],
})
export class StorageModule {}
