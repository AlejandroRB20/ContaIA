/**
 * Token de inyeccion del adapter de almacenamiento de objetos activo (real
 * o deshabilitado, segun STORAGE_ENABLED) — ningun consumidor debe
 * inyectar una implementacion concreta directamente (inversion de
 * dependencias, docs/07_SOFTWARE_ARCHITECTURE.md seccion 5).
 */
export const STORAGE_ADAPTER = Symbol('STORAGE_ADAPTER');

/** URL de un solo uso, valida por un periodo corto y conservador. */
export interface PresignedUrl {
  readonly url: string;
  readonly expiresAt: Date;
}

/**
 * Contrato de almacenamiento de objetos S3-compatible (MinIO en desarrollo,
 * S3 en produccion futura) — inversion de dependencias: ningun consumidor
 * (futuro DocumentsModule) debe importar tipos del SDK de AWS directamente,
 * solo este contrato. `key` es la key opaca del objeto en el almacenamiento
 * (nunca el nombre original del archivo ni una URL); su generacion es
 * responsabilidad del consumidor, no de este contrato.
 */
export interface StorageAdapter {
  /** URL prefirmada para subir el objeto directamente al almacenamiento (nunca a traves del backend). */
  getPresignedUploadUrl(key: string, contentType: string): Promise<PresignedUrl>;

  /** URL prefirmada para descargar el objeto directamente del almacenamiento. */
  getPresignedDownloadUrl(key: string): Promise<PresignedUrl>;

  /** Comprueba existencia del objeto mediante HEAD, sin descargar su contenido. */
  exists(key: string): Promise<boolean>;

  /** Elimina el objeto. Idempotente: eliminar un objeto ya ausente no falla. */
  deleteObject(key: string): Promise<void>;
}
