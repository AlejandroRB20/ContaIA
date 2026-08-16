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
 * Metadata minima y generica de un objeto, obtenida sin descargar su
 * contenido (HEAD, no GET) — nunca credenciales, URLs ni headers crudos de
 * la peticion. `contentType`/`etag` son `null` cuando el almacenamiento no
 * los reporta (no todo backend S3-compatible garantiza ambos).
 */
export interface ObjectMetadata {
  readonly sizeBytes: number;
  readonly contentType: string | null;
  readonly etag: string | null;
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

  /**
   * Metadata del objeto (tamaño, content type, ETag) mediante HEAD, sin
   * descargar su contenido — nunca lee ni interpreta el archivo. Devuelve
   * `null` si el objeto no existe (mismo criterio que `exists()`).
   */
  getMetadata(key: string): Promise<ObjectMetadata | null>;

  /** Elimina el objeto. Idempotente: eliminar un objeto ya ausente no falla. */
  deleteObject(key: string): Promise<void>;

  /**
   * Descarga el contenido completo del objeto (GET, no HEAD) — a diferencia
   * de `getPresignedDownloadUrl`, la transferencia pasa por el backend: uso
   * exclusivo server-side (el worker de `E5-S4-T02`, Sprint 4), nunca para
   * servir contenido directamente a un cliente HTTP. Sin límite de tamaño
   * propio: es un passthrough puro, igual que el resto del contrato no
   * impone políticas de negocio del dominio documental — el llamador decide
   * si `getMetadata(key).sizeBytes` justifica la descarga antes de invocar
   * este método (`XML_MAX_FILE_SIZE_BYTES`, Addendum §10.3, `E5-S4-T09`).
   *
   * @throws {StorageError} `STORAGE_OBJECT_NOT_FOUND` si el objeto no existe.
   */
  getObject(key: string): Promise<Buffer>;
}
