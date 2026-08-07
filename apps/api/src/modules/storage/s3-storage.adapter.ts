import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Logger } from '@nestjs/common';

import { StorageError } from './storage.errors';
import type { ObjectMetadata, PresignedUrl, StorageAdapter } from './storage.interface';

export interface S3StorageAdapterConfig {
  readonly endpoint: string;
  readonly port: number;
  readonly bucket: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
}

/** Conservador a proposito: minimiza la ventana de uso de un enlace filtrado o reenviado por error. */
const UPLOAD_URL_EXPIRY_SECONDS = 300;
const DOWNLOAD_URL_EXPIRY_SECONDS = 300;

/** El SDK de AWS exige una region aunque MinIO no la usa realmente. */
const PLACEHOLDER_REGION = 'us-east-1';

/**
 * Implementacion de StorageAdapter contra un endpoint S3-compatible
 * (MinIO en desarrollo local, docker-compose.yml — EWO-005). Local a este
 * archivo: no depende de Prisma, DocumentsModule ni BullMQ.
 *
 * `forcePathStyle: true` es obligatorio para MinIO (el estilo
 * virtual-hosted no resuelve contra un endpoint por IP/localhost).
 *
 * Nunca crea el bucket ni modifica politicas — el bucket lo aprovisiona la
 * infraestructura de docker-compose (servicio `minio-init`), no la
 * aplicacion (docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md seccion
 * 12, punto 3). El cliente S3 no abre conexion al construirse (el SDK v3
 * es perezoso: solo emite trafico de red al invocar `send()`), por lo que
 * instanciar este adapter nunca bloquea el arranque de la aplicacion.
 */
export class S3StorageAdapter implements StorageAdapter {
  private readonly logger = new Logger(S3StorageAdapter.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: S3StorageAdapterConfig) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      endpoint: `http://${config.endpoint}:${config.port}`,
      region: PLACEHOLDER_REGION,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async getPresignedUploadUrl(key: string, contentType: string): Promise<PresignedUrl> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return this.presign(command, UPLOAD_URL_EXPIRY_SECONDS, 'generar la URL prefirmada de carga');
  }

  async getPresignedDownloadUrl(key: string): Promise<PresignedUrl> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return this.presign(
      command,
      DOWNLOAD_URL_EXPIRY_SECONDS,
      'generar la URL prefirmada de descarga',
    );
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch (error) {
      if (this.isNotFound(error)) {
        return false;
      }
      throw this.toStorageError(error, 'comprobar la existencia del objeto');
    }
  }

  /**
   * Mismo HEAD que `exists()`, pero capturando la respuesta para exponer
   * `ContentLength`/`ContentType`/`ETag` — nunca el cuerpo del objeto (HEAD
   * no lo transmite). `contentType`/`etag` se normalizan a `null` cuando el
   * backend S3-compatible no los reporta.
   */
  async getMetadata(key: string): Promise<ObjectMetadata | null> {
    try {
      const response = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return {
        sizeBytes: response.ContentLength ?? 0,
        contentType: response.ContentType ?? null,
        etag: response.ETag ?? null,
      };
    } catch (error) {
      if (this.isNotFound(error)) {
        return null;
      }
      throw this.toStorageError(error, 'obtener la metadata del objeto');
    }
  }

  /**
   * GET real — a diferencia de `exists()`/`getMetadata()` (siempre HEAD).
   * `Body.transformToByteArray()` es el helper del propio SDK v3 para
   * consumir el stream de respuesta de forma completa y cerrarlo
   * correctamente, sin gestionar manualmente eventos `data`/`end`/`error`
   * ni añadir una dependencia de streaming adicional.
   */
  async getObject(key: string): Promise<Buffer> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      const bytes = await response.Body?.transformToByteArray();
      return Buffer.from(bytes ?? new Uint8Array());
    } catch (error) {
      if (this.isNotFound(error)) {
        throw new StorageError('STORAGE_OBJECT_NOT_FOUND', 'El objeto solicitado no existe.');
      }
      throw this.toStorageError(error, 'descargar el objeto');
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      // DeleteObject en S3/MinIO responde 204 tanto si el objeto existia
      // como si no — la idempotencia la da el propio protocolo, sin
      // necesidad de un HEAD previo.
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (error) {
      throw this.toStorageError(error, 'eliminar el objeto');
    }
  }

  private async presign(
    command: PutObjectCommand | GetObjectCommand,
    expiresInSeconds: number,
    actionDescription: string,
  ): Promise<PresignedUrl> {
    try {
      const url = await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
      return { url, expiresAt: new Date(Date.now() + expiresInSeconds * 1000) };
    } catch (error) {
      throw this.toStorageError(error, actionDescription);
    }
  }

  /**
   * Distingue "objeto inexistente" (404) de cualquier otro fallo. Acceso
   * denegado (403) y errores de red NO son "no encontrado" — deben
   * propagarse como STORAGE_OPERATION_FAILED, nunca enmascararse como
   * ausencia del objeto.
   */
  private isNotFound(error: unknown): boolean {
    const metadataStatus = (error as { $metadata?: { httpStatusCode?: number } } | undefined)
      ?.$metadata?.httpStatusCode;
    const name = (error as { name?: string } | undefined)?.name;
    return metadataStatus === 404 || name === 'NotFound' || name === 'NoSuchKey';
  }

  /**
   * Traduce cualquier error del SDK a STORAGE_OPERATION_FAILED. El mensaje
   * expuesto es siempre generico; el detalle (solo el nombre del error,
   * nunca sus propiedades completas — que podrian incluir headers de
   * peticion) va al log interno, nunca a un valor de configuracion ni a
   * una URL firmada.
   */
  private toStorageError(error: unknown, actionDescription: string): StorageError {
    const name = error instanceof Error ? error.name : 'UnknownError';
    this.logger.error(
      `No fue posible ${actionDescription} (bucket=${this.bucket}, error=${name}).`,
    );
    return new StorageError('STORAGE_OPERATION_FAILED', `No fue posible ${actionDescription}.`);
  }
}
