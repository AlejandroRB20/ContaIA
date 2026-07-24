import { ServiceUnavailableException } from '@nestjs/common';

/**
 * Excepcion de dominio de Documents ante cualquier fallo del almacenamiento
 * de objetos (StorageModule: STORAGE_DISABLED, STORAGE_CONFIGURATION_ERROR
 * o STORAGE_OPERATION_FAILED). Mensaje siempre generico — docs/08_API_DESIGN.md
 * seccion 11 clasifica esto como "Dependencia externa" (502/503); el detalle
 * interno (endpoint, credenciales, bucket, codigo especifico de StorageError)
 * nunca llega a la respuesta HTTP (BR-SEC-003). El filtro global
 * (`AllExceptionsFilter`) ademas sustituye el mensaje de cualquier excepcion
 * 5xx por uno generico propio, asi que este mensaje solo es una segunda capa
 * de defensa, no la unica.
 */
export class DocumentStorageUnavailableException extends ServiceUnavailableException {
  constructor() {
    super(
      'El servicio de almacenamiento de documentos no esta disponible. Intenta de nuevo mas tarde.',
    );
  }
}
