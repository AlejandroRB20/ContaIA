/**
 * Token de inyeccion del adapter de cola de Jobs activo (real o
 * deshabilitado, segun REDIS_ENABLED) — ningun consumidor debe inyectar una
 * implementacion concreta directamente (inversion de dependencias, mismo
 * patron que STORAGE_ADAPTER).
 */
export const JOBS_QUEUE_ADAPTER = Symbol('JOBS_QUEUE_ADAPTER');

/**
 * Nombre de la cola BullMQ (docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md
 * §2.1/§4.1: "Cola BullMQ | Worker `xml-extraction`"). Nombre del job
 * dentro de esa cola — no documentado explicitamente en el plan; Bloque D
 * lo fija de forma estable y explicita.
 */
export const XML_EXTRACTION_QUEUE_NAME = 'xml-extraction';
export const XML_EXTRACTION_JOB_NAME = 'extract-xml';

/**
 * Payload minimo del Job (Bloque D, seccion 6): unicamente los
 * identificadores necesarios para que un worker futuro recupere el resto
 * de la informacion autorizada desde persistencia — nunca storageReference,
 * bucket, URL firmada, contenido, datos fiscales, Membership ni permisos.
 */
export interface EnqueueXmlExtractionPayload {
  readonly jobId: string;
  readonly documentId: string;
  readonly companyId: string;
}

/**
 * Contrato de cola de Jobs — inversion de dependencias: ningun consumidor
 * (JobsService) debe importar tipos de BullMQ directamente, solo este
 * contrato (mismo principio que StorageAdapter respecto al SDK de AWS).
 */
export interface JobsQueueAdapter {
  /**
   * Encola el Job de extraccion XML. Idempotente por `jobId`: encolar dos
   * veces el mismo `jobId` no crea un duplicado (contrato documentado de
   * BullMQ, ver `job-id.util.ts`) — el llamante siempre debe pasar el
   * identificador determinista persistente del Job, nunca uno nuevo por
   * intento.
   */
  enqueueXmlExtraction(payload: EnqueueXmlExtractionPayload): Promise<void>;
}
