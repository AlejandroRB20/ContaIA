import { randomUUID } from 'node:crypto';

import type { ApiSuccessResponse } from '@contaia/types';
import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Envuelve toda respuesta exitosa en el sobre estandar de
 * docs/08_API_DESIGN.md (seccion 10): `{ data, meta: { correlationId,
 * timestamp } }`. Los controladores devuelven solo el payload de negocio —
 * nunca construyen el sobre manualmente.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiSuccessResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccessResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const correlationId = request.correlationId ?? randomUUID();

    return next.handle().pipe(
      map((data) => ({
        data,
        meta: {
          correlationId,
          timestamp: new Date().toISOString(),
        },
      })),
    );
  }
}
