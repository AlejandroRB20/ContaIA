import { HttpStatus } from '@nestjs/common';

/**
 * Mapa de codigo de error por estado HTTP, coherente con la tabla de
 * categorias de docs/08_API_DESIGN.md (seccion 11). Extensible cuando un
 * modulo funcional introduzca nuevos codigos especificos.
 */
export function errorCodeForStatus(status: number): { code: string; retryable: boolean } {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return { code: 'VALIDATION_ERROR', retryable: true };
    case HttpStatus.UNAUTHORIZED:
      return { code: 'AUTHENTICATION_ERROR', retryable: true };
    case HttpStatus.FORBIDDEN:
      return { code: 'AUTHORIZATION_ERROR', retryable: false };
    case HttpStatus.NOT_FOUND:
      return { code: 'NOT_FOUND', retryable: false };
    case HttpStatus.CONFLICT:
      return { code: 'CONFLICT', retryable: false };
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return { code: 'BUSINESS_RULE_VIOLATION', retryable: false };
    case HttpStatus.TOO_MANY_REQUESTS:
      return { code: 'RATE_LIMIT_EXCEEDED', retryable: true };
    case HttpStatus.SERVICE_UNAVAILABLE:
    case HttpStatus.BAD_GATEWAY:
      return { code: 'DEPENDENCY_ERROR', retryable: true };
    default:
      return { code: 'INTERNAL_ERROR', retryable: true };
  }
}
