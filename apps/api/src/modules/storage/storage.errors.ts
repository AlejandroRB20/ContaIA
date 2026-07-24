export type StorageErrorCode =
  | 'STORAGE_DISABLED'
  | 'STORAGE_CONFIGURATION_ERROR'
  | 'STORAGE_OBJECT_NOT_FOUND'
  | 'STORAGE_OPERATION_FAILED';

/**
 * Error de dominio de StorageModule. `code` es lo unico que un consumidor
 * debe inspeccionar para decidir como reaccionar (ej. mapear a una
 * excepcion HTTP especifica en un modulo futuro) — el mensaje nunca
 * envuelve el error crudo del SDK de AWS ni ningun valor de configuracion
 * (endpoint, credenciales), para no filtrar detalle interno de
 * infraestructura (BR-SEC-003, docs/11_SECURITY_ARCHITECTURE.md seccion 29).
 */
export class StorageError extends Error {
  constructor(
    public readonly code: StorageErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'StorageError';
  }
}
