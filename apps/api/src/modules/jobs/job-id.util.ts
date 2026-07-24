import { createHash } from 'node:crypto';

/**
 * Namespace UUID fijo de ContaIA para Jobs deterministicos (RFC 4122 §4.3,
 * UUIDv5) — generado una sola vez y fijado para siempre; nunca debe
 * regenerarse (cambiarlo invalidaria la deduplicacion de cualquier Job ya
 * persistido, al producir un id distinto para los mismos argumentos). No es
 * secreto: un namespace UUID no protege nada, solo evita colisiones entre
 * distintos usos de UUIDv5 dentro del proyecto.
 */
const CONTAIA_JOB_NAMESPACE = '9f3348a9-7307-48bb-bf01-0e3b4f1b284f';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uuidToBytes(uuid: string): Buffer {
  const hex = uuid.replace(/-/g, '');
  return Buffer.from(hex, 'hex');
}

function bytesToUuid(bytes: Buffer): string {
  const hex = bytes.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

function normalizeUuid(value: string, label: string): string {
  const normalized = value.trim().toLowerCase();
  if (!UUID_PATTERN.test(normalized)) {
    throw new TypeError(`${label} debe ser un UUID valido.`);
  }
  return normalized;
}

function normalizeJobType(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (normalized.length === 0) {
    throw new TypeError('type no puede estar vacio.');
  }
  return normalized;
}

/**
 * UUIDv5 (RFC 4122 §4.3, SHA-1) deterministico: los mismos argumentos
 * siempre producen el mismo id — es a la vez la clave primaria (`Job.id`,
 * columna `uuid` en Postgres) y el `jobId` de BullMQ (Bloque D, seccion 7:
 * "Job.id determinista = funcion estable de companyId + documentId +
 * JobType"). Garantiza "a lo sumo un Job logico por (companyId, documentId,
 * type)" sin modificar el schema de Prisma: un segundo intento de crear el
 * mismo Job colisiona con la restriccion de clave primaria (P2002 —
 * `jobs.repository.ts`), y un segundo intento de encolar el mismo `jobId`
 * en BullMQ no crea un duplicado (comportamiento documentado en el SDK
 * instalado, `bullmq/dist/.../base-job-options.d.ts`: "If you attempt to
 * add a job with an id that already exists, it will not be added").
 * Algoritmo verificado contra la implementacion de referencia del paquete
 * `uuid` (funcion `v5`) usando los vectores de prueba publicados para el
 * namespace DNS estandar.
 */
export function buildDeterministicJobId(
  companyId: string,
  documentId: string,
  type: string,
): string {
  // JSON serializa cada campo de forma estructurada: no hay ambigüedad por
  // delimitadores (por ejemplo, ["ab", "c"] no puede equivaler a ["a", "bc"])
  // ni por mayúsculas/minúsculas de UUIDs semánticamente iguales.
  const name = JSON.stringify([
    normalizeJobType(type),
    normalizeUuid(companyId, 'companyId'),
    normalizeUuid(documentId, 'documentId'),
  ]);
  const namespaceBytes = uuidToBytes(CONTAIA_JOB_NAMESPACE);
  const nameBytes = Buffer.from(name, 'utf8');
  const hash = createHash('sha1')
    .update(Buffer.concat([namespaceBytes, nameBytes]))
    .digest();
  const bytes = Buffer.from(hash.subarray(0, 16));

  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  return bytesToUuid(bytes);
}
