/**
 * Formas de respuesta estandar del API, coherentes con docs/08_API_DESIGN.md
 * (secciones 10 y 11). No contienen logica de negocio: son solo las formas
 * de datos compartidas entre apps/api (las produce) y apps/web (las consume).
 */

export interface ApiMeta {
  correlationId: string;
  timestamp: string;
}

export interface ApiSuccessResponse<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  detail?: string | null;
  field?: string | null;
  correlationId: string;
  retryable: boolean;
}

export interface ApiErrorResponse {
  error: ApiErrorDetail;
}
