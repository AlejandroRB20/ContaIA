import { ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';

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

/**
 * Usada tanto cuando el Documento no existe como cuando existe pero el
 * actor no tiene Membership activa en su Empresa o su Rol no incluye
 * `document.read` — mensaje y codigo HTTP identicos en ambos casos para no
 * filtrar la existencia de un Documento de otra Empresa (Bloque B de
 * EWO-005, seccion 15: "Preferencia segura: devolver 404 tanto si no
 * existe como si existe pero el actor no tiene acceso").
 */
export class DocumentNotFoundException extends NotFoundException {
  constructor() {
    super('Documento no encontrado.');
  }
}

/**
 * Bloque C — API-0023.5 (confirm-upload). Cubre todos los casos en que la
 * carga no puede confirmarse: objeto inexistente en Storage, archivo
 * vacio, tamaño o content type inconsistentes con lo declarado al iniciar
 * la carga, metadata invalida, o un Documento cuyo estado ya es `REJECTED`
 * (resultado terminal negativo de una etapa posterior — BR-XML-001 —
 * confirmarlo de nuevo no debe leerse como exito). Un unico mensaje
 * publico generico — la causa especifica se registra solo en el log
 * interno (`DocumentsService`), nunca en la respuesta (BR-SEC-003, mismo
 * principio que `DocumentStorageUnavailableException`).
 */
export class DocumentUploadNotVerifiedException extends ConflictException {
  constructor() {
    super('No fue posible verificar la carga del documento en el almacenamiento.');
  }
}
