import { randomUUID } from 'node:crypto';

import type { ApiErrorResponse } from '@contaia/types';
import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { errorCodeForStatus } from './error-code.util';

const GENERIC_SERVER_MESSAGE = 'Ha ocurrido un error interno. Intenta de nuevo en unos momentos.';

/**
 * Filtro global de excepciones. Traduce cualquier error a la forma exacta
 * del contrato de docs/08_API_DESIGN.md (seccion 11) y aplica el principio
 * de errores seguros (BR-SEC-003, docs/11_SECURITY_ARCHITECTURE.md seccion 12):
 * el detalle tecnico de un error no controlado (stack trace) se registra
 * solo en el log interno, nunca se expone en la respuesta.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = request.correlationId ?? randomUUID();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const { code, retryable } = errorCodeForStatus(status);

    const clientMessage = this.resolveClientMessage(exception, isHttpException, status);

    if (!isHttpException || status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const detail = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(`[${correlationId}] ${clientMessage}`, detail);
    }

    const body: ApiErrorResponse = {
      error: {
        code,
        message: clientMessage,
        detail: null,
        field: null,
        correlationId,
        retryable,
      },
    };

    response.status(status).setHeader('X-Correlation-Id', correlationId).json(body);
  }

  private resolveClientMessage(
    exception: unknown,
    isHttpException: boolean,
    status: number,
  ): string {
    // Un error no controlado (500) nunca expone su mensaje real al cliente —
    // solo las excepciones HTTP deliberadamente lanzadas por nuestro propio
    // codigo son seguras de mostrar tal cual.
    if (!isHttpException || status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return GENERIC_SERVER_MESSAGE;
    }

    const response = (exception as HttpException).getResponse();

    if (typeof response === 'string') {
      return response;
    }

    if (typeof response === 'object' && response !== null && 'message' in response) {
      const { message } = response as { message: string | string[] };
      return Array.isArray(message) ? message.join(', ') : message;
    }

    return (exception as HttpException).message;
  }
}
